(function () {
  'use strict';

  var doc = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  doc.classList.add('js');

  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    var label = btn.textContent;
    btn.addEventListener('click', function () {
      var done = function () {
        btn.textContent = 'скопировано';
        btn.classList.add('is-done');
        setTimeout(function () { btn.textContent = label; btn.classList.remove('is-done'); }, 1400);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(btn.dataset.copy).then(done, function () {});
    });
  });

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
  var nap = initNap();
  // "могу сделать сайт / дизайн / бота / mini app": each word in the sentence opens its own note
  (function say() {
    var ws = document.querySelectorAll('.say .w'), outs = document.querySelectorAll('.say__item');
    ws.forEach(function (w, i) {
      w.addEventListener('click', function () {
        ws.forEach(function (x, j) { x.classList.toggle('is-on', i === j); x.setAttribute('aria-expanded', i === j ? 'true' : 'false'); });
        outs.forEach(function (o, j) { o.classList.toggle('is-on', i === j); });
      });
    });
  })();

  // small helpers shared by the planets and the moons
  function cellGrid(cv, fs) {
    var dpr = Math.min(devicePixelRatio || 1, 2), W = cv.clientWidth, H = cv.clientHeight;
    if (!W || !H) return null;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var cw = fs * .62, ch = fs * 1.18, cols = Math.floor(W / cw), rows = Math.floor(H / ch);
    return { dpr: dpr, W: W, H: H, cw: cw, ch: ch, cols: cols, rows: rows, ox: (W - cols * cw) / 2, oy: (H - rows * ch) / 2 };
  }
  function shades() {
    var p = readPal(), out = [];
    for (var l = 0; l < 10; l++) {
      var k = l / 9;
      out.push(rgb(k < .62 ? mix(mix(p.bg, p.acc, .32), p.acc, k / .62) : mix(p.acc, p.ink, (k - .62) / .38)));
    }
    return out;
  }
  // lum[] holds 0..1 per cell (negative = empty), glyph[] can force a character
  function paintCells(ctx, g, lum, glyph, cols) {
    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    ctx.clearRect(0, 0, g.W, g.H);
    ctx.font = '500 ' + (g.ch * .82).toFixed(1) + 'px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var lv = 0; lv < 10; lv++) {
      ctx.fillStyle = cols[lv];
      for (var r = 0; r < g.rows; r++) for (var c = 0; c < g.cols; c++) {
        var i = r * g.cols + c, L = lum[i];
        if (L < .05 || Math.min(9, (L * 10) | 0) !== lv) continue;
        ctx.fillText(glyph[i] || RAMP[lv][(hash2(c, r) * 4) | 0], g.ox + (c + .5) * g.cw, g.oy + (r + .5) * g.ch);
      }
    }
  }
  function fract(x) { return x - Math.floor(x); }

  function initOrbs() {
    var lis = document.querySelectorAll('.orb');
    if (!lis.length) return null;
    var items = [], cols = shades(), raf = 0, LX = -.5, LY = -.42, LZ = .76;
    var touch = matchMedia('(hover: none)').matches;

    function setup(it) {
      it.g = cellGrid(it.cv, it.cv.clientWidth < 360 ? 7 : 8);
      if (!it.g) return;
      var n = it.g.cols * it.g.rows;
      it.lum = new Float32Array(n); it.glyph = new Array(n);
      it.R = it.ring ? Math.min(it.g.H * .44, it.g.W * .25) : it.g.H * .46;
      sample(it);
    }
    function sample(it) {
      var g = it.g, img = it.img;
      if (!g || !img || !img.naturalWidth) return;
      var s = document.createElement('canvas'), tw = g.cols, th = g.rows;
      s.width = tw; s.height = th;
      var sx = s.getContext('2d');
      sx.drawImage(img, 0, 0, tw, th);
      var d = sx.getImageData(0, 0, tw, th).data, t = new Float32Array(tw * th), lo = 1, hi = 0, i;
      for (i = 0; i < t.length; i++) {
        var v = (d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11) / 255;
        t[i] = v; if (v < lo) lo = v; if (v > hi) hi = v;
      }
      // stretch contrast so dark screenshots still read on the sphere
      for (i = 0; i < t.length; i++) t[i] = Math.pow(clamp((t[i] - lo) / Math.max(.05, hi - lo), 0, 1), .8);
      it.tex = t; it.tw = tw; it.th = th;
    }
    function tex(it, u, v) {
      if (!it.tex) return .5;
      return it.tex[clamp((v * it.th) | 0, 0, it.th - 1) * it.tw + clamp((u * it.tw) | 0, 0, it.tw - 1)];
    }

    function render(it, t) {
      var g = it.g, lum = it.lum, glyph = it.glyph, R = it.R, cx = g.W / 2, cy = g.H / 2;
      var CT = Math.cos(it.tilt), ST = Math.sin(it.tilt), RS = .26, k = it.k;
      var maxd = Math.sqrt(cx * cx + cy * cy);
      var ma = t * .5 + it.seed * 6, mx = Math.cos(ma) * 1.75, my = Math.sin(ma) * .42 - .1, mr = .2;
      for (var r = 0; r < g.rows; r++) for (var c = 0; c < g.cols; c++) {
        var i = r * g.cols + c, px = g.ox + (c + .5) * g.cw, py = g.oy + (r + .5) * g.ch, h = hash2(c + it.seed * 31, r);
        glyph[i] = '';
        // the flat page spreads out from the middle with a sparkling edge
        if (k > 0 && it.tex) {
          var dx = px - cx, dy = py - cy, e = Math.sqrt(dx * dx + dy * dy) / maxd * .78 + h * .22;
          if (e < k - .05) { lum[i] = .06 + .94 * tex(it, c / g.cols, r / g.rows); continue; }
          if (e < k + .03) { lum[i] = .7 + h * .3; glyph[i] = '+*:.#'[(h * 5) | 0]; continue; }
        }
        var x = (px - cx) / R, y = (py - cy) / R;
        var xr = x * CT + y * ST, yr = -x * ST + y * CT, d2 = x * x + y * y, L = -1;
        var ring = -1;
        if (it.ring) {
          var ry = yr / RS, rd = Math.sqrt(xr * xr + ry * ry);
          if (rd > 1.3 && rd < 2 && Math.abs(rd - 1.66) > .05) {
            ring = (.3 + .28 * (.5 + .5 * Math.sin(rd * 24)) + .08 * Math.sin(Math.atan2(ry, xr) * 30 - t)) * (1 - .45 * Math.pow((rd - 1.3) / .7, 2));
            if (yr < 0) ring *= .7;
          }
        }
        if (d2 < 1) {
          if (ring >= 0 && yr > 0) L = ring;
          else if (it.empty) {
            // the empty slot is just a wireframe globe
            var nz0 = Math.sqrt(1 - d2), la = Math.asin(clamp(yr, -1, 1)), lo2 = Math.atan2(xr, nz0) + t * .35;
            var a1 = Math.abs(fract(la / (Math.PI / 6) + .5) - .5), a2 = Math.abs(fract(lo2 / (Math.PI / 6) + .5) - .5) * Math.max(.25, Math.cos(la));
            L = d2 > .9 ? .42 : (a1 < .09 || a2 < .045) ? .28 + .2 * nz0 : -1;
          } else {
            var nz = Math.sqrt(1 - d2), lat = Math.asin(clamp(yr, -1, 1)), lon = Math.atan2(xr, nz) + t * .22 + it.seed * 3;
            var dif = Math.max(0, x * LX + y * LY + nz * LZ);
            L = .1 + (.45 + .55 * tex(it, fract(lon / (Math.PI * 2)), .5 + lat / Math.PI)) * (.08 + .92 * dif) + Math.pow(1 - nz, 3) * .25 * dif;
          }
        } else if (ring >= 0) L = ring;
        else if (d2 < 1.25 && !it.empty) {
          var dd = Math.sqrt(d2);
          L = .28 * (1 - (dd - 1) / .118) * Math.max(0, (x * LX + y * LY) / dd + .35);
        }
        if (it.moon) {
          var mdx = (x - mx) / mr, mdy = (y - my) / mr, m2 = mdx * mdx + mdy * mdy;
          if (m2 < 1 && (Math.sin(ma) > 0 || d2 >= 1)) {
            var mz = Math.sqrt(1 - m2);
            L = .05 + .85 * Math.max(0, mdx * LX + mdy * LY + mz * LZ) * (.75 + .25 * hash2(Math.round(mdx * 3), Math.round(mdy * 3)));
          }
        }
        lum[i] = L;
      }
      paintCells(it.ctx, g, lum, glyph, cols);
    }

    function frame(ts) {
      raf = 0;
      var busy = false;
      items.forEach(function (it) {
        if (!it.g || !it.vis) return;
        var dt = it.last ? Math.min(ts - it.last, 250) / 1000 : 0;
        if (it.last && ts - it.last < 42 && it.k === it.goal) { busy = true; return; }
        it.last = ts;
        if (!reduced) it.t += dt;
        var was = it.k;
        it.k = reduced ? it.goal : it.goal > it.k ? Math.min(it.goal, it.k + dt / .75) : Math.max(it.goal, it.k - dt / .45);
        if (it.k >= 1 && it.goal === 1) it.li.classList.add('is-flat');
        render(it, it.t);
        // once the real screenshot covers the canvas there is nothing left to animate
        if (!(it.k >= 1 && was >= 1) && !(reduced && it.k === it.goal)) busy = true;
      });
      if (busy) kick();
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    function aim(it, on) {
      if (it.empty || !it.tex) on = false;
      it.goal = on ? 1 : 0;
      if (!on) it.li.classList.remove('is-flat');
      it.last = 0;
      if (reduced) { it.k = it.goal; if (it.g) render(it, it.t); if (on) it.li.classList.add('is-flat'); }
      kick();
    }

    lis.forEach(function (li, n) {
      var cv = li.querySelector('.orb__cv'), img = li.querySelector('img');
      var it = {
        li: li, cv: cv, ctx: cv.getContext('2d'), img: img, k: 0, goal: 0, t: 0, last: 0, vis: false, seed: n * .37 + .1,
        ring: li.hasAttribute('data-ring'), moon: li.hasAttribute('data-moon'), tilt: +(li.dataset.tilt || 0), empty: !img
      };
      items.push(it);
      setup(it);
      if (img) {
        img.loading = 'eager';
        if (!(img.complete && img.naturalWidth)) img.addEventListener('load', function () { sample(it); if (it.g) render(it, it.t); kick(); });
      }
      if (it.g) render(it, 0);
      if (!touch) {
        var a = li.querySelector('a');
        a.addEventListener('pointerenter', function () { aim(it, true); });
        a.addEventListener('pointerleave', function () { aim(it, false); });
        a.addEventListener('focus', function () { aim(it, true); });
        a.addEventListener('blur', function () { aim(it, false); });
      }
    });

    if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var it = items.filter(function (x) { return x.li === e.target; })[0];
          it.vis = e.isIntersecting;
          it.last = 0;
          if (it.vis) kick();
        });
      });
      items.forEach(function (it) { vio.observe(it.li); });
      if (touch) {
        // phones have no hover, so a planet unrolls once it sits in the middle of the screen
        var tio = new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            var it = items.filter(function (x) { return x.cv === e.target; })[0];
            aim(it, e.isIntersecting);
          });
        }, { rootMargin: '-30% 0px -30% 0px' });
        items.forEach(function (it) { tio.observe(it.cv); });
      }
    } else items.forEach(function (it) { it.vis = true; kick(); });

    addEventListener('resize', debounce(function () { items.forEach(function (it) { setup(it); if (it.g) render(it, it.t); }); }, 200));
    return function () { cols = shades(); items.forEach(function (it) { if (it.g) render(it, it.t); }); };
  }

  // moon phases for the four steps: the terminator sweeps into place when they scroll in
  function initMoons() {
    var cvs = document.querySelectorAll('.moon');
    if (!cvs.length) return null;
    var cols = shades(), list = [];
    function setup(m) {
      m.g = cellGrid(m.cv, m.cv.clientWidth < 120 ? 6 : 7);
      if (m.g) { var n = m.g.cols * m.g.rows; m.lum = new Float32Array(n); m.glyph = new Array(n); }
    }
    function render(m, ph) {
      var g = m.g;
      if (!g) return;
      var R = Math.min(g.W, g.H) * .46, cx = g.W / 2, cy = g.H / 2;
      var lx = Math.sin(ph), lz = Math.cos(ph);
      for (var r = 0; r < g.rows; r++) for (var c = 0; c < g.cols; c++) {
        var i = r * g.cols + c, x = (g.ox + (c + .5) * g.cw - cx) / R, y = (g.oy + (r + .5) * g.ch - cy) / R, d2 = x * x + y * y;
        m.glyph[i] = '';
        if (d2 >= 1) { m.lum[i] = -1; continue; }
        var nz = Math.sqrt(1 - d2), lat = Math.asin(y), lon = Math.atan2(x, nz);
        // maria and craters from a little value noise
        var n1 = hash2(Math.floor(lon * 2.2 + 9), Math.floor(lat * 2.2 + 9)), n2 = hash2(Math.floor(lon * 5 + 3), Math.floor(lat * 5 + 3));
        var tx = .62 + .22 * n1 + .16 * n2;
        var dif = Math.max(0, x * lx + nz * lz - y * .08);
        var soft = clamp(dif * 4, 0, 1);
        m.lum[i] = .07 + (tx * (.3 + .7 * dif)) * soft + (d2 > .86 ? .06 : 0);
      }
      paintCells(m.ctx, g, m.lum, m.glyph, cols);
    }
    function play(m) {
      if (m.played) return;
      m.played = true;
      if (reduced) return render(m, m.ph);
      var t0 = 0, from = Math.PI * .96;
      (function step(ts) {
        if (!t0) t0 = ts;
        var k = clamp((ts - t0) / 1600, 0, 1);
        render(m, from + (m.ph - from) * easeS(k));
        if (k < 1) requestAnimationFrame(step);
      })(performance.now());
    }
    cvs.forEach(function (cv, n) {
      var m = { cv: cv, ctx: cv.getContext('2d'), ph: +cv.dataset.phase, played: false };
      list.push(m);
      setup(m);
      render(m, Math.PI * .96);
    });
    if ('IntersectionObserver' in window && !reduced) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var i = list.findIndex(function (m) { return m.cv === e.target; });
          setTimeout(function () { play(list[i]); }, i * 220);
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -15% 0px' });
      list.forEach(function (m) { io.observe(m.cv); });
    } else list.forEach(play);
    addEventListener('resize', debounce(function () { list.forEach(function (m) { setup(m); render(m, m.played ? m.ph : Math.PI * .96); }); }, 200));
    return function () { cols = shades(); list.forEach(function (m) { render(m, m.played ? m.ph : Math.PI * .96); }); };
  }

  var orbs = initOrbs(), moons = initMoons();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (orbs) orbs(); if (moons) moons(); });

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
    var CT = Math.cos(-.32), ST = Math.sin(-.32), RS = .27, SQ = Math.sqrt(1 - RS * RS);
    var W = 0, H = 0, dpr = 1, cw = 7, ch = 13, cols = 0, rows = 0, RF = .34, PCY = .07;
    var atlas = null, aw = 0, ah = 0;
    var lum = null, mat = null, glyph = null, inSpace = null;
    var stars = [], now = 0, done = false, raf = 0, visible = true, last = 0;
    var LX = 0, LY = 0, ptr = null, ptrT = -1e9;

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
      var k = ease(seq(T_SPACE - .5, T_LOOK, t)), par = ease(seq(T_LOOK - .5, END, t));
      return { r: .025 + (RF - .025) * k, cy: -PCY * k + LY * .012 * par, cx: LX * .02 * par };
    }
    function dist(t) { return .035 * t + 2.4 * ease(seq(T_ZOOM + .5, T_SPACE + .9, t)); }
    // the light comes from wherever the cursor is, so moving it walks the terminator across the planet
    var LIT = [-.4, -.4, .82];
    function light() {
      var x = LX * .9 - .3, y = LY * .8 - .3, z = .8, n = Math.sqrt(x * x + y * y + z * z);
      LIT = [x / n, y / n, z / n];
    }
    function inRing(rd) { return rd > 1.32 && rd < 2.05 && Math.abs(rd - 1.7) > .05; }
    function ringShadow(x, y, nz) {
      var L = LIT;
      var px = x * CT + y * ST, py = -x * ST + y * CT;
      var lx = L[0] * CT + L[1] * ST, ly = -L[0] * ST + L[1] * CT, lz = L[2];
      var den = ly * SQ - lz * RS;
      if (Math.abs(den) < 1e-4) return false;
      var s = -(py * SQ - nz * RS) / den;
      if (s <= 0) return false;
      var a = px + s * lx, b = (py + s * ly) * RS + (nz + s * lz) * SQ;
      return inRing(Math.sqrt(a * a + b * b));
    }
    function surf(x, y, nz, t) {
      var L = LIT, dif = Math.max(0, x * L[0] + y * L[1] + nz * L[2]);
      var lat = Math.asin(clamp(y, -1, 1)), lon = Math.atan2(x, nz) + t * .12;
      var band = Math.sin(lat * 11 + .35 * Math.sin(lon * 3 + lat * 4));
      var sd = Math.sqrt(Math.pow(Math.sin((lon - 1.4) / 2) * 2.2, 2) + Math.pow((lat - .3) * 2.6, 2));
      var belt = band < -.2 || sd < .3;
      var tex = belt ? .5 + .18 * (band + 1) - (sd < .3 ? .15 * (1 - sd / .3) : 0) : .82 + .18 * band;
      var l = .07 + 1.02 * dif * tex + Math.pow(1 - nz, 4) * .2 * dif;
      if (dif > 0 && ringShadow(x, y, nz)) l = .05 + l * .25;
      return [l, belt ? 1 : 2];
    }

    function space(u, v, m, t) {
      var P = planetAt(t), x = (u / m - P.cx) / P.r, y = (v / m - P.cy) / P.r;
      var xr = x * CT + y * ST, yr = -x * ST + y * CT, ry = yr / RS, rd = Math.sqrt(xr * xr + ry * ry), ring = -1;
      if (inRing(rd)) {
        var ra = Math.atan2(ry, xr);
        ring = (.45 + .32 * (.5 + .5 * Math.sin(rd * 26)) + .1 * Math.sin(ra * 40 - t * 1.4 + rd * 9));
        ring *= 1 - .5 * Math.pow((rd - 1.32) / .73, 2);
        ring *= .7 + .3 * Math.max(0, LIT[2] + .3 * LIT[1]);
        if (yr < 0) ring *= .8;
      }
      var d2 = x * x + y * y;
      if (d2 < 1) {
        if (ring >= 0 && yr > 0) return [ring, 0];
        return surf(x, y, Math.sqrt(1 - d2), t);
      }
      if (ring >= 0) {
        // the planet's shadow falls across the ring behind it
        var rz = ry * SQ, pj = -(x * LIT[0] + y * LIT[1] + rz * LIT[2]);
        if (pj > 0 && x * x + y * y + rz * rz - pj * pj < 1) ring *= .22;
        return [ring, 0];
      }
      var d = Math.sqrt(d2);
      if (d < 1.12) return [.3 * (1 - (d - 1) / .12) * (.25 + .75 * Math.max(0, (x * LIT[0] + y * LIT[1]) / d + .2)), 1];
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
      // advance by capped steps: a stall (context menu, busy tab) pauses the film instead of skipping it
      now += (last ? Math.min(ts - last, 250) : 0) / 1000;
      last = ts;
      if (!done && now >= END) finish();
      steer(now);
      light();
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
          }
          lum[i] = l; mat[i] = res[1];
          var lv = clamp(Math.floor(l * LV), 0, LV - 1);
          var vr = hash(c, r) * 4 | 0;
          if (hash(c + flickT, r) < .04) vr = (vr + 1) & 3;
          glyph[i] = GI[RAMP[lv][vr]];
        }
      }
      if (t > T_ZOOM + .4) {
        var m = geo(t).m, fade = ease(seq(T_ZOOM + .4, T_ZOOM + 1.3, t)), Dn = dist(t), Dp = dist(t - .07);
        var px = .02 * ease(seq(T_LOOK - .5, END, t));
        for (var s = 0; s < stars.length; s++) {
          var S = stars[s], z = fr(S.z - Dn), zp = fr(S.z - Dp);
          var zz = .03 + .97 * z, hc = sc((S.x * .32 - LX * px) / zz * m), hr = sr((S.y * .32 - LY * px) / zz * m);
          var b = clamp(1.2 - zz, .15, 1) * fade;
          if (zp > z) {
            var zzp = .03 + .97 * zp, pc = sc((S.x * .32 - LX * px) / zzp * m), pr = sr((S.y * .32 - LY * px) / zzp * m);
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
      sec.classList.add('is-done');
    }
    function kick() { if (!raf && visible && !reduced) raf = requestAnimationFrame(frame); }
    function jump() { finish(); now = END; LX = LY = 0; light(); paint(); }

    if (skip) skip.addEventListener('click', jump);
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

  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
})();
