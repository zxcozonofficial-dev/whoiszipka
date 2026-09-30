


import { $, clamp, damp, tick, reduced, watchVisible } from './core.js';

export function initBadge() {
  const rig = $('[data-badge]');
  const card = rig?.querySelector('.badge');
  if (!rig || !card) return;

  buildBars(card.querySelector('.badge__bars'), 'JUSTZIPKA');
  const glares = card.querySelectorAll('.badge__glare');
  const handle = card.querySelector('.badge__handle');
  const stage = rig.parentElement;
  const still = reduced();
  const TG = 'https://t.me/holyfear';

  let th = 0.18;
  let om = 0;
  let fa = 0;
  let fv = 0;
  let turns = 0;
  let back = false;
  let twist = 0;
  let tiltX = 0;
  let tiltY = 0;
  let hoverX = 0;
  let hoverY = 0;
  let visible = false;
  let drag = null;
  let hot = false;
  let press = null;
  const K = 15;
  const C = 1.05;

  const flip = () => {
    turns += 1;
    card.classList.toggle('is-flipped', turns % 2 === 1);
    if (still) card.classList.toggle('show-back', turns % 2 === 1);
    else om = clamp(om + 0.7, -9, 9);
  };
  const pivot = () => {
    const r = stage.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + rig.offsetTop };
  };

  const onHandle = (x, y) => {
    if (!handle || !card.classList.contains('show-back')) return false;
    const p = pivot();
    const a = still ? 0 : th;
    const dx = x - p.x;
    const dy = y - p.y;
    const lx = dx * Math.cos(a) + dy * Math.sin(a) + rig.offsetWidth / 2;
    const ly = -dx * Math.sin(a) + dy * Math.cos(a);
    const face = handle.offsetParent;
    const left = card.offsetLeft + face.offsetLeft + handle.offsetLeft;
    const top = card.offsetTop + face.offsetTop + handle.offsetTop;
    const pad = 6;
    return lx > left - pad && lx < left + handle.offsetWidth + pad && ly > top - pad && ly < top + handle.offsetHeight + pad;
  };

  const setHot = (on) => {
    if (on === hot) return;
    hot = on;
    handle?.classList.toggle('is-hot', on);
    if (on) card.removeAttribute('data-cursor');
    else card.setAttribute('data-cursor', 'тяни');
  };

  stage.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') setHot(onHandle(e.clientX, e.clientY)); });
  stage.addEventListener('pointerleave', () => setHot(false));
  stage.addEventListener('pointerdown', (e) => {
    press = e.button === 0 && onHandle(e.clientX, e.clientY) ? { id: e.pointerId, x: e.clientX, y: e.clientY } : null;
  });
  stage.addEventListener('pointerup', (e) => {
    if (!press || e.pointerId !== press.id) return;
    const open = Math.hypot(e.clientX - press.x, e.clientY - press.y) < 8;
    press = null;
    if (open) window.open(TG, '_blank', 'noopener');
  });
  stage.addEventListener('pointercancel', () => { press = null; });

  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
  });

  if (still) {
    card.addEventListener('click', (e) => { if (!onHandle(e.clientX, e.clientY)) flip(); });
    return;
  }

  card.addEventListener('dblclick', (e) => { if (!onHandle(e.clientX, e.clientY)) flip(); });

  const angleAt = (x, y) => {
    const p = pivot();
    return Math.atan2(p.x - x, Math.max(1, y - p.y));
  };

  card.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    card.setPointerCapture(e.pointerId);
    const a = angleAt(e.clientX, e.clientY);
    const now = performance.now();
    drag = {
      id: e.pointerId,
      a0: a,
      th0: th,
      samples: [{ t: now, th }],
      moved: 0,
      sx: e.clientX,
      sy: e.clientY,
      type: e.pointerType,
      link: onHandle(e.clientX, e.clientY),
    };
    om = 0;
  });

  card.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || drag) {
      const r = card.getBoundingClientRect();
      hoverX = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
      hoverY = clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
    }
    if (!drag || e.pointerId !== drag.id) return;
    const now = performance.now();
    th = clamp(drag.th0 + angleAt(e.clientX, e.clientY) - drag.a0, -1.3, 1.3);
    drag.samples.push({ t: now, th });
    while (drag.samples.length > 2 && now - drag.samples[0].t > 90) drag.samples.shift();
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
  });

  const release = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const now = performance.now();
    const first = drag.samples[0];
    const lastT = drag.samples[drag.samples.length - 1].t;
    om = now - lastT > 90 || now - first.t < 8 ? 0 : clamp((th - first.th) / ((now - first.t) / 1000), -9, 9);
    const tap = drag.moved < 6 && e?.type !== 'pointercancel' && drag.type !== 'mouse' && !drag.link;
    if (drag.type !== 'mouse') { hoverX = 0; hoverY = 0; }
    drag = null;
    if (tap) flip();
  };
  card.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    om = clamp(om + (e.key === 'ArrowLeft' ? 2.4 : -2.4), -9, 9);
  });
  card.addEventListener('pointerup', release);
  card.addEventListener('pointercancel', release);
  card.addEventListener('pointerleave', () => { hoverX = 0; hoverY = 0; });

  watchVisible(rig.parentElement, (v) => { visible = v; }, '120px');

  tick((dt, now) => {
    if (!visible) return;
    if (!drag) {
      const breeze = Math.sin(now / 1700) * 0.05 + Math.sin(now / 610) * 0.02;
      om += (-K * Math.sin(th) - C * om + breeze) * dt;
      th += om * dt;
    }
    const hx = hot ? 0 : hoverX;
    const hy = hot ? 0 : hoverY;
    twist = damp(twist, clamp(-om * 9, -40, 40) + hx * 10, 8, dt);
    tiltX = damp(tiltX, -hy * 8, 8, dt);
    tiltY = damp(tiltY, twist, 10, dt);
    fv += ((turns * Math.PI - fa) * 70 - fv * 12) * dt;
    fa += fv * dt;
    rig.style.transform = `rotate(${th.toFixed(4)}rad) rotateY(${tiltY.toFixed(2)}deg) rotateX(${tiltX.toFixed(2)}deg)`;
    card.style.transform = `rotateY(${fa.toFixed(4)}rad)`;
    const ty = tiltY * Math.PI / 180;
    const tx = tiltX * Math.PI / 180;
    const facing = Math.cos(ty) * Math.cos(tx) * Math.cos(fa) - Math.sin(ty) * Math.sin(fa);
    if ((facing < 0) !== back) {
      back = facing < 0;
      card.classList.toggle('show-back', back);
    }
    const g = `${(-30 + th * 90 + tiltY * 1.6).toFixed(1)}%`;
    glares.forEach((el) => el.style.setProperty('--glare', g));
  });
}


function buildBars(el, text) {
  if (!el) return;
  const frag = document.createDocumentFragment();
  let total = 0;
  const pieces = [];
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    for (let k = 0; k < 4; k++) {
      const bar = 1 + ((c >> k) & 1) + ((c >> (k + 3)) & 1);
      const gap = 1 + ((c >> (k + 1)) & 1);
      pieces.push([bar, gap]);
      total += bar + gap;
    }
  }
  for (const [bar, gap] of pieces) {
    const i = document.createElement('i');
    i.style.width = `${(bar / total) * 100}%`;
    i.style.marginRight = `${(gap / total) * 100}%`;
    frag.appendChild(i);
  }
  el.appendChild(frag);
}
