


import { $, sleep, msk, watchVisible, reduced, clamp, tick, palette, rgbStr } from './core.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const link = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${esc(text)}</a>`;
const dim = (s) => `<span class="t-dim">${s}</span>`;
const acc = (s) => `<span class="t-acc">${s}</span>`;
const hi = (s) => `<span class="t-hi">${s}</span>`;
const pad = (s, n) => s + ' '.repeat(Math.max(1, n - s.length));

const ABOUT = 'делаю сайты целиком: придумываю, рисую, верстаю и выкладываю в сеть.\nещё пишу telegram-ботов и mini apps к ним. дизайн и код в одних руках.';

const STACK = [
  ['дизайн', 'макеты, интерфейсы, типографика, анимации'],
  ['фронтенд', 'html, css, javascript'],
  ['боты', 'telegram bot api, mini apps'],
  ['бэкенд', 'простой, под задачу'],
];

const WORKS = [
  ['01', 'ВиброЭксперт СПб', 'https://vibroexpertspb.ru/', 'vibroexpertspb.ru'],
  ['02', 'ВиброРотор', 'https://vibrorotor.ru/', 'vibrorotor.ru'],
  ['03', 'Hakune', 'https://hakune.blog/', 'hakune.blog'],
];

const CONTACTS = [
  ['telegram', 'https://t.me/holyfear', '@holyfear'],
  ['discord', 'https://discord.com/users/1243462258395451487', 'die.ru'],
  ['почта', 'mailto:godcomplex@xyecoc.com', 'godcomplex@xyecoc.com'],
];

const FILES = ['about.txt', 'stack.txt', 'contacts.vcf', 'works/', 'secret.zip'];
const HIDDEN = ['.zsh_history', '.env'];

const ZSH_HISTORY = ['ls -a', 'sl', 'snake', 'whois zipka', 'matrix', '1000-7', 'fortune', 'cowsay привет', 'top', 'hack', 'ping', 'qr', 'sudo make me a sandwich', 'reboot'];

const FORTUNES = [
  'работает? не трогай. не работает? тоже не трогай, сначала кофе.',
  'лучший дизайн тот, который не пришлось объяснять.',
  'в любой непонятной ситуации ставь display: flex.',
  'это не баг, а незадокументированная фича.',
  'заказчик: «сделайте красиво». через час: «а можно логотип побольше?»',
  'отцентровать div легко. с третьей попытки.',
  'git commit -m "финал (2) точно последний"',
  'дедлайн был вчера, идея пришла только что.',
  'npm install решает всё, кроме проблем от npm install.',
  'никогда не выкатывай в пятницу. ну, почти никогда.',
  'пиксель съехал на 1px. ночь потеряна, пиксель найден.',
  'хороший сайт грузится быстрее, чем ты успеваешь передумать.',
];

const PROCS = [
  ['1', 'zipka', '12%', '64K'],
  ['42', 'идеи', '87%', '2.1G'],
  ['69', 'кофе', '99%', '0.4L'],
  ['128', 'дедлайн', '100%', '—'],
  ['256', 'pixel-perfect', '64%', '1.3G'],
  ['404', 'баги', '0%', 'не найдено'],
  ['993', 'zxc', '7%', '1000-7'],
];

const SMOKE = [
  ['          (@@)  (  )   (@)', '         ( )'],
  ['          (  )  (@@)   ( )', '         (@)'],
];
const TRAIN = [
  '  ____   ||',
  ' | [] |__||____     _______________',
  ' |    ZIPKA    |-o-|   justzipka   |',
  ' |_____________|-o-|_______________|',
];
const WHEELS = ['   (+)     (+)       (+)       (+)', '   (x)     (x)       (x)       (x)'];

const CAT = ['     \\', '      \\   /\\_/\\', '         ( o.o )', '          > ^ <'];

const RAIN = 'justzipka01アイウエオカキクケコサシスセソタチツテトナニヌネノ';

const SNAKE_KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

