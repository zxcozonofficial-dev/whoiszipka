// Мелкие эффекты: скрамбл, разбивка заголовков на слова, появление при скролле,
// подсветка текста, счётчики, бегущие строки, магнитные кнопки, пиксельные иконки.

import { $, $$, clamp, damp, tick, scroll, reduced, media, watchVisible, debounce } from './core.js';

/* ---------- скрамбл ---------- */

const UPPER = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ0123456789#%&*+=<>/';
const LOWER = 'абвгдежзиклмнопрстуфхцчшщэюя0123456789#%&*+=<>/';

export function scramble(el, text, { duration = 650 } = {}) {
  const target = text ?? el.dataset.text ?? el.textContent;
  el.dataset.text = target;
  if (reduced()) { el.textContent = target; return; }
  const from = el.textContent;
  const chars = target === target.toLowerCase() ? LOWER : UPPER;
  const len = Math.max(from.length, target.length);
  const q = [];
  for (let i = 0; i < len; i++) {
    const start = Math.random() * 0.45;
    q.push({ from: from[i] || '', to: target[i] || '', start, end: start + 0.25 + Math.random() * 0.3, ch: '' });
  }
  const t0 = performance.now();
  cancelAnimationFrame(el._scr);
  const step = (now) => {
    const p = (now - t0) / duration;
    let out = '';
    let done = 0;
    for (const c of q) {
      if (p >= c.end) { out += c.to; done++; }
      else if (p >= c.start) {
        if (c.to === ' ' || c.to === '') { out += c.to; continue; }
        if (!c.ch || Math.random() < 0.3) c.ch = chars[(Math.random() * chars.length) | 0];
        out += c.ch;
      } else out += c.from;
    }
    el.textContent = out;
    if (done < q.length) el._scr = requestAnimationFrame(step);
  };
  el._scr = requestAnimationFrame(step);
}

export function initScrambleHover() {
  $$('[data-scramble-hover]').forEach((el) => {
    const text = el.textContent;
    el.addEventListener('pointerenter', () => scramble(el, text, { duration: 420 }));
  });
}

/* ---------- заголовки по словам ---------- */

export function splitWords(el) {
  if (el.dataset.splitDone) return;
  el.dataset.splitDone = '1';
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  let wi = 0;
  const walk = (node) => {
    for (const ch of Array.from(node.childNodes)) {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const part of ch.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
          const w = document.createElement('span');
          w.className = 'w';
          w.setAttribute('aria-hidden', 'true');
          const inner = document.createElement('span');
          inner.textContent = part;
          inner.style.setProperty('--wi', wi++);
          w.appendChild(inner);
          frag.appendChild(w);
        }
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1 && ch.tagName !== 'BR') {
        walk(ch);
      }
    }
  };
  walk(el);
}

/* ---------- появление ---------- */

