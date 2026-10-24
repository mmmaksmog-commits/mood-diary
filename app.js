const KEY = 'mood_v1';
const $ = (s) => document.querySelector(s);

const MOODS = [
  { v: 1, emoji: '😣', name: 'Ужасно', color: '#94a3b8' },
  { v: 2, emoji: '😕', name: 'Плохо', color: '#60a5fa' },
  { v: 3, emoji: '😐', name: 'Нормально', color: '#facc15' },
  { v: 4, emoji: '🙂', name: 'Хорошо', color: '#fb923c' },
  { v: 5, emoji: '🤩', name: 'Отлично', color: '#f43f5e' },
];
const FACTORS = [
  ['sleep', '😴 Хороший сон'], ['sport', '🏃 Спорт'], ['friends', '👯 Друзья'], ['family', '🏡 Семья'],
  ['work', '💼 Работа'], ['study', '📚 Учёба'], ['nature', '🌳 Прогулка'], ['food', '🍜 Вкусная еда'],
  ['games', '🎮 Игры'], ['stress', '😤 Стресс'], ['sick', '🤒 Болезнь'], ['weather', '🌧 Погода'],
];
const factorName = Object.fromEntries(FACTORS);

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) return d; } catch { /* ignore */ }
  return demo();
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ } }

// Демо-данные с реальными закономерностями: спорт и сон поднимают настроение, стресс — опускает
function demo() {
  const entries = {};
  for (let i = 1; i < 75; i++) {
    if (Math.random() < 0.15) continue;
    const d = new Date();
    d.setDate(d.getDate() - i);
    const f = FACTORS.map(([id]) => id).filter((id) => Math.random() < ({ sleep: 0.5, sport: 0.35, friends: 0.3, work: 0.5, stress: 0.25, nature: 0.3, sick: 0.05 }[id] ?? 0.12));
    let v = 3 + (f.includes('sleep') ? 0.8 : -0.4) + (f.includes('sport') ? 0.7 : 0) + (f.includes('friends') ? 0.6 : 0) + (f.includes('stress') ? -1.3 : 0) + (f.includes('sick') ? -1.5 : 0) + (Math.random() - 0.5);
    v = Math.max(1, Math.min(5, Math.round(v)));
    entries[iso(d)] = { v, f, note: '' };
  }
  return { entries };
}

const db = load();
let day = iso(new Date());
let view = new Date();
view.setDate(1);
let draft = { v: 0, f: [], note: '' };

