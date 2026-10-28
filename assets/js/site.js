(function () {
  'use strict';

  var doc = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  doc.classList.add('js');

  function clock() {
    var t = new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
    document.querySelectorAll('[data-clock]').forEach(function (el) { el.textContent = t; });
  }
  clock();
  setInterval(clock, 15000);

  var bar = document.getElementById('progress');
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav__links a'));
  var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  function onScroll() {
    var max = doc.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
    var cur = 0;
    sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < innerHeight * .4) cur = i; });
    links.forEach(function (a, i) { a.classList.toggle('is-on', i === cur); });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var items = document.querySelectorAll('.sec__head, .about > *, .svc__name, .works li, .steps li, .contact__big, .links li');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      io.observe(el);
    });
  }

  var svc = document.querySelectorAll('.svc__item');
  svc.forEach(function (li) {
    var open = function () { svc.forEach(function (x) { x.classList.toggle('is-on', x === li); }); };
    li.querySelector('.svc__name').addEventListener('click', open);
    li.addEventListener('mouseenter', function () { if (matchMedia('(hover: hover) and (min-width: 981px)').matches) open(); });
  });

  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var done = function () {
        btn.textContent = 'скопировано';
        btn.classList.add('is-done');
        setTimeout(function () { btn.textContent = 'копировать'; btn.classList.remove('is-done'); }, 1600);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(btn.dataset.copy).then(done, function () {});
    });
  });

  var hands = document.querySelector('.hands');
  if (hands && !reduced) {
    var hx = 0, hy = 0, gx = 0, gy = 0, raf = 0;
    var step = function () {
      hx += (gx - hx) * .06;
      hy += (gy - hy) * .06;
      hands.style.setProperty('--mx', hx.toFixed(3));
      hands.style.setProperty('--my', hy.toFixed(3));
      raf = Math.abs(gx - hx) + Math.abs(gy - hy) > .001 ? requestAnimationFrame(step) : 0;
    };
    addEventListener('pointermove', function (e) {
      gx = e.clientX / innerWidth * 2 - 1;
      gy = e.clientY / innerHeight * 2 - 1;
      if (!raf) raf = requestAnimationFrame(step);
    }, { passive: true });
  }

  var seasonBtn = document.querySelector('.season');
  var snow = document.getElementById('snow');
  var winter = function () { return doc.dataset.season === 'winter'; };
  var startSnow = initSnow(snow);
  function setSeason(on) {
    if (on) doc.dataset.season = 'winter'; else delete doc.dataset.season;
    seasonBtn.setAttribute('aria-pressed', String(on));
    try { localStorage.setItem('zipka-season', on ? 'on' : 'off'); } catch (e) {}
    if (on && startSnow) startSnow();
  }
  if (seasonBtn) {
    seasonBtn.setAttribute('aria-pressed', String(winter()));
    seasonBtn.addEventListener('click', function () { setSeason(!winter()); });
  }
  if (winter() && startSnow) startSnow();

  function initSnow(cv) {
    if (!cv || reduced) return null;
    var ctx = cv.getContext('2d');
    var hero = document.querySelector('.hero');
    var W = 0, H = 0, dpr = 1, flakes = [], drift = [], running = false, wind = 0, lastX = null;
    var COL = 3;

    function makeFlake(size, ink) {
      var r = size / 2, pad = 6;
      var c = document.createElement('canvas');
      c.width = c.height = Math.ceil((size + pad * 2) * dpr);
      var g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.translate(r + pad, r + pad);
      g.strokeStyle = g.fillStyle = ink;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.shadowColor = ink;
      g.shadowBlur = size > 24 ? 4 : 2;
      var w = Math.max(.8, size / 26);
      var n = 2 + ((Math.random() * 3) | 0);
      var branches = [];
      for (var i = 0; i < n; i++) {
        branches.push({
          at: .28 + (i + Math.random() * .6) / n * .62,
          len: (.18 + Math.random() * .3) * (1 - i / (n + 1)),
          ang: Math.PI / 3 * (.8 + Math.random() * .35),
          twig: Math.random() < .45,
        });
      }
      var tip = Math.random(), plate = Math.random() < .55, ring = Math.random() < .4;
      for (var a = 0; a < 6; a++) {
        g.save();
        g.rotate(a * Math.PI / 3);
        g.lineWidth = w * 1.25;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -r); g.stroke();
        g.lineWidth = w;
        branches.forEach(function (b) {
          var y = -r * b.at, l = r * b.len;
          [-1, 1].forEach(function (s) {
            var ex = Math.sin(b.ang) * l * s, ey = y - Math.cos(b.ang) * l;
            g.beginPath(); g.moveTo(0, y); g.lineTo(ex, ey); g.stroke();
            if (b.twig) {
              var mx = ex * .55, my = y + (ey - y) * .55;
              g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + s * l * .05, my - l * .32); g.stroke();
            }
          });
        });
        if (tip < .35) {
          g.beginPath(); g.arc(0, -r, w * 1.4, 0, Math.PI * 2); g.fill();
        } else if (tip < .7) {
          g.beginPath();
          g.moveTo(0, -r - w * 2); g.lineTo(w * 1.6, -r + w); g.lineTo(0, -r + w * 3); g.lineTo(-w * 1.6, -r + w);
          g.closePath(); g.fill();
        }
        g.restore();
      }
      if (plate) {
        g.lineWidth = w;
        g.beginPath();
        for (var k = 0; k < 6; k++) {
          var t = k * Math.PI / 3 + Math.PI / 6, pr = r * .22;
          g[k ? 'lineTo' : 'moveTo'](Math.cos(t) * pr, Math.sin(t) * pr);
        }
        g.closePath(); g.stroke();
      }
      if (ring) { g.beginPath(); g.arc(0, 0, w * 1.6, 0, Math.PI * 2); g.fill(); }
      return c;
    }

    var bank = [], bankInk = '';
    function bake(ink) {
      bankInk = ink;
      bank = [];
      for (var i = 0; i < 28; i++) bank.push(makeFlake(12 + Math.pow(Math.random(), 1.6) * 34, ink));
    }

    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth;
      H = innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var want = Math.round(W * H / 9500);
      while (flakes.length < want) flakes.push(spawn(true));
      flakes.length = want;
      var cols = Math.ceil(W / COL);
      if (drift.length !== cols) drift = new Float32Array(cols);
      bankInk = '';
    }
    function spawn(anywhere) {
      var z = Math.random();
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : -30,
        z: z,
        k: z < .68 ? -1 : (Math.random() * 28) | 0,
        sc: .45 + z * .7,
        v: .25 + z * .9,
        rot: Math.random() * 6.28,
        spin: (Math.random() - .5) * .02,
        ph: Math.random() * 6.28,
      };
    }
    addEventListener('resize', resize);
    addEventListener('pointermove', function (e) {
      if (lastX !== null) wind += (e.clientX - lastX) * .008;
      lastX = e.clientX;
    }, { passive: true });

    function frame(t) {
      if (!winter()) { running = false; ctx.clearRect(0, 0, W, H); return; }
      requestAnimationFrame(frame);
      wind *= .96;
      var ink = getComputedStyle(doc).getPropertyValue('--ink').trim() || '#fff';
      if (ink !== bankInk) bake(ink);
      ctx.clearRect(0, 0, W, H);
      var floor = hero ? hero.getBoundingClientRect().bottom : H + 99;
      ctx.fillStyle = ink;
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.y += f.v;
        f.x += Math.sin(t / 1600 + f.ph) * .3 * (f.z + .3) + wind * (f.z + .2);
        f.rot += f.spin;
        if (f.x < -30) f.x += W + 60; else if (f.x > W + 30) f.x -= W + 60;
        var col = Math.max(0, Math.min(drift.length - 1, (f.x / COL) | 0));
        if (floor < H + 4 && f.y >= floor - drift[col] && f.y < floor + 4) {
          if (drift[col] < 54) {
            var add = f.k < 0 ? 1.2 : 3;
            drift[col] += add;
            if (col > 0) drift[col - 1] += add * .45;
            if (col < drift.length - 1) drift[col + 1] += add * .45;
          }
          flakes[i] = spawn(false);
          continue;
        }
        if (f.y > H + 30) { flakes[i] = spawn(false); continue; }
        ctx.globalAlpha = .3 + f.z * .7;
        if (f.k < 0) {
          ctx.beginPath(); ctx.arc(f.x, f.y, .6 + f.z * 1.6, 0, 6.283); ctx.fill();
        } else {
          var img = bank[f.k], s = f.sc / dpr;
          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.rotate(f.rot);
          ctx.scale(s * (.75 + .25 * Math.cos(t / 1300 + f.ph)), s);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          ctx.restore();
        }
      }
      if (floor < H + 60) {
        ctx.globalAlpha = .92;
        ctx.beginPath();
        ctx.moveTo(0, floor);
        for (var x = 0; x < drift.length; x++) {
          var h = (drift[Math.max(0, x - 1)] + drift[x] * 2 + drift[Math.min(drift.length - 1, x + 1)]) / 4;
          ctx.lineTo(x * COL + COL / 2, floor - h);
        }
        ctx.lineTo(W, floor);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    resize();
    return function () {
      if (running) return;
      running = true;
      requestAnimationFrame(frame);
    };
  }

  var garland = document.querySelector('.garland');
  var LAMPS = ['#ffb547', '#ff5a5f', '#3ddc97', '#5ab8ff', '#ff7ac6'];
  function drawGarland() {
    if (!garland) return;
    var w = garland.clientWidth || innerWidth, span = 170, sag = 14;
    var n = Math.max(2, Math.round(w / span)), step = w / n;
    var wire = 'M0 3', twist = 'M0 4', lamps = '', defs = '';
    LAMPS.forEach(function (c, k) {
      defs += '<radialGradient id="lg' + k + '" cx="35%" cy="30%" r="80%">' +
        '<stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".28" stop-color="' + c + '"/>' +
        '<stop offset="1" stop-color="' + c + '" stop-opacity=".55"/></radialGradient>';
    });
    defs += '<linearGradient id="cap" x1="0" x2="1"><stop offset="0" stop-color="#2a3a32"/><stop offset=".5" stop-color="#6d8577"/><stop offset="1" stop-color="#1c2620"/></linearGradient>' +
      '<filter id="blur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="5"/></filter>';
    var idx = 0;
    for (var i = 0; i < n; i++) {
      var x0 = i * step, mid = x0 + step / 2, x1 = x0 + step;
      wire += ' Q' + mid.toFixed(1) + ' ' + (3 + sag * 2) + ' ' + x1.toFixed(1) + ' 3';
      twist += ' Q' + mid.toFixed(1) + ' ' + (4 + sag * 2) + ' ' + x1.toFixed(1) + ' 4';
      for (var k = 1; k <= 3; k++) {
        var t = k / 4, x = x0 + step * t, y = 3 + 2 * t * (1 - t) * sag * 2;
        var ci = (idx * 2 + i) % LAMPS.length, c = LAMPS[ci];
        var d1 = (-(idx * 0.83) % 4.6).toFixed(2), d2 = (-(idx * 1.37) % 3).toFixed(2), dur = (2.4 + (idx * 0.61) % 1.8).toFixed(2);
        lamps += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"><g class="lamp" style="animation-delay:' + d1 + 's">' +
          '<circle class="halo" cx="0" cy="13" r="9" fill="' + c + '" filter="url(#blur)" style="animation-delay:' + d2 + 's;animation-duration:' + dur + 's"/>' +
          '<rect x="-2.6" y="0" width="5.2" height="5" rx="1" fill="url(#cap)"/>' +
          '<path class="glass" d="M-3.2 5 C-6 9 -5.6 15.5 0 19.5 C5.6 15.5 6 9 3.2 5 Z" fill="url(#lg' + ci + ')" style="animation-delay:' + d2 + 's;animation-duration:' + dur + 's"/>' +
          '<path d="M-1.6 7.5 C-3 10 -2.8 13 -1.4 15" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".9" stroke-linecap="round"/>' +
          '</g></g>';
        idx++;
      }
    }
    garland.innerHTML = '<svg viewBox="0 0 ' + w + ' 46"><defs>' + defs + '</defs>' +
      '<path class="wire" d="' + wire + '"/><path class="twist" d="' + twist + '"/>' + lamps + '</svg>';
  }
  drawGarland();
  addEventListener('resize', debounce(drawGarland, 150));

  var startBaubles = initBaubles(document.getElementById('baubles'));
  if (winter() && startBaubles) startBaubles();
  if (seasonBtn) seasonBtn.addEventListener('click', function () { if (winter() && startBaubles) startBaubles(); });

  function initBaubles(cv) {
    if (!cv || reduced) return null;
    var ctx = cv.getContext('2d'), hero = cv.parentElement;
    var PX = 2, W = 0, H = 0, img = null, running = false;
    var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    var balls = [
      { x: .6, len: .2, r: 44, pat: 'band' },
      { x: .74, len: .34, r: 62, pat: 'dots' },
      { x: .88, len: .16, r: 36, pat: 'plain' },
    ];
    balls.forEach(function (b) { b.a = 0; b.w = 0; b.spin = Math.random() * 6.28; });
    var mx = -1e4, my = -1e4, pvx = 0;
    addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      pvx = e.clientX - r.left - mx;
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    }, { passive: true });

    function resize() {
      W = Math.ceil(hero.clientWidth / PX);
      H = Math.ceil(hero.clientHeight / PX);
      cv.width = W;
      cv.height = H;
      img = ctx.createImageData(W, H);
    }
    addEventListener('resize', resize);

    function hex(c) {
      c = c.trim().replace('#', '');
      if (c.length === 3) c = c.split('').map(function (ch) { return ch + ch; }).join('');
      var v = parseInt(c, 16);
      return [v >> 16 & 255, v >> 8 & 255, v & 255];
    }
    function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

    function frame() {
      if (!winter()) { running = false; ctx.clearRect(0, 0, W, H); return; }
      requestAnimationFrame(frame);
      var cs = getComputedStyle(doc);
      var bg = hex(cs.getPropertyValue('--bg')), acc = hex(cs.getPropertyValue('--acc')), ink = hex(cs.getPropertyValue('--ink'));
      var pal = [mix(bg, acc, .18), mix(bg, acc, .5), acc, mix(acc, ink, .6), [255, 255, 255]];
      var data = img.data;
      data.fill(0);
      var top = 64 / PX + 23;
      function put(x, y, c) {
        if (x < 0 || y < 0 || x >= W || y >= H) return;
        var o = (y * W + x) * 4;
        data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
      }
      balls.forEach(function (b) {
        var k = Math.max(.5, Math.min(1, W * PX / 1100)), narrow = W < H;
        var ax = b.x * W, L = b.len * H * (narrow ? .3 : 1) + 40 / PX, R = b.r * k / PX;
        var bx = ax + Math.sin(b.a) * L, by = top + Math.cos(b.a) * L;
        var dx = mx / PX - bx, dy = my / PX - by;
        if (dx * dx + dy * dy < R * R * 2.6) b.w += pvx * .00045;
        b.w += -Math.sin(b.a) * .0016 - b.w * .012;
        b.a += b.w;
        b.spin += .004 + b.w * .5;
        bx = ax + Math.sin(b.a) * L;
        by = top + Math.cos(b.a) * L;
        for (var s = 0; s < L - R; s += 1) {
          var sx = (ax + Math.sin(b.a) * s) | 0, sy = (top + Math.cos(b.a) * s) | 0;
          if ((sx + sy) % 2 === 0) put(sx, sy, pal[1]);
        }
        var cx = bx - Math.sin(b.a) * R, cy = by - Math.cos(b.a) * R;
        for (var yy = -3; yy <= 1; yy++) for (var xx = -4; xx <= 4; xx++) {
          var g = (xx + 4) / 8, lv = g < .3 ? 2 : g < .6 ? 3 : 1;
          put((cx + xx) | 0, (cy + yy) | 0, pal[lv]);
        }
        var ca = Math.cos(-b.a), sa = Math.sin(-b.a);
        for (var py = -R; py <= R; py++) for (var px = -R; px <= R; px++) {
          var nx = px / R, ny = py / R, r2 = nx * nx + ny * ny;
          if (r2 > 1) continue;
          var nz = Math.sqrt(1 - r2);
          var dif = Math.max(0, nx * -.55 + ny * -.6 + nz * .58);
          var spec = Math.pow(Math.max(0, nx * -.35 + ny * -.45 + nz * .82), 28);
          var rim = Math.pow(1 - nz, 2.2) * Math.max(0, ny) * .6;
          var lum = .08 + dif * .8 + rim;
          var lx = nx * ca - ny * sa, ly = nx * sa + ny * ca;
          var lon = Math.atan2(lx, nz) + b.spin;
          if (b.pat === 'band' && Math.abs(ly) < .16) lum *= Math.abs(ly) < .1 && Math.sin(lon * 6) > 0 ? 1.45 : .55;
          if (b.pat === 'dots') {
            var u = lon * 3, v = ly * 4.2, fu = u - Math.round(u), fv = v - Math.round(v);
            if (fu * fu + fv * fv < .07) lum += .45;
          }
          lum += spec * 1.4;
          var X = (bx + px) | 0, Y = (by + py) | 0;
          var th = (BAYER[(Y & 3) * 4 + (X & 3)] + .5) / 16;
          put(X, Y, pal[Math.min(4, Math.max(0, Math.floor(lum * 4 + th - .5)))]);
        }
      });
      ctx.putImageData(img, 0, 0);
    }
    resize();
    return function () {
      if (running) return;
      running = true;
      requestAnimationFrame(frame);
    };
  }

  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
})();