export function initReveal() {
  $$('[data-split]').forEach(splitWords);

  $$('[data-stagger]').forEach((group) => {
    $$('.rv', group).forEach((el, i) => el.style.setProperty('--i', Math.min(i, 8)));
  });

  const targets = $$('.rv, [data-split]');
  const onIn = (el) => {
    el.classList.add('in');
    $$('[data-scramble]', el).forEach((s) => scramble(s, s.textContent, { duration: 900 }));
    if (el.matches('[data-scramble]')) scramble(el, el.textContent, { duration: 900 });
    $$('[data-count]', el).forEach(countUp);
  };

  if (!('IntersectionObserver' in window)) { targets.forEach(onIn); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      onIn(e.target);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
  targets.forEach((el) => io.observe(el));
}

function countUp(el) {
  const to = parseInt(el.dataset.count, 10) || 0;
  if (reduced()) { el.textContent = String(to).padStart(2, '0'); return; }
  const t0 = performance.now();
  const dur = 1100;
  const step = (now) => {
    const p = clamp((now - t0) / dur, 0, 1);
    const e = 1 - Math.pow(1 - p, 3);
    const v = p < 1 ? Math.floor(Math.random() * 10 * (1 - e) + to * e) : to;
    el.textContent = String(v).padStart(2, '0');
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- текст, который загорается при скролле ---------- */

export function initLitText() {
  const el = $('[data-lit]');
  if (!el || reduced()) return;
  const words = [];
  const walk = (node) => {
    for (const ch of Array.from(node.childNodes)) {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        for (const part of ch.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
          const s = document.createElement('span');
          s.className = 'lw';
          s.textContent = part;
          words.push(s);
          frag.appendChild(s);
        }
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1) walk(ch);
    }
  };
  walk(el);

  let lastN = -1;
  let visible = false;
  watchVisible(el, (v) => { visible = v; }, '20% 0px 20% 0px');
  tick(() => {
    if (!visible) return;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const start = vh * 0.88;
    const end = vh * 0.42;
    const p = clamp((start - r.top) / (r.height + start - end), 0, 1);
    const n = Math.round(p * words.length);
    if (n === lastN) return;
    lastN = n;
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  });
}

/* ---------- бегущие строки ---------- */

export function initMarquee() {
  $$('.marquee__track').forEach((track) => {
    const dir = parseFloat(track.dataset.dir) || 1;
    const band = track.parentElement;
    const original = Array.from(track.children);
    let setW = 0;
    let x = 0;
    let visible = false;

    const measure = () => {
      while (track.children.length > original.length) track.lastElementChild.remove();
      const oneSet = track.scrollWidth;
      const copies = Math.max(2, Math.ceil((band.clientWidth * 2) / Math.max(1, oneSet)) + 1);
      for (let c = 1; c < copies; c++) original.forEach((n) => track.appendChild(n.cloneNode(true)));
      setW = track.children[original.length].offsetLeft - track.children[0].offsetLeft;
    };
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener('resize', debounce(measure, 200));

    if (reduced()) return;
    watchVisible(band, (v) => { visible = v; }, '100px');
    tick((dt) => {
      if (!visible || !setW) return;
      const speed = 55 + Math.min(900, Math.abs(scroll.v) * 0.35);
      x -= speed * dt * dir * scroll.dir;
      if (x <= -setW) x += setW;
      if (x > 0) x -= setW;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    });
  });
}

/* ---------- магнитные кнопки ---------- */

export function initMagnetic() {
  if (!media.fine.matches || reduced()) return;
  $$('[data-magnetic]').forEach((el) => {
    const strength = el.classList.contains('round-cta') ? 0.35 : 0.22;
    let tx = 0; let ty = 0; let x = 0; let y = 0; let live = false;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const cx = r.left - x + r.width / 2;
      const cy = r.top - y + r.height / 2;
      tx = (e.clientX - cx) * strength;
      ty = (e.clientY - cy) * strength;
      live = true;
    });
    el.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
    tick((dt) => {
      if (!live) return;
      x = damp(x, tx, 10, dt);
      y = damp(y, ty, 10, dt);
      if (!tx && !ty && Math.abs(x) < 0.05 && Math.abs(y) < 0.05) {
        x = 0; y = 0; live = false;
        el.style.transform = '';
        return;
      }
      el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
    });
  });
}

/* ---------- круглая кнопка: вращение текста ---------- */

export function initRoundCta() {
  const cta = $('.round-cta');
  const ring = cta?.querySelector('.round-cta__ring');
  if (!ring || reduced()) return;
  let angle = 0; let speed = 22; let target = 22; let visible = false;
  cta.addEventListener('pointerenter', () => { target = 110; });
  cta.addEventListener('pointerleave', () => { target = 22; });
  watchVisible(cta, (v) => { visible = v; });
  tick((dt) => {
    if (!visible) return;
    speed = damp(speed, target + Math.abs(scroll.v) * 0.05, 4, dt);
    angle = (angle + speed * dt) % 360;
    ring.style.transform = `rotate(${angle.toFixed(2)}deg)`;
  });
}

