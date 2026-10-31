/* =====================================================================
   GÖRSEL EFEKTLER
   Hafif, sadece gerektiğinde çalışan efektler: ortam parçacıkları,
   kıvılcım/kalp patlamaları, imleç ışığı, 3B eğilme, bölüm noktaları.
   `prefers-reduced-motion` açıksa neredeyse hepsi kapanır.
   Metinleri değiştirmek için js/config.js'e bak.
   ===================================================================== */
(function () {
  'use strict';

  var CFG = window.SITE;
  var $ = function (id) { return document.getElementById(id); };
  var qsa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  function heartPath(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.35);
    ctx.bezierCurveTo(-s, -s * 0.3, -s * 0.5, -s, 0, -s * 0.45);
    ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.3, 0, s * 0.35);
    ctx.closePath();
  }

  /* ---------- kıvılcım / kalp patlaması (tek paylaşılan tuval) ---------- */
  var FX = (function () {
    var cv = $('fx'), ctx = cv.getContext('2d'), items = [], running = false, last = 0, dpr = 1, W = 0, H = 0;
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function add(p) {
      if (reduce) return;
      if (!running) { resize(); running = true; last = performance.now(); requestAnimationFrame(loop); }
      items.push(p);
    }
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, W, H);
      for (var i = items.length - 1; i >= 0; i--) {
        var p = items[i]; p.t += dt;
        if (p.t < 0) continue;
        if (p.t >= p.life) { items.splice(i, 1); continue; }
        var k = p.t / p.life, a = (1 - k) * (1 - k);
        ctx.save(); ctx.translate(p.x, p.y);
        if (p.type === 'ring') {
          ctx.globalAlpha = a * 0.7; ctx.strokeStyle = p.color; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(0, 0, p.r0 + (p.r1 - p.r0) * (1 - Math.pow(1 - k, 3)), 0, 6.283); ctx.stroke();
        } else {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.type === 'spark') { p.vx *= 0.96; p.vy = p.vy * 0.96 + 40 * dt; }
          else { p.vx += Math.sin(p.t * 4 + p.ph) * 40 * dt; }
          ctx.globalAlpha = (p.type === 'heart' ? Math.min(1, k * 8) * (1 - k) : a) * p.alpha; ctx.fillStyle = p.color;
          if (p.type === 'heart') { ctx.rotate(Math.sin(p.t * 3 + p.ph) * 0.35); heartPath(ctx, p.size); ctx.fill(); }
          else { ctx.rotate(p.rot + p.t * 4); var s = p.size * (1 - k * 0.5); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.rotate(0.785); ctx.fillRect(-s / 2, -s / 2, s, s); }
        }
        ctx.restore();
      }
      if (items.length) requestAnimationFrame(loop); else { running = false; ctx.clearRect(0, 0, W, H); }
    }
    window.addEventListener('resize', function () { if (running) resize(); });
    return {
      sparkle: function (x, y, n) {
        var cols = ['#f6dfae', '#fff6e2', '#e9a3ac', '#f1c9a5'];
        add({ type: 'ring', x: x, y: y, t: 0, life: 0.9, r0: 8, r1: 54, color: '#e9b7a8' });
        for (var i = 0; i < (n || 14); i++) {
          var an = rand(0, 6.283), sp = rand(60, 210);
          add({ type: 'spark', x: x, y: y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, t: 0, life: rand(0.6, 1.1), size: rand(2, 4.5), rot: rand(0, 3), color: cols[i % cols.length], alpha: 1 });
        }
      },
      hearts: function (x, y, n) {
        var cols = ['#7b2233', '#a24556', '#d98a8f', '#e8b6ae'];
        for (var i = 0; i < (n || 6); i++) {
          add({ type: 'heart', x: x + rand(-14, 14), y: y, vx: rand(-34, 34), vy: -rand(70, 160), t: -i * 0.05 + 0, life: rand(1.4, 2.2), size: rand(6, 12), ph: rand(0, 6), color: cols[i % cols.length], alpha: rand(0.55, 0.9) });
        }
      }
    };
  })();
  window.FX = FX;

  /* ---------- ortam parçacıkları (sadece görünürken çalışır) ---------- */
  function ambient(canvas, kind) {
    if (!canvas || reduce) { if (canvas) canvas.remove(); return; }
    var ctx = canvas.getContext('2d'), parent = canvas.parentNode, parts = [], bokeh = [], vis = false, raf = 0, W = 0, H = 0, last = 0, hearts = [], nextHeart = 1.5;
    function size() {
      var dpr = Math.min(window.innerWidth < 700 ? 1.5 : 2, window.devicePixelRatio || 1);
      W = parent.clientWidth; H = parent.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var small = W < 700, n = kind === 'dust' ? (small ? 28 : 60) : (small ? 55 : 120);
      parts = []; for (var i = 0; i < n; i++) parts.push(make(true));
      bokeh = []; if (kind === 'dust') for (var j = 0; j < (small ? 4 : 8); j++) bokeh.push({ x: rand(0, W), y: rand(0, H), r: rand(50, 130), vx: rand(-6, 6), vy: rand(-5, 5), a: rand(0.1, 0.22) });
    }
    function make(anywhere) {
      return kind === 'dust'
        ? { x: rand(0, W), y: anywhere ? rand(0, H) : H + 10, r: rand(0.8, 2.6), vy: -rand(5, 20), ph: rand(0, 6), sw: rand(6, 22), a: rand(0.18, 0.6), c: Math.random() < 0.5 ? '150,50,60' : '214,150,140' }
        : { x: rand(0, W), y: rand(0, H), r: rand(0.4, 1.6), ph: rand(0, 6), sp: rand(0.6, 2.2), c: Math.random() < 0.8 ? '246,227,196' : '233,163,172' };
    }
    function loop(now) {
      if (!vis) { raf = 0; return; }
      var dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now;
      ctx.clearRect(0, 0, W, H);
      bokeh.forEach(function (b) {
        b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < -b.r) b.x = W + b.r; if (b.x > W + b.r) b.x = -b.r; if (b.y < -b.r) b.y = H + b.r; if (b.y > H + b.r) b.y = -b.r;
        var g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r); g.addColorStop(0, 'rgba(232,170,160,' + b.a + ')'); g.addColorStop(1, 'rgba(232,170,160,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill();
      });
      parts.forEach(function (p, i) {
        if (kind === 'dust') {
          p.y += p.vy * dt; p.x += Math.sin(t * 0.6 + p.ph) * p.sw * dt;
          if (p.y < -10) parts[i] = make(false);
          ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')';
        } else {
          ctx.fillStyle = 'rgba(' + p.c + ',' + (0.25 + 0.75 * Math.abs(Math.sin(t * p.sp + p.ph))) * 0.85 + ')';
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      });
      if (kind === 'stars') {
        nextHeart -= dt; if (nextHeart <= 0) { nextHeart = rand(2.2, 4.5); hearts.push({ x: rand(W * 0.1, W * 0.9), y: H + 10, vy: -rand(22, 46), ph: rand(0, 6), s: rand(5, 10) }); }
        for (var i = hearts.length - 1; i >= 0; i--) {
          var h = hearts[i]; h.y += h.vy * dt; h.x += Math.sin(t + h.ph) * 14 * dt;
          if (h.y < -20) { hearts.splice(i, 1); continue; }
          ctx.save(); ctx.translate(h.x, h.y); ctx.globalAlpha = Math.min(0.4, (H - h.y) / 120) * Math.min(1, h.y / 120 + 0.2); ctx.fillStyle = '#d98a8f'; heartPath(ctx, h.s); ctx.fill(); ctx.restore();
        }
      }
      raf = requestAnimationFrame(loop);
    }
    size();
    new IntersectionObserver(function (es) {
      vis = es[0].isIntersecting;
      if (vis && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    }, { threshold: 0 }).observe(parent);
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 200); });
  }
  ambient($('ambientHero'), 'dust');
  ambient($('ambientClosing'), 'stars');

  /* ---------- imleç ışığı (sadece fare olan cihazlarda) ---------- */
  if (finePointer && !reduce) {
    var glow = $('glow'), gx = -200, gy = -200, tx = gx, ty = gy, graf = 0;
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY; glow.classList.add('is-on');
      if (!graf) graf = requestAnimationFrame(tick);
    }, { passive: true });
    document.addEventListener('mouseleave', function () { glow.classList.remove('is-on'); });
    var tick = function () {
      gx += (tx - gx) * 0.14; gy += (ty - gy) * 0.14;
      glow.style.transform = 'translate3d(' + (gx - 160) + 'px,' + (gy - 160) + 'px,0)';
      graf = (Math.abs(tx - gx) + Math.abs(ty - gy) > 0.5) ? requestAnimationFrame(tick) : 0;
    };
  } else { $('glow').remove(); }

  /* ---------- 3B eğilme: hero fotoğrafı ve galeri ---------- */
  if (finePointer && !reduce) {
    var hero = $('hero'), arch = document.querySelector('.hero__arch');
    if (arch) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        arch.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg'); arch.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
      });
      hero.addEventListener('pointerleave', function () { arch.style.setProperty('--ry', '0deg'); arch.style.setProperty('--rx', '0deg'); });
    }
    var grid = $('galleryGrid');
    grid.addEventListener('pointermove', function (e) {
      var f = e.target.closest ? e.target.closest('.shot__frame') : null; if (!f) return;
      var r = f.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      f.style.transform = 'perspective(900px) rotateY(' + ((x - 0.5) * 8).toFixed(2) + 'deg) rotateX(' + ((0.5 - y) * 8).toFixed(2) + 'deg) scale(1.015)';
      f.style.setProperty('--gx', (x * 100).toFixed(0) + '%'); f.style.setProperty('--gy', (y * 100).toFixed(0) + '%');
    });
    grid.addEventListener('pointerout', function (e) { var f = e.target.closest ? e.target.closest('.shot__frame') : null; if (f && !f.contains(e.relatedTarget)) f.style.transform = ''; });
  }

  /* ---------- bölüm noktaları + süs çizgileri + filigran rakamlar ---------- */
  (function () {
    var nav = $('dots'), items = (CFG.nav || []).filter(function (n) { return $(n.id); }), btns = {};
    items.forEach(function (n) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'dots__b'; b.setAttribute('aria-label', n.label);
      var s = document.createElement('span'); s.textContent = n.label; b.appendChild(s);
      b.addEventListener('click', function () { $(n.id).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); });
      nav.appendChild(b); btns[n.id] = b;
    });
    var cur = '';
    function setActive(id) {
      if (id === cur) return; cur = id;
      Object.keys(btns).forEach(function (k) { btns[k].classList.toggle('is-on', k === id); });
      nav.classList.toggle('on-dark', id === 'closing');
      nav.classList.toggle('is-show', id !== 'hero' || window.scrollY > window.innerHeight * 0.5);
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
    }, { threshold: 0.35 });
    items.forEach(function (n) { io.observe($(n.id)); });
    window.addEventListener('scroll', function () { nav.classList.toggle('is-show', window.scrollY > window.innerHeight * 0.4); }, { passive: true });

    // filigran rakamlar
    [['letter', 'letter'], ['puzzle', 'puzzle'], ['gallery', 'gallery'], ['closing', 'closing']].forEach(function (p) {
      var sec = $(p[0]); if (sec && CFG[p[1]] && CFG[p[1]].sectionNumber) sec.setAttribute('data-num', CFG[p[1]].sectionNumber);
    });
    // bölümler arası süs: çizilen kalp
    ['letter', 'puzzle', 'gallery'].forEach(function (id) {
      var sec = $(id); if (!sec) return;
      var d = document.createElement('div'); d.className = 'orn reveal'; d.setAttribute('aria-hidden', 'true');
      d.innerHTML = '<svg viewBox="0 0 120 24"><path class="orn__l" d="M0 12H46"/><path class="orn__h" d="M60 19C52 13 48 9.5 48 6.5C48 4 50 2.5 52.3 2.5C55.5 2.5 58 5 60 7.5C62 5 64.5 2.5 67.7 2.5C70 2.5 72 4 72 6.5C72 9.5 68 13 60 19Z"/><path class="orn__l" d="M74 12H120"/></svg>';
      sec.insertBefore(d, sec.firstChild);
      new IntersectionObserver(function (es, o) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); o.disconnect(); } }); }, { threshold: 0.5 }).observe(d);
    });
  })();

  /* ---------- dokunma/tıklama: küçük kalpler (yapboz ve lightbox hariç) ---------- */
  if (!reduce) {
    document.addEventListener('click', function (e) {
      if (!e.isTrusted || e.target.closest('#puzzle, .lightbox, .music, .dots, input, a[href^="#"]')) return;
      FX.hearts(e.clientX, e.clientY, 4);
    });
  }

  /* ---------- yapboz: parça yerleşince kıvılcım ---------- */
  document.addEventListener('puzzle:placed', function (e) { FX.sparkle(e.detail.x, e.detail.y, e.detail.last ? 30 : 14); });
})();
