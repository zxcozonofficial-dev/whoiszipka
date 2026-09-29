// Пасхалки: zxc-режим, konami-код, сетка на G, привет в консоли, заголовок вкладки.

import { $, tick, palette, rgbStr, themeChanged, toast, reduced, rand } from './core.js';
import { rasterPath } from './hero.js';

const root = document.documentElement;
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

export function initEggs({ hero } = {}) {
  const api = {
    toggleZxc: () => toggleZxc(hero),
    toggleGrid,
    glitch,
    rain: pixelRain,
  };

  let buf = '';
  let k = 0;
  window.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t instanceof Element && t.closest('input, textarea, select, [contenteditable]')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    k = e.code === KONAMI[k] ? k + 1 : e.code === KONAMI[0] ? 1 : 0;
    if (k === KONAMI.length) {
      k = 0;
      pixelRain();
      toast('konami! +30 жизней');
      return;
    }

    const letter = { KeyZ: 'z', KeyX: 'x', KeyC: 'c' }[e.code] || '-';
    buf = (buf + letter).slice(-3);
    if (buf === 'zxc') { buf = ''; api.toggleZxc(); return; }
    if (e.code === 'KeyG' && !e.repeat) toggleGrid();
  });

  hello();

  const title = document.title;
  document.addEventListener('visibilitychange', () => {
    document.title = document.hidden ? 'эй, вернись' : title;
  });

  return api;
}

function toggleZxc(hero) {
  const on = root.classList.toggle('zxc');
  themeChanged();
  glitch();
  hero?.morph(on ? 'ZXC' : 'logo');
  if (!on) { toast('zxc mode: off'); return false; }
  let n = 1000;
  toast(`${n}-7`, 3000);
  const id = setInterval(() => {
    const next = n - 7;
    toast(`${n}-7 = ${next}`, 3000);
    n = next;
    if (n <= 944) { clearInterval(id); setTimeout(() => toast('zxc mode: on', 1800), 180); }
  }, 150);
  return true;
}

function toggleGrid() {
  const g = $('.grid-overlay');
  if (!g) return false;
  const on = g.classList.toggle('is-on');
  toast(on ? 'сетка: 12 колонок' : 'сетка выключена', 1400);
  return on;
}

function glitch() {
  if (reduced()) return;
  const b = document.body;
  b.classList.remove('glitching');
  void b.offsetWidth;
  b.classList.add('glitching');
  setTimeout(() => b.classList.remove('glitching'), 600);
}

function pixelRain() {
  if (reduced()) return;
  const c = document.createElement('canvas');
  c.className = 'px-rain';
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth;
  const H = window.innerHeight;
  c.width = W * dpr;
  c.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const p = palette();
  const cols = [rgbStr(p.accent), rgbStr(p.ink), rgbStr(p.accent)];
  const drops = Array.from({ length: 320 }, () => ({
    x: Math.round(rand(0, W) / 6) * 6,
    y: rand(-H * 1.2, -10),
    v: rand(240, 620),
    s: [6, 6, 12, 18][(Math.random() * 4) | 0],
    c: cols[(Math.random() * cols.length) | 0],
  }));
  const t0 = performance.now();
  const off = tick((dt, now) => {
    ctx.clearRect(0, 0, W, H);
    let alive = 0;
    for (const d of drops) {
      d.y += d.v * dt;
      d.v += 900 * dt;
      if (d.y < H) alive++;
      ctx.fillStyle = d.c;
      ctx.fillRect(d.x, Math.round(d.y / 6) * 6, d.s, d.s);
    }
    if (!alive || now - t0 > 4500) { off(); c.remove(); }
  });
}

function hello() {
  const pathEl = $('#logo-path');
  if (!pathEl) return;
  try {
    const bits = rasterPath(pathEl.getAttribute('d'), 168, 43);
    const lines = [];
    for (let y = 0; y < 43; y += 3) {
      let s = '';
      for (let x = 0; x < 168; x += 2) {
        let on = 0;
        for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 2; dx++) on += bits[(y + dy) * 168 + x + dx] || 0;
        s += on >= 3 ? '█' : ' ';
      }
      if (s.trim()) lines.push(s.replace(/\s+$/, ''));
    }
    const a = palette().accent;
    console.log(`%c${lines.join('\n')}`, `color: rgb(${a.join(',')}); font: 10px/10px monospace;`);
    console.log('%cпривет, разработчик. раз ты здесь, нам точно есть о чём поговорить: t.me/holyfear', 'font: 12px monospace; padding: 4px 0;');
    console.log('%cподсказка: в терминале на сайте есть команда unzip', 'font: 11px monospace; color: #888;');
  } catch { /* консоль не главное */ }
}
