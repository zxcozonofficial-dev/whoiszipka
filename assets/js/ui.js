// Интерфейс: шапка, меню, тема, часы, активный раздел, копирование контактов.

import { $, $$, tick, scroll, msk, toast, themeChanged, reduced, clamp, debounce } from './core.js';
import { scramble } from './fx.js';

const root = document.documentElement;

export function initClock() {
  const full = $$('[data-clock]');
  const short = $$('[data-clock-short]');
  const sleepy = $$('[data-sleep]');
  const update = () => {
    const t = msk();
    full.forEach((el) => { el.textContent = `${t.h}:${t.m}:${t.s}`; });
    short.forEach((el) => { el.textContent = `${t.h}:${t.m}`; });
    const night = Number(t.h) < 8;
    sleepy.forEach((el) => { el.textContent = night ? ', скорее всего, сплю' : ''; });
  };
  update();
  setInterval(update, 1000);
  const y = String(new Date().getFullYear());
  $$('[data-year]').forEach((el) => { el.textContent = y; });
}

export function initTheme() {
  const btn = $('.theme-btn');
  const meta = $('meta[name="theme-color"]');
  const current = () => (root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  const syncMeta = () => {
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg-raw').trim() || '#0b0b0a');
  };
  const apply = (t) => {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('zipka-theme', t); } catch { /* без хранилища */ }
    themeChanged();
    syncMeta();
  };
  const toggle = (from) => {
    const next = current() === 'light' ? 'dark' : 'light';
    if (!document.startViewTransition || reduced()) { apply(next); return next; }
    const r = (from || btn || document.body).getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const vt = document.startViewTransition(() => apply(next));
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' },
      );
    }).catch(() => {});
    return next;
  };
  btn?.addEventListener('click', () => toggle(btn));
  syncMeta();
  return toggle;
}

export function initHeader() {
  const hdr = $('#hdr');
  if (!hdr) return;
  tick(() => {
    const y = scroll.y;
    hdr.classList.toggle('is-solid', y > 30);
    if (root.classList.contains('menu-open')) { hdr.classList.remove('is-hidden'); return; }
    const deep = y > window.innerHeight * 0.7;
    if (!deep) hdr.classList.remove('is-hidden');
    else if (scroll.dir > 0 && scroll.v > 40) hdr.classList.add('is-hidden');
    else if (scroll.dir < 0 && scroll.v < -40) hdr.classList.remove('is-hidden');
  });
}

export function initMenu() {
  const btn = $('.menu-btn');
  const menu = $('#menu');
  if (!btn || !menu) return;
  const txt = $('.menu-btn__txt', btn);
  $$('.menu__nav a', menu).forEach((a, i) => a.style.setProperty('--i', i));
  let timer = 0;
  const open = () => {
    clearTimeout(timer);
    menu.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    root.classList.add('menu-open');
    btn.setAttribute('aria-expanded', 'true');
    if (txt) txt.textContent = 'закрыть';
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    menu.classList.remove('is-open');
    root.classList.remove('menu-open');
    btn.setAttribute('aria-expanded', 'false');
    if (txt) txt.textContent = 'меню';
    document.body.style.overflow = '';
    timer = setTimeout(() => { menu.hidden = true; }, 250);
  };
  btn.addEventListener('click', () => (menu.hidden ? open() : close()));
  $$('a', menu).forEach((a) => a.addEventListener('click', close));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) close(); });
  window.matchMedia('(min-width: 1181px)').addEventListener('change', (e) => { if (e.matches && !menu.hidden) close(); });
}

export function initSections() {
  const sections = $$('main [data-name]');
  const links = $$('.hdr__nav a');
  const hud = $('.hud');
  const idxEl = $('.hud__idx');
  const nameEl = $('.hud__name');
  const bar = $('.hud__bar');
  const pctEl = $('.hud__pct');
  let current = null;

  const setCurrent = (sec) => {
    if (!sec || sec === current) return;
    current = sec;
    const id = sec.id;
    links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
    if (idxEl) idxEl.textContent = sec.dataset.idx || '00';
    if (nameEl) scramble(nameEl, sec.dataset.name || '', { duration: 450 });
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setCurrent(e.target);
    }, { rootMargin: '-45% 0px -54% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  let max = 1;
  const measure = () => { max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight); };
  measure();
  window.addEventListener('resize', debounce(measure, 150));
  window.addEventListener('load', measure);
  document.fonts?.ready.then(measure);
  setInterval(measure, 2000);

  let lastPct = -1;
  tick(() => {
    const p = clamp(scroll.y / max, 0, 1);
    const pct = Math.round(p * 100);
    hud?.classList.toggle('is-on', scroll.y > window.innerHeight * 0.8);
    if (pct === lastPct) return;
    lastPct = pct;
    bar?.style.setProperty('--p', p.toFixed(3));
    if (pctEl) pctEl.textContent = `${pct}%`;
  });
}

export function initCopy() {
  $$('[data-copy]').forEach((btn) => {
    const label = btn.textContent;
    btn.addEventListener('click', async () => {
      const value = btn.getAttribute('data-copy');
      let ok = false;
      try {
        await navigator.clipboard.writeText(value);
        ok = true;
      } catch {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch { ok = false; }
        ta.remove();
      }
      if (!ok) { toast('не получилось скопировать'); return; }
      btn.textContent = 'скопировано';
      btn.classList.add('is-done');
      toast(`скопировано: ${value}`);
      setTimeout(() => { btn.textContent = label; btn.classList.remove('is-done'); }, 1600);
    });
  });
}

export function initToTop() {
  $('[data-totop]')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
  });
}
