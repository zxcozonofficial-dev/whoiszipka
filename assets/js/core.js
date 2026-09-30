


export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const media = {
  reduced: window.matchMedia('(prefers-reduced-motion: reduce)'),
  fine: window.matchMedia('(hover: hover) and (pointer: fine)'),
};
export const reduced = () => media.reduced.matches;

export function debounce(fn, ms = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}



const subs = new Set();
let last = 0;
let running = false;

function frame(t) {
  const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60;
  last = t;
  for (const fn of subs) {
    try { fn(dt, t); } catch (e) { subs.delete(fn); console.warn('[zipka] tick', e); }
  }
  requestAnimationFrame(frame);
}

export function tick(fn) {
  subs.add(fn);
  if (!running) {
    running = true;
    requestAnimationFrame(frame);
  }
  return () => subs.delete(fn);
}



export const scroll = { y: window.scrollY, v: 0, dir: 1 };
let prevY = window.scrollY;

tick((dt) => {
  const y = window.scrollY;
  const inst = (y - prevY) / Math.max(dt, 1 / 240);
  prevY = y;
  scroll.v = damp(scroll.v, inst, 8, dt);
  if (Math.abs(y - scroll.y) > 0.5) scroll.dir = y > scroll.y ? 1 : -1;
  scroll.y = y;
});



let colors = null;

function hexToRgb(hex) {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a, b, t) {
  return [0, 1, 2].map((i) => Math.round(lerp(a[i], b[i], t)));
}

export const rgbStr = (c, a = 1) => (a >= 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`);

export function palette() {
  if (colors) return colors;
  const cs = getComputedStyle(document.documentElement);
  const get = (name, fallback) => {
    const v = cs.getPropertyValue(name).trim();
    return v.startsWith('#') ? hexToRgb(v) : hexToRgb(fallback);
  };
  colors = {
    bg: get('--bg-raw', '#0a0a0a'),
    ink: get('--ink-raw', '#f2f2f2'),
    ink3: get('--ink-3', '#858585'),
    line: get('--line', '#242424'),
    line2: get('--line-2', '#363636'),
    accent: get('--accent', '#f2f2f2'),
    heat: get('--heat', '#6e6e6e'),
  };
  return colors;
}

export function themeChanged() {
  colors = null;
  document.dispatchEvent(new CustomEvent('zipka:theme'));
}

export const onTheme = (fn) => document.addEventListener('zipka:theme', fn);



let toastTimer = 0;
export function toast(msg, ms = 2200) {
  const el = $('.toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), ms);
}



const mskFmt = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function msk() {
  const parts = {};
  for (const p of mskFmt.formatToParts(new Date())) parts[p.type] = p.value;
  return { h: parts.hour, m: parts.minute, s: parts.second };
}



export function watchVisible(el, cb, rootMargin = '0px') {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { cb(true); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) cb(e.isIntersecting);
  }, { rootMargin });
  io.observe(el);
}
