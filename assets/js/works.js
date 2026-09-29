// Работы: при наведении за курсором едет превью сайта,
// которое «распаковывается» из крупных пикселей в чёткую картинку.

import { $, $$, clamp, damp, tick, media, reduced } from './core.js';

const STEPS = [40, 22, 12, 6, 3, 1];

export function initWorks() {
  if (!media.fine.matches) return;
  const links = $$('.work__link[data-preview]');
  const pv = $('.preview');
  const canvas = pv?.querySelector('.preview__canvas');
  if (!links.length || !pv || !canvas) return;
  const ctx = canvas.getContext('2d');
  const urlEl = pv.querySelector('.preview__url');
  const resEl = pv.querySelector('.preview__res');
  const small = document.createElement('canvas');
  const sctx = small.getContext('2d');

  const items = links.map((a) => {
    const src = a.querySelector('.work__img')?.getAttribute('src');
    const img = new Image();
    img.decoding = 'async';
    let loaded = false;
    img.onload = () => { loaded = true; };
    const load = () => { if (!img.src && src) img.src = src; };
    return { a, img, load, isLoaded: () => loaded, url: a.querySelector('.work__url')?.textContent || '' };
  });

  // картинки подтягиваем заранее, когда секция уже близко
  const works = $('#works');
  if ('IntersectionObserver' in window && works) {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { items.forEach((it) => it.load()); io.disconnect(); }
    }, { rootMargin: '600px 0px' });
    io.observe(works);
  } else items.forEach((it) => it.load());

  let W = 0; let H = 0; let dpr = 1;
  const size = () => {
    const r = pv.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.round(r.width * dpr);
    H = Math.round(r.height * dpr);
    canvas.width = W;
    canvas.height = H;
  };

  let active = -1;
  let on = false;
  let shown = -1;
  let stepIdx = -1;
  let t = 0;
  const m = { x: 0, y: 0 };
  const p = { x: 0, y: 0, r: 0 };

  window.addEventListener('pointermove', (e) => { m.x = e.clientX; m.y = e.clientY; }, { passive: true });

  items.forEach((it, i) => {
    it.a.addEventListener('pointerenter', (e) => {
      it.load();
      if (!on) { p.x = e.clientX; p.y = e.clientY; m.x = e.clientX; m.y = e.clientY; }
      if (!W) size();
      active = i;
      on = true;
      t = 0;
      stepIdx = -1;
      urlEl.textContent = it.url;
      pv.classList.add('is-on');
    });
    it.a.addEventListener('pointerleave', () => {
      if (active === i) { on = false; pv.classList.remove('is-on'); }
    });
  });
  window.addEventListener('resize', () => { W = 0; });
  window.addEventListener('scroll', () => {
    if (!on) return;
    const el = document.elementFromPoint(m.x, m.y);
    if (!el || !el.closest('.work__link[data-preview]')) { on = false; pv.classList.remove('is-on'); }
  }, { passive: true });

  function draw(img, block) {
    ctx.imageSmoothingEnabled = block <= 1;
    const iw = img.naturalWidth; const ih = img.naturalHeight;
    const s = Math.max(W / iw, H / ih);
    const dw = iw * s; const dh = ih * s;
    const dx = (W - dw) / 2; const dy = (H - dh) / 2;
    if (block <= 1) { ctx.drawImage(img, dx, dy, dw, dh); return; }
    const sw = Math.max(2, Math.round(W / (block * dpr)));
    const sh = Math.max(2, Math.round(H / (block * dpr)));
    small.width = sw; small.height = sh;
    sctx.imageSmoothingEnabled = true;
    sctx.drawImage(img, dx * (sw / W), dy * (sh / H), dw * (sw / W), dh * (sh / H));
    ctx.drawImage(small, 0, 0, sw, sh, 0, 0, W, H);
  }

  tick((dt) => {
    if (!on && shown === -2) return;
    p.x = damp(p.x, m.x, 9, dt);
    p.y = damp(p.y, m.y, 9, dt);
    p.r = damp(p.r, clamp((m.x - p.x) * 0.06, -9, 9), 8, dt);
    if (!W) size();
    const w = W / dpr; const h = H / dpr;
    pv.style.transform = `translate3d(${(p.x - w / 2).toFixed(1)}px, ${(p.y - h / 2).toFixed(1)}px, 0) rotate(${p.r.toFixed(2)}deg)`;
    if (!on) {
      if (Math.abs(m.x - p.x) < 0.5 && Math.abs(m.y - p.y) < 0.5) shown = -2;
      return;
    }
    const it = items[active];
    if (!it || !it.isLoaded()) return;
    t += dt;
    const k = reduced() ? STEPS.length - 1 : Math.min(STEPS.length - 1, Math.floor(t / 0.075));
    if (k === stepIdx && shown === active) return;
    stepIdx = k;
    shown = active;
    draw(it.img, STEPS[k]);
    resEl.textContent = k === STEPS.length - 1 ? '100%' : `${Math.round((k / (STEPS.length - 1)) * 100)}%`;
  });
}