export function initTerminal(api = {}) {
  const root = $('[data-term]');
  if (!root) return;
  const body = $('.term__body', root);
  const out = $('.term__out', root);
  const form = $('.term__line', root);
  const input = $('.term__input', root);
  const prompt = $('.term__prompt', root).textContent;
  const bootedAt = performance.now();

  const history = [];
  let hIdx = 0;
  let busy = false;
  let userTyped = false;
  let autotyping = false;
  let playing = false;
  const touch = matchMedia('(hover: none)').matches;

  const scrollDown = () => { body.scrollTop = body.scrollHeight; };
  const print = (html = '', cls = '') => {
    const line = document.createElement('div');
    if (cls) line.className = cls;
    line.innerHTML = html;
    out.appendChild(line);
    scrollDown();
    return line;
  };
  const echoCmd = (cmd) => print(`<span class="t-p">${esc(prompt)}</span> <span class="t-cmd">${esc(cmd)}</span>`);

  const quiet = (cls) => {
    const el = print('', cls);
    el.setAttribute('aria-hidden', 'true');
    return el;
  };

  const cols = () => {
    const probe = document.createElement('span');
    probe.textContent = 'x'.repeat(20);
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
    out.appendChild(probe);
    const w = probe.getBoundingClientRect().width / 20;
    probe.remove();
    return Math.max(20, Math.floor(out.clientWidth / (w || 8)));
  };

  const listStack = () => STACK.map(([k, v]) => `${acc(pad(k, 11))}${esc(v)}`).join('\n');
  const listWorks = () => WORKS.map(([n, name, href, url]) => `${dim(n)}  ${hi(pad(name, 19))}${link(href, url)}`).join('\n');
  const listContacts = () => CONTACTS.map(([k, href, v]) => `${acc(pad(k, 11))}${link(href, v)}`).join('\n');

  function uptime() {
    const s = Math.floor((performance.now() - bootedAt) / 1000);
    const m = Math.floor(s / 60);
    return m ? `${m} мин ${s % 60} с` : `${s} с`;
  }

  function neofetch() {
    const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'светлая' : 'тёмная';
    const rows = [
      ['роль', 'веб-дизайнер / разработчик'],
      ['стек', 'html, css, javascript'],
      ['боты', 'telegram bot api, mini apps'],
      ['шелл', 'zsh (почти)'],
      ['тема', theme],
      ['экран', `${window.innerWidth}×${window.innerHeight}`],
      ['аптайм', uptime()],
      ['статус', 'беру новые проекты'],
    ];
    const info = [`${acc('zipka')}@${acc('web')}`, dim('-'.repeat(16)), ...rows.map(([k, v]) => `${acc(pad(k, 8))}${esc(v)}`)].join('\n');
    const swatches = ['var(--ink)', 'var(--ink-2)', 'var(--ink-3)', 'var(--line-2)', 'var(--line)']
      .map((c) => `<i style="display:inline-block;width:18px;height:10px;background:${c};margin-right:4px"></i>`).join('');
    print(`<div class="t-neo"><svg class="t-neo__logo" viewBox="0 0 168 43" aria-hidden="true"><use href="#logo-path"/></svg><div>${info}\n\n${swatches}</div></div>`);
  }

  function whois(args) {
    const q = (args[0] || 'zipka').toLowerCase();
    if (!/zipka|зипка/.test(q)) { print(`whois: ${esc(q)}: ничего не найдено. попробуй ${acc('whois zipka')}`); return; }
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date());
    const row = (k, v) => `${acc(pad(`${k}:`, 14))}${v}`;
    print([
      row('Domain Name', 'ZIPKA'),
      row('Registrant', 'Зипка (justzipka)'),
      row('Role', 'веб-дизайнер и разработчик'),
      row('Location', 'Москва, UTC+3'),
      row('Status', 'clientTransferProhibited (не продаётся)'),
      row('Status', 'serverHold (ушёл за кофе)'),
      row('Name Server', link('https://t.me/holyfear', 't.me/holyfear')),
      row('Updated', today),
      row('Expires', 'никогда'),
    ].join('\n'));
  }

  function bubble(text) {
    const width = clamp(cols() - 6, 12, 30);
    const lines = [];
    for (const word of text.split(/\s+/)) {
      const last = lines[lines.length - 1];
      if (last !== undefined && `${last} ${word}`.length <= width) lines[lines.length - 1] = `${last} ${word}`;
      else for (let i = 0; i < word.length; i += width) lines.push(word.slice(i, i + width));
    }
    const w = Math.max(...lines.map((l) => l.length));
    const edge = (i) => {
      if (lines.length === 1) return ['<', '>'];
      if (i === 0) return ['/', '\\'];
      if (i === lines.length - 1) return ['\\', '/'];
      return ['|', '|'];
    };
    return [
      ` ${'_'.repeat(w + 2)}`,
      ...lines.map((l, i) => { const [a, b] = edge(i); return `${a} ${l.padEnd(w)} ${b}`; }),
      ` ${'-'.repeat(w + 2)}`,
    ];
  }

  async function sl() {
    const art = quiet('t-art');
    const width = cols();
    const frame = (x, n) => [...SMOKE[n], ...TRAIN, WHEELS[n]]
      .map((l) => (' '.repeat(Math.max(0, x)) + l.slice(Math.max(0, -x))).slice(0, width).replace(/\s+$/, ''))
      .join('\n');
    if (reduced()) art.textContent = frame(1, 0);
    else {
      const span = Math.max(...TRAIN.map((l) => l.length));
      for (let x = width; x > -span; x -= 1) {
        art.textContent = frame(x, Math.floor(Math.abs(x) / 2) % 2);
        scrollDown();
        await sleep(32);
      }
      art.remove();
    }
    print(dim('ты хотел набрать ls, да?'));
  }

  async function ghoul() {
    const line = quiet('t-acc');
    let n = 1000;
    while (n - 7 > 0) {
      line.textContent = `${n} - 7 = ${n - 7}`;
      n -= 7;
      if (!reduced()) await sleep(n > 930 ? 90 : 12);
    }
    await sleep(300);
    print(`${acc('я гуль.')} ${dim('включить zxc mode: zxc')}`);
  }

  async function hack() {
    const steps = ['подключаюсь к мейнфрейму', 'обхожу файрвол', 'подбираю пароль', 'качаю секретики'];
    const width = cols() >= 46 ? 26 : 0;
    for (const step of steps) {
      const line = quiet();
      for (let i = 0; i <= 10; i += 1) {
        line.innerHTML = `${esc(pad(step, width))}${dim('[')}${'#'.repeat(i)}${dim(`${'.'.repeat(10 - i)}]`)} ${i * 10}%`;
        if (!reduced()) await sleep(30 + Math.random() * 70);
      }
    }
    print(acc('доступ получен.'));
    await sleep(reduced() ? 0 : 600);
    print(`шучу, никто ничего не взломал.\nвзламывать я не умею, зато делаю сайты и ботов. пиши: ${acc('contact')}`);
  }

  async function ping(args) {
    const host = esc(args[0] || 'zipka');
    print(`PING ${host}: 56 байт данных`);
    for (let i = 0; i < 4; i += 1) {
      await sleep(reduced() ? 0 : 420);
      print(`64 байта от ${host}: icmp_seq=${i} время=${(3 + Math.random() * 9).toFixed(1)} мс`);
    }
    print(dim(`--- 4 пакета, 0% потерь. ${host} на связи, пиши: tg`));
  }

  function matrix() {
    if (reduced()) { print(`${dim('проснись, нео...')} матрица отдыхает, у тебя выключены анимации.`); return undefined; }
    return new Promise((resolve) => {
      const p = palette();
      const w = body.clientWidth;
      const h = body.clientHeight;
      const size = 14;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cv = document.createElement('canvas');
      cv.className = 't-rain';
      cv.setAttribute('aria-hidden', 'true');
      cv.width = w * dpr;
      cv.height = h * dpr;
      cv.style.top = `${body.offsetTop}px`;
      cv.style.height = `${h}px`;
      root.appendChild(cv);
      const g = cv.getContext('2d');
      g.scale(dpr, dpr);
      g.font = `${size - 1}px ${getComputedStyle(root).fontFamily}`;
      g.textBaseline = 'top';
      const rows = Math.ceil(h / size);
      const drop = () => ({ y: -Math.random() * rows, v: 7 + Math.random() * 16, len: 6 + Math.floor(Math.random() * 16) });
      const drops = Array.from({ length: Math.ceil(w / size) }, drop);
      let start = 0;
      let end = 0;
      const quit = () => { if (!end) end = performance.now(); };
      const stop = tick((dt, t) => {
        if (!start) start = t;
        if (t - start > 7000) quit();
        const fade = Math.min(1, (t - start) / 300, end ? 1 - (t - end) / 400 : 1);
        cv.style.opacity = String(Math.max(0, fade));
        g.clearRect(0, 0, w, h);
        drops.forEach((d, i) => {
          d.y += d.v * dt;
          if (d.y - d.len > rows) Object.assign(d, drop(), { y: -Math.random() * 6 });
          const head = Math.floor(d.y);
          for (let k = 0; k < d.len; k += 1) {
            const row = head - k;
            if (row < 0 || row >= rows) continue;
            const seed = row * 31 + i * 17 + (k < 3 ? Math.floor(t / 70) : 0);
            g.fillStyle = k === 0 ? rgbStr(p.ink) : rgbStr(p.ink3, 1 - k / d.len);
            g.fillText(RAIN[seed % RAIN.length], i * size, row * size);
          }
        });
        if (end && t - end > 400) {
          stop();
          cv.remove();
          window.removeEventListener('keydown', quit, true);
          root.removeEventListener('pointerdown', quit);
          resolve();
        }
      });
      window.addEventListener('keydown', quit, true);
      root.addEventListener('pointerdown', quit);
    }).then(() => print(`${dim('проснись, нео...')} следуй за белым кроликом: ${acc('contact')}`));
  }

  function snake() {
    const p = palette();
    const cell = 12;
    const W = clamp(Math.floor(out.clientWidth / cell), 14, 32);
    const H = 14;
    const holder = quiet('t-game');
    const cv = document.createElement('canvas');
    const status = document.createElement('div');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * cell * dpr;
    cv.height = H * cell * dpr;
    cv.style.width = `${W * cell}px`;
    cv.style.height = `${H * cell}px`;
    holder.append(cv, status);
    const g = cv.getContext('2d');
    g.scale(dpr, dpr);

    let best = 0;
    try { best = Number(localStorage.getItem('zipka-snake')) || 0; } catch { best = 0; }
    const worm = [{ x: 5, y: 7 }, { x: 4, y: 7 }, { x: 3, y: 7 }, { x: 2, y: 7 }];
    const queue = [];
    let dir = { x: 1, y: 0 };
    let score = 0;
    let lag = 0;
    let started = false;
    let paused = false;
    const spawn = () => {
      const free = [];
      for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) if (!worm.some((s) => s.x === x && s.y === y)) free.push({ x, y });
      }
      return free.length ? free[Math.floor(Math.random() * free.length)] : null;
    };
    let food = spawn();

    const hint = touch ? 'свайпай по терминалу' : 'стрелки или wasd, пробел пауза, esc выход';
    const showStatus = () => {
      const state = paused ? 'пауза' : started ? hint : `${hint}. старт через секунду`;
      status.innerHTML = `счёт ${acc(String(score))}  рекорд ${acc(String(Math.max(best, score)))}  ${dim(state)}`;
    };

    const steer = ([x, y]) => {
      started = true;
      paused = false;
      const last = queue.length ? queue[queue.length - 1] : dir;
      showStatus();
      if (queue.length > 2 || (x === -last.x && y === -last.y) || (x === last.x && y === last.y)) return;
      queue.push({ x, y });
    };

    const step = () => {
      if (queue.length) dir = queue.shift();
      const head = { x: worm[0].x + dir.x, y: worm[0].y + dir.y };
      const ate = !!food && head.x === food.x && head.y === food.y;
      const body0 = ate ? worm : worm.slice(0, -1);
      if (head.x < 0 || head.y < 0 || head.x >= W || head.y >= H || body0.some((s) => s.x === head.x && s.y === head.y)) return false;
      worm.unshift(head);
      if (ate) { score += 1; food = spawn(); showStatus(); } else worm.pop();
      return !!food;
    };

    const draw = (t) => {
      g.clearRect(0, 0, W * cell, H * cell);
      g.fillStyle = rgbStr(p.line2);
      for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) g.fillRect(x * cell + cell / 2 - 1, y * cell + cell / 2 - 1, 2, 2);
      if (food) {
        g.fillStyle = rgbStr(p.accent, 0.65 + 0.35 * Math.sin(t / 110));
        g.fillRect(food.x * cell + 3, food.y * cell + 3, cell - 6, cell - 6);
      }
      worm.forEach((s, i) => {
        g.fillStyle = rgbStr(p.ink, i ? Math.max(0.35, 1 - i / (worm.length + 6)) : 1);
        g.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
      });
      const h0 = worm[0];
      g.fillStyle = rgbStr(p.bg);
      const ex = dir.x ? h0.x * cell + (dir.x > 0 ? cell - 5 : 3) : null;
      const ey = dir.y ? h0.y * cell + (dir.y > 0 ? cell - 5 : 3) : null;
      if (ex !== null) { g.fillRect(ex, h0.y * cell + 3, 2, 2); g.fillRect(ex, h0.y * cell + cell - 5, 2, 2); }
      else { g.fillRect(h0.x * cell + 3, ey, 2, 2); g.fillRect(h0.x * cell + cell - 5, ey, 2, 2); }
    };

    return new Promise((resolve) => {
      let sx = 0;
      let sy = 0;
      const onDown = (e) => { sx = e.clientX; sy = e.clientY; };
      const onUp = (e) => {
        if (e.pointerType === 'mouse') return;
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) { if (started) { paused = !paused; showStatus(); } return; }
        steer(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
      };
      const cleanup = [];
      const finish = (dead) => {
        cleanup.forEach((fn) => fn());
        playing = false;
        root.classList.remove('is-playing');
        const record = score > best;
        if (record) { try { localStorage.setItem('zipka-snake', String(score)); } catch { best = score; } }
        const won = !food;
        const verdict = won ? acc('поле кончилось. ты победил.') : dead ? 'game over.' : 'выход.';
        print(`${verdict} счёт: ${acc(String(score))}${record ? ` ${acc('новый рекорд!')}` : ''} ${dim('ещё раз: snake')}`);
        resolve();
      };
      const onKey = (e) => {
        const a = document.activeElement;
        if (a && a !== input && a !== document.body && !root.contains(a)) return;
        const d = SNAKE_KEYS[e.code];
        if (!d && e.code !== 'Escape' && e.code !== 'Space') return;
        e.preventDefault();
        e.stopPropagation();
        if (e.code === 'Escape') finish(false);
        else if (e.code === 'Space') { if (started) { paused = !paused; showStatus(); } }
        else steer(d);
      };
      const timer = setTimeout(() => { if (!started) { started = true; showStatus(); } }, 1500);
      playing = true;
      root.classList.add('is-playing');
      window.addEventListener('keydown', onKey, true);
      body.addEventListener('pointerdown', onDown);
      body.addEventListener('pointerup', onUp);
      cleanup.push(
        () => clearTimeout(timer),
        () => window.removeEventListener('keydown', onKey, true),
        () => body.removeEventListener('pointerdown', onDown),
        () => body.removeEventListener('pointerup', onUp),
        tick((dt, t) => {
          if (started && !paused) {
            lag += dt * 1000;
            const every = Math.max(60, 130 - score * 3);
            while (lag >= every) {
              lag -= every;
              if (!step()) { draw(t); finish(true); return; }
            }
          }
          draw(t);
        }),
      );
      showStatus();
      scrollDown();
    });
  }

  const COMMANDS = {
    help: () => print([
      'команды:',
      `  ${acc(pad('whoami', 11))}кто здесь`,
      `  ${acc(pad('about', 11))}коротко обо мне`,
      `  ${acc(pad('stack', 11))}на чём пишу`,
      `  ${acc(pad('works', 11))}работы`,
      `  ${acc(pad('contact', 11))}как связаться`,
      `  ${acc(pad('neofetch', 11))}инфа о системе`,
      `  ${acc(pad('ls, cat', 11))}файлы`,
      `  ${acc(pad('theme', 11))}сменить тему`,
      `  ${acc(pad('grid', 11))}показать сетку`,
      `  ${acc(pad('clear', 11))}очистить экран`,
      dim('остальное спрятано. начни с ls -a'),
    ].join('\n')),
    whoami: () => print('зипка (justzipka). веб-дизайнер и разработчик.'),
    about: () => print(esc(ABOUT)),
    stack: () => print(listStack()),
    works: () => print(listWorks()),
    projects: () => COMMANDS.works(),
    contact: () => print(listContacts()),
    contacts: () => COMMANDS.contact(),
    tg: () => { print(`открываю telegram... ${link('https://t.me/holyfear', 't.me/holyfear')}`); window.open('https://t.me/holyfear', '_blank', 'noopener'); },
    telegram: () => COMMANDS.tg(),
    neofetch,
    ls: (args) => {
      const target = args.find((a) => !a.startsWith('-'));
      if (target && target.replace(/\/$/, '') === 'works') { print(WORKS.map((w) => w[3]).join('  ')); return; }
      if (target) { print(`ls: ${esc(target)}: нет такого файла или папки`); return; }
      const all = args.some((a) => /^-\w*a/.test(a));
      const list = all ? ['.', '..', ...HIDDEN, ...FILES] : FILES;
      print(list.map((f) => (f.endsWith('/') ? acc(f) : f.startsWith('.') ? dim(f) : f)).join('  '));
    },
    cat: (args) => {
      const f = (args[0] || '').replace(/^\.\//, '');
      if (!f) { print('cat: какой файл? попробуй ls'); return; }
      if (f === 'about.txt') print(esc(ABOUT));
      else if (f === 'stack.txt') print(listStack());
      else if (f === 'contacts.vcf') print(dim(['BEGIN:VCARD', 'VERSION:4.0', 'FN:Зипка', 'NICKNAME:justzipka', 'ROLE:веб-дизайнер и разработчик', 'URL:https://t.me/holyfear', 'EMAIL:godcomplex@xyecoc.com', 'END:VCARD'].join('\n')));
      else if (f.replace(/\/$/, '') === 'works') print('cat: works: это папка. попробуй ls works');
      else if (f === 'secret.zip') print('это архив, его надо распаковать: unzip secret.zip');
      else if (f === '.zsh_history') print(ZSH_HISTORY.map((h, i) => `${dim(String(i + 1).padStart(3, ' '))}  ${esc(h)}`).join('\n'));
      else if (f === '.env') print(dim(['ZIPKA_SECRET=не скажу', 'COFFEE_LEVEL=low', 'DEADLINE=вчера', 'FRIDAY_DEPLOY=true'].join('\n')));
      else print(`cat: ${esc(f)}: нет такого файла`);
    },
    unzip: async (args) => {
      const f = args[0];
      if (!f) { print('usage: unzip файл.zip'); return; }
      if (f === 'justzipka.zip') { print('уже распаковано. ты внутри.'); return; }
      if (f !== 'secret.zip') { print(`unzip: не могу найти ${esc(f)}`); return; }
      print('Archive:  secret.zip');
      await sleep(260);
      print(`  ${acc('inflating:')} note.txt`);
      await sleep(260);
      print(`  ${acc('inflating:')} konami.txt`);
      await sleep(320);
      print([
        '',
        hi('note.txt:'),
        'набери zxc на клавиатуре где угодно на сайте.',
        '',
        hi('konami.txt:'),
        '↑ ↑ ↓ ↓ ← → ← → b a',
      ].join('\n'));
    },
    echo: (args) => print(esc(args.join(' '))),
    date: () => {
      const d = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());
      print(`${esc(d)} ${dim('(мск)')}`);
    },
    time: () => { const t = msk(); print(`${t.h}:${t.m}:${t.s} ${dim('(мск)')}`); },
    clear: () => { out.innerHTML = ''; },
    theme: () => { const t = api.toggleTheme?.(); print(`тема: ${t === 'light' ? 'светлая' : 'тёмная'}`); },
    grid: () => { const on = api.toggleGrid?.(); print(`сетка: ${on ? 'вкл' : 'выкл'} ${dim('(ещё можно нажать g)')}`); },
    zxc: () => { const on = api.toggleZxc?.(); print(on ? acc('zxc mode: on. 1000-7...') : 'zxc mode: off'); },
    sudo: (args) => {
      if (args.join(' ').toLowerCase() === 'make me a sandwich') { print('окей.'); return; }
      if (args[0] === 'rm') { COMMANDS.rm(args.slice(1)); return; }
      print('[sudo] пароль для guest: ********\nguest нет в списке sudoers. этот инцидент будет записан.');
    },
    make: (args) => {
      if (args.join(' ').toLowerCase() === 'me a sandwich') print('сделай сам.');
      else if (!args.length) print('make: *** не заданы цели и не найден makefile. стоп.');
      else print(`make: *** нет правила для сборки цели «${esc(args.join(' '))}». стоп.`);
    },
    whois,
    snake,
    matrix,
    sl,
    ping,
    hack,
    '1000-7': ghoul,
    1000: (args) => (args.join('') === '-7' ? ghoul() : print('1000? и что с ним сделать?')),
    fortune: () => print(esc(FORTUNES[Math.floor(Math.random() * FORTUNES.length)])),
    cowsay: (args) => print(`${dim('коровы закончились, вот кот:')}\n<span class="t-art">${esc([...bubble(args.join(' ') || 'мяу. набери contact'), ...CAT].join('\n'))}</span>`),
    catsay: (args) => print(`<span class="t-art">${esc([...bubble(args.join(' ') || 'мяу.'), ...CAT].join('\n'))}</span>`),
    top: () => print([
      dim(`${pad('PID', 5)}${pad('ПРОЦЕСС', 14)}${pad('CPU', 6)}MEM`),
      ...PROCS.map(([pid, name, cpu, mem]) => `${pad(pid, 5)}${hi(pad(name, 14))}${pad(cpu, 6)}${esc(mem)}`),
      dim('это не настоящий top, выходить не надо.'),
    ].join('\n')),
    htop: () => COMMANDS.top(),
    qr: () => print(`<span class="t-qr"><svg viewBox="-1 -1 31 31" role="img" aria-label="QR-код на Telegram @holyfear"><use href="#qr-tg" width="29" height="29"/></svg></span>${dim('наведи камеру или жми: ')}${link('https://t.me/holyfear', 't.me/holyfear')}`),
    reboot: async () => {
      print('перезагрузка...');
      await sleep(700);
      try { sessionStorage.removeItem('zipka-unzipped'); } finally {
        window.scrollTo(0, 0);
        window.location.reload();
      }
    },
    rm: (args) => {
      if (args.join(' ').includes('-rf')) { print(acc('эй, не ломай мне сайт.')); api.glitch?.(); }
      else print('rm: тут ничего нельзя удалять');
    },
    pwd: () => print('/home/zipka/portfolio'),
    cd: () => print('cd: тут всего одна папка, и ты уже в ней'),
    exit: () => print('некуда выходить. ты уже дома.'),
    history: () => print(history.map((h, i) => `${dim(String(i + 1).padStart(3, ' '))}  ${esc(h)}`).join('\n') || dim('пусто')),
    vim: () => print(':q! не поможет. лучше напиши мне: contact'),
    nano: () => COMMANDS.vim(),
    git: () => print('git push --force в прод? не в мою смену.'),
    npm: () => print(`${dim('$ npm install zipka')}\nadded 1 package in 0.3s\nfound ${acc('0')} vulnerabilities`),
    hello: () => print('привет! если есть задача, набери contact.'),
    'привет': () => COMMANDS.hello(),
    hi: () => COMMANDS.hello(),
    coffee: () => print('кофе закончился. зато сайт работает.'),
    'кофе': () => COMMANDS.coffee(),
  };
  const PUBLIC = ['help', 'whoami', 'about', 'stack', 'works', 'contact', 'neofetch', 'ls', 'cat', 'unzip', 'echo', 'date', 'clear', 'theme', 'grid', 'history', 'tg'];

  async function run(raw) {
    const line = raw.trim();
    echoCmd(line);
    if (!line) return;
    history.push(line);
    hIdx = history.length;
    const [name, ...args] = line.split(/\s+/);
    const key = name.toLowerCase();
    const fn = Object.hasOwn(COMMANDS, key) ? COMMANDS[key] : null;
    if (!fn) { print(`zsh: команда не найдена: ${esc(name)}. набери ${acc('help')}`); return; }
    busy = true;
    try { await fn(args); } finally { busy = false; scrollDown(); }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (busy) return;
    userTyped = true;
    const v = input.value;
    input.value = '';
    run(v);
  });

  input.addEventListener('keydown', (e) => {
    userTyped = true;
    
    if (autotyping) { autotyping = false; input.value = ''; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      hIdx = Math.max(0, hIdx - 1);
      input.value = history[hIdx] || '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      hIdx = Math.min(history.length, hIdx + 1);
      input.value = history[hIdx] || '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      complete();
    } else if ((e.key === 'l' || e.key === 'д') && e.ctrlKey) {
      e.preventDefault();
      out.innerHTML = '';
    }
  });

  function complete() {
    const v = input.value;
    const parts = v.split(/\s+/);
    if (parts.length === 1) {
      const hits = PUBLIC.filter((c) => c.startsWith(parts[0].toLowerCase()));
      if (hits.length === 1) input.value = `${hits[0]} `;
      else if (hits.length > 1) { echoCmd(v); print(hits.join('  ')); }
    } else {
      const last = parts[parts.length - 1];
      const hits = (last.startsWith('.') ? HIDDEN : FILES).filter((f) => f.startsWith(last));
      if (hits.length === 1) { parts[parts.length - 1] = hits[0]; input.value = parts.join(' '); }
      else if (hits.length > 1) { echoCmd(v); print(hits.join('  ')); }
    }
  }

  body.addEventListener('click', () => {
    if (window.getSelection()?.toString() || (playing && touch)) return;
    input.focus({ preventScroll: true });
  });

  print(dim(`zipka shell 1.0. последний вход: сегодня, ${msk().h}:${msk().m}`));

  
  let played = false;
  watchVisible(root, async (v) => {
    if (!v || played) return;
    played = true;
    if (reduced()) { await run('whoami'); await run('neofetch'); return; }
    await sleep(500);
    for (const cmd of ['whoami', 'neofetch']) {
      if (userTyped) return;
      autotyping = true;
      for (const ch of cmd) {
        if (userTyped) return;
        input.value += ch;
        await sleep(55 + Math.random() * 70);
      }
      await sleep(260);
      if (userTyped) return;
      autotyping = false;
      input.value = '';
      await run(cmd);
      await sleep(650);
    }
  }, '-20% 0px -20% 0px');
}
