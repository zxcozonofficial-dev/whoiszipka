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
    delete doc.dataset.tone;
    seasonBtn.setAttribute('aria-pressed', String(on));
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

  function zipTeeth(ctx, len, wfn, dfn, extra, lim, pal) {
    var P = 6.5, n = Math.ceil(len / P) + 1;
    var light = rgb(pal.metal), dark = rgb(pal.metalD);
    for (var i = 0; i < n; i++) {
      var y = i * P, o = wfn(y) + extra;
      if (o > lim) continue;
      var a = Math.atan(dfn(y)), left = i % 2 === 0, x0 = left ? -7 : -3;
      ctx.save();
      ctx.translate(left ? -o : o, y);
      ctx.rotate(left ? a : -a);
      ctx.fillStyle = light;
      ctx.fillRect(x0, -2.25, 10, 4.5);
      ctx.fillStyle = dark;
      ctx.fillRect(x0, .75, 10, 1.5);
      ctx.restore();
    }
  }

  function zipSlider(ctx, ang, pal) {
    var out = rgb(pal.out), metal = rgb(pal.metal), metalD = rgb(pal.metalD), acc = rgb(pal.acc);
    ctx.fillStyle = out;
    ctx.beginPath(); ctx.moveTo(-18, -32); ctx.lineTo(18, -32); ctx.lineTo(13, 12); ctx.lineTo(-13, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = metal;
    ctx.beginPath(); ctx.moveTo(-15.5, -29.5); ctx.lineTo(15.5, -29.5); ctx.lineTo(11, 9.5); ctx.lineTo(-11, 9.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = metalD;
    ctx.beginPath(); ctx.moveTo(8.5, -29.5); ctx.lineTo(15.5, -29.5); ctx.lineTo(11, 9.5); ctx.lineTo(6.5, 9.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-10.5, -25, 2.5, 27);
    ctx.fillStyle = out;
    ctx.beginPath(); ctx.moveTo(-5, -32); ctx.lineTo(5, -32); ctx.lineTo(0, -21); ctx.closePath(); ctx.fill();

    ctx.save();
    ctx.translate(0, -7);
    ctx.rotate(ang);
    ctx.fillStyle = out; rr(ctx, -11.5, -2.5, 23, 77, 6);
    ctx.fillStyle = acc; rr(ctx, -9, 0, 18, 72, 4);
    ctx.fillStyle = rgb(mix(pal.acc, [255, 255, 255], .55)); ctx.fillRect(-6.5, 24, 2, 20);
    ctx.fillStyle = rgb(mix(pal.acc, [0, 0, 0], .3)); ctx.fillRect(5, 4, 2.5, 64);
    ctx.fillStyle = out; rr(ctx, -4.5, 5, 9, 14, 2); rr(ctx, -4, 49, 8, 15, 2);
    ctx.restore();

    ctx.fillStyle = out; rr(ctx, -6.5, -17, 13, 21, 3);
    ctx.fillStyle = metalD; rr(ctx, -4, -14.5, 8, 16, 2);
    ctx.fillStyle = metal; ctx.fillRect(-2.5, -13, 2, 12);
  }

  var zip = initZip();
  var cord = initCord();
  function repaint() { if (zip) zip(); if (cord) cord(); toneLabel(); }
  toneLabel();
  var toneBtn = document.querySelector('.end__tone');
  if (toneBtn) toneBtn.addEventListener('click', nextTone);
  if (seasonBtn) seasonBtn.addEventListener('click', repaint);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (zip) zip(); });

  (function hem() {
    var c = document.createElement('canvas'), k = 3;
    c.width = 4 * k; c.height = 32 * k;
    var g = c.getContext('2d');
    g.fillStyle = '#000';
    for (var r = 0; r < 32; r++) for (var x = 0; x < 4; x++) {
      if ((BAYER[(r & 3) * 4 + x] + .5) / 16 < Math.pow((r + 1) / 32, 1.15)) g.fillRect(x * k, r * k, k, k);
    }
    doc.style.setProperty('--hem', 'url(' + c.toDataURL() + ')');
  })();

  function initZip() {
    var sec = document.querySelector('.hero'), cv = document.getElementById('zip');
    if (!sec || !cv || reduced || !window.Path2D) return null;
    var stage = sec.querySelector('.zip__stage'), grab = sec.querySelector('.zip__grab');
    var hint = sec.querySelector('.zip__hint'), handsEl = sec.querySelector('.hands');
    var ctx = cv.getContext('2d');
    var JUST = new Path2D('M122 -560H316V200H100L0 100V40H122ZM122 -606V-726H316V-606Z M814 -560V0H488L360 -128V-560H554V-168H620V-560Z M857 0V-152H1065V-233H857V-448L969 -560H1259V-408H1051V-329H1259V-111L1148 0Z M1302 -650 1496 -700V-540H1620V-380H1496V-160H1620V0H1430L1302 -128Z');
    var ZIPKA = new Path2D('M1640 0V-140L1784 -400H1644V-560H1994V-420L1850 -160H1998V0Z M2030 0V-560H2224V0ZM2030 -606V-726H2224V-606Z M2268 140V-560H2594L2722 -432V-128L2594 0H2462V140ZM2528 -400H2462V-160H2528Z M2765 0V-700H2959V-371H2989L3033 -560H3234L3150 -301L3243 0H3040L2992 -211H2959V0Z M3257 -112V-328L3499 -338V-400H3267V-560H3557L3685 -432V0H3369ZM3443 -233V-152H3499V-252Z');
    var W = 0, H = 0, dpr = 1, cx = 0, cloth = [null, null], shade = null, pal = null, portrait = false;
    var p = 0, s = 0, s0 = 0, sEnd = 0, spread = 0, A = 0;
    var ang = 0, angV = 0, lastS = null, raf = 0, drag = null;
    doc.classList.add('zip-on');

    function wOf(y) { return y >= s ? 0 : A * (1 - Math.exp(-1.6 * (s - y) / H)) / .798; }
    function dW(y) { return y >= s ? 0 : -A * 1.6 / (.798 * H) * Math.exp(-1.6 * (s - y) / H); }

    function makeCloth(side) {
      var cw = side < 0 ? cx : cv.width - cx, ch = cv.height;
      var c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      var g = c.getContext('2d');
      var PX = Math.max(2, Math.round(3 * dpr)), lw = Math.ceil(cw / PX), lh = Math.ceil(ch / PX);
      var t = document.createElement('canvas');
      t.width = lw; t.height = lh;
      var tg = t.getContext('2d'), im = tg.createImageData(lw, lh), d = im.data;
      var sh = [mix(pal.bg, [0, 0, 0], .5), mix(pal.bg, [0, 0, 0], .12), pal.bg2, mix(pal.bg2, pal.acc, .1), mix(pal.bg2, pal.acc, .22)];
      for (var y = 0; y < lh; y++) for (var x = 0; x < lw; x++) {
        var u = (side < 0 ? x * PX : cx + x * PX) / cv.width, v = y * PX / ch, e = Math.abs(u - .5) * 2;
        var lum = .62
          + .17 * Math.sin((u * 3.1 + v * 1.7) * 3.2 + Math.sin(v * 5) * .6)
          + .07 * Math.sin(u * 17 - v * 9)
          - .3 * e * e - .2 * v * v;
        var lv = clamp(Math.floor(lum * 4 + (BAYER[(y & 3) * 4 + (x & 3)] + .5) / 16 - .5), 0, 4), o = (y * lw + x) * 4;
        d[o] = sh[lv][0]; d[o + 1] = sh[lv][1]; d[o + 2] = sh[lv][2]; d[o + 3] = 255;
      }
      tg.putImageData(im, 0, 0);
      g.imageSmoothingEnabled = false;
      g.drawImage(t, 0, 0, lw, lh, 0, 0, lw * PX, lh * PX);

      g.scale(dpr, dpr);
      var hw = cw / dpr, ie = side < 0 ? hw : 0;
      g.fillStyle = rgb(mix(pal.bg, [0, 0, 0], .4));
      g.fillRect(side < 0 ? hw - 17 : 0, 0, 17, H);
      g.strokeStyle = rgb(pal.ink3);
      g.lineWidth = 1.5;
      g.setLineDash([7, 5]);
      [22, 27].forEach(function (off, i) {
        g.globalAlpha = i ? .45 : 1;
        g.beginPath(); g.moveTo(ie + side * off, 0); g.lineTo(ie + side * off, H); g.stroke();
      });
      g.globalAlpha = 1;
      g.setLineDash([]);

      var gut = clamp(W * .04, 16, 48), k;
      g.fillStyle = rgb(pal.ink);
      g.save();
      if (portrait) {
        var gap = 36, y0 = H * .31;
        k = Math.min((hw - gap - 12) / 926, H * .46 / 2045);
        if (side < 0) { g.translate(hw - gap - 726 * k, y0); g.rotate(Math.PI / 2); g.scale(k, k); g.fill(JUST); }
        else { g.translate(gap + 140 * k, y0); g.rotate(Math.PI / 2); g.scale(k, k); g.translate(-1640, 0); g.fill(ZIPKA); }
      } else {
        var gp = 50, base;
        k = Math.min((hw - gut - gp) / 2045, H * .3 / 926);
        base = H * .52 + 280 * k;
        if (side < 0) { g.translate(hw - gp - 1620 * k, base); g.scale(k, k); g.fill(JUST); }
        else { g.translate(gp - 1640 * k, base); g.scale(k, k); g.fill(ZIPKA); }
      }
      g.restore();
      if (!portrait) {
        g.font = '500 11px "JetBrains Mono", monospace';
        g.fillStyle = rgb(pal.ink3);
        g.textBaseline = 'alphabetic';
        if (side < 0) { g.textAlign = 'left'; g.fillText('ВЕБ-ДИЗАЙНЕР И РАЗРАБОТЧИК', gut, H - 30); }
        else { g.textAlign = 'right'; g.fillText('САЙТЫ / ДИЗАЙН / TELEGRAM-БОТЫ / MINI APPS', hw - gut, H - 30); }
      }
      return c;
    }

    function makeShade() {
      var cell = Math.max(2, Math.round(2 * dpr));
      var mk = function (pts, alpha) {
        var c = document.createElement('canvas');
        c.width = c.height = cell * 4;
        var g = c.getContext('2d');
        g.fillStyle = 'rgba(0,0,0,' + alpha + ')';
        pts.forEach(function (q) { g.fillRect(q[0] * cell, q[1] * cell, cell, cell); });
        return ctx.createPattern(c, 'repeat');
      };
      return {
        a: mk([[0, 0], [2, 0], [1, 1], [3, 1], [0, 2], [2, 2], [1, 3], [3, 3]], .5),
        b: mk([[0, 0], [2, 2]], .5),
      };
    }

    function build() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = stage.clientWidth;
      H = stage.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cx = Math.round(cv.width / 2);
      portrait = W < H * .8;
      s0 = H * (portrait ? .2 : .25);
      sEnd = H + 100;
      A = Math.min(W * .3, H * .5);
      pal = readPal();
      cloth[0] = makeCloth(-1);
      cloth[1] = makeCloth(1);
      shade = makeShade();
      kick();
    }

    function draw() {
      var CW = cv.width, CH = cv.height, L = cloth[0], R = cloth[1];
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, CW, CH);
      if (spread >= W / 2 + 60) return;
      var SH = Math.max(2, Math.round(2 * dpr)), sd = clamp(Math.round(s * dpr), 0, CH), sp = spread * dpr;
      var bA = Math.round(6 * dpr), bB = Math.round(16 * dpr);
      for (var y = 0; y < sd; y += SH) {
        var h = Math.min(SH, sd - y), o = Math.round(wOf((y + h / 2) / dpr) * dpr + sp);
        ctx.drawImage(L, 0, y, L.width, h, -o, y, L.width, h);
        ctx.drawImage(R, 0, y, R.width, h, cx + o, y, R.width, h);
        if (o > 3) {
          var wb = Math.min(bB, o), wa = Math.min(bA, o);
          ctx.fillStyle = shade.b; ctx.fillRect(cx - o, y, wb, h); ctx.fillRect(cx + o - wb, y, wb, h);
          ctx.fillStyle = shade.a; ctx.fillRect(cx - o, y, wa, h); ctx.fillRect(cx + o - wa, y, wa, h);
        }
      }
      if (sd < CH) {
        ctx.drawImage(L, 0, sd, L.width, CH - sd, 0, sd, L.width, CH - sd);
        ctx.drawImage(R, 0, sd, R.width, CH - sd, cx, sd, R.width, CH - sd);
      }
      ctx.setTransform(dpr, 0, 0, dpr, cx, 0);
      zipTeeth(ctx, H, wOf, dW, spread, W / 2 + 12, pal);
      if (s < H + 50) {
        ctx.translate(0, s);
        zipSlider(ctx, ang, pal);
      }
    }

    function frame() {
      raf = 0;
      var r = sec.getBoundingClientRect(), len = r.height - innerHeight;
      if (r.bottom < -20) { lastS = null; return; }
      p = len > 0 ? clamp(-r.top / len, 0, 1) : 1;
      var ps = clamp((p - .6) / .4, 0, 1);
      s = s0 + (sEnd - s0) * Math.min(1, p / .6);
      spread = (W / 2 + 70) * ps * ps * (3 - 2 * ps);
      var vs = lastS === null ? 0 : s - lastS;
      lastS = s;
      angV += clamp(vs, -40, 40) * .0012 - ang * .05 - angV * .07;
      ang = clamp(ang + angV, -1.1, 1.1);
      draw();
      var yl = H * (portrait ? .2 : .36), yr = H * (portrait ? .74 : .72);
      handsEl.style.setProperty('--pl', (wOf(yl) + spread).toFixed(1));
      handsEl.style.setProperty('--pr', (wOf(yr) + spread).toFixed(1));
      hint.style.opacity = clamp(1 - p * 9, 0, 1);
      hint.style.transform = 'translateY(' + (s - 36).toFixed(1) + 'px)';
      grab.style.transform = 'translate(' + (W / 2 - 32) + 'px,' + (s - 40) + 'px)';
      grab.style.visibility = s < H && !spread ? 'visible' : 'hidden';
      if (drag || Math.abs(ang) > .003 || Math.abs(angV) > .003) kick();
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    addEventListener('scroll', kick, { passive: true });
    addEventListener('resize', debounce(function () {
      if (stage.clientWidth !== W || stage.clientHeight !== H) build();
    }, 120));
    setInterval(function () {
      if (p < .01 && !drag && !document.hidden) { angV += .055; kick(); }
    }, 3600);
    stage.addEventListener('pointermove', function (e) {
      if (drag || s > H) return;
      var dx = e.clientX - W / 2, dy = e.clientY - (s + 30);
      if (dx * dx + dy * dy < 70 * 70) { angV -= clamp(e.movementX || 0, -30, 30) * .0016; kick(); }
    }, { passive: true });

    function secLen() { return sec.offsetHeight - innerHeight; }
    function secTop() { return sec.getBoundingClientRect().top + scrollY; }
    grab.addEventListener('pointerdown', function (e) {
      drag = { dy: e.clientY - s, pu: 0 };
      grab.setPointerCapture(e.pointerId);
      doc.classList.add('is-zipping');
      e.preventDefault();
      kick();
    });
    grab.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var pu = clamp((e.clientY - drag.dy - s0) / (sEnd - s0), 0, 1);
      drag.pu = pu;
      angV -= clamp(e.movementX || 0, -30, 30) * .002;
      scrollTo({ top: secTop() + pu * .6 * secLen(), behavior: 'instant' });
    });
    var drop = function () {
      if (!drag) return;
      var far = drag.pu > .8;
      drag = null;
      doc.classList.remove('is-zipping');
      if (far) scrollTo({ top: secTop() + secLen(), behavior: 'smooth' });
    };
    grab.addEventListener('pointerup', drop);
    grab.addEventListener('pointercancel', drop);

    build();
    return build;
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
