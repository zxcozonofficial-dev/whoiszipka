


import { $, damp, tick, media } from './core.js';

export function initCursor() {
  if (!media.fine.matches) return;
  const root = $('.cursor');
  const box = $('.cursor__box');
  const dot = $('.cursor__dot');
  const label = $('.cursor-label');
  const labelText = label?.querySelector('span');
  if (!root || !box || !dot || !label) return;

  document.documentElement.classList.add('has-cursor');

  const m = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const b = { x: m.x - 13, y: m.y - 13, w: 26, h: 26 };
  const l = { x: m.x, y: m.y };
  let snap = null;
  let mode = '';
  let seen = false;

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    m.x = e.clientX;
    m.y = e.clientY;
    if (!seen) {
      seen = true;
      b.x = m.x - 13; b.y = m.y - 13;
      l.x = m.x; l.y = m.y;
    }
    document.documentElement.classList.remove('cursor-out');
  }, { passive: true });

  document.addEventListener('pointerleave', () => document.documentElement.classList.add('cursor-out'));
  document.documentElement.addEventListener('mouseleave', () => document.documentElement.classList.add('cursor-out'));
  window.addEventListener('pointerdown', () => root.classList.add('is-down'));
  window.addEventListener('pointerup', () => root.classList.remove('is-down'));

  document.addEventListener('pointerover', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const labeled = t.closest('[data-cursor]');
    const text = t.closest('input, textarea, [data-cursor-text]');
    const snappy = t.closest('[data-snap], .btn, .icon-btn');
    if (labeled) {
      mode = 'label';
      snap = null;
      labelText.textContent = labeled.getAttribute('data-cursor');
    } else if (text) {
      mode = 'text';
      snap = null;
    } else if (snappy) {
      mode = 'snap';
      snap = snappy;
    } else {
      mode = '';
      snap = null;
    }
    root.classList.toggle('is-text', mode === 'text');
    root.classList.toggle('is-label', mode === 'label');
    label.classList.toggle('is-on', mode === 'label');
  });

  tick((dt) => {
    let tx, ty, tw, th;
    if (snap && snap.isConnected) {
      const r = snap.getBoundingClientRect();
      const pad = 6;
      tx = r.left - pad; ty = r.top - pad; tw = r.width + pad * 2; th = r.height + pad * 2;
    } else {
      const s = root.classList.contains('is-down') ? 18 : 26;
      tx = m.x - s / 2; ty = m.y - s / 2; tw = s; th = s;
    }
    const k = snap ? 18 : 26;
    b.x = damp(b.x, tx, k, dt);
    b.y = damp(b.y, ty, k, dt);
    b.w = damp(b.w, tw, 16, dt);
    b.h = damp(b.h, th, 16, dt);
    box.style.transform = `translate3d(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px, 0)`;
    box.style.width = `${b.w.toFixed(1)}px`;
    box.style.height = `${b.h.toFixed(1)}px`;
    dot.style.transform = `translate3d(${m.x}px, ${m.y}px, 0)`;

    l.x = damp(l.x, m.x, 14, dt);
    l.y = damp(l.y, m.y, 14, dt);
    label.style.transform = `translate3d(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px, 0)`;
  });
}
