// Терминал: настоящая командная строка с историей, автодополнением
// и парой секретов. Сам печатает первые команды, когда его видно.

import { $, sleep, msk, watchVisible, reduced } from './core.js';

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
  ['почта', 'mailto:godcomplexxed@xyecoc.com', 'godcomplexxed@xyecoc.com'],
];

const FILES = ['about.txt', 'stack.txt', 'contacts.vcf', 'works/', 'secret.zip'];

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
    const swatches = ['var(--accent)', 'var(--ink)', 'var(--ink-2)', 'var(--ink-3)', 'var(--line-2)']
      .map((c) => `<i style="display:inline-block;width:18px;height:10px;background:${c};margin-right:4px"></i>`).join('');
    print(`<div class="t-neo"><svg class="t-neo__logo" viewBox="0 0 168 43" aria-hidden="true"><use href="#logo-path"/></svg><div>${info}\n\n${swatches}</div></div>`);
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
      dim('остальное спрятано, поищи.'),
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
      if (args[0] && args[0].replace(/\/$/, '') === 'works') { print(WORKS.map((w) => w[3]).join('  ')); return; }
      if (args[0]) { print(`ls: ${esc(args[0])}: нет такого файла или папки`); return; }
      print(FILES.map((f) => (f.endsWith('/') ? acc(f) : f)).join('  '));
    },
    cat: (args) => {
      const f = (args[0] || '').replace(/^\.\//, '');
      if (!f) { print('cat: какой файл? попробуй ls'); return; }
      if (f === 'about.txt') print(esc(ABOUT));
      else if (f === 'stack.txt') print(listStack());
      else if (f === 'contacts.vcf') print(dim(['BEGIN:VCARD', 'VERSION:4.0', 'FN:Зипка', 'NICKNAME:justzipka', 'ROLE:веб-дизайнер и разработчик', 'URL:https://t.me/holyfear', 'EMAIL:godcomplexxed@xyecoc.com', 'END:VCARD'].join('\n')));
      else if (f.replace(/\/$/, '') === 'works') print('cat: works: это папка. попробуй ls works');
      else if (f === 'secret.zip') print('это архив, его надо распаковать: unzip secret.zip');
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
    sudo: () => print('[sudo] пароль для guest: ********\nguest нет в списке sudoers. этот инцидент будет записан.'),
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
    const fn = COMMANDS[name.toLowerCase()];
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
    // если автопечать ещё идёт, убираем её недописанную команду
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
      const hits = FILES.filter((f) => f.startsWith(last));
      if (hits.length === 1) { parts[parts.length - 1] = hits[0]; input.value = parts.join(' '); }
      else if (hits.length > 1) { echoCmd(v); print(hits.join('  ')); }
    }
  }

  body.addEventListener('click', () => {
    if (window.getSelection()?.toString()) return;
    input.focus({ preventScroll: true });
  });

  print(dim(`zipka shell 1.0. последний вход: сегодня, ${msk().h}:${msk().m}`));

  // автопечать при первом появлении
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
