// Прелоадер: сайт «распаковывается» из justzipka.zip,
// потом экран рассыпается на пиксели. Один раз за сессию.

import { $, palette, rgbStr, sleep, clamp } from './core.js';

const FILES = [
  'about/bio.txt',
  'works/vibroexpertspb.ru',
  'works/vibrorotor.ru',
  'works/hakune.blog',
  'bots/telegram.bot',
  'contacts.vcf',
];

export async function runIntro(onReveal) {
  const el = $('#intro');
  const root = document.documentElement;
  if (!el || root.classList.contains('skip-intro') || getComputedStyle(el).display === 'none') {
    el?.remove();
    onReveal();
    return;
  }
  el.style.animation = 'none';

  const log = $('.intro__log', el);
  const fill = $('.intro__fill', el);
  const pct = $('.intro__pct', el);
  const num = $('.intro__num', el);
  let skip = false;
  const skipNow = () => { skip = true; };
  el.addEventListener('click', skipNow);
  window.addEventListener('keydown', skipNow, { once: true });

  const cmd = 'unzip justzipka.zip';
  const lines = [];
  const render = (typed) => {
    log.innerHTML = `<i>$</i> <b>${cmd.slice(0, typed)}</b>${typed < cmd.length ? '<b>_</b>' : ''}\n${lines.join('\n')}`;
  };

  const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), sleep(2200)]);
  const t0 = performance.now();
  const total = 1650;
  let typed = 0;
  let shown = 0;
  const events = [
    { at: 480, line: 'Archive:  justzipka.zip' },
    ...FILES.map((f, i) => ({ at: 600 + i * 130, line: `  <i>inflating:</i> ${f}` })),
    { at: 1480, line: `<b>готово.</b> ${FILES.length} файлов, 0 ошибок` },
  ];

  await new Promise((resolve) => {
    const frame = (now) => {
      const t = skip ? total : now - t0;
      typed = clamp(Math.floor(t / 22), 0, cmd.length);
      while (shown < events.length && events[shown].at <= t) lines.push(events[shown++].line);
      render(typed);
      const p = clamp(t / total, 0, 1);
      const e = 1 - Math.pow(1 - p, 2.2);
      const v = Math.floor(e * 100);
      fill.style.width = `${e * 100}%`;
      pct.textContent = `${v}%`;
      num.textContent = v;
      if (p < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });

  if (!skip) await fontsReady;
  try { sessionStorage.setItem('zipka-unzipped', '1'); } catch { /* приватный режим */ }

  await dissolve(el, onReveal);
  el.remove();
}

function dissolve(el, onReveal) {
  return new Promise((resolve) => {
    const canvas = $('.intro__px', el);
    const ctx = canvas.getContext('2d');
    const W = window.innerWidth;
    const H = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const p = palette();
    ctx.fillStyle = rgbStr(p.bg);
    ctx.fillRect(0, 0, W, H);
    el.classList.add('is-leaving');

    const S = W < 700 ? 26 : 36;
    const cols = Math.ceil(W / S);
    const rows = Math.ceil(H / S);
    const cells = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const order = (x / cols) * 0.45 + (1 - y / rows) * 0.25 + Math.random() * 0.3;
        cells.push({ x: x * S, y: y * S, t: order });
      }
    }
    cells.sort((a, b) => a.t - b.t);

    onReveal();
    const dur = 620;
    const t0 = performance.now();
    let i = 0;
    const accent = rgbStr(p.accent);
    const frame = (now) => {
      const k = (now - t0) / dur;
      // вспышка акцентом перед тем, как клетка исчезнет
      const flashTo = Math.min(cells.length, Math.floor((k + 0.08) * cells.length));
      ctx.fillStyle = accent;
      for (let j = i; j < flashTo; j++) ctx.fillRect(cells[j].x, cells[j].y, S, S);
      const upto = Math.min(cells.length, Math.floor(k * cells.length));
      for (; i < upto; i++) ctx.clearRect(cells[i].x, cells[i].y, S, S);
      if (i < cells.length) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}
