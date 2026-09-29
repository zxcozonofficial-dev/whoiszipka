



import { $, clamp, rand, tick, palette, onTheme, mix, rgbStr, reduced, watchVisible, debounce } from './core.js';

const LOGO_W = 168;
const LOGO_H = 43;
const SPLIT_A = [0, 75];   
const SPLIT_B = [77, 168]; 
const WORDS = ['ДИЗАЙН', 'КОД', 'БОТЫ', 'САЙТЫ'];
const WORD_FONT = '"Pixelify Sans", "Unbounded", system-ui, sans-serif';

const K = 0.055;       
const DAMP = 0.84;     
const BUCKETS = 6;     

export function initHero() {
  const section = $('.hero');
  const canvas = $('.hero__canvas');
  const mark = $('.hero__mark');
  const pathEl = $('#logo-path');
  if (!section || !canvas || !mark || !pathEl) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const still = reduced();
  const logoBits = rasterPath(pathEl.getAttribute('d'), LOGO_W, LOGO_H);

  let W = 0; let H = 0; let dpr = 1;
  let cell = 6; let size = 5;
  let box = { x: 0, y: 0, w: 0, h: 0 };
  let targets = new Map();
  let currentKey = 'logo';
  let wordIdx = -1;

  let N = 0;
  let px, py, vx, vy, hx, hy, heat, delay;
  let bucketIdx = [];
  let bucketLen = new Int32Array(BUCKETS);
  let colors = [];

  let T = 44; let tCols = 0; let tRows = 0; let tOx = 0; let tOy = 0;
  let trail = new Float32Array(0);
  let trailLive = false;

  const mouse = { x: -1e4, y: -1e4, vx: 0, vy: 0, inside: false, t: 0 };
  let started = false;
  let visible = true;
  let dirty = true;
  let nextGlitch = 0;
  let fontReady = null;
  let trailColor = [255, 75, 31];

  function buildColors() {
    const p = palette();
    colors = [];
    for (let b = 0; b < BUCKETS; b++) colors.push(rgbStr(mix(p.ink, p.accent, b / (BUCKETS - 1))));
    trailColor = p.accent;
    dirty = true;
  }

  

  function layout() {
    const r = section.getBoundingClientRect();
    W = Math.round(r.width);
    H = Math.round(r.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const m = mark.getBoundingClientRect();
    box = { x: m.left - r.left, y: m.top - r.top, w: m.width, h: m.height };

    const stacked = window.matchMedia('(max-width: 760px)').matches;
    let grid = stacked ? stackLogo(logoBits) : { w: LOGO_W, h: LOGO_H, bits: logoBits };
    let c = Math.min(box.w / grid.w, box.h / grid.h);
    if (c < 2.5) {
      grid = downsample(grid);
      c = Math.min(box.w / grid.w, box.h / grid.h);
    }
    cell = Math.max(1.5, Math.floor(c * dpr) / dpr);
    const gap = cell >= 6 ? 1 : cell >= 3.5 ? 0.5 : 0;
    size = cell - gap;

    const gw = grid.w * cell;
    const gh = grid.h * cell;
    const ox = Math.round((box.x + (box.w - gw) / 2) * dpr) / dpr;
    const oy = Math.round((box.y + (box.h - gh) / 2) * dpr) / dpr;

    targets = new Map();
    targets.set('logo', gridToTarget(grid, ox, oy, cell));
    const cols = Math.floor(box.w / cell);
    const rows = Math.floor(box.h / cell);
    const snap = (v) => Math.round(v * dpr) / dpr;
    targets.set('_dims', { cols, rows, ox: snap(box.x + (box.w - cols * cell) / 2), oy: snap(box.y + (box.h - rows * cell) / 2) });

    
    T = Math.max(32, Math.round(cell * 6));
    tOx = ((ox % T) + T) % T - T;
    tOy = ((oy % T) + T) % T - T;
    tCols = Math.ceil((W - tOx) / T) + 1;
    tRows = Math.ceil((H - tOy) / T) + 1;
    trail = new Float32Array(tCols * tRows);
    section.style.setProperty('--cell', `${T}px`);
    section.style.setProperty('--cell-x', `${tOx}px`);
    section.style.setProperty('--cell-y', `${tOy}px`);

    const logo = targets.get('logo');
    ensurePool(Math.max(logo.length / 2, 800));
    const t = targetFor(currentKey) || logo;
    assign(t, !started);
    dirty = true;
  }

  function ensurePool(count) {
    count = Math.ceil(count);
    if (count <= N) return;
    const grow = (arr, fill = 0) => {
      const next = new Float32Array(count);
      if (arr) next.set(arr.subarray(0, Math.min(arr.length, count)));
      if (fill) next.fill(fill, arr ? arr.length : 0);
      return next;
    };
    const prevN = N;
    px = grow(px); py = grow(py); vx = grow(vx); vy = grow(vy);
    hx = grow(hx); hy = grow(hy); heat = grow(heat); delay = grow(delay);
    for (let i = prevN; i < count; i++) {
      px[i] = rand(0, W); py[i] = started ? rand(0, H) : -9999;
    }
    N = count;
    bucketIdx = Array.from({ length: BUCKETS }, () => new Int32Array(N));
  }

  function targetFor(key) {
    if (targets.has(key)) return targets.get(key);
    if (key === 'logo') return targets.get('logo');
    const d = targets.get('_dims');
    if (!d) return null;
    const grid = textGrid(key, d.cols, d.rows);
    if (!grid) return null;
    const t = gridToTarget(grid, d.ox, d.oy, cell);
    targets.set(key, t);
    return t;
  }

  
  function assign(t, instant) {
    const M = t.length / 2;
    if (!M) return;
    ensurePool(M);
    const order = Array.from({ length: N }, (_, i) => i);
    order.sort((a, b) => (px[a] + py[a] * 0.15) - (px[b] + py[b] * 0.15));
    const torder = Array.from({ length: M }, (_, i) => i);
    torder.sort((a, b) => (t[a * 2] + t[a * 2 + 1] * 0.15) - (t[b * 2] + t[b * 2 + 1] * 0.15));
    for (let k = 0; k < N; k++) {
      const i = order[k];
      const j = torder[Math.min(M - 1, Math.floor((k * M) / N))];
      hx[i] = t[j * 2];
      hy[i] = t[j * 2 + 1];
      if (instant) { px[i] = hx[i]; py[i] = hy[i]; vx[i] = 0; vy[i] = 0; }
    }
    dirty = true;
  }

  

  function start() {
    if (started) return;
    started = true;
    document.documentElement.classList.add('hero-live');
    if (still) { snapHome(); render(); return; }
    const left = box.x;
    const width = Math.max(1, box.w);
    const mid = box.y + box.h / 2;
    for (let i = 0; i < N; i++) {
      const fromTop = hy[i] < mid;
      px[i] = hx[i] + rand(-30, 30);
      py[i] = fromTop ? -rand(40, 260) - (mid - hy[i]) : H + rand(40, 260) + (hy[i] - mid);
      vx[i] = 0;
      vy[i] = fromTop ? rand(6, 14) : -rand(6, 14);
      delay[i] = ((hx[i] - left) / width) * 0.75 + rand(0, 0.12);
      heat[i] = rand(0.2, 1);
    }
    dirty = true;
    nextGlitch = performance.now() + 3500;
  }

  function snapHome() {
    for (let i = 0; i < N; i++) { px[i] = hx[i]; py[i] = hy[i]; vx[i] = 0; vy[i] = 0; heat[i] = 0; delay[i] = 0; }
    dirty = true;
  }

  

  function shock(x, y, power = 1) {
    const R = Math.max(220, cell * 42) * power;
    for (let i = 0; i < N; i++) {
      const dx = px[i] + size / 2 - x;
      const dy = py[i] + size / 2 - y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > R) continue;
      const f = Math.pow(1 - d / R, 1.4) * (14 + cell * 1.6) * power;
      vx[i] += (dx / d) * f + rand(-1, 1);
      vy[i] += (dy / d) * f + rand(-1, 1);
      heat[i] = Math.max(heat[i], 1 - d / R);
    }
    dirty = true;
  }

  async function morph(key, at) {
    if (!started) return;
    if (key !== 'logo' && !targets.has(key)) {
      await loadFont();
    }
    const t = targetFor(key) || targets.get('logo');
    currentKey = targets.has(key) ? key : 'logo';
    if (still) { assign(t, true); render(); return; }
    shock(at ? at.x : box.x + box.w / 2, at ? at.y : box.y + box.h / 2, at ? 1 : 1.4);
    setTimeout(() => assign(t, false), 90);
  }

  function nextWord(at) {
    wordIdx = (wordIdx + 1) % (WORDS.length + 1);
    morph(wordIdx === WORDS.length ? 'logo' : WORDS[wordIdx], at);
  }

  function loadFont() {
    if (!fontReady) {
      const load = document.fonts
        ? document.fonts.load(`700 48px ${WORD_FONT}`, 'ДИЗАЙНКОДБОТЫСАЙТЫZXC').catch(() => null)
        : Promise.resolve();
      fontReady = Promise.race([load, new Promise((r) => setTimeout(r, 900))]);
    }
    return fontReady;
  }

  function local(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  let down = null;
  section.addEventListener('pointerenter', () => { loadFont(); });
  section.addEventListener('pointermove', (e) => {
    const p = local(e);
    const now = performance.now();
    const dt = Math.max(8, now - mouse.t) / 16.7;
    if (mouse.inside) {
      mouse.vx = clamp((p.x - mouse.x) / dt, -40, 40);
      mouse.vy = clamp((p.y - mouse.y) / dt, -40, 40);
    }
    mouse.x = p.x; mouse.y = p.y; mouse.t = now; mouse.inside = true;
    const cx = Math.floor((p.x - tOx) / T);
    const cy = Math.floor((p.y - tOy) / T);
    if (cx >= 0 && cy >= 0 && cx < tCols && cy < tRows) { trail[cy * tCols + cx] = 1; trailLive = true; }
    dirty = true;
  }, { passive: true });
  section.addEventListener('pointerleave', () => { mouse.inside = false; mouse.vx = 0; mouse.vy = 0; });
  section.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button')) return;
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    loadFont();
  });
  section.addEventListener('pointerup', (e) => {
    if (!down || e.target.closest('a, button')) { down = null; return; }
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 450;
    down = null;
    if (moved < 12 && quick) nextWord(local(e));
    if (e.pointerType !== 'mouse') mouse.inside = false;
  });
  section.addEventListener('pointercancel', () => { down = null; mouse.inside = false; });

  

  function step(dt, now) {
    if (!started || !visible || still) return;
    const f = Math.min(3, dt * 60);
    const damp = Math.pow(DAMP, f);
    const cool = Math.pow(0.95, f);
    const R = clamp(cell * 14, 70, 170);
    const R2 = R * R;
    const force = (1.6 + cell * 0.32) * f;
    const half = size / 2;
    const mIn = mouse.inside;
    const mx = mouse.x; const my = mouse.y;
    const mvx = mouse.vx; const mvy = mouse.vy;
    let active = false;

    if (now > nextGlitch) glitch(now);

    for (let i = 0; i < N; i++) {
      if (delay[i] > 0) {
        delay[i] -= dt;
        active = true;
        if (delay[i] > 0) continue;
      }
      let x = px[i]; let y = py[i]; let ux = vx[i]; let uy = vy[i];
      const dx = hx[i] - x;
      const dy = hy[i] - y;
      ux += dx * K * f;
      uy += dy * K * f;
      if (mIn) {
        const ex = x + half - mx;
        const ey = y + half - my;
        const d2 = ex * ex + ey * ey;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1;
          const fall = 1 - d / R;
          const s = fall * fall * force;
          ux += (ex / d) * s + mvx * fall * 0.05 * f;
          uy += (ey / d) * s + mvy * fall * 0.05 * f;
          if (fall > heat[i]) heat[i] = fall;
        }
      }
      ux *= damp; uy *= damp;
      x += ux * f; y += uy * f;
      if (Math.abs(ux) + Math.abs(uy) < 0.02 && Math.abs(dx) + Math.abs(dy) < 0.08) {
        x = hx[i]; y = hy[i]; ux = 0; uy = 0;
      } else active = true;
      px[i] = x; py[i] = y; vx[i] = ux; vy[i] = uy;
      if (heat[i] > 0.003) { heat[i] *= cool; active = true; } else heat[i] = 0;
    }

    mouse.vx *= 0.8; mouse.vy *= 0.8;

    if (trailLive) {
      const tc = Math.pow(0.9, f);
      let any = false;
      for (let i = 0; i < trail.length; i++) {
        if (trail[i] > 0.01) { trail[i] *= tc; any = true; } else trail[i] = 0;
      }
      trailLive = any;
      active = true;
    }

    if (active || dirty) render();
    dirty = false;
  }

  function glitch(now) {
    nextGlitch = now + rand(2600, 6200);
    if (mouse.inside) return;
    const t = targets.get(currentKey) || targets.get('logo');
    if (!t || !t.length) return;
    const y0 = t[1 + 2 * Math.floor(Math.random() * (t.length / 2))];
    const band = cell * Math.round(rand(2, 6));
    const kick = (Math.random() < 0.5 ? -1 : 1) * rand(5, 11);
    for (let i = 0; i < N; i++) {
      if (hy[i] >= y0 && hy[i] < y0 + band) { vx[i] += kick; heat[i] = Math.max(heat[i], 0.55); }
    }
    dirty = true;
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    if (trailLive) {
      const [r, g, b] = trailColor;
      for (let y = 0; y < tRows; y++) {
        for (let x = 0; x < tCols; x++) {
          const v = trail[y * tCols + x];
          if (v < 0.02) continue;
          ctx.fillStyle = `rgba(${r},${g},${b},${(v * 0.16).toFixed(3)})`;
          ctx.fillRect(tOx + x * T + 1, tOy + y * T + 1, T - 1, T - 1);
        }
      }
    }

    bucketLen.fill(0);
    for (let i = 0; i < N; i++) {
      if (delay[i] > 0) continue;
      const b = heat[i] > 0.02 ? Math.min(BUCKETS - 1, 1 + Math.floor(heat[i] * (BUCKETS - 1))) : 0;
      bucketIdx[b][bucketLen[b]++] = i;
    }
    for (let b = 0; b < BUCKETS; b++) {
      const n = bucketLen[b];
      if (!n) continue;
      const list = bucketIdx[b];
      ctx.beginPath();
      for (let k = 0; k < n; k++) {
        const i = list[k];
        ctx.rect(px[i], py[i], size, size);
      }
      ctx.fillStyle = colors[b];
      ctx.fill();
    }
  }

  

  buildColors();
  layout();
  onTheme(() => { buildColors(); if (still) render(); });
  watchVisible(section, (v) => { visible = v; if (v) dirty = true; });
  window.addEventListener('resize', debounce(() => {
    const keep = currentKey;
    layout();
    if (started) {
      const t = targetFor(keep) || targets.get('logo');
      assign(t, still);
    }
    if (still) render();
  }, 180));
  document.fonts?.ready.then(() => { if (!started) layout(); });
  tick(step);

  return { start, morph, nextWord, shock: (x, y) => shock(x, y) };
}



