import { $ } from './core.js';

const API = 'https://84.22.149.210.sslip.io/api/site';
const KEY = { session: 'zipka-chat-session', nick: 'zipka-chat-nick', seen: 'zipka-chat-seen', nudge: 'zipka-chat-nudge' };
const NICK = /^@?[A-Za-z0-9_]{0,32}$/;
const URL_RE = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g;

const read = (k, store = localStorage) => { try { return store.getItem(k); } catch { return null; } };
const write = (k, v, store = localStorage) => { try { store.setItem(k, v); } catch { return; } };

const TEMPLATE = `
<button class="chat__fab" type="button" aria-expanded="false" aria-controls="chat-panel" aria-label="Открыть чат с Зипкой" data-snap>
  <svg class="chat__ico" viewBox="0 0 16 12" aria-hidden="true"><path d="M1 0h14v1h-14zM0 1h16v6h-16zM1 7h14v1h-14zM3 8h4v1h-4zM3 9h3v1h-3zM3 10h2v1h-2zM3 11h1v1h-1z"/><rect class="chat__dot" x="3" y="3" width="2" height="2"/><rect class="chat__dot" x="7" y="3" width="2" height="2"/><rect class="chat__dot" x="11" y="3" width="2" height="2"/></svg>
  <span class="chat__badge" hidden></span>
</button>
<p class="chat__nudge" aria-hidden="true">есть задача? пиши сюда</p>
<section class="chat__panel" id="chat-panel" role="dialog" aria-label="Чат с Зипкой">
  <div class="chat__bar">
    <span class="chat__avatar" aria-hidden="true"><svg viewBox="0 0 7 9"><path d="M0 0h7v1h-7zM0 1h7v1h-7zM4 2h3v1h-3zM3 3h3v1h-3zM2 4h3v1h-3zM1 5h3v1h-3zM0 6h3v1h-3zM0 7h7v1h-7zM0 8h7v1h-7z"/></svg></span>
    <span class="chat__who"><b>зипка</b><small class="chat__status">ответ придёт прямо сюда</small></span>
    <button class="chat__close" type="button" aria-label="Закрыть чат"><svg viewBox="0 0 7 7" aria-hidden="true"><path d="M0 0h1v1h-1zM6 0h1v1h-1zM1 1h1v1h-1zM5 1h1v1h-1zM2 2h1v1h-1zM4 2h1v1h-1zM3 3h1v1h-1zM2 4h1v1h-1zM4 4h1v1h-1zM1 5h1v1h-1zM5 5h1v1h-1zM0 6h1v1h-1zM6 6h1v1h-1z"/></svg></button>
  </div>
  <div class="chat__list" role="log" aria-live="polite" aria-relevant="additions">
    <div class="chat__msg chat__msg--me chat__msg--greet"><p class="chat__text">привет! я зипка. напиши, что нужно: сайт, бот или дизайн. отвечу прямо сюда, а если ты уже уйдёшь, напишу в telegram, так что оставь ник.</p></div>
    <p class="chat__note" hidden></p>
    <div class="chat__typing" hidden><span class="chat__pix" aria-hidden="true"><i></i><i></i><i></i></span>зипка печатает</div>
  </div>
  <form class="chat__form" novalidate autocomplete="off">
    <label class="chat__nick"><span aria-hidden="true">@</span><input name="nick" type="text" maxlength="33" placeholder="ник в telegram, необязательно" aria-label="Твой ник в Telegram, необязательно" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></label>
    <input class="chat__hp" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
    <div class="chat__row">
      <textarea name="text" rows="1" maxlength="1000" placeholder="сообщение" aria-label="Сообщение" enterkeyhint="send"></textarea>
      <button class="chat__send" type="submit" aria-label="Отправить"><svg viewBox="0 0 5 5" aria-hidden="true"><use href="#i-ne"/></svg></button>
    </div>
    <p class="chat__hint" aria-live="polite"></p>
  </form>
</section>`;

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

function stamp(ts) {
  const d = new Date(ts < 1e12 ? ts * 1000 : ts);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? time : `${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} ${time}`;
}

function fill(p, text, links) {
  if (!links) { p.textContent = text; return; }
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    if (m.index > last) p.append(text.slice(last, m.index));
    const a = document.createElement('a');
    a.href = m[0];
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = m[0];
    p.append(a);
    last = m.index + m[0].length;
  }
  if (last < text.length) p.append(text.slice(last));
}