/* ---------- подсветка карточек ---------- */

export function initSpotlight() {
  $$('[data-spot]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
    el.addEventListener('pointerenter', () => popIcon($('.px-ico', el)));
  });
}

/* ---------- пиксельные иконки 12×12 ---------- */

const ICONS = {
  web: [
    '############',
    '#.#.#......#',
    '############',
    '#..........#',
    '#.#######..#',
    '#..........#',
    '#.####.###.#',
    '#.####.###.#',
    '#.####.###.#',
    '#..........#',
    '#..........#',
    '############',
  ],
  design: [
    '..#.........',
    '..##........',
    '..#.#.......',
    '..#..#......',
    '..#...#.....',
    '..#....#....',
    '..#.....#...',
    '..#..####...',
    '..#.#.#.....',
    '..##..#.....',
    '.......#....',
    '.......#....',
  ],
  bot: [
    '.....##.....',
    '.....##.....',
    '.##########.',
    '.#........#.',
    '.#.##..##.#.',
    '##.##..##.##',
    '##........##',
    '.#..####..#.',
    '.#........#.',
    '.##########.',
    '...#....#...',
    '..##....##..',
  ],
  app: [
    '.##########.',
    '.#........#.',
    '.#.##..##.#.',
    '.#.##..##.#.',
    '.#........#.',
    '.#.##..##.#.',
    '.#.##..##.#.',
    '.#........#.',
    '.#........#.',
    '.#...##...#.',
    '.#........#.',
    '.##########.',
  ],
  chat: [
    '.##########.',
    '#..........#',
    '#..........#',
    '#.##.##.##.#',
    '#.##.##.##.#',
    '#..........#',
    '#..........#',
    '.######..##.',
    '.......#.#..',
    '........##..',
    '.........#..',
    '............',
  ],
  grid: [
    '############',
    '#....#.....#',
    '#....#.....#',
    '######.....#',
    '#....#.....#',
    '#....#######',
    '#....#.....#',
    '######.....#',
    '#..........#',
    '#..........#',
    '#..........#',
    '############',
  ],
  code: [
    '............',
    '.......#....',
    '...#...##...',
    '..#...#..#..',
    '.#....#...#.',
    '#....#.....#',
    '.#...#....#.',
    '..#.#....#..',
    '...##...#...',
    '....#.......',
    '............',
    '............',
  ],
  rocket: [
    '.....##.....',
    '....####....',
    '....#..#....',
    '...##..##...',
    '...#.##.#...',
    '...#.##.#...',
    '...#....#...',
    '..##....##..',
    '.#.#....#.#.',
    '.#.######.#.',
    '....#..#....',
    '.....##.....',
  ],
};

export function initIcons() {
  $$('[data-icon]').forEach((holder) => {
    const rows = ICONS[holder.dataset.icon];
    if (!rows) return;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${rows[0].length} ${rows.length}`);
    svg.setAttribute('aria-hidden', 'true');
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== '#') continue;
        const r = document.createElementNS(ns, 'rect');
        r.setAttribute('x', x);
        r.setAttribute('y', y);
        r.setAttribute('width', 1);
        r.setAttribute('height', 1);
        r.style.setProperty('--d', `${Math.round(Math.random() * 320)}ms`);
        svg.appendChild(r);
      }
    });
    holder.appendChild(svg);
  });

  if ('IntersectionObserver' in window && !reduced()) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        popIcon(e.target);
      }
    }, { rootMargin: '0px 0px -15% 0px' });
    $$('[data-icon]').forEach((el) => io.observe(el));
  }
}

export function popIcon(el) {
  if (!el || reduced()) return;
  el.classList.remove('pop');
  void el.getBoundingClientRect();
  el.classList.add('pop');
}