export function rasterPath(d, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000';
  g.fill(new Path2D(d));
  const data = g.getImageData(0, 0, w, h).data;
  const bits = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) bits[i] = data[i * 4 + 3] > 127 ? 1 : 0;
  return bits;
}

function stackLogo(bits) {
  const wa = SPLIT_A[1] - SPLIT_A[0];
  const wb = SPLIT_B[1] - SPLIT_B[0];
  const w = Math.max(wa, wb);
  const gapRows = 4;
  const h = LOGO_H * 2 + gapRows;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < LOGO_H; y++) {
    for (let x = 0; x < wa; x++) out[y * w + x] = bits[y * LOGO_W + SPLIT_A[0] + x];
    for (let x = 0; x < wb; x++) out[(y + LOGO_H + gapRows) * w + (w - wb) + x] = bits[y * LOGO_W + SPLIT_B[0] + x];
  }
  return { w, h, bits: out };
}

function downsample(grid) {
  const w = Math.ceil(grid.w / 2);
  const h = Math.ceil(grid.h / 2);
  const bits = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const sx = x * 2 + dx; const sy = y * 2 + dy;
        if (sx < grid.w && sy < grid.h) s += grid.bits[sy * grid.w + sx];
      }
      bits[y * w + x] = s >= 2 ? 1 : 0;
    }
  }
  return { w, h, bits };
}