export function initChat() {
  const root = document.createElement('div');
  root.className = 'chat';
  root.innerHTML = TEMPLATE;
  document.body.appendChild(root);

  const fab = $('.chat__fab', root);
  const badge = $('.chat__badge', root);
  const list = $('.chat__list', root);
  const note = $('.chat__note', root);
  const typingEl = $('.chat__typing', root);
  const form = $('.chat__form', root);
  const nickIn = form.elements.nick;
  const hp = form.elements.website;
  const ta = form.elements.text;
  const hint = $('.chat__hint', root);
  const closeBtn = $('.chat__close', root);

  let session = read(KEY.session);
  if (session && !/^[A-Za-z0-9_-]{16,48}$/.test(session)) session = null;
  let seen = Number(read(KEY.seen)) || 0;
  let lastId = 0;
  let lastVisitor = 0;
  let lastMe = 0;
  let open = false;
  let timer = 0;
  let busy = false;
  let fails = 0;
  let lastSend = 0;
  let hintTimer = 0;
  const known = new Map();

  nickIn.value = read(KEY.nick) || '';

  const nearBottom = () => list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  const toBottom = () => { list.scrollTop = list.scrollHeight; };

  const say = (text, ms = 3500) => {
    hint.textContent = text;
    clearTimeout(hintTimer);
    if (ms) hintTimer = setTimeout(() => { hint.textContent = ''; }, ms);
  };

  const setNote = (text) => {
    note.textContent = text;
    note.hidden = !text;
  };

  const syncNote = () => {
    if (!typingEl.hidden) { setNote(''); return; }
    if (lastVisitor && lastVisitor > lastMe) setNote('доставлено, зипка скоро ответит');
    else if (!list.querySelector('.is-pending')) setNote('');
  };

  function bubble(msg) {
    const mine = msg.from === 'me';
    const el = document.createElement('div');
    el.className = `chat__msg chat__msg--${mine ? 'me' : 'you'}`;
    const p = document.createElement('p');
    p.className = 'chat__text';
    fill(p, String(msg.text ?? ''), mine);
    const t = document.createElement('time');
    t.className = 'chat__time';
    t.textContent = stamp(msg.ts ?? Date.now());
    el.append(p, t);
    return el;
  }

  function place(el, id) {
    let before = note;
    let best = Infinity;
    if (id) {
      for (const [k, other] of known) if (k > id && k < best && other.isConnected) { best = k; before = other; }
    }
    list.insertBefore(el, before);
  }

  function badgeUpdate() {
    const unread = open ? 0 : Array.from(known.entries()).filter(([id, el]) => id > seen && el.classList.contains('chat__msg--me')).length;
    badge.hidden = !unread;
    badge.textContent = unread > 9 ? '9+' : String(unread);
    fab.setAttribute('aria-label', unread ? `Открыть чат с Зипкой, новых сообщений: ${unread}` : 'Открыть чат с Зипкой');
  }

  function markSeen() {
    if (lastMe > seen) { seen = lastMe; write(KEY.seen, String(seen)); }
    badgeUpdate();
  }

  function apply(data) {
    const stick = nearBottom();
    let fresh = false;
    const msgs = Array.isArray(data.messages) ? data.messages.slice().sort((a, b) => a.id - b.id) : [];
    for (const m of msgs) {
      const id = Number(m.id);
      if (!id || known.has(id)) { lastId = Math.max(lastId, id || 0); continue; }
      let el = null;
      if (m.from !== 'me') {
        el = Array.from(list.querySelectorAll('.chat__msg--you.is-pending, .chat__msg--you.is-sent:not([data-id])'))
          .find((x) => x.dataset.text === m.text) || null;
        if (el) { el.classList.remove('is-pending', 'is-failed'); el.dataset.id = String(id); }
      }
      if (!el) {
        el = bubble(m);
        el.dataset.id = String(id);
        place(el, id);
        if (m.from === 'me') fresh = true;
      }
      known.set(id, el);
      lastId = Math.max(lastId, id);
      if (m.from === 'me') lastMe = Math.max(lastMe, id);
      else lastVisitor = Math.max(lastVisitor, id);
    }
    const typing = !!data.typing;
    if (typingEl.hidden === typing) {
      typingEl.hidden = !typing;
      root.classList.toggle('is-typing', typing);
    }
    syncNote();
    if (open) markSeen();
    else {
      badgeUpdate();
      if (fresh && lastMe > seen) ping();
    }
    if ((stick || fresh) && open) toBottom();
  }

  function ping() {
    fab.classList.remove('is-ping');
    void fab.offsetWidth;
    fab.classList.add('is-ping');
  }

  function schedule(ms) {
    clearTimeout(timer);
    if (!session) return;
    const base = open && !document.hidden ? 3000 : 20000;
    timer = setTimeout(poll, ms ?? base * (fails > 3 ? 3 : 1));
  }

  async function poll() {
    clearTimeout(timer);
    if (!session || busy) { schedule(); return; }
    busy = true;
    try {
      const r = await fetch(`${API}/messages?session=${encodeURIComponent(session)}&after=${lastId}`, { cache: 'no-store' });
      const data = r.ok ? await r.json() : null;
      if (data && data.ok) { apply(data); fails = 0; } else fails += 1;
    } catch {
      fails += 1;
    } finally {
      busy = false;
      schedule();
    }
  }

  async function send(text, el) {
    const nick = nickIn.value.trim();
    if (!session) {
      session = uuid();
      write(KEY.session, session);
    }
    el.classList.remove('is-failed', 'is-sent');
    el.classList.add('is-pending');
    setNote('отправка...');
    try {
      const r = await fetch(`${API}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, text, nick, website: hp.value }),
      });
      if (r.status === 429) {
        el.remove();
        if (!ta.value) ta.value = text;
        grow();
        say('подожди пару секунд');
        syncNote();
        return;
      }
      const data = await r.json().catch(() => null);
      if (!r.ok || !data || !data.ok) throw new Error('send');
      lastSend = Date.now();
      write(KEY.nick, nick);
      el.classList.remove('is-pending');
      const id = Number(data.id);
      if (id && !known.has(id)) {
        el.dataset.id = String(id);
        known.set(id, el);
        lastVisitor = Math.max(lastVisitor, id);
      } else if (!id) el.classList.add('is-sent');
      syncNote();
      schedule(1500);
    } catch {
      el.classList.remove('is-pending');
      el.classList.add('is-failed');
      setNote('');
      say('не отправилось. нажми на сообщение, чтобы повторить', 6000);
    }
  }

  function grow() {
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    if (!NICK.test(nickIn.value.trim())) { say('ник: только латиница, цифры и _'); nickIn.focus(); return; }
    if (Date.now() - lastSend < 5000) { say('подожди пару секунд'); return; }
    const el = bubble({ from: 'visitor', text, ts: Date.now() });
    el.dataset.text = text;
    place(el, 0);
    ta.value = '';
    grow();
    toBottom();
    send(text, el);
  });

  list.addEventListener('click', (e) => {
    const el = e.target instanceof Element ? e.target.closest('.chat__msg--you.is-failed') : null;
    if (el) send(el.dataset.text, el);
  });

  ta.addEventListener('input', grow);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
  });
  nickIn.addEventListener('input', () => {
    if (!NICK.test(nickIn.value.trim())) say('ник: только латиница, цифры и _', 0);
    else if (hint.textContent.startsWith('ник:')) say('', 0);
  });

  function setOpen(v, focus = true) {
    if (open === v) return;
    open = v;
    root.classList.toggle('is-open', v);
    fab.setAttribute('aria-expanded', String(v));
    root.classList.remove('is-nudge');
    write(KEY.nudge, '1', sessionStorage);
    if (v) {
      markSeen();
      toBottom();
      if (focus) setTimeout(() => ta.focus({ preventScroll: true }), 60);
      if (session) poll();
    } else {
      if (focus) fab.focus({ preventScroll: true });
      schedule();
    }
  }

  fab.addEventListener('click', () => setOpen(!open));
  closeBtn.addEventListener('click', () => setOpen(false));
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && session) poll(); else schedule(); });

  if (session) poll();

  if (!session && !read(KEY.nudge, sessionStorage)) {
    setTimeout(() => {
      if (open || session) return;
      root.classList.add('is-nudge');
      write(KEY.nudge, '1', sessionStorage);
      setTimeout(() => root.classList.remove('is-nudge'), 6500);
    }, 25000);
  }

  return { open: () => setOpen(true) };
}
