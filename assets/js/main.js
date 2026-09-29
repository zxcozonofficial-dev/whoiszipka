


import { initHero } from './hero.js';
import { runIntro } from './intro.js';
import { initCursor } from './cursor.js';
import {
  initReveal, initLitText, initMarquee, initMagnetic, initRoundCta,
  initSpotlight, initIcons, initScrambleHover,
} from './fx.js';
import { initBadge } from './badge.js';
import { initWorks } from './works.js';
import { initProcess } from './process.js';
import { initTerminal } from './terminal.js';
import { initDither } from './dither.js';
import { initClock, initTheme, initHeader, initMenu, initSections, initCopy, initToTop } from './ui.js';
import { initEggs } from './eggs.js';

const root = document.documentElement;
root.classList.add('ready');

const safe = (name, fn) => {
  try { return fn(); } catch (e) { console.warn(`[zipka] ${name}:`, e); return undefined; }
};

const hero = safe('hero', initHero);
let revealed = false;
const reveal = () => {
  if (revealed) return;
  revealed = true;
  root.classList.add('hero-in');
  safe('hero start', () => hero?.start());
};
safe('intro', () => runIntro(reveal).catch((e) => { console.warn('[zipka] intro:', e); document.getElementById('intro')?.remove(); reveal(); }));

safe('clock', initClock);
const toggleTheme = safe('theme', initTheme);
safe('header', initHeader);
safe('menu', initMenu);
safe('sections', initSections);
safe('icons', initIcons);
safe('reveal', initReveal);
safe('lit', initLitText);
safe('marquee', initMarquee);
safe('cursor', initCursor);
safe('magnetic', initMagnetic);
safe('round cta', initRoundCta);
safe('spotlight', initSpotlight);
safe('scramble', initScrambleHover);
safe('badge', initBadge);
safe('works', initWorks);
safe('process', initProcess);
safe('dither', initDither);
safe('copy', initCopy);
safe('to top', initToTop);
const eggs = safe('eggs', () => initEggs({ hero })) || {};
safe('terminal', () => initTerminal({
  toggleTheme: () => toggleTheme?.(),
  toggleZxc: () => eggs.toggleZxc?.(),
  toggleGrid: () => eggs.toggleGrid?.(),
  glitch: () => eggs.glitch?.(),
}));