function gridToTarget(grid, ox, oy, cell) {
  const pts = [];
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      if (grid.bits[y * grid.w + x]) pts.push(ox + x * cell, oy + y * cell);
    }
  }
  return Float32Array.from(pts);
}

function textGrid(text, cols, rows) {
  if (cols < 4 || rows < 4) return null;
  const c = document.createElement('canvas');
  c.width = cols; c.height = rows;
  const g = c.getContext('2d', { willReadFrequently: true });
  const font = (s) => `700 ${s}px ${WORD_FONT}`;
  g.font = font(100);
  const m = g.measureText(text);
  const w100 = m.width || 1;
  const h100 = (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) || 72;
  const s = Math.max(6, Math.floor(100 * Math.min((cols * 0.94) / w100, (rows * 0.74) / h100)));
  g.font = font(s);
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  const m2 = g.measureText(text);
  const y = (rows + m2.actualBoundingBoxAscent - m2.actualBoundingBoxDescent) / 2;
  g.fillStyle = '#000';
  g.fillText(text, cols / 2, Math.round(y));
  const data = g.getImageData(0, 0, cols, rows).data;
  const bits = new Uint8Array(cols * rows);
  let any = 0;
  for (let i = 0; i < cols * rows; i++) { bits[i] = data[i * 4 + 3] > 110 ? 1 : 0; any += bits[i]; }
  return any ? { w: cols, h: rows, bits } : null;
}
