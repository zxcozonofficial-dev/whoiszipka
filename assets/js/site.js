(function () {
  'use strict';

  var doc = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  doc.classList.add('js');

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

  var snow = document.getElementById('snow');
  var winter = function () { return doc.dataset.season === 'winter'; };
  var startSnow = initSnow(snow);
  function setSeason(on) {
    if (on) doc.dataset.season = 'winter'; else delete doc.dataset.season;
    delete doc.dataset.tone;
    try { localStorage.setItem('zipka-season', on ? 'on' : 'off'); localStorage.removeItem('zipka-tone'); } catch (e) {}
    if (on && startSnow) startSnow();
  }
  var TONES = [['pink', 'розовая'], ['winter', 'зимняя'], ['acid', 'кислотная'], ['rust', 'ржавая']];
  function curTone() { return doc.dataset.tone || (winter() ? 'winter' : 'pink'); }
  function toneLabel() {
    var el = document.querySelector('.end__tone b'), id = curTone();
    if (el) TONES.forEach(function (t) { if (t[0] === id) el.textContent = t[1]; });
  }
  function nextTone() {
    var id = curTone(), i = 0;
    TONES.forEach(function (t, k) { if (t[0] === id) i = k; });
    var nx = TONES[(i + 1) % TONES.length][0];
    setSeason(nx === 'winter');
    if (nx === 'acid' || nx === 'rust') {
      doc.dataset.tone = nx;
      try { localStorage.setItem('zipka-tone', nx); } catch (e) {}
    }
    repaint();
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

  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function hex(c) {
    c = c.trim().replace('#', '');
    if (c.length === 3) c = c.split('').map(function (ch) { return ch + ch; }).join('');
    var v = parseInt(c, 16);
    return [v >> 16 & 255, v >> 8 & 255, v & 255];
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function rgb(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function readPal() {
    var cs = getComputedStyle(doc);
    var v = function (n) { return hex(cs.getPropertyValue(n)); };
    var p = { bg: v('--bg'), bg2: v('--bg-2'), ink: v('--ink'), ink2: v('--ink-2'), ink3: v('--ink-3'), acc: v('--acc') };
    p.metal = mix(p.ink, p.ink2, .3);
    p.metalD = mix(p.ink3, p.bg, .2);
    p.out = mix(p.bg, [0, 0, 0], .45);
    return p;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    ctx.fill();
  }

  var RAMP = [".`',", "-:;~", "=+^\"", "/\\|!", "()[]", "tfjr", "zcYJ", "UCLQ", "0OZm", "#MW@"];
  var zip = initEye();
  (function clock() {
    var el = document.querySelector('.end__clock b');
    if (!el) return;
    var f;
    try { f = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' }); } catch (e) { return; }
    function tick() { el.textContent = f.format(new Date()); }
    tick();
    setInterval(tick, 20000);
  })();
  var cord = initCord();
  var nap = initNap();
  function repaint() { if (zip) zip(); if (cord) cord(); if (nap) nap(); toneLabel(); }
  toneLabel();
  var toneBtn = document.querySelector('.end__tone');
  if (toneBtn) toneBtn.addEventListener('click', nextTone);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (zip) zip(); });

  function easeS(x) { return x * x * (3 - 2 * x); }
  function hash2(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function blinkAt(d) { return d > 0 && d < .28 ? 1 - .98 * Math.sin(d / .28 * Math.PI) : 1; }

  function initEye() {
    var sec = document.querySelector('.hero'), cv = document.getElementById('eye');
    if (!sec || !cv) return null;
    var skip = sec.querySelector('.hero__skip');
    var ctx = cv.getContext('2d');

    var EXTRA = "+-|*.";
    var CHARS = RAMP.join('') + EXTRA, GI = {};
    for (var q = 0; q < CHARS.length; q++) if (GI[CHARS[q]] === undefined) GI[CHARS[q]] = q;
    var LV = RAMP.length, MATS = 3;

    // eye opens, dive into the pupil, warp, a ringed planet arrives and opens an eye of its own
    var END = 7.4, T_OPEN = .9, T_HOLD = 2.3, T_ZOOM = 3.0, T_SPACE = 4.9, T_LOOK = 6.2;
    var CT = Math.cos(-.32), ST = Math.sin(-.32), RS = .27;
    var W = 0, H = 0, dpr = 1, cw = 7, ch = 13, cols = 0, rows = 0, RF = .34, PCY = .07;
    var atlas = null, aw = 0, ah = 0;
    var lum = null, mat = null, glyph = null, inSpace = null;
    var stars = [], t0 = 0, now = 0, done = false, raf = 0, visible = true, last = 0;
    var LX = 0, LY = 0, ptr = null, ptrT = -1e9, blinkT = -99;

    var seq = function (a, b, t) { return clamp((t - a) / (b - a), 0, 1); };
    var ease = easeS, hash = hash2;
    function fr(x) { return x - Math.floor(x); }

    function bake() {
      var pal = readPal();
      var neutral = [mix(pal.bg, pal.ink3, .6), pal.ink];
      var accent = [mix(pal.bg, pal.acc, .35), pal.acc];
      var hot = [mix(pal.bg, pal.acc, .45), mix(pal.acc, [255, 255, 255], .55)];
      var ramps = [neutral, accent, hot];
      var gw = Math.ceil(cw * dpr), gh = Math.ceil(ch * dpr);
      atlas = document.createElement('canvas');
      atlas.width = CHARS.length * gw; atlas.height = MATS * LV * gh;
      aw = gw; ah = gh;
      var g = atlas.getContext('2d');
      g.font = '500 ' + (ch * .82 * dpr).toFixed(1) + 'px "JetBrains Mono", ui-monospace, monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (var m = 0; m < MATS; m++) for (var l = 0; l < LV; l++) {
        var k = l / (LV - 1);
        g.fillStyle = rgb(mix(ramps[m][0], ramps[m][1], Math.pow(k, .8)));
        for (var c = 0; c < CHARS.length; c++) g.fillText(CHARS[c], c * gw + gw / 2, (m * LV + l) * gh + gh / 2);
      }
    }

    function build() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = sec.clientWidth; H = sec.clientHeight;
      if (!W || !H) { cols = rows = 0; return; }
      var fs = W < 600 ? 10 : W < 1100 ? 11 : 12;
      cw = fs * .62; ch = fs * 1.18;
      cols = Math.ceil(W / cw); rows = Math.ceil(H / ch);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      var n = cols * rows;
      lum = new Float32Array(n); mat = new Uint8Array(n); glyph = new Int16Array(n); inSpace = new Uint8Array(n);
      var asp = W / H;
      RF = W < H ? Math.min(.5, asp * .62) : Math.min(.48, asp * .4);
      PCY = W < H ? .16 : .08;
      stars = [];
      for (var i = 0; i < 240; i++) {
        stars.push({
          x: (Math.random() * 2 - 1) * (asp + .4) * 1.3, y: (Math.random() * 2 - 1) * 1.5, z: Math.random(),
          sp: 1 + Math.random() * 2.5, ph: Math.random() * 6.28,
        });
      }
      bake();
      paint();
    }

    function geo(t) {
      var zt = seq(T_ZOOM, T_SPACE, t), z = Math.exp(Math.pow(zt, 1.7) * 5.2);
      var asp = W / H, ew = Math.min(1.45, asp * .9), a = ew * .42, R = a * .93, Rp = R * (.34 + .06 * zt);
      return { zt: zt, z: z, ew: ew, a: a, R: R, Rp: Rp, m: clamp(Rp * z, .2, 1) };
    }
    function planetAt(t) {
      var k = ease(seq(T_SPACE - .5, T_LOOK, t));
      return { r: .025 + (RF - .025) * k, cy: -PCY * k };
    }
    function dist(t) { return .035 * t + 2.4 * ease(seq(T_ZOOM + .5, T_SPACE + .9, t)); }
    function lid(t) {
      var o = ease(seq(T_LOOK, T_LOOK + .8, t));
      if (o <= 0) return 0;
      var k = Math.floor(t / 4.6), bt = k * 4.6 + 1.2 + hash(k, 9) * 2.6;
      return o * blinkAt(t - bt) * blinkAt(t - blinkT);
    }

    // the planet's face: banded sphere that turns out to have an eye
    function surf(x, y, nz, t) {
      var dif = Math.max(0, x * -.45 + y * -.5 + nz * .74);
      var lat = Math.asin(clamp(y, -1, 1)), lon = Math.atan2(x, nz) + t * .18;
      var band = .5 + .5 * Math.sin(lat * 9 + .9 * Math.sin(lon * 2));
      var base = .08 + .62 * dif * (.65 + .35 * band) + Math.pow(1 - nz, 3) * .3;
      var op = lid(t);
      if (op > .01 && Math.abs(x) < .74) {
        var ey = y + .1, q = x / .74, h = .44 * op * (1 - q * q) * (ey < 0 ? 1.1 : .9), ad = Math.abs(ey);
        if (ad < h) {
          var shade = 1 - .5 * Math.pow(clamp(1 - (h - ad) / .15, 0, 1), 2);
          var ix = x - LX * .34, iy = ey - LY * .14, ir = Math.sqrt(ix * ix + iy * iy), IR = .27;
          var gx = ix + IR * .35, gy = iy + IR * .35;
          if (ir < IR && gx * gx + gy * gy < IR * IR * .04) return [1, 0];
          if (ir < IR * .46) return [.03, 0];
          if (ir < IR) {
            var ang = Math.atan2(iy, ix);
            var fib = .5 + .5 * Math.sin(ang * 22 + Math.sin(ang * 5 + ir * 30) * 2 + ir * 40);
            var l = (.35 + .55 * fib) * (1 - .6 * Math.pow(clamp((ir - IR * .82) / (IR * .18), 0, 1), 1.5));
            return [l * shade, 1];
          }
          return [(.95 - .4 * q * q) * shade * (.75 + .25 * dif), 0];
        }
        if (ad < h + .045) return [.04, 0];
        if (ad < h + .14) base *= .7;
      }
      return [base, 2];
    }

    function space(u, v, m, t) {
      var P = planetAt(t), x = u / m / P.r, y = (v / m - P.cy) / P.r;
      var xr = x * CT + y * ST, yr = -x * ST + y * CT, ry = yr / RS, rd = Math.sqrt(xr * xr + ry * ry), ring = -1;
      if (rd > 1.32 && rd < 2.05 && Math.abs(rd - 1.7) > .05) {
        var ra = Math.atan2(ry, xr);
        ring = (.32 + .3 * (.5 + .5 * Math.sin(rd * 26)) + .1 * Math.sin(ra * 40 - t * 1.4 + rd * 9));
        ring *= 1 - .5 * Math.pow((rd - 1.32) / .73, 2);
        if (yr < 0) ring *= .75;
      }
      var d2 = x * x + y * y;
      if (d2 < 1) {
        if (ring >= 0 && yr > 0) return [ring, 0];
        return surf(x, y, Math.sqrt(1 - d2), t);
      }
      if (ring >= 0) return [ring, 0];
      var d = Math.sqrt(d2);
      if (d < 1.12) return [.3 * (1 - (d - 1) / .12), 1];
      return [-1, 0];
    }

    function eye(u, v, t, r) {
      var open = ease(seq(T_OPEN, T_HOLD, t)), G = geo(t);
      var zt = G.zt, z = G.z, ew = G.ew, a = G.a, R = G.R, Rp = G.Rp;
      var lookX = .1 * LX * (1 - zt), lookY = .05 * LY * (1 - zt);
      var eu = u / z, ev = v / z, iu = eu - lookX * R, iv = ev - lookY * R, rr = Math.sqrt(iu * iu + iv * iv);
      if (rr < Rp && zt > 0) return space(u, v, G.m, t);
      var h = Math.abs(eu) < ew ? a * open * (1 - (eu / ew) * (eu / ew)) * (ev < 0 ? 1.08 : .92) : -1;
      if (Math.abs(ev) > h) {
        var edge = Math.abs(ev) - h;
        if (h > 0 && edge < .035) return [.06, 0];
        var stripe = r % 2 ? .55 : 1;
        return [(.16 + .1 * hash(Math.floor(u * 40), r)) * stripe * (.6 + .4 * Math.min(1, t / T_OPEN)), 0];
      }
      var shade = 1 - .55 * Math.pow(clamp(1 - (h - Math.abs(ev)) / (a * .35), 0, 1), 2);
      var gx = iu + R * .3, gy = iv + R * .32;
      if (rr < R && gx * gx + gy * gy < R * R * .012) return [1, 0];
      if (rr < Rp) return [.03, 0];
      if (rr < R) {
        var ang = Math.atan2(iv, iu);
        var fib = .5 + .5 * Math.sin(ang * 38 + Math.sin(ang * 7 + rr * 9) * 2.2 + rr * 18);
        var l = .28 + .5 * fib * (.55 + .45 * (rr - Rp) / (R - Rp));
        l += .3 * Math.exp(-Math.pow((rr - Rp * 1.45) / (R * .08), 2));
        l *= 1 - .7 * Math.pow(clamp((rr - R * .86) / (R * .14), 0, 1), 1.5);
        return [l * shade, 1];
      }
      var vein = .06 * Math.sin(Math.atan2(ev, eu) * 23 + Math.abs(eu) * 30) * Math.pow(Math.abs(eu) / ew, 2);
      return [(.86 - .45 * Math.pow(eu / ew, 2) - vein) * shade, 0];
    }

    function star(c, r, l, ch2) {
      if (c < 0 || r < 0 || c >= cols || r >= rows) return;
      var i = r * cols + c;
      if (!inSpace[i] || lum[i] > l) return;
      lum[i] = l; mat[i] = 0; glyph[i] = GI[ch2];
    }
    function streak(c0, r0, c1, r1, b) {
      var a = Math.atan2((r1 - r0) * ch, (c1 - c0) * cw);
      if (a < 0) a += Math.PI;
      var chr = a < .39 || a > 2.75 ? '-' : a < 1.18 ? '\\' : a < 1.96 ? '|' : '/';
      var n = Math.min(70, Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0)));
      for (var k = 0; k <= n; k++) {
        var f = k / n;
        star(Math.round(c0 + (c1 - c0) * f), Math.round(r0 + (r1 - r0) * f), b * (.2 + .8 * f), k === n ? '*' : chr);
      }
    }
    function sc(px) { return Math.round((px * H / 2 + W / 2) / cw - .5); }
    function sr(py) { return Math.round((py * H / 2 + H / 2) / ch - .5); }

    function steer(t) {
      var tx, ty;
      if (ptr && performance.now() - ptrT < 2500) {
        var P = planetAt(Math.max(t, T_LOOK));
        tx = clamp((ptr.x - W / 2) / (W * .32), -1, 1);
        ty = clamp((ptr.y - (H / 2 + P.cy * H / 2)) / (H * .32), -1, 1);
      } else {
        tx = .75 * Math.sin(t * .6); ty = .55 * Math.sin(t * .43 + 1);
      }
      LX += (tx - LX) * .14; LY += (ty - LY) * .14;
    }

    function frame(ts) {
      raf = 0;
      if (!visible) return;
      if (ts - last < 33) { raf = requestAnimationFrame(frame); return; }
      last = ts;
      if (!t0) t0 = ts;
      now = (ts - t0) / 1000;
      if (!done && now >= END) finish();
      steer(now);
      paint();
      if (!reduced) raf = requestAnimationFrame(frame);
    }

    function paint() {
      if (!atlas || !cols) return;
      var t = reduced ? END : now, i, c, r;
      var boot = clamp(t / .6, 0, 1), flickT = Math.floor(t * 7);
      for (r = 0; r < rows; r++) {
        var v = ((r + .5) * ch - H / 2) / (H / 2);
        for (c = 0; c < cols; c++) {
          i = r * cols + c;
          var u = ((c + .5) * cw - W / 2) / (H / 2);
          if (r > rows * boot) { lum[i] = -1; inSpace[i] = 0; continue; }
          var res = eye(u, v, t, r);
          var l = res[0];
          inSpace[i] = l < 0 ? 1 : 0;
          if (l < 0) {
            var hd = hash(c, r);
            l = hd < .012 ? .14 + .1 * Math.sin(t * 3 + hd * 900) : -1;
            res[1] = 0;
          } else if (res[1] === 2 && r % 2) l *= .72;
          lum[i] = l; mat[i] = res[1];
          var lv = clamp(Math.floor(l * LV), 0, LV - 1);
          var vr = hash(c, r) * 4 | 0;
          if (hash(c + flickT, r) < .04) vr = (vr + 1) & 3;
          glyph[i] = GI[RAMP[lv][vr]];
        }
      }
      if (t > T_ZOOM + .4) {
        var m = geo(t).m, fade = ease(seq(T_ZOOM + .4, T_ZOOM + 1.3, t)), Dn = dist(t), Dp = dist(t - .07);
        for (var s = 0; s < stars.length; s++) {
          var S = stars[s], z = fr(S.z - Dn), zp = fr(S.z - Dp);
          var zz = .03 + .97 * z, hc = sc(S.x * .32 / zz * m), hr = sr(S.y * .32 / zz * m);
          var b = clamp(1.2 - zz, .15, 1) * fade;
          if (zp > z) {
            var zzp = .03 + .97 * zp, pc = sc(S.x * .32 / zzp * m), pr = sr(S.y * .32 / zzp * m);
            if (Math.abs(hc - pc) + Math.abs(hr - pr) > 2) { streak(pc, pr, hc, hr, b); continue; }
          }
          var tw = .5 + .5 * Math.sin(t * S.sp + S.ph);
          if (zz > .6) { if (tw > .3) star(hc, hr, b * (.45 + .4 * tw), '.'); continue; }
          var arm = Math.round((zz < .25 ? 2.4 : 1.2) * (.5 + .7 * tw)), bb = b * (.75 + .25 * tw);
          star(hc, hr, bb, '+');
          for (var k = 1; k <= arm; k++) {
            var al = bb * (1 - k / (arm + 1)) * .85;
            star(hc - k * 2, hr, al, '-'); star(hc - k * 2 + 1, hr, al, '-');
            star(hc + k * 2, hr, al, '-'); star(hc + k * 2 - 1, hr, al, '-');
            if (k <= Math.ceil(arm / 2)) { star(hc, hr - k, al, '|'); star(hc, hr + k, al, '|'); }
          }
        }
        // the odd shooting star once everything has settled
        var SP = 3.9, kk = Math.floor(t / SP), s2 = (t - kk * SP) / 1.1;
        if (t > END + .5 && s2 < 1 && hash(kk, 5) > .3) {
          var c0 = Math.round(cols * (.3 + .65 * hash(kk, 1))), r0 = Math.round(rows * (.03 + .3 * hash(kk, 2)));
          var L = Math.round(rows * .4), hc2 = c0 - Math.round(s2 * L), hr2 = r0 + Math.round(s2 * L), fo = Math.sin(s2 * Math.PI);
          for (var j = 0; j < 10; j++) star(hc2 + j, hr2 - j, fo * (1 - j / 10), j ? '/' : '*');
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      var dw = cw * dpr, dh = ch * dpr;
      for (i = 0; i < lum.length; i++) {
        var Lm = lum[i];
        if (Lm < .04) continue;
        c = i % cols; r = (i / cols) | 0;
        var lvl = clamp(Math.floor(Lm * LV), 0, LV - 1);
        ctx.drawImage(atlas, glyph[i] * aw, (mat[i] * LV + lvl) * ah, aw, ah, Math.round(c * dw), Math.round(r * dh), aw, ah);
      }
    }

    function finish() {
      if (done) return;
      done = true;
      t0 = performance.now() - END * 1000;
      sec.classList.add('is-done');
    }
    function kick() { if (!raf && visible && !reduced) raf = requestAnimationFrame(frame); }
    function jump() { finish(); now = END; LX = LY = 0; paint(); }

    if (skip) skip.addEventListener('click', jump);
    cv.addEventListener('click', function () { if (!done) jump(); else blinkT = now; });
    addEventListener('pointermove', function (e) {
      var b = sec.getBoundingClientRect();
      ptr = { x: e.clientX - b.left, y: e.clientY - b.top };
      ptrT = performance.now();
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(sec);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      last = 0;
      kick();
    });
    var rebuild = debounce(function () {
      if (sec.clientWidth !== W || sec.clientHeight !== H) build();
    }, 150);
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (!cols) build(); else rebuild(); }).observe(sec);
    else addEventListener('resize', rebuild);

    sec.classList.add('eye-on');
    build();
    if (reduced) { finish(); paint(); } else kick();
    return function () { bake(); paint(); };
  }

  // footer: the same eye, smaller; it watches the cursor and dozes off when nobody moves
  function initNap() {
    var cv = document.querySelector('.end__eye');
    if (!cv) return null;
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, cw = 7, ch = 13, cols = 0, rows = 0;
    var cols8 = null, raf = 0, vis = false, last = 0, op = 0, LX = 0, LY = 0;
    var ptr = null, act = -1e9, blinkT = -99, t0 = performance.now();

    function colors() {
      var p = readPal(), out = [[], []];
      for (var l = 0; l < 10; l++) {
        var k = Math.pow(l / 9, .8);
        out[0].push(rgb(mix(mix(p.bg, p.ink3, .6), p.ink, k)));
        out[1].push(rgb(mix(mix(p.bg, p.acc, .35), p.acc, k)));
      }
      out.z = rgb(p.acc);
      cols8 = out;
    }
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      if (!W || !H) return;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      var fs = W < 420 ? 10 : 11;
      cw = fs * .62; ch = fs * 1.18;
      cols = Math.floor(W / cw); rows = Math.floor(H / ch);
      colors();
    }

    function cell(X, Y, t, c, r) {
      var EW = W * .44, EH = H * .4, x = X / EW, y = Y / EH;
      if (Math.abs(x) >= 1) return null;
      y -= (1 - op) * .3 * (1 - x * x);
      var h = op * (1 - x * x) * (y < 0 ? 1.08 : .92), ad = Math.abs(y);
      if (ad < h) {
        var ix = X - LX * EW * .42, iy = Y - LY * EH * .22, ir = Math.sqrt(ix * ix + iy * iy), IR = EH * .62;
        var shade = 1 - .5 * Math.pow(clamp(1 - (h - ad) / .35, 0, 1), 2);
        var gx = ix + IR * .35, gy = iy + IR * .4;
        if (ir < IR && gx * gx + gy * gy < IR * IR * .03) return [1, 0];
        if (ir < IR * .45) return [.03, 0];
        if (ir < IR) {
          var ang = Math.atan2(iy, ix), fib = .5 + .5 * Math.sin(ang * 26 + Math.sin(ang * 6) * 2 + ir * .4);
          return [(.35 + .55 * fib) * shade * (1 - .6 * Math.pow(clamp((ir / IR - .82) / .18, 0, 1), 1.5)), 1];
        }
        return [(.82 - .4 * x * x) * shade, 0];
      }
      var e = ad - h, ep = e * EH;
      if (ep < ch * .55) return [.62, 0, op < .15 ? '~' : '-'];
      // lashes fan out over the top lid when open, hang under the line when shut
      var side = op < .15 ? y > 0 : y < 0;
      if (side && ep < ch * 2.4 && Math.abs(x) < .82 && c % 3 === 0) {
        var lean = x < -.25 ? '\\' : x > .25 ? '/' : '|';
        if (op < .15) lean = x < -.25 ? '/' : x > .25 ? '\\' : '|';
        return [.5 * (1 - ep / (ch * 2.4)) + .2, 0, lean];
      }
      return null;
    }

    function draw(t) {
      if (!cols) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.font = '500 ' + (ch * .82).toFixed(1) + 'px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var fl = Math.floor(t * 6);
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var X = (c + .5) * cw - W / 2, Y = (r + .5) * ch - H / 2, res = cell(X, Y, t, c, r);
        if (!res || res[0] < .04) continue;
        var lv = clamp(Math.floor(res[0] * 10), 0, 9), vr = hash2(c, r) * 4 | 0;
        if (hash2(c + fl, r) < .03) vr = (vr + 1) & 3;
        ctx.fillStyle = cols8[res[1]][lv];
        ctx.fillText(res[2] || RAMP[lv][vr], X + W / 2, Y + H / 2);
      }
      if (op < .2) {
        ctx.fillStyle = cols8.z;
        for (var k = 0; k < 3; k++) {
          var ph = (t * .3 + k / 3) % 1;
          ctx.globalAlpha = Math.sin(ph * Math.PI) * (1 - op * 5);
          ctx.font = '500 ' + (ch * (.8 + ph * .9)).toFixed(1) + 'px "JetBrains Mono", ui-monospace, monospace';
          ctx.fillText(ph < .5 ? 'z' : 'Z', W * .76 + ph * W * .1 + Math.sin(ph * 9 + k) * 6, H * .4 - ph * H * .42);
        }
        ctx.globalAlpha = 1;
      }
    }

    function frame(ts) {
      raf = 0;
      if (!vis) return;
      if (ts - last < 33) { raf = requestAnimationFrame(frame); return; }
      last = ts;
      var t = (ts - t0) / 1000, awake = ts - act < 4500;
      var k = Math.floor(t / 4.2), bt = k * 4.2 + 1 + hash2(k, 3) * 2.5;
      var target = awake ? blinkAt(t - bt) * blinkAt(t - blinkT) : 0;
      op += (target - op) * (target > op ? .25 : awake ? .45 : .035);
      if (ptr) {
        var b = cv.getBoundingClientRect();
        var tx = clamp((ptr.x - b.left - W / 2) / (W * .6), -1, 1), ty = clamp((ptr.y - b.top - H / 2) / (H * 1.4), -1, 1);
        LX += (tx - LX) * .15; LY += (ty - LY) * .15;
      }
      draw(t);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && vis) raf = requestAnimationFrame(frame); }
    function wake() { act = performance.now(); }

    addEventListener('pointermove', function (e) { ptr = { x: e.clientX, y: e.clientY }; wake(); }, { passive: true });
    addEventListener('scroll', wake, { passive: true });
    addEventListener('touchstart', wake, { passive: true });
    cv.addEventListener('click', function () { wake(); blinkT = (performance.now() - t0) / 1000; });

    size();
    if (reduced) { op = 1; draw(0); }
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) kick(); }).observe(cv);
    }
    addEventListener('resize', debounce(function () { size(); if (reduced) draw(0); }, 150));
    return function () { colors(); if (reduced) draw(0); };
  }

  function initCord() {
    var foot = document.querySelector('.end'), cv = document.getElementById('cord');
    var grab = foot && foot.querySelector('.end__grab'), toneBtn = foot && foot.querySelector('.end__tone');
    if (!foot || !cv || !grab || !toneBtn) return null;
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, pal = null, raf = 0;
    var N = 14, pts = [], seg = 10, ax = 0, ay = 0, len = 0, HANDLE = 92;
    var drag = null, armed = false, label = toneBtn.querySelector('span'), idle = label.textContent;

    function place() {
      var fr = foot.getBoundingClientRect(), tr = toneBtn.getBoundingClientRect();
      ax = tr.left - fr.left + 22;
      ay = 0;
      len = Math.max(50, tr.top - fr.top - HANDLE - 18);
      seg = len / (N - 1);
      pts = [];
      for (var i = 0; i < N; i++) pts.push({ x: ax, y: ay + i * seg, px: ax, py: ay + i * seg });
    }

    function physics() {
      var i, p, energy = 0, last = pts[N - 1];
      for (i = 1; i < N; i++) {
        p = pts[i];
        if (drag && i === N - 1) continue;
        var vx = (p.x - p.px) * .975, vy = (p.y - p.py) * .975;
        p.px = p.x; p.py = p.y;
        p.x += vx; p.y += vy + .45;
        energy += Math.abs(vx) + Math.abs(vy);
      }
      if (drag) { last.px = last.x; last.py = last.y; last.x = drag.x; last.y = drag.y; }
      for (var k = 0; k < 12; k++) {
        for (i = 0; i < N - 1; i++) {
          var a = pts[i], b = pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || .001;
          var f = (d - seg) / d;
          var wa = i === 0 ? 0 : (drag && i + 1 === N - 1 ? 1 : .5), wb = drag && i + 1 === N - 1 ? 0 : (i === 0 ? 1 : .5);
          a.x += dx * f * wa; a.y += dy * f * wa;
          b.x -= dx * f * wb; b.y -= dy * f * wb;
        }
      }
      pts[0].x = ax; pts[0].y = ay;
      return energy;
    }

    function drawPull(x, y, angle) {
      var out = rgb(pal.out), acc = rgb(pal.acc);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.scale(1.15, 1.15);
      ctx.strokeStyle = rgb(pal.metal);
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 2, 4, 0, 6.283); ctx.stroke();
      ctx.translate(0, 7);
      ctx.fillStyle = out; rr(ctx, -11.5, -2.5, 23, 77, 6);
      ctx.fillStyle = acc; rr(ctx, -9, 0, 18, 72, 4);
      ctx.fillStyle = rgb(mix(pal.acc, [255, 255, 255], .55)); ctx.fillRect(-6.5, 24, 2, 20);
      ctx.fillStyle = rgb(mix(pal.acc, [0, 0, 0], .3)); ctx.fillRect(5, 4, 2.5, 64);
      ctx.fillStyle = out; rr(ctx, -4.5, 5, 9, 14, 2); rr(ctx, -4, 49, 8, 15, 2);
      ctx.restore();
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var i, acc = 0, metal = rgb(pal.metal), shine = rgb(pal.ink), dark = rgb(pal.metalD);
      ctx.fillStyle = dark;
      ctx.fillRect(ax - 7, 0, 14, 4);
      for (i = 0; i < N - 1; i++) {
        var a = pts[i], b = pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy);
        for (; acc < d; acc += 6.5) {
          var t = acc / d, x = a.x + dx * t, y = a.y + dy * t;
          ctx.fillStyle = metal; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.283); ctx.fill();
          ctx.fillStyle = shine; ctx.fillRect(x - 1.4, y - 1.6, 1.2, 1.2);
        }
        acc -= d;
      }
      var l = pts[N - 1], q = pts[N - 2], ang = Math.atan2(-(l.x - q.x), l.y - q.y);
      drawPull(l.x, l.y, ang);
      var cx = l.x - Math.sin(ang) * HANDLE / 2, cy = l.y + Math.cos(ang) * HANDLE / 2;
      grab.style.transform = 'translate(' + (cx - 40).toFixed(1) + 'px,' + (cy - 62).toFixed(1) + 'px)';
    }

    var still = 0;
    function frame() {
      raf = 0;
      var e = physics();
      draw();
      still = e > .06 ? 0 : still + 1;
      if (drag || still < 30) raf = requestAnimationFrame(frame);
    }
    function kick() { still = 0; if (!raf) raf = requestAnimationFrame(frame); }

    function rel(e) { var r = foot.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    grab.addEventListener('pointerdown', function (e) {
      var p = rel(e), l = pts[N - 1];
      drag = { ox: l.x - p.x, oy: l.y - p.y, x: l.x, y: l.y };
      grab.setPointerCapture(e.pointerId);
      doc.classList.add('is-zipping');
      e.preventDefault();
      kick();
    });
    grab.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var p = rel(e);
      drag.x = clamp(p.x + drag.ox, 10, W - 10);
      drag.y = clamp(p.y + drag.oy, 10, H + 120);
      var dx = drag.x - ax, dy = drag.y - ay;
      var was = armed;
      armed = Math.sqrt(dx * dx + dy * dy) - len > 34;
      if (armed !== was) { label.textContent = armed ? 'отпускай' : idle; toneBtn.classList.toggle('is-armed', armed); }
      kick();
    });
    var drop = function () {
      if (!drag) return;
      drag = null;
      doc.classList.remove('is-zipping');
      if (armed) {
        armed = false;
        toneBtn.classList.remove('is-armed');
        label.textContent = idle;
        nextTone();
        var side = Math.random() < .5 ? -1 : 1;
        for (var i = 1; i < N; i++) { pts[i].py = pts[i].y + 8 * i / N; pts[i].px = pts[i].x - side * (1.5 + Math.random()) * i / N; }
      }
      kick();
    };
    grab.addEventListener('pointerup', drop);
    grab.addEventListener('pointercancel', drop);
    foot.addEventListener('pointermove', function (e) {
      if (drag) return;
      var p = rel(e), hit = false;
      for (var i = 1; i < N; i++) {
        var dx = p.x - pts[i].x, dy = p.y - pts[i].y;
        if (dx * dx + dy * dy < 20 * 20) { pts[i].px -= clamp(e.movementX || 0, -14, 14) * .35; hit = true; }
      }
      if (hit) kick();
    }, { passive: true });

    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = foot.clientWidth; H = foot.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      pal = readPal();
      place();
      draw();
    }
    addEventListener('resize', debounce(size, 150));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(size);
    size();
    return function () { pal = readPal(); draw(); };
  }

  var peek = document.querySelector('.peek');
  if (peek && !reduced && matchMedia('(hover: hover) and (min-width: 981px)').matches) {
    var pim = peek.querySelector('img'), px = 0, py = 0, tx = 0, ty = 0, praf = 0, warmed = false;
    var pstep = function () {
      praf = 0;
      var dx = tx - px, dy = ty - py;
      px += dx * .16; py += dy * .16;
      peek.style.transform = 'translate(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px) rotate(' + clamp(dx * .1, -9, 9).toFixed(2) + 'deg)';
      if (Math.abs(dx) + Math.abs(dy) > .4) praf = requestAnimationFrame(pstep);
    };
    var shots = document.querySelectorAll('.work .work__img');
    shots.forEach(function (im) {
      var a = im.closest('.work'), src = im.getAttribute('src');
      a.addEventListener('pointerenter', function (e) {
        if (!warmed) { warmed = true; shots.forEach(function (x) { new Image().src = x.getAttribute('src'); }); }
        pim.src = src;
        px = tx = e.clientX; py = ty = e.clientY;
        peek.classList.add('is-on');
        if (!praf) praf = requestAnimationFrame(pstep);
      });
      a.addEventListener('pointermove', function (e) {
        tx = e.clientX; ty = e.clientY;
        if (!praf) praf = requestAnimationFrame(pstep);
      });
      a.addEventListener('pointerleave', function () { peek.classList.remove('is-on'); });
    });
  }


  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
})();