const plural = (n, a, b, c) => { const m = n % 10; const h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
const escapeHTML = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Запись ----------
function loadDraft() {
  const e = db.entries[day];
  draft = e ? { v: e.v, f: [...e.f], note: e.note } : { v: 0, f: [], note: '' };
  const isToday = day === iso(new Date());
  const label = parse(day).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#dateLabel').textContent = isToday ? `Сегодня, ${label}` : label[0].toUpperCase() + label.slice(1);
  document.querySelector('.top h1').innerHTML = isToday ? 'Как вы<br><em>сегодня?</em>' : 'Как прошёл<br><em>этот день?</em>';
  $('#note').value = draft.note;
  renderEntry();
}

function renderEntry() {
  $('#moods').innerHTML = MOODS.map((m) => `
    <button class="mood ${draft.v === m.v ? 'is-active' : ''}" role="radio" aria-checked="${draft.v === m.v}" data-v="${m.v}" style="--c:${m.color}">
      <span>${m.emoji}</span><small>${m.name}</small>
    </button>`).join('');
  $('#factors').innerHTML = FACTORS.map(([id, name]) => `<button class="chip ${draft.f.includes(id) ? 'is-active' : ''}" data-f="${id}">${name}</button>`).join('');
  $('#saveBtn').disabled = !draft.v;
  $('#saveBtn').textContent = db.entries[day] ? 'Обновить запись' : 'Сохранить';
}

// ---------- Календарь ----------
function renderCalendar() {
  const y = view.getFullYear();
  const m = view.getMonth();
  const label = view.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(' г.', '');
  $('#monthLabel').textContent = label[0].toUpperCase() + label.slice(1);
  const now = new Date();
  $('#nextM').disabled = y === now.getFullYear() && m === now.getMonth();
  const first = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const head = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((d) => `<span class="cal__wd">${d}</span>`).join('');
  const blanks = '<span></span>'.repeat(first);
  const cells = Array.from({ length: days }, (_, i) => {
    const d = new Date(y, m, i + 1);
    const key = iso(d);
    const e = db.entries[key];
    const mood = e && MOODS[e.v - 1];
    const future = d > now;
    return `<button class="cal__day ${key === day ? 'is-sel' : ''} ${future ? 'is-future' : ''}" ${future ? 'disabled' : ''} data-day="${key}" style="${mood ? `--c:${mood.color}` : ''}" title="${mood ? mood.name : ''}">
      ${mood ? `<span>${mood.emoji}</span>` : `<b>${i + 1}</b>`}
    </button>`;
  }).join('');
  $('#cal').innerHTML = head + blanks + cells;
}

// ---------- Закономерности ----------
function renderInsights() {
  const list = Object.values(db.entries);
  if (list.length < 5) {
    $('#avg').innerHTML = '';
    $('#insights').innerHTML = '<p class="hint">Сделайте хотя бы 5 записей — и здесь появятся выводы.</p>';
    return;
  }
  const avg = (arr) => arr.reduce((s, e) => s + e.v, 0) / arr.length;
  const total = avg(list);
  const last30 = Object.entries(db.entries).filter(([k]) => parse(k) > new Date(Date.now() - 30 * 864e5)).map(([, e]) => e);
  const dist = MOODS.map((mo) => list.filter((e) => e.v === mo.v).length);
  $('#avg').innerHTML = `
    <div class="avg__num"><b>${MOODS[Math.round(total) - 1].emoji} ${total.toFixed(1)}</b><span>в среднем за ${list.length} ${plural(list.length, 'день', 'дня', 'дней')}</span></div>
    <div class="avg__bar">${MOODS.map((mo, i) => `<i style="flex:${dist[i] || 0.001};background:${mo.color}" title="${mo.name}: ${dist[i]}"></i>`).join('')}</div>
    ${last30.length ? `<p class="hint">За последние 30 дней: <b>${avg(last30).toFixed(1)}</b></p>` : ''}`;

  // Влияние фактора: среднее «с фактором» минус «без фактора»
  const impact = FACTORS.map(([id]) => {
    const withF = list.filter((e) => e.f.includes(id));
    const without = list.filter((e) => !e.f.includes(id));
    if (withF.length < 3 || without.length < 3) return null;
    return { id, diff: avg(withF) - avg(without), n: withF.length };
  }).filter(Boolean).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 5);

  $('#insights').innerHTML = impact.length
    ? impact.map((x) => `
      <div class="insight ${x.diff >= 0 ? 'is-up' : 'is-down'}">
        <span class="insight__name">${factorName[x.id]}</span>
        <span class="insight__bar"><i style="width:${Math.min(100, Math.abs(x.diff) * 50)}%"></i></span>
        <b>${x.diff >= 0 ? '+' : '−'}${Math.abs(x.diff).toFixed(1)}</b>
      </div>`).join('') + '<p class="hint">Насколько настроение выше (+) или ниже (−), когда фактор есть</p>'
    : '<p class="hint">Отмечайте факторы — так станет видно, что на вас влияет.</p>';
}

function toast(t) {
  const el = $('#toast');
  el.textContent = t;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 1800);
}

// ---------- События ----------
$('#moods').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { draft.v = Number(b.dataset.v); renderEntry(); } });
$('#factors').addEventListener('click', (e) => {
  const b = e.target.closest('[data-f]');
  if (!b) return;
  const id = b.dataset.f;
  draft.f = draft.f.includes(id) ? draft.f.filter((x) => x !== id) : [...draft.f, id];
  renderEntry();
});
$('#note').addEventListener('input', (e) => { draft.note = e.target.value; });
$('#saveBtn').onclick = () => {
  if (!draft.v) return;
  db.entries[day] = { v: draft.v, f: draft.f, note: draft.note.trim() };
  save();
  renderEntry();
  renderCalendar();
  renderInsights();
  toast(`${MOODS[draft.v - 1].emoji} Записано`);
};
$('#cal').addEventListener('click', (e) => {
  const b = e.target.closest('[data-day]');
  if (!b) return;
  day = b.dataset.day;
  loadDraft();
  renderCalendar();
  const e2 = db.entries[day];
  if (e2?.note) toast(`«${e2.note.slice(0, 60)}»`);
  document.querySelector('.entry').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
$('#prevM').onclick = () => { view.setMonth(view.getMonth() - 1); renderCalendar(); };
$('#nextM').onclick = () => { view.setMonth(view.getMonth() + 1); renderCalendar(); };

loadDraft();
renderCalendar();
renderInsights();
