import { $, clamp, damp, tick, reduced, watchVisible } from './core.js';

const NS = 'http://www.w3.org/2000/svg';
const LINKS = 12;
const STICK = 300;
const G = 2600;
const W = 270;
const PAD = 1200;

export function initBadge() {
  const rig = $('[data-badge]');
  const card = rig?.querySelector('.badge');
  if (!rig || !card) return;

  const handle = card.querySelector('.badge__handle');
  const stage = rig.parentElement;
  const still = reduced();
  const TG = 'https://t.me/holyfear';

  const rope = document.createElementNS(NS, 'svg');
  rope.setAttribute('class', 'badge-rope');
  rope.setAttribute('aria-hidden', 'true');
  const band = document.createElementNS(NS, 'path');
  band.setAttribute('class', 'badge-rope__band');
  const stitchA = document.createElementNS(NS, 'path');
  const stitchB = document.createElementNS(NS, 'path');
  stitchA.setAttribute('class', 'badge-rope__stitch');
  stitchB.setAttribute('class', 'badge-rope__stitch');
  rope.append(band, stitchA, stitchB);
  stage.insertBefore(rope, rig);

  let L = 330;
  let anchor = { x: 0, y: 0 };
  let pts = [];
  let bot = null;
  let ang = 0;
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
  let ropeTop = 0;

  const fit = () => {
    rope.style.left = `${-PAD}px`;
    rope.style.width = `${stage.clientWidth + PAD * 2}px`;
    rope.style.height = `${stage.clientHeight - ropeTop + PAD}px`;
  };

  const point = (x, y, m) => ({ x, y, px: x, py: y, m });
  const top = () => pts[pts.length - 1];

  const build = () => {
    L = parseFloat(getComputedStyle(stage).getPropertyValue('--rope')) || 330;
    anchor = { x: stage.clientWidth / 2, y: 80 - L };
    const seg = L / LINKS;
    pts = [];
    for (let i = 0; i <= LINKS; i++) pts.push(point(anchor.x, anchor.y + i * seg, i === LINKS ? 3 : 0.4));
    pts[0].m = 0;
    const t = top();
    bot = point(t.x + (still ? 0 : 90), t.y + Math.sqrt(STICK * STICK - (still ? 0 : 8100)), 3);
    ropeTop = anchor.y - 30;
    rope.style.top = `${ropeTop}px`;
    fit();
    rope.style.setProperty('--fade', `${Math.round(L * 0.45 + 30)}px`);
  };

  const relax = (a, b, len, slack) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    if (slack && d <= len) return;
    const wa = a.m ? 1 / a.m : 0;
    const wb = b.m ? 1 / b.m : 0;
    const k = (d - len) / d / ((wa + wb) || 1);
    a.x += dx * k * wa; a.y += dy * k * wa;
    b.x -= dx * k * wb; b.y -= dy * k * wb;
  };

  const pin = () => {
    if (!drag) return;
    const t = top();
    const u = drag.u;
    const ex = (bot.x - t.x) / STICK;
    const ey = (bot.y - t.y) / STICK;
    const tx = drag.x + ey * drag.v;
    const ty = drag.y - ex * drag.v;
    const dx = tx - (t.x + (bot.x - t.x) * u);
    const dy = ty - (t.y + (bot.y - t.y) * u);
    const s = (1 - u) * (1 - u) + u * u;
    t.x += dx * (1 - u) / s; t.y += dy * (1 - u) / s;
    bot.x += dx * u / s; bot.y += dy * u / s;
  };

  const step = (dt, now) => {
    const air = Math.max(0, 1 - 1.6 * dt);
    const breeze = drag ? 0 : (Math.sin(now / 1700) * 22 + Math.sin(now / 610) * 9);
    for (const p of [...pts, bot]) {
      if (!p.m) continue;
      const vx = clamp((p.x - p.px) * air, -60, 60);
      const vy = clamp((p.y - p.py) * air, -60, 60);
      p.px = p.x; p.py = p.y;
      p.x += vx + (p === bot ? breeze : 0) * dt * dt;
      p.y += vy + G * dt * dt;
    }
    const seg = L / LINKS;
    for (let k = 0; k < 14; k++) {
      for (let i = 0; i < LINKS; i++) relax(pts[i], pts[i + 1], seg, true);
      relax(top(), bot, STICK, false);
      pin();
      pts[0].x = anchor.x; pts[0].y = anchor.y;
    }
  };

  const offsetIn = (el) => {
    let x = 0;
    let y = 0;
    for (let n = el; n && n !== rig; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    return { x, y };
  };

  const local = (x, y) => {
    const r = stage.getBoundingClientRect();
    const t = top();
    const dx = x - r.left - t.x;
    const dy = y - r.top - t.y;
    return {
      x: dx * Math.cos(ang) + dy * Math.sin(ang) + W / 2,
      y: -dx * Math.sin(ang) + dy * Math.cos(ang),
    };
  };

  const onHandle = (x, y) => {
    if (!handle || !card.classList.contains('show-back')) return false;
    const p = local(x, y);
    const o = offsetIn(handle);
    const pad = 6;
    return p.x > o.x - pad && p.x < o.x + handle.offsetWidth + pad && p.y > o.y - pad && p.y < o.y + handle.offsetHeight + pad;
  };

  const render = () => {
    const t = top();
    ang = Math.atan2(-(bot.x - t.x), bot.y - t.y);
    rig.style.transform = `translate(${(t.x - W / 2).toFixed(2)}px,${t.y.toFixed(2)}px) rotate(${ang.toFixed(4)}rad) rotateY(${tiltY.toFixed(2)}deg) rotateX(${tiltX.toFixed(2)}deg)`;
    let d = '';
    let sa = '';
    let sb = '';
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / len * 7;
      const ny = (b.x - a.x) / len * 7;
      const x = p.x + PAD;
      const y = p.y - ropeTop;
      const c = i ? 'L' : 'M';
      d += `${c}${x.toFixed(1)} ${y.toFixed(1)}`;
      sa += `${c}${(x + nx).toFixed(1)} ${(y + ny).toFixed(1)}`;
      sb += `${c}${(x - nx).toFixed(1)} ${(y - ny).toFixed(1)}`;
    }
    band.setAttribute('d', d);
    stitchA.setAttribute('d', sa);
    stitchB.setAttribute('d', sb);
  };

  const kick = (v) => { bot.px -= v; };

  const flip = () => {
    turns += 1;
    card.classList.toggle('is-flipped', turns % 2 === 1);
    if (still) card.classList.toggle('show-back', turns % 2 === 1);
    else kick(4);
  };

  const setHot = (on) => {
    if (on === hot) return;
    hot = on;
    handle?.classList.toggle('is-hot', on);
    if (on) card.removeAttribute('data-cursor');
    else card.setAttribute('data-cursor', 'тяни');
  };

  build();
  render();
  window.addEventListener('resize', () => {
    const old = { ...anchor };
    const oldL = L;
    L = parseFloat(getComputedStyle(stage).getPropertyValue('--rope')) || 330;
    if (L !== oldL) { build(); render(); return; }
    anchor = { x: stage.clientWidth / 2, y: 80 - L };
    const dx = anchor.x - old.x;
    for (const p of [...pts, bot]) { p.x += dx; p.px += dx; }
    fit();
    render();
  });

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

  const toStage = (e) => {
    const r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  card.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    card.setPointerCapture(e.pointerId);
    const p = toStage(e);
    const t = top();
    const ex = (bot.x - t.x) / STICK;
    const ey = (bot.y - t.y) / STICK;
    const rx = p.x - t.x;
    const ry = p.y - t.y;
    drag = {
      id: e.pointerId,
      u: clamp((rx * ex + ry * ey) / STICK, 0, 1),
      v: rx * -ey + ry * ex,
      x: p.x,
      y: p.y,
      moved: 0,
      sx: e.clientX,
      sy: e.clientY,
      type: e.pointerType,
      link: onHandle(e.clientX, e.clientY),
    };
  });

  card.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || drag) {
      const r = card.getBoundingClientRect();
      hoverX = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
      hoverY = clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
    }
    if (!drag || e.pointerId !== drag.id) return;
    const p = toStage(e);
    const reach = L * 1.04 + STICK * drag.u;
    const dx = p.x - anchor.x;
    const dy = p.y - anchor.y;
    const d = Math.hypot(dx, dy);
    const k = d > reach ? reach / d : 1;
    drag.x = anchor.x + dx * k;
    drag.y = anchor.y + dy * k;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
  });

  const release = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const tap = drag.moved < 6 && e?.type !== 'pointercancel' && drag.type !== 'mouse' && !drag.link;
    if (drag.type !== 'mouse') { hoverX = 0; hoverY = 0; }
    drag = null;
    if (tap) flip();
  };
  card.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    kick(e.key === 'ArrowLeft' ? 12 : -12);
  });
  card.addEventListener('pointerup', release);
  card.addEventListener('pointercancel', release);
  card.addEventListener('pointerleave', () => { hoverX = 0; hoverY = 0; });

  watchVisible(stage, (v) => { visible = v; }, '120px');

  tick((dt, now) => {
    if (!visible) return;
    const h = dt / 2;
    step(h, now);
    step(h, now);
    const vx = (bot.x - bot.px) / h;
    const hx = hot ? 0 : hoverX;
    const hy = hot ? 0 : hoverY;
    twist = damp(twist, clamp(-vx * 0.035, -40, 40) + hx * 10, 8, dt);
    tiltX = damp(tiltX, -hy * 8, 8, dt);
    tiltY = damp(tiltY, twist, 10, dt);
    fv += ((turns * Math.PI - fa) * 70 - fv * 12) * dt;
    fa += fv * dt;
    render();
    card.style.transform = `rotateY(${fa.toFixed(4)}rad)`;
    const ty = tiltY * Math.PI / 180;
    const tx = tiltX * Math.PI / 180;
    const facing = Math.cos(ty) * Math.cos(tx) * Math.cos(fa) - Math.sin(ty) * Math.sin(fa);
    if ((facing < 0) !== back) {
      back = facing < 0;
      card.classList.toggle('show-back', back);
    }
  });
}
