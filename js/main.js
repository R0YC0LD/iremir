/* =====================================================================
   ANA SCRIPT
   Yazıları js/config.js dosyasından okuyup sayfaya yerleştirir; müzik,
   mektup, galeri, lightbox ve animasyonları yönetir.
   Metin değiştirmek için bu dosyaya değil config.js'e bak.
   ===================================================================== */
(function () {
  'use strict';

  var CFG = window.SITE;
  var $ = function (id) { return document.getElementById(id); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;

  /* ---------- küçük yardımcılar ---------- */
  function get(path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, CFG); }
  function fill(s) { return String(s == null ? '' : s).replace(/\{to\}/g, CFG.names.to).replace(/\{from\}/g, CFG.names.from); }
  // "*vurgu*" -> <em>vurgu</em>  (güvenli: innerHTML kullanılmaz)
  function setRich(el, text) {
    el.textContent = '';
    fill(text).split(/(\*[^*]+\*)/).forEach(function (part) {
      if (!part) return;
      if (part.charAt(0) === '*' && part.charAt(part.length - 1) === '*') { var em = document.createElement('em'); em.textContent = part.slice(1, -1); el.appendChild(em); }
      else el.appendChild(document.createTextNode(part));
    });
  }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /* ---------- 0) genel yazılar ---------- */
  document.title = CFG.meta.pageTitle;
  document.documentElement.lang = CFG.meta.language || 'tr';
  var md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute('content', CFG.meta.description);
  qsa('[data-c]').forEach(function (n) { var v = get(n.getAttribute('data-c')); if (v != null) setRich(n, v); });

  /* ---------- 1) hero ---------- */
  (function () {
    var h = CFG.hero, t = $('heroTitle');
    t.setAttribute('aria-label', fill(h.titleLines.join(' ')).replace(/\*/g, ''));
    h.titleLines.forEach(function (line, i) {
      var wrap = el('span', 'line'), inner = el('span'); wrap.style.setProperty('--i', i);
      setRich(inner, line); wrap.appendChild(inner); wrap.setAttribute('aria-hidden', 'true'); t.appendChild(wrap);
    });
    var fig = $('heroPhoto');
    if (h.photo) { var im = $('heroImg'); im.src = h.photo; im.alt = h.photoAlt || ''; }
    else { fig.remove(); document.querySelector('.hero__inner').style.gridTemplateColumns = '1fr'; }
  })();

  /* ---------- açılış (kapı + sinematik giriş) ---------- */
  var readyDone = false;
  function goReady() {
    if (readyDone) return; readyDone = true;
    body.classList.remove('is-loading'); body.classList.add('is-ready');
  }
  var fontsReady = Promise.race([
    document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
    new Promise(function (r) { setTimeout(r, 1800); })
  ]);

  /* sinematik açılış perdesi */
  function initials() {
    var f = (CFG.names.from || '').trim().charAt(0).toLocaleUpperCase('tr'), t = (CFG.names.to || '').trim().charAt(0).toLocaleUpperCase('tr');
    return f && t ? f + ' & ' + t : (f || t || '♥');
  }
  function runIntro() {
    var cur = $('curtain'), I = CFG.intro || {};
    if (!I.enabled || reduceMotion) { cur.remove(); body.classList.remove('is-locked'); requestAnimationFrame(goReady); return; }
    $('curtainMono').textContent = I.monogram || initials(); $('curtainCap').textContent = I.caption || '';
    cur.classList.add('is-go');
    var dur = Math.max(1600, I.durationMs || 2800);
    setTimeout(function () { cur.classList.add('is-lift'); body.classList.remove('is-locked'); }, dur);
    setTimeout(goReady, dur + 450);
    setTimeout(function () { cur.remove(); }, dur + 2200);
  }

  var gate = $('gate');
  function openGate() {
    gate.hidden = false; body.classList.add('is-locked');
    $('gateMusic').focus({ preventScroll: true });
  }
  function closeGate(withMusic) {
    if (withMusic) music.play();
    gate.classList.add('is-leaving');
    setTimeout(function () { goReady(); }, reduceMotion ? 0 : 450);
    setTimeout(function () { gate.hidden = true; body.classList.remove('is-locked'); }, reduceMotion ? 50 : 1250);
  }

  /* ---------- 3) müzik ---------- */
  var music = (function () {
    var m = CFG.music, root = $('music'), btn = $('musicBtn'), vol = $('musicVol');
    var audio = new Audio(); audio.loop = true; audio.preload = 'none'; audio.src = m.file;
    var target = Math.min(1, Math.max(0, m.volume == null ? 0.5 : m.volume)), playing = false, fadeRaf = 0;
    $('musicTitle').textContent = m.title; $('musicArtist').textContent = m.artist;
    vol.value = target; vol.setAttribute('aria-label', m.labelVolume);
    audio.volume = 0;

    function paint() {
      root.classList.toggle('is-playing', playing);
      btn.setAttribute('aria-pressed', playing);
      btn.setAttribute('aria-label', (playing ? m.labelOn : m.labelOff) + ' — ' + m.title);
    }
    function fade(to, ms, done) {
      cancelAnimationFrame(fadeRaf);
      var from = audio.volume, t0 = performance.now();
      if (reduceMotion || ms === 0) { audio.volume = to; if (done) done(); return; }
      (function step(now) {
        var k = Math.min(1, (now - t0) / ms); audio.volume = Math.max(0, Math.min(1, from + (to - from) * k));
        if (k < 1) fadeRaf = requestAnimationFrame(step); else if (done) done();
      })(t0);
    }
    var pending = false;
    function play() {
      if (playing) return Promise.resolve(true);
      if (pending) return Promise.resolve(false);
      pending = true;
      var ok = function () { pending = false; playing = true; paint(); fade(target, 2200); return true; };
      var no = function () { pending = false; playing = false; paint(); return false; };
      var p; try { p = audio.play(); } catch (e) { return Promise.resolve(no()); }
      return p && p.then ? p.then(ok, no) : Promise.resolve(ok());
    }
    function pause() { playing = false; paint(); fade(0, 600, function () { audio.pause(); }); }
    var armed = false, evs = ['wheel', 'touchmove', 'touchend', 'pointerdown', 'keydown', 'click', 'scroll'];
    function onFirst() {
      if (!armed) return;
      play().then(function (ok) { if (ok) disarm(); });
    }
    function disarm() { armed = false; evs.forEach(function (n) { window.removeEventListener(n, onFirst, true); }); }
    function arm() { if (armed) return; armed = true; evs.forEach(function (n) { window.addEventListener(n, onFirst, { capture: true, passive: true }); }); }
    btn.addEventListener('click', function (e) { disarm(); e.stopPropagation(); playing ? pause() : play(); });
    function hint() {
      if (playing) return;
      root.classList.add('is-hint'); $('musicArtist').textContent = m.hint || '';
      setTimeout(function () { root.classList.remove('is-hint'); $('musicArtist').textContent = m.artist; }, 7000);
    }
    vol.addEventListener('input', function () { target = +vol.value; cancelAnimationFrame(fadeRaf); audio.volume = target; });
    audio.addEventListener('error', function () { root.hidden = true; });
    paint();
    return { play: play, pause: pause, arm: arm, hint: hint };
  })();

  if (CFG.gate && CFG.gate.enabled) {
    fontsReady.then(openGate);
    $('gateMusic').addEventListener('click', function () { closeGate(true); });
    $('gateSilent').addEventListener('click', function () { closeGate(false); });
  } else {
    fontsReady.then(runIntro);
    if (CFG.music.startOnFirstInteraction !== false) {
      music.arm();
      setTimeout(music.hint, 3500);
    }
  }

  /* ---------- 2) mektup ---------- */
  (function () {
    var l = CFG.letter, envelope = $('envelope'), envWrap = $('envWrap'), paperWrap = $('paperWrap'), paper = $('paper');
    var seal = (l.sealLetter || CFG.names.from || '♥').trim().charAt(0).toUpperCase();
    $('sealLetter').textContent = seal;
    $('letterGreeting').textContent = fill(l.greeting);
    $('letterClosing').textContent = fill(l.closing);
    $('letterSig').textContent = fill(l.signature);
    var skip = $('letterSkip'); skip.textContent = l.skipLabel;

    var words = [];
    var bodyEl = $('letterBody');
    l.paragraphs.forEach(function (txt) {
      var p = el('p');
      fill(txt).split(/\s+/).forEach(function (w, i, a) {
        if (!w) return;
        var s = el('span', 'w', w + (i < a.length - 1 ? ' ' : '')); p.appendChild(s); words.push(s);
      });
      bodyEl.appendChild(p);
    });

    var typing = false, timer = 0;
    var section = $('letter');
    $('letterNextText').textContent = l.nextCue || '';
    function done() { paper.classList.add('is-done'); section.classList.add('is-read'); }
    function showAll() { cancelAnimationFrame(timer); typing = false; words.forEach(function (w) { w.classList.add('on'); }); done(); }
    function type() {
      if (!l.typewriter || reduceMotion) { paper.classList.add('is-static'); section.classList.add('is-read'); return; }
      typing = true; var i = 0, last = performance.now(), delay = Math.max(8, l.wordDelayMs || 40);
      (function step(now) {
        if (!typing) return;
        var n = Math.floor((now - last) / delay);
        if (n > 0) { for (var k = 0; k < n && i < words.length; k++) words[i++].classList.add('on'); last += n * delay; }
        if (i >= words.length) { typing = false; done(); return; }
        timer = requestAnimationFrame(step);
      })(last);
    }
    skip.addEventListener('click', showAll);

    envelope.addEventListener('click', function () {
      if (envelope.classList.contains('is-open')) return;
      envelope.classList.add('is-open'); envelope.setAttribute('aria-expanded', 'true');
      var sr = $('envelope').querySelector('.envelope__seal').getBoundingClientRect();
      if (window.FX) window.FX.hearts(sr.left + sr.width / 2, sr.top + sr.height / 2, 9);
      var q = reduceMotion ? 0 : 1;
      setTimeout(function () { envWrap.classList.add('is-gone'); }, 950 * q);
      setTimeout(function () { paperWrap.classList.add('is-open'); }, 1150 * q);
      setTimeout(function () {
        var r = paperWrap.getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + r.top - 40, behavior: reduceMotion ? 'auto' : 'smooth' });
      }, 1500 * q);
      setTimeout(type, 2100 * q);
    });
  })();

  /* ---------- 4) galeri + lightbox ---------- */
  (function () {
    var g = CFG.gallery, grid = $('galleryGrid'), shots = [];
    g.photos.forEach(function (ph, i) {
      var fig = el('figure', 'shot reveal'); fig.tabIndex = 0; fig.setAttribute('role', 'button');
      fig.setAttribute('aria-label', (ph.alt || 'Fotoğraf') + ' — büyüt');
      fig.style.setProperty('--d', (i % 2) * 0.12 + 's'); fig.style.setProperty('--span', 6);
      var frame = el('div', 'shot__frame'), im = new Image();
      im.alt = ph.alt || ''; im.decoding = 'async'; im.loading = i < 2 ? 'eager' : 'lazy'; im.src = ph.src;
      im.addEventListener('load', function () {
        var r = im.naturalWidth / im.naturalHeight;
        var cls = r < 0.9 ? 'is-portrait' : r > 1.9 ? 'is-wide' : r > 1.2 ? 'is-landscape' : '';
        if (cls) fig.classList.add(cls);
        fig.style.setProperty('--span', r < 0.9 ? 5 : r > 1.9 ? 9 : r > 1.2 ? 7 : 6);
      });
      frame.appendChild(im); fig.appendChild(frame);
      var meta = el('div', 'shot__meta');
      meta.appendChild(el('span', 'shot__no', 'N° ' + pad2(i + 1)));
      if (ph.date) meta.appendChild(el('span', 'shot__date', ph.date));
      if (ph.caption) meta.appendChild(el('p', 'shot__cap', ph.caption));
      fig.appendChild(meta);
      fig.addEventListener('click', function () { open(i); });
      fig.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
      grid.appendChild(fig); shots.push(fig);
    });

    var lb = $('lightbox'), lbImg = $('lbImg'), idx = 0, lastFocus = null, isOpen = false, tx = null;
    function render(first) {
      var ph = g.photos[idx];
      var apply = function () {
        lbImg.src = ph.src; lbImg.alt = ph.alt || '';
        $('lbCount').textContent = pad2(idx + 1) + ' / ' + pad2(g.photos.length);
        $('lbCap').textContent = ph.caption || ''; $('lbDate').textContent = ph.date || '';
        lbImg.classList.remove('is-swap');
      };
      if (first || reduceMotion) apply();
      else { lbImg.classList.add('is-swap'); setTimeout(apply, 220); }
      [idx + 1, idx - 1].forEach(function (n) { var p = g.photos[(n + g.photos.length) % g.photos.length]; if (p) (new Image()).src = p.src; });
    }
    function open(i) {
      idx = i; isOpen = true; lastFocus = document.activeElement;
      lb.classList.toggle('is-single', g.photos.length < 2);
      lb.hidden = false; render(true); body.classList.add('is-locked');
      requestAnimationFrame(function () { requestAnimationFrame(function () { lb.classList.add('is-open'); }); });
      lb.querySelector('.lb-close').focus({ preventScroll: true });
    }
    function close() {
      if (!isOpen) return; isOpen = false; lb.classList.remove('is-open'); body.classList.remove('is-locked');
      setTimeout(function () { if (!isOpen) lb.hidden = true; }, reduceMotion ? 0 : 520);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    function step(d) { if (g.photos.length < 2) return; idx = (idx + d + g.photos.length) % g.photos.length; render(false); }
    qsa('[data-close]', lb).forEach(function (n) { n.addEventListener('click', close); });
    $('lbPrev').addEventListener('click', function () { step(-1); });
    $('lbNext').addEventListener('click', function () { step(1); });
    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Tab') {
        var f = qsa('button', lb).filter(function (b) { return b.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var fig = $('lbFig');
    fig.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    fig.addEventListener('touchend', function (e) {
      if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    }, { passive: true });
    // görselin etrafındaki boşluğa tıklayınca da kapansın
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  })();

  /* ---------- 5) kapanış ---------- */
  (function () {
    var c = CFG.closing, box = $('closingLines');
    c.lines.forEach(function (ln) { var s = el('span'); setRich(s, ln); box.appendChild(s); });
    $('closingName').textContent = fill(c.signature);
    var d = $('closingDate'); if (c.date) d.textContent = c.date; else d.remove();
  })();

  /* ---------- yapboz ---------- */
  setRich($('puzzleTitle'), CFG.puzzle.title);
  setRich($('galleryTitle'), CFG.gallery.title);
  window.__jigsaw = window.Puzzle.init(CFG.puzzle);

  /* ---------- scroll: reveal, çizgi, parallax ---------- */
  (function () {
    var els = qsa('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      els.forEach(function (n) { io.observe(n); });
    } else els.forEach(function (n) { n.classList.add('is-in'); });

    var line = document.querySelector('.scroll-line span'), par = qsa('[data-parallax]'), ticking = false;
    function update() {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      line.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
      if (reduceMotion) return;
      var vh = window.innerHeight;
      par.forEach(function (n) {
        var r = n.parentNode.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        n.style.transform = 'translate3d(0,' + ((r.top + r.height / 2 - vh / 2) * -parseFloat(n.getAttribute('data-parallax'))).toFixed(1) + 'px,0)';
      });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  /* ---------- tamamlanma: hafif yaprak yağmuru ---------- */
  (function () {
    var cv = $('petals'), ctx = cv.getContext('2d'), raf = 0;
    document.addEventListener('puzzle:complete', function (e) {
      if (reduceMotion || (e.detail && e.detail.instant)) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1), w = window.innerWidth, h = window.innerHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var colors = ['#7b2233', '#a24556', '#d8b7a9', '#efe3d2', '#5a1622'], N = w < 600 ? 34 : 60, ps = [], t0 = performance.now();
      for (var i = 0; i < N; i++) ps.push({
        x: Math.random() * w, y: -30 - Math.random() * h * 0.6, s: 6 + Math.random() * 9, vy: 55 + Math.random() * 70,
        sw: 18 + Math.random() * 40, ph: Math.random() * 6.28, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 2.4,
        c: colors[i % colors.length], a: 0.55 + Math.random() * 0.4, delay: Math.random() * 2200
      });
      cancelAnimationFrame(raf);
      (function frame(now) {
        var t = now - t0, alive = false; ctx.clearRect(0, 0, w, h);
        ps.forEach(function (p) {
          if (t < p.delay) { alive = true; return; }
          var k = (t - p.delay) / 1000, y = p.y + p.vy * k; if (y > h + 30) return; alive = true;
          var x = p.x + Math.sin(k * 1.4 + p.ph) * p.sw;
          ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + p.vr * k); ctx.globalAlpha = p.a * Math.min(1, k * 2);
          ctx.fillStyle = p.c; ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(k * 2 + p.ph)));
          ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.bezierCurveTo(p.s * 0.9, -p.s * 0.5, p.s * 0.7, p.s * 0.6, 0, p.s); ctx.bezierCurveTo(-p.s * 0.7, p.s * 0.6, -p.s * 0.9, -p.s * 0.5, 0, -p.s); ctx.fill(); ctx.restore();
        });
        if (alive && t < 11000) raf = requestAnimationFrame(frame); else ctx.clearRect(0, 0, w, h);
      })(t0);
    });
  })();
})();
