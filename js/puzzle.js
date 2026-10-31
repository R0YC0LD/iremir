/* =====================================================================
   YAPBOZ MOTORU  (120 parça = 10 sütun x 12 satır)
   ---------------------------------------------------------------------
   Burayı değiştirmen gerekmiyor. Fotoğraf, parça sayısı ve yazılar
   js/config.js içindeki "puzzle" bölümünden ayarlanır.

   Nasıl çalışır?
   1. Fotoğraf yüklenir ve 10x12 hücreye bölünür.
   2. Komşu iki parçanın ortak kenarı TEK bir eğriden üretilir; biri o eğriyi
      ileri, diğeri geri çizer. Bu yüzden çıkıntı ve girintiler birebir uyar.
   3. Her parça kendi şekline göre kırpılıp ayrı bir <canvas> olur.
   4. Parçalar sürüklenebilir (fare / parmak) ya da "dokun - sonra yerini
      göster" yöntemiyle yerleştirilebilir.
   ===================================================================== */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rand) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function r2(n) { return Math.round(n * 100) / 100; }

  /* ---------- kenar geometrisi ----------
     Bir kenar 10 noktalık Bezier zinciridir: başlangıç + 3 kübik eğri. */
  function edgeParams(rand) {
    var j = function () { return (rand() * 2 - 1) * 0.035; };
    return { s: rand() < 0.5 ? -1 : 1, t: 0.1 + (rand() * 2 - 1) * 0.006, a: j(), b: j(), c: j(), d: j(), e: j() };
  }
  function edgePoints(x0, y0, x1, y1, p) {
    var dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, t = p.t;
    var raw = [
      [0, 0], [0.2, p.a], [0.5 + p.b + p.d, -t + p.c], [0.5 - t + p.b, t + p.c],
      [0.5 - 2 * t + p.b - p.d, 3 * t + p.c], [0.5 + 2 * t + p.b - p.d, 3 * t + p.c], [0.5 + t + p.b, t + p.c],
      [0.5 + p.b + p.d, -t + p.c], [0.8, p.e], [1, 0]
    ];
    return raw.map(function (q) {
      return [x0 + dx * q[0] + nx * L * q[1] * p.s, y0 + dy * q[0] + ny * L * q[1] * p.s];
    });
  }
  function flatPoints(x0, y0, x1, y1) { return [[x0, y0], [x1, y1]]; }
  function segPath(pts) {
    if (pts.length === 2) return 'L' + r2(pts[1][0]) + ' ' + r2(pts[1][1]);
    var s = '';
    for (var i = 1; i < pts.length; i += 3) {
      s += 'C' + r2(pts[i][0]) + ' ' + r2(pts[i][1]) + ' ' + r2(pts[i + 1][0]) + ' ' + r2(pts[i + 1][1]) + ' ' + r2(pts[i + 2][0]) + ' ' + r2(pts[i + 2][1]);
    }
    return s;
  }

  function init(cfg) {
    var COLS = cfg.columns || 10, ROWS = cfg.rows || 12, TOTAL = COLS * ROWS;
    var L = cfg.labels, C = cfg.completion;

    var section = $('puzzle'), layout = $('pzLayout'), board = $('pzBoard'), placedLayer = $('pzPlaced');
    var tray = $('pzTray'), toastEl = $('pzToast'), cellEl = $('pzCell'), finale = $('pzFinale');
    var numEl = $('pzNum'), labelEl = $('pzLabel'), barEl = $('pzBar'), fillEl = $('pzFill');
    var guideSvg = $('pzGuideSvg'), ghostImg = $('pzGhost'), finalImg = $('pzFinal');

    var storeKey = 'jigsaw:' + cfg.image + ':' + COLS + 'x' + ROWS + ':' + (cfg.seed || 0);
    var img = new Image();
    img.decoding = 'async';

    var W, H, cw, ch, pad, cvW, cvH;
    var pieces = [], slots = [];
    var placed = {}, placedCount = 0;
    var order = [], selectedId = null, finished = false, edgesOnly = false;
    var toastTimer = 0, press = null, drag = null, restartTimer = 0, finishTimers = [];

    img.onload = function () { build(); };
    img.onerror = function () { toast('Yapboz fotoğrafı yüklenemedi: ' + cfg.image); };
    img.src = cfg.image;

    function store(v) { try { if (v === null) localStorage.removeItem(storeKey); else localStorage.setItem(storeKey, JSON.stringify(v)); } catch (e) {} }
    function load() { try { var v = JSON.parse(localStorage.getItem(storeKey)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }

    /* ---------- parçaları üret ---------- */
    function build() {
      // büyük fotoğrafları makul bir çözünürlüğe indir (kare oranı bozulmaz)
      var maxSide = 1700, k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      W = Math.round(img.naturalWidth * k); H = Math.round(img.naturalHeight * k);
      var base = document.createElement('canvas'); base.width = W; base.height = H;
      var bctx = base.getContext('2d'); bctx.imageSmoothingQuality = 'high'; bctx.drawImage(img, 0, 0, W, H);

      cw = W / COLS; ch = H / ROWS;
      pad = Math.ceil(0.36 * Math.max(cw, ch));
      cvW = Math.ceil(cw + pad * 2); cvH = Math.ceil(ch + pad * 2);

      layout.style.setProperty('--ar', (W / H).toFixed(5));
      tray.style.setProperty('--k', (cvW / cw).toFixed(4));
      ghostImg.src = cfg.image; finalImg.src = cfg.image;

      // 1) ortak kenarlar: HE[r][c] r. satırın üst kenarı, VE[r][c] c. sütunun sol kenarı
      var rand = mulberry32(cfg.seed || 1);
      var HE = [], VE = [], r, c;
      for (r = 0; r <= ROWS; r++) {
        HE[r] = [];
        for (c = 0; c < COLS; c++) {
          HE[r][c] = (r === 0 || r === ROWS) ? flatPoints(c * cw, r * ch, (c + 1) * cw, r * ch) : edgePoints(c * cw, r * ch, (c + 1) * cw, r * ch, edgeParams(rand));
        }
      }
      for (r = 0; r < ROWS; r++) {
        VE[r] = [];
        for (c = 0; c <= COLS; c++) {
          VE[r][c] = (c === 0 || c === COLS) ? flatPoints(c * cw, r * ch, c * cw, (r + 1) * ch) : edgePoints(c * cw, r * ch, c * cw, (r + 1) * ch, edgeParams(rand));
        }
      }

      // 2) kılavuz çizgileri (tüm kesimler, her kenar bir kez)
      var gd = '';
      for (r = 1; r < ROWS; r++) for (c = 0; c < COLS; c++) gd += 'M' + r2(HE[r][c][0][0]) + ' ' + r2(HE[r][c][0][1]) + segPath(HE[r][c]);
      for (r = 0; r < ROWS; r++) for (c = 1; c < COLS; c++) gd += 'M' + r2(VE[r][c][0][0]) + ' ' + r2(VE[r][c][0][1]) + segPath(VE[r][c]);
      gd += 'M0 0H' + W + 'V' + H + 'H0Z';
      guideSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      guideSvg.innerHTML = '<path d="' + gd + '"/>';

      // 3) her parça için canvas
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          var rev = function (a) { return a.slice().reverse(); };
          var top = HE[r][c], right = VE[r][c + 1], bottom = rev(HE[r + 1][c]), left = rev(VE[r][c]);
          var d = 'M' + r2(c * cw) + ' ' + r2(r * ch) + segPath(top) + segPath(right) + segPath(bottom) + segPath(left) + 'Z';
          var path = new Path2D(d);
          var cv = document.createElement('canvas');
          cv.width = cvW; cv.height = cvH;
          var ctx = cv.getContext('2d');
          ctx.translate(pad - c * cw, pad - r * ch);
          ctx.save(); ctx.clip(path);
          ctx.drawImage(base, 0, 0);
          // kesik kenar hissi: iç gölge + ince ışık
          ctx.lineJoin = 'round';
          ctx.lineWidth = 3.2; ctx.strokeStyle = 'rgba(38, 14, 10, .34)'; ctx.stroke(path);
          ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(255, 246, 232, .42)'; ctx.stroke(path);
          ctx.restore();
          cv.className = 'piece';
          cv.dataset.id = r * COLS + c;
          cv.setAttribute('role', 'img');
          cv.setAttribute('aria-label', 'Parça ' + (r * COLS + c + 1));
          cv.draggable = false;
          pieces.push({ id: r * COLS + c, r: r, c: c, el: cv, edge: r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1 });
        }
      }

      bind();
      startGame(true);
      section.dataset.ready = '1';
    }

    /* ---------- oyun durumu ---------- */
    function startGame(restore) {
      placed = {}; placedCount = 0; finished = false; selectedId = null;
      placedLayer.textContent = ''; tray.textContent = ''; slots = [];
      board.classList.remove('is-complete'); section.classList.remove('is-finished'); finale.classList.remove('is-in');
      pieces.forEach(function (p) { p.el.className = 'piece'; p.el.style.cssText = ''; });

      var saved = restore ? load().filter(function (i) { return i >= 0 && i < TOTAL; }) : [];
      var rest = [];
      pieces.forEach(function (p) { if (saved.indexOf(p.id) === -1) rest.push(p.id); });
      order = shuffle(rest, Math.random);
      order.forEach(function (id) { addSlot(id); });
      saved.forEach(function (id) { putOnBoard(id, true); });
      applyFilter(); updateUI();
      if (placedCount === TOTAL) finish(true);
    }

    function addSlot(id) {
      var s = document.createElement('div');
      s.className = 'slot'; s.dataset.id = id;
      s.appendChild(pieces[id].el);
      tray.appendChild(s);
      slots[id] = s;
    }

    function applyFilter() {
      slots.forEach(function (s, id) { if (s && s.parentNode) s.classList.toggle('is-hidden', edgesOnly && !pieces[id].edge); });
    }

    function putOnBoard(id, restoring) {
      var p = pieces[id], el = p.el;
      if (el.parentNode && el.parentNode !== placedLayer) { /* parçayı slottan çıkar */ }
      var s = slots[id];
      if (s && s.parentNode) { s.classList.add('is-gone'); (function (s) { setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, restoring ? 0 : 380); })(s); }
      slots[id] = null;
      el.className = 'piece' + (restoring ? ' is-restored' : '');
      el.style.cssText = 'left:' + ((p.c * cw - pad) / W * 100).toFixed(4) + '%;top:' + ((p.r * ch - pad) / H * 100).toFixed(4) + '%;width:' + (cvW / W * 100).toFixed(4) + '%';
      placedLayer.appendChild(el);
      placed[id] = true; placedCount++;
    }

    function updateUI() {
      numEl.textContent = placedCount;
      labelEl.textContent = L.progress.replace('{done}', '').replace('{total}', TOTAL).replace(/^\s+/, '');
      barEl.setAttribute('aria-valuenow', placedCount); barEl.setAttribute('aria-valuemax', TOTAL);
      barEl.setAttribute('aria-valuetext', L.progress.replace('{done}', placedCount).replace('{total}', TOTAL));
      fillEl.style.transform = 'scaleX(' + (placedCount / TOTAL) + ')';
      $('pzBadge').textContent = placedCount + ' / ' + TOTAL;
    }

    function toast(msg) {
      toastEl.textContent = msg; toastEl.classList.add('is-on');
      clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 1800);
    }

    /* ---------- geometri yardımcıları ---------- */
    function boardRect() { return board.getBoundingClientRect(); }
    function cellAt(clientX, clientY, rect) {
      var u = (clientX - rect.left) / rect.width * W, v = (clientY - rect.top) / rect.height * H;
      if (u < 0 || v < 0 || u >= W || v >= H) return null;
      return { c: Math.min(COLS - 1, Math.floor(u / cw)), r: Math.min(ROWS - 1, Math.floor(v / ch)), u: u, v: v };
    }
    function showCell(cell, bad) {
      if (!cell) { cellEl.classList.remove('is-on'); return; }
      cellEl.style.left = (cell.c * cw / W * 100) + '%'; cellEl.style.top = (cell.r * ch / H * 100) + '%';
      cellEl.style.width = (cw / W * 100) + '%'; cellEl.style.height = (ch / H * 100) + '%';
      cellEl.classList.add('is-on');
      if (bad) {
        cellEl.classList.remove('is-bad'); void cellEl.offsetWidth; cellEl.classList.add('is-bad');
        setTimeout(function () { cellEl.classList.remove('is-bad', 'is-on'); }, 650);
      }
    }
    function targetCenter(p, rect) {
      return { x: rect.left + (p.c + 0.5) * cw / W * rect.width, y: rect.top + (p.r + 0.5) * ch / H * rect.height };
    }
    function tf(x, y, s) { return 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + s + ')'; }

    function makeGhost(p, wPx) {
      var g = document.createElement('canvas');
      g.width = cvW; g.height = cvH; g.getContext('2d').drawImage(p.el, 0, 0);
      g.className = 'piece piece--ghost';
      g.style.width = wPx + 'px'; g.style.height = (wPx * cvH / cvW) + 'px';
      document.body.appendChild(g);
      return g;
    }

    function animateTo(g, from, to, ms, easing) {
      if (reduceMotion || !g.animate) { g.style.transform = to; return Promise.resolve(); }
      var a = g.animate([{ transform: from }, { transform: to }], { duration: ms, easing: easing || 'cubic-bezier(.22,.72,.18,1)', fill: 'forwards' });
      // zaman çizelgesi durursa (arka plan sekmesi vb.) parça takılı kalmasın
      return new Promise(function (res) {
        var done = false, fin = function () { if (!done) { done = true; res(); } };
        a.finished.then(fin, fin); setTimeout(fin, ms + 160);
      });
    }

    /* ---------- yerleştirme / geri dönme ---------- */
    function commit(id) {
      var p = pieces[id];
      putOnBoard(id, false);
      if (selectedId === id) selectedId = null;
      store(Object.keys(placed).map(Number));
      updateUI(); applyFilter();
      if (placedCount === TOTAL) finish(false);
    }

    function flyBack(g, p, fromT, s0, rect) {
      var slot = slots[p.id], tr = p.el.getBoundingClientRect();
      var gw = parseFloat(g.style.width), gh = parseFloat(g.style.height);
      var tx = tr.left + tr.width / 2 - gw / 2, ty = tr.top + tr.height / 2 - gh / 2;
      animateTo(g, fromT, tf(tx, ty, tr.width / gw), 420, 'cubic-bezier(.34,1.3,.5,1)').then(function () {
        if (g.parentNode) g.parentNode.removeChild(g);
        p.el.style.visibility = ''; p.el.classList.remove('is-back'); void p.el.offsetWidth; p.el.classList.add('is-back');
      });
    }

    function flyIn(g, p, fromT, rect) {
      var gw = parseFloat(g.style.width), gh = parseFloat(g.style.height), tc = targetCenter(p, rect);
      return animateTo(g, fromT, tf(tc.x - gw / 2, tc.y - gh / 2, 1), 190, 'cubic-bezier(.2,.8,.3,1)').then(function () {
        commit(p.id);
        if (g.parentNode) g.parentNode.removeChild(g);
        p.el.style.visibility = '';
      });
    }

    /* ---------- sürükleme (fare + dokunmatik) ---------- */
    function stackedLayout() { return window.matchMedia('(max-width: 960px)').matches; }

    function onDown(e) {
      var el = e.target.closest ? e.target.closest('.piece') : null;
      if (!el || !tray.contains(el) || (e.pointerType === 'mouse' && e.button !== 0) || drag || press) return;
      var id = +el.dataset.id;
      press = { id: id, el: el, x: e.clientX, y: e.clientY, pid: e.pointerId, type: e.pointerType, t: performance.now() };
      if (e.pointerType === 'mouse') e.preventDefault();
      else {
        // parmağı bir an basılı tutmak da sürüklemeyi başlatır (parça alanı kayarken bile)
        var pr = press;
        pr.timer = setTimeout(function () { if (press === pr && !drag) startDrag({ clientX: pr.x, clientY: pr.y }); }, 160);
      }
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    }

    function onMove(e) {
      if (press && e.pointerId === press.pid && !drag) {
        var dx = e.clientX - press.x, dy = e.clientY - press.y, dist = Math.hypot(dx, dy);
        if (press.type === 'touch' || press.type === 'pen') {
          if (dist < 6) return;
          var vertical = Math.abs(dy) > Math.abs(dx) * 0.8;
          var wantDrag = stackedLayout() ? vertical : !vertical;
          if (!wantDrag) { endPress(); return; }   // tarayıcı kaydırıyor
        } else if (dist < 4) return;
        startDrag(e);
      }
      if (drag && e.pointerId === drag.pid) {
        e.preventDefault();
        drag.px = e.clientX; drag.py = e.clientY;
        if (!drag.raf) drag.raf = requestAnimationFrame(frame);
      }
    }

    function startDrag(e) {
      clearTimeout(press.timer);
      var p = pieces[press.id], rect = boardRect();
      var gw = cvW * rect.width / W, gh = gw * cvH / cvW;
      var tr = p.el.getBoundingClientRect();
      var g = makeGhost(p, gw);
      var s0 = tr.width / gw;
      var lift = press.type === 'touch' ? -(gh * 0.42 + 14) : 0;
      drag = { touch: press.type !== 'mouse', id: p.id, p: p, g: g, pid: press.pid, gw: gw, gh: gh, lift: lift, px: e.clientX, py: e.clientY, raf: 0, s0: s0, last: null, cell: null };
      var from = tf(tr.left + tr.width / 2 - gw / 2, tr.top + tr.height / 2 - gh / 2, s0);
      g.style.transform = from; void g.offsetWidth;
      g.classList.add('is-lift');
      g.style.transform = tf(e.clientX - gw / 2, e.clientY + lift - gh / 2, 1);
      setTimeout(function () { if (g) g.classList.remove('is-lift'); }, 180);
      p.el.style.visibility = 'hidden';
      deselect();
      document.body.classList.add('is-dragging');
      press = null;
      scrollLoop();
    }

    function frame() {
      if (!drag) return;
      drag.raf = 0;
      var cx = drag.px, cy = drag.py + drag.lift;
      drag.g.style.transform = tf(cx - drag.gw / 2, cy - drag.gh / 2, 1);
      drag.last = { x: cx, y: cy };
      showCell(cellAt(cx, cy, boardRect()));
    }

    function scrollLoop() {
      if (!drag) return;
      var y = drag.py, vh = window.innerHeight, v = 0;
      if (y < 70) v = -Math.ceil((70 - y) / 5); else if (y > vh - 70) v = Math.ceil((y - (vh - 70)) / 5);
      if (v) { window.scrollBy(0, v); if (!drag.raf) drag.raf = requestAnimationFrame(frame); }
      requestAnimationFrame(scrollLoop);
    }

    function onUp(e) {
      if (press && e.pointerId === press.pid) {
        var wasTap = performance.now() - press.t < 600 && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 10;
        var id = press.id;
        endPress();
        if (wasTap) toggleSelect(id);
        return;
      }
      if (drag && e.pointerId === drag.pid) finishDrag(e.clientX, e.clientY);
    }

    function onCancel(e) {
      if (press && e.pointerId === press.pid) { endPress(); return; }
      if (drag && e.pointerId === drag.pid) finishDrag(null, null);
    }

    function endPress() {
      if (press) clearTimeout(press.timer);
      press = null;
      if (!drag) { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onCancel); }
    }

    function finishDrag(x, y) {
      var d = drag; if (!d) return;
      drag = null; if (d.raf) cancelAnimationFrame(d.raf);
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onCancel);
      document.body.classList.remove('is-dragging');
      cellEl.classList.remove('is-on');
      var p = d.p, rect = boardRect();
      var cx = (x === null ? (d.last ? d.last.x : d.px) : x), cy = (y === null ? (d.last ? d.last.y : d.py + d.lift) : y + d.lift);
      var cur = tf(cx - d.gw / 2, cy - d.gh / 2, 1);
      var cell = cellAt(cx, cy, rect);
      var u = (cx - rect.left) / rect.width * W, v = (cy - rect.top) / rect.height * H;
      var tol = d.touch ? 0.85 : 0.6;
      var ok = x !== null && Math.abs(u - (p.c + 0.5) * cw) < tol * cw && Math.abs(v - (p.r + 0.5) * ch) < tol * ch;
      if (ok) { flyIn(d.g, p, cur, rect); toastQuiet(); }
      else {
        if (cell && x !== null) { showCell(cell, true); toast(L.wrong); }
        flyBack(d.g, p, cur, d.s0, rect);
      }
    }
    function toastQuiet() { toastEl.classList.remove('is-on'); }

    /* ---------- dokun & yerleştir ---------- */
    function deselect() {
      if (selectedId !== null && pieces[selectedId]) pieces[selectedId].el.classList.remove('is-selected');
      selectedId = null; board.classList.remove('has-selection');
    }
    function toggleSelect(id) {
      if (selectedId === id) { deselect(); return; }
      deselect(); selectedId = id;
      pieces[id].el.classList.add('is-selected');
      board.classList.add('has-selection');
      toast(L.selectHint);
    }
    function onBoardClick(e) {
      if (selectedId === null || finished) return;
      var rect = boardRect(), cell = cellAt(e.clientX, e.clientY, rect);
      if (!cell) return;
      var p = pieces[selectedId];
      if (cell.c === p.c && cell.r === p.r) {
        var tr = p.el.getBoundingClientRect(), gw = cvW * rect.width / W, gh = gw * cvH / cvW;
        var g = makeGhost(p, gw), s0 = tr.width / gw;
        var from = tf(tr.left + tr.width / 2 - gw / 2, tr.top + tr.height / 2 - gh / 2, s0);
        g.style.transform = from; p.el.style.visibility = 'hidden';
        var id = p.id; deselect();
        flyIn(g, pieces[id], from, rect);
      } else {
        showCell(cell, true); toast(L.wrong);
      }
    }
    function onBoardMove(e) {
      if (selectedId === null || drag || e.pointerType !== 'mouse') return;
      showCell(cellAt(e.clientX, e.clientY, boardRect()));
    }

    /* ---------- bitiş ---------- */
    function after(fn, ms) { finishTimers.push(setTimeout(fn, ms)); }
    function finish(instant) {
      finished = true; deselect();
      finishTimers.forEach(clearTimeout); finishTimers = [];
      if (instant || reduceMotion) {
        board.classList.add('is-complete'); section.classList.add('is-finished'); finale.classList.add('is-in');
        document.dispatchEvent(new CustomEvent('puzzle:complete', { detail: { instant: true } }));
        return;
      }
      after(function () { board.classList.add('is-complete'); }, 650);
      after(function () {
        section.classList.add('is-finished'); finale.classList.add('is-in');
        document.dispatchEvent(new CustomEvent('puzzle:complete', { detail: { instant: false } }));
        var r = layout.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) window.scrollTo({ top: window.scrollY + r.top - 90, behavior: 'smooth' });
      }, 2300);
    }

    /* ---------- butonlar ---------- */
    function reshuffle() {
      deselect();
      var ids = [];
      slots.forEach(function (s, id) { if (s && s.parentNode) ids.push(id); });
      shuffle(ids, Math.random);
      tray.style.opacity = '.0'; tray.style.transform = 'scale(.99)';
      setTimeout(function () {
        ids.forEach(function (id) { tray.appendChild(slots[id]); });
        tray.scrollTo(0, 0);
        tray.style.opacity = ''; tray.style.transform = '';
      }, reduceMotion ? 0 : 220);
    }
    function restart() {
      finishTimers.forEach(clearTimeout); finishTimers = [];
      store(null); startGame(false);
      toastQuiet();
    }
    function bind() {
      tray.addEventListener('pointerdown', onDown);
      window.addEventListener('touchmove', function (e) { if (drag && e.cancelable) e.preventDefault(); }, { passive: false });
      tray.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      tray.addEventListener('dragstart', function (e) { e.preventDefault(); });
      board.addEventListener('click', onBoardClick);
      board.addEventListener('pointermove', onBoardMove);
      board.addEventListener('pointerleave', function () { if (!drag) cellEl.classList.remove('is-on'); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') deselect(); });

      var guideBtn = $('pzGuide'), prevBtn = $('pzPreview'), shBtn = $('pzShuffle'), reBtn = $('pzRestart');
      guideBtn.textContent = L.guide; prevBtn.textContent = L.preview; shBtn.textContent = L.shuffle; reBtn.textContent = L.restart;
      $('pzLabel').textContent = '';
      guideBtn.addEventListener('click', function () {
        var on = guideBtn.getAttribute('aria-pressed') !== 'true';
        guideBtn.setAttribute('aria-pressed', on); board.classList.toggle('no-guide', !on);
      });
      prevBtn.addEventListener('click', function () {
        var on = prevBtn.getAttribute('aria-pressed') !== 'true';
        prevBtn.setAttribute('aria-pressed', on); board.classList.toggle('is-preview', on);
      });
      shBtn.addEventListener('click', reshuffle);
      reBtn.addEventListener('click', function () {
        if (reBtn.classList.contains('is-confirm') || placedCount === 0) {
          clearTimeout(restartTimer); reBtn.classList.remove('is-confirm'); reBtn.textContent = L.restart; restart();
        } else {
          reBtn.classList.add('is-confirm'); reBtn.textContent = L.restartConfirm;
          restartTimer = setTimeout(function () { reBtn.classList.remove('is-confirm'); reBtn.textContent = L.restart; }, 3200);
        }
      });
      $('pzReplay').addEventListener('click', function () {
        restart();
        var r = layout.getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + r.top - 120, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
      var allBtn = $('pzAll'), edgeBtn = $('pzEdges');
      function setFilter(only) { edgesOnly = only; allBtn.classList.toggle('is-on', !only); edgeBtn.classList.toggle('is-on', only); applyFilter(); tray.scrollTo(0, 0); }
      allBtn.addEventListener('click', function () { setFilter(false); });
      edgeBtn.addEventListener('click', function () { setFilter(true); });
    }

    // test / hata ayıklama için küçük arayüz
    return {
      pieces: pieces,
      get placedCount() { return placedCount; },
      get total() { return TOTAL; },
      get dims() { return { W: W, H: H, cw: cw, ch: ch, pad: pad, cvW: cvW, cvH: cvH }; },
      select: toggleSelect
    };
  }

  window.Puzzle = { init: init };
})();
