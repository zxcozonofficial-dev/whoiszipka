// Процесс: на широких экранах секция прилипает, а шаги едут вбок,
// пока страница листается вниз. На телефонах обычный вертикальный список.

import { $, clamp, tick, reduced, debounce } from './core.js';

export function initProcess() {
  const sec = $('.process');
  const track = sec?.querySelector('.process__track');
  const bar = sec?.querySelector('.process__bar');
  if (!sec || !track) return;

  const mq = window.matchMedia('(min-width: 1024px)');
  let enabled = false;
  let dist = 0;
  let lastP = -1;

  function layout() {
    enabled = mq.matches && !reduced() && window.innerHeight >= 560;
    sec.classList.toggle('is-h', enabled);
    if (!enabled) {
      sec.style.height = '';
      track.style.transform = '';
      return;
    }
    dist = Math.max(0, track.scrollWidth - window.innerWidth);
    sec.style.height = `${dist + window.innerHeight}px`;
    lastP = -1;
  }

  layout();
  document.fonts?.ready.then(layout);
  window.addEventListener('resize', debounce(layout, 160));
  window.addEventListener('load', layout);

  tick(() => {
    if (!enabled || !dist) return;
    const p = clamp(-sec.getBoundingClientRect().top / dist, 0, 1);
    if (Math.abs(p - lastP) < 0.0005) return;
    lastP = p;
    track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px, 0, 0)`;
    bar?.style.setProperty('--p', p.toFixed(4));
  });
}
