import { createStore } from './store.js';

const MEALS = { sabah: 'Sabah', ogle: 'Öğle', aksam: 'Akşam', ara: 'Ara Öğün' };
const MEAL_ORDER = Object.keys(MEALS);
const SELECTED_USER_KEY = 'samsinnFit.selectedUser';
const VIEW_KEY = 'samsinnFit.view';
const SVG_NS = 'http://www.w3.org/2000/svg';

const monthFormat = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });
const rangeFormat = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
const dayFormat = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const headingFormat = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
const numberFormat = new Intl.NumberFormat('tr-TR');

// Veri Yapısı
const state = {
  users: [],
  selectedUser: readPreference(SELECTED_USER_KEY, null), // her cihaz kendi seçimini hatırlar
  view: readPreference(VIEW_KEY, matchMedia('(max-width: 600px)').matches ? 'week' : 'month'),
  selectedDate: toDateKey(new Date()), // 'YYYY-MM-DD'
  entries: [], // takvimde görünen aralıktaki tüm kayıtlar
  pending: false, // sunucuya henüz ulaşmamış değişiklik var mı
  account: null,
  editing: { food: null, exercise: null } // düzenlenen kaydın id'si
};

const SHEETS = {
  food: {
    sheet: 'foodSheet', form: 'foodForm', title: 'foodSheetTitle',
    titles: ['Besin ekle', 'Besini düzenle'],
    fields: { name: 'foodName', calories: 'foodCalories' }
  },
  exercise: {
    sheet: 'exerciseSheet', form: 'exerciseForm', title: 'exerciseSheetTitle',
    titles: ['Aktivite ekle', 'Aktiviteyi düzenle'],
    fields: { name: 'exerciseName', duration: 'exerciseDuration', notes: 'exerciseNotes' }
  }
};

let store;
let authNotice = '';
let toastTimer;
let toastHandler = null;
const subscriptions = { users: null, entries: null, range: '' };

const $ = (id) => document.getElementById(id);
const formatKcal = (value) => `${numberFormat.format(value)} kcal`;

// Tarihler her zaman yerel saate göre 'YYYY-MM-DD' anahtarına çevrilir
// (toISOString UTC kullandığı için Türkiye saatinde bir önceki günü verir)
function toDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Haftalar pazartesi başlar
function startOfWeek(date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

// Takvimde gösterilecek günler: haftalık görünümde 7 gün, aylıkta ayı kapsayan tam haftalar
function visibleDays() {
  const selected = fromDateKey(state.selectedDate);
  let start = startOfWeek(selected);
  let end = addDays(start, 6);

  if (state.view === 'month') {
    start = startOfWeek(new Date(selected.getFullYear(), selected.getMonth(), 1));
    end = addDays(startOfWeek(new Date(selected.getFullYear(), selected.getMonth() + 1, 0)), 6);
  }

  const days = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

// Saate göre varsayılan öğün
function mealForNow() {
  const hour = new Date().getHours();
  if (hour < 11) return 'sabah';
  if (hour < 16) return 'ogle';
  if (hour < 21) return 'aksam';
  return 'ara';
}

// Cihaza özel tercihler (seçili kişi, görünüm)
function readPreference(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function savePreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Tercih sadece bu oturum için geçerli kalır
  }
}

function currentUser() {
  return state.users.find(user => user.id === state.selectedUser);
}

function entriesOn(dateKey, type) {
  return state.entries.filter(e => e.userId === state.selectedUser && e.date === dateKey && e.type === type);
}

// Seçili kişinin görünen aralıktaki kayıtlarından, isme göre tekilleştirilmiş en yeniler
function recentEntries(type) {
  const seen = new Set();
  return state.entries
    .filter(e => e.userId === state.selectedUser && e.type === type)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .filter(e => {
      const key = e.name.toLocaleLowerCase('tr');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// DOM yardımcıları
function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

function iconButton(name, label, className) {
  const button = el('button', `icon-btn ${className}`);
  button.type = 'button';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.append(icon(name));
  return button;
}

// Ekranlar
function showScreen(name) {
  $('loading').hidden = name !== 'loading';
  $('authScreen').hidden = name !== 'auth';
  $('app').hidden = name !== 'app';
}

function showAuthScreen() {
  $('authMessage').textContent = authNotice;
  $('authMessage').hidden = !authNotice;
  showScreen('auth');
}

// Takvim oluştur
function renderCalendar() {
  const days = visibleDays();
  const todayKey = toDateKey(new Date());
  const selectedMonth = fromDateKey(state.selectedDate).getMonth();

  const totals = {}; // tarih -> { food, exercise, kcal }
  state.entries.forEach(entry => {
    if (entry.userId !== state.selectedUser) return;
    const day = (totals[entry.date] ||= { kcal: 0 });
    day[entry.type] = true;
    if (entry.type === 'food') day.kcal += Number(entry.calories) || 0;
  });

  const calendar = $('calendar');
  calendar.classList.toggle('week', state.view === 'week');
  calendar.classList.toggle('month', state.view === 'month');
  calendar.replaceChildren(...days.map(date => {
    const dayStr = toDateKey(date);
    const info = totals[dayStr];
    const dayEl = el('button', 'calendar-day');
    dayEl.type = 'button';
    dayEl.dataset.date = dayStr;
    dayEl.classList.toggle('today', dayStr === todayKey);
    dayEl.classList.toggle('selected', dayStr === state.selectedDate);
    dayEl.classList.toggle('outside', state.view === 'month' && date.getMonth() !== selectedMonth);
    if (dayStr === todayKey) dayEl.setAttribute('aria-current', 'date');
    dayEl.setAttribute('aria-pressed', String(dayStr === state.selectedDate));

    const marks = [info?.food && 'beslenme kaydı var', info?.exercise && 'spor kaydı var'].filter(Boolean);
    dayEl.setAttribute('aria-label', [dayFormat.format(date), ...marks].join(', '));

    const dots = el('span', 'day-dots');
    if (info?.food) dots.append(el('span', 'dot dot-food'));
    if (info?.exercise) dots.append(el('span', 'dot dot-exercise'));

    dayEl.append(
      el('span', 'day-number', String(date.getDate())),
      dots,
      el('span', 'day-kcal', info?.kcal ? numberFormat.format(info.kcal) : '')
    );
    return dayEl;
  }));

  $('periodLabel').textContent = state.view === 'week'
    ? rangeFormat.formatRange(days[0], days[6])
    : monthFormat.format(fromDateKey(state.selectedDate));
  $('viewWeek').setAttribute('aria-pressed', String(state.view === 'week'));
  $('viewMonth').setAttribute('aria-pressed', String(state.view === 'month'));
}

// Seçili günün kayıtları
function renderDetails() {
  const date = fromDateKey(state.selectedDate);
  $('selectedDateLabel').textContent = headingFormat.format(date);
  $('todayBadge').hidden = state.selectedDate !== toDateKey(new Date());

  const foods = entriesOn(state.selectedDate, 'food');
  const exercises = entriesOn(state.selectedDate, 'exercise');
  const total = foods.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);

  renderSummary(total, exercises.length);
  renderMealGroups(foods);
  $('foodTotal').textContent = foods.length ? formatKcal(total) : '';

  $('exerciseCount').textContent = exercises.length ? `${exercises.length} aktivite` : '';
  if (exercises.length) {
    $('exerciseList').replaceChildren(...exercises.map(entryRow));
  } else {
    $('exerciseList').replaceChildren(el('p', 'empty-note', 'Bu gün için aktivite yok.'));
  }
}

function renderSummary(total, exerciseCount) {
  const goal = Number(currentUser()?.calorieGoal) || 0;
  const ring = $('calorieRing');
  ring.style.setProperty('--p', goal ? Math.min(100, (total / goal) * 100) : 0);
  ring.classList.toggle('over', goal > 0 && total > goal);
  $('totalCalories').textContent = numberFormat.format(total);

  if (!goal) {
    $('summaryMain').textContent = total ? 'Alınan kalori' : 'Henüz besin eklenmedi';
    $('summarySub').textContent = 'Günlük hedefi ⚙️ Ayarlar\'dan belirleyebilirsiniz';
  } else if (total > goal) {
    $('summaryMain').textContent = `${formatKcal(total - goal)} hedefin üzerinde`;
    $('summarySub').textContent = `Günlük hedef: ${formatKcal(goal)}`;
  } else {
    $('summaryMain').textContent = `${formatKcal(goal - total)} kaldı`;
    $('summarySub').textContent = `Günlük hedef: ${formatKcal(goal)}`;
  }
  $('exerciseSummary').textContent = exerciseCount ? `${exerciseCount} aktivite` : 'Spor kaydı yok';
  $('exerciseSummary').parentElement.classList.toggle('none', !exerciseCount);
}

function renderMealGroups(foods) {
  $('mealGroups').replaceChildren(...MEAL_ORDER.map(meal => {
    const items = foods.filter(item => item.meal === meal);
    const subtotal = items.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);

    const title = el('div');
    title.append(el('span', 'meal-title', MEALS[meal]), el('span', 'meal-kcal', items.length ? formatKcal(subtotal) : ''));
    const add = iconButton('plus', `${MEALS[meal]} öğününe besin ekle`, 'meal-add');
    add.dataset.addMeal = meal;

    const header = el('div', 'meal-header');
    header.append(title, add);
    const list = el('div', 'entry-list');
    list.append(...items.map(entryRow));

    const group = el('div', 'meal-group');
    group.append(header, list);
    return group;
  }));
}

function entryRow(entry) {
  const main = el('button', 'entry-main');
  main.type = 'button';
  main.title = 'Düzenle';
  main.dataset.action = 'edit';
  main.dataset.id = entry.id;

  const text = el('span', 'entry-text');
  text.append(el('span', 'entry-name', entry.name));
  if (entry.notes) text.append(el('span', 'entry-note', entry.notes));
  main.append(text, el('span', 'entry-detail', entry.type === 'food' ? formatKcal(entry.calories) : entry.duration));

  const remove = iconButton('trash', `${entry.name} kaydını sil`, 'entry-delete');
  remove.dataset.action = 'delete';
  remove.dataset.id = entry.id;

  const row = el('div', 'entry');
  row.append(main, remove);
  return row;
}

function renderPersonSwitch() {
  $('personSwitch').replaceChildren(...state.users.map(user => {
    const button = el('button', '', user.name);
    button.type = 'button';
    button.dataset.user = user.id;
    button.setAttribute('aria-pressed', String(user.id === state.selectedUser));
    return button;
  }));
}

function setStatus(kind, text, title = '') {
  $('status').hidden = !kind;
  $('status').dataset.state = kind || '';
  $('status').title = title;
  $('statusText').textContent = text || '';
}

// Durum sadece dikkat gerektiğinde gösterilir
function renderStatus() {
  if (store.mode === 'local') setStatus('local', 'Yerel mod', 'Kayıtlar sadece bu cihazda saklanıyor');
  else if (!navigator.onLine) setStatus('offline', 'Çevrimdışı', 'Değişiklikler bağlantı gelince gönderilecek');
  else if (state.pending) setStatus('pending', 'Kaydediliyor…');
  else setStatus(null);
}

function render() {
  renderCalendar();
  renderDetails();
  renderStatus();
}

// Bildirim
function showToast(message, { action, onAction } = {}) {
  clearTimeout(toastTimer);
  $('toastText').textContent = message;
  $('toastAction').textContent = action ?? '';
  $('toastAction').hidden = !action;
  toastHandler = onAction ?? null;
  $('toast').hidden = false;
  toastTimer = setTimeout(hideToast, action ? 6000 : 4000);
}

function hideToast() {
  $('toast').hidden = true;
  toastHandler = null;
}

// Veri abonelikleri
function watchVisibleRange() {
  const days = visibleDays();
  const start = toDateKey(days[0]);
  const end = toDateKey(days[days.length - 1]);
  if (subscriptions.range === `${start}/${end}`) return;

  subscriptions.range = `${start}/${end}`;
  subscriptions.entries?.();
  subscriptions.entries = store.watchEntries(start, end, (entries, meta) => {
    state.entries = entries;
    state.pending = meta.pending;
    render();
  }, handleDataError);
}

function startApp(account) {
  stopApp();
  state.account = account;
  subscriptions.users = store.watchUsers(users => {
    state.users = users;
    if (!users.some(user => user.id === state.selectedUser)) state.selectedUser = users[0].id;
    renderPersonSwitch();
    render();
  }, handleDataError);
  watchVisibleRange();
  showScreen('app');
  render();
}

function stopApp() {
  subscriptions.users?.();
  subscriptions.entries?.();
  Object.assign(subscriptions, { users: null, entries: null, range: '' });
  Object.assign(state, { account: null, entries: [], pending: false });
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  hideToast();
}

async function handleDataError(error) {
  if (!state.account) return;
  if (error.code === 'permission-denied') {
    authNotice = `${state.account.email} hesabının bu uygulamaya erişim izni yok. İzin verilen bir Google hesabıyla giriş yapın.`;
    stopApp();
    await store.signOut();
    showAuthScreen();
    return;
  }
  console.error(error);
  setStatus('error', 'Bağlantı hatası', 'Veriler yüklenemedi. Sayfayı yenileyin.');
}

function reportWriteError(error) {
  console.error(error);
  showToast(error.code === 'permission-denied'
    ? 'Kaydedilemedi: yetki yok ya da bilgi geçersiz.'
    : 'Değişiklik kaydedilemedi. Lütfen tekrar deneyin.');
}

// Gün ve görünüm seçimi
function selectDate(dateKey) {
  state.selectedDate = dateKey;
  watchVisibleRange();
  renderCalendar();
  renderDetails();
}

function shiftPeriod(direction) {
  const date = fromDateKey(state.selectedDate);
  if (state.view === 'week') {
    selectDate(toDateKey(addDays(date, 7 * direction)));
    return;
  }
  // Ayın 31'inden bir sonraki aya geçerken ay atlamaması için gün, hedef ayın son gününe sabitlenir
  const lastDay = new Date(date.getFullYear(), date.getMonth() + direction + 1, 0).getDate();
  selectDate(toDateKey(new Date(date.getFullYear(), date.getMonth() + direction, Math.min(date.getDate(), lastDay))));
}

function setView(view) {
  state.view = view;
  savePreference(VIEW_KEY, view);
  watchVisibleRange();
  renderCalendar();
}

// Kayıt panelleri
function openSheet(type, { entry = null, meal = null } = {}) {
  const config = SHEETS[type];
  const form = $(config.form);
  form.reset();
  state.editing[type] = entry?.id ?? null;

  if (entry) {
    Object.entries(config.fields).forEach(([field, inputId]) => { $(inputId).value = entry[field] ?? ''; });
  }
  if (type === 'food') form.elements.meal.value = entry?.meal ?? meal ?? mealForNow();

  $(config.title).textContent = config.titles[entry ? 1 : 0];
  form.querySelector('[data-delete]').hidden = !entry;
  renderQuickPicks(type, !entry);
  $(config.sheet).showModal();
  // Dokunmatik cihazlarda klavye hızlı seçimleri kapatmasın diye sadece fareli cihazlarda odaklan
  if (!entry && matchMedia('(hover: hover)').matches) $(config.fields.name).focus();
}

function renderQuickPicks(type, visible) {
  const recent = recentEntries(type);
  $(`${type}Suggestions`).replaceChildren(...recent.map(entry => {
    const option = document.createElement('option');
    option.value = entry.name;
    return option;
  }));

  const picks = visible ? recent.slice(0, 6) : [];
  $(`${type}QuickPicks`).hidden = !picks.length;
  $(`${type}Chips`).replaceChildren(...picks.map(entry => {
    const chip = el('button', 'chip', entry.name);
    chip.type = 'button';
    chip.append(el('small', '', type === 'food' ? formatKcal(entry.calories) : entry.duration));
    chip.addEventListener('click', () => fillFromHistory(type, entry, true));
    return chip;
  }));
}

// Daha önce girilmiş bir kaydın bilgilerini forma doldurur
function fillFromHistory(type, entry, overwrite) {
  const { fields } = SHEETS[type];
  const detailField = type === 'food' ? 'calories' : 'duration';
  $(fields.name).value = entry.name;
  if (overwrite || !$(fields[detailField]).value) $(fields[detailField]).value = entry[detailField];
}

function readForm(type) {
  if (type === 'food') {
    return {
      name: $('foodName').value.trim(),
      calories: Math.round(Number($('foodCalories').value)),
      meal: $('foodForm').elements.meal.value
    };
  }
  return {
    name: $('exerciseName').value.trim(),
    duration: $('exerciseDuration').value.trim(),
    notes: $('exerciseNotes').value.trim()
  };
}

function submitSheet(type) {
  if (!state.selectedUser) return;
  const fields = readForm(type);
  const id = state.editing[type];
  const request = id
    ? store.updateEntry(id, fields)
    : store.addEntry({ ...fields, type, userId: state.selectedUser, date: state.selectedDate });
  // Firestore değişikliği hemen ekrana yansıtır; istek sunucuya ulaşınca (çevrimdışıysa daha sonra) tamamlanır
  request.catch(reportWriteError);
  $(SHEETS[type].sheet).close();
}

function deleteEntry(entry) {
  store.deleteEntry(entry.id).catch(reportWriteError);
  showToast(`"${entry.name}" silindi`, {
    action: 'Geri al',
    onAction: () => store.restoreEntry(entry).catch(reportWriteError)
  });
}

// Ayarlar
function openSettings() {
  $('peopleFields').replaceChildren(...state.users.map((user, index) => {
    const fields = $('personFieldsTemplate').content.firstElementChild.cloneNode(true);
    const [nameLabel, goalLabel] = fields.querySelectorAll('label');
    const nameInput = fields.querySelector('[name=name]');
    const goalInput = fields.querySelector('[name=goal]');

    fields.querySelector('legend').textContent = `Kişi ${index + 1}`;
    nameInput.id = nameLabel.htmlFor = `person${index}Name`;
    goalInput.id = goalLabel.htmlFor = `person${index}Goal`;
    nameInput.value = user.name;
    goalInput.value = user.calorieGoal || '';
    return fields;
  }));
  $('accountSection').hidden = store.mode === 'local';
  $('accountEmail').textContent = state.account?.email ?? '';
  $('localModeHint').hidden = store.mode !== 'local';
  $('settingsSheet').showModal();
}

function saveSettings() {
  if (!state.users.length) return;
  const users = state.users.map((user, index) => {
    const { calorieGoal, ...rest } = user;
    const name = $(`person${index}Name`).value.trim();
    const goal = Math.round(Number($(`person${index}Goal`).value));
    return { ...rest, name: name || user.name, ...(goal > 0 ? { calorieGoal: goal } : {}) };
  });
  store.saveUsers(users).catch(reportWriteError);
  $('settingsSheet').close();
}

// Olaylar
function bindEvents() {
  $('signInBtn').addEventListener('click', async () => {
    authNotice = '';
    $('authMessage').hidden = true;
    try {
      await store.signIn();
    } catch (error) {
      if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(error.code)) return;
      const messages = {
        'auth/popup-blocked': 'Giriş penceresi engellendi. Tarayıcının açılır pencere iznini verip tekrar deneyin.',
        'auth/unauthorized-domain': 'Bu adres Firebase\'de yetkili alan adı olarak eklenmemiş (README > Firebase Kurulumu).',
        'auth/network-request-failed': 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.'
      };
      $('authMessage').textContent = messages[error.code] || `Giriş yapılamadı: ${error.message}`;
      $('authMessage').hidden = false;
    }
  });

  $('signOutBtn').addEventListener('click', () => {
    $('settingsSheet').close();
    store.signOut();
  });

  // Kişi seçimi
  $('personSwitch').addEventListener('click', (e) => {
    const button = e.target.closest('[data-user]');
    if (!button) return;
    state.selectedUser = button.dataset.user;
    savePreference(SELECTED_USER_KEY, state.selectedUser);
    renderPersonSwitch();
    renderCalendar();
    renderDetails();
  });

  // Takvim kontrolü
  $('prevPeriod').addEventListener('click', () => shiftPeriod(-1));
  $('nextPeriod').addEventListener('click', () => shiftPeriod(1));
  $('todayBtn').addEventListener('click', () => selectDate(toDateKey(new Date())));
  $('viewMonth').addEventListener('click', () => setView('month'));
  $('viewWeek').addEventListener('click', () => setView('week'));

  $('calendar').addEventListener('click', (e) => {
    const dayEl = e.target.closest('.calendar-day');
    if (dayEl) selectDate(dayEl.dataset.date);
  });

  // Takvimde sağa/sola kaydırarak dönem değiştir
  let touchStart = null;
  $('calendar').addEventListener('touchstart', (e) => {
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  $('calendar').addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) shiftPeriod(dx < 0 ? 1 : -1);
  });

  // Ekleme, düzenleme ve silme
  $('addFoodBtn').addEventListener('click', () => openSheet('food'));
  $('addExerciseBtn').addEventListener('click', () => openSheet('exercise'));

  $('dailyDetails').addEventListener('click', (e) => {
    const addMeal = e.target.closest('[data-add-meal]');
    if (addMeal) {
      openSheet('food', { meal: addMeal.dataset.addMeal });
      return;
    }
    const button = e.target.closest('[data-action]');
    const entry = button && state.entries.find(item => item.id === button.dataset.id);
    if (!entry) return;
    if (button.dataset.action === 'edit') openSheet(entry.type, { entry });
    else deleteEntry(entry);
  });

  Object.entries(SHEETS).forEach(([type, { sheet, form, fields }]) => {
    $(form).addEventListener('submit', (e) => {
      e.preventDefault();
      submitSheet(type);
    });
    $(sheet).addEventListener('close', () => {
      $(form).reset();
      state.editing[type] = null;
    });
    $(form).querySelector('[data-delete]').addEventListener('click', () => {
      const entry = state.entries.find(item => item.id === state.editing[type]);
      $(sheet).close();
      if (entry) deleteEntry(entry);
    });
    // Bilinen bir isim girilince kalori/süre boşsa önceki kayıttan doldur
    $(fields.name).addEventListener('change', () => {
      const name = $(fields.name).value.trim().toLocaleLowerCase('tr');
      const match = recentEntries(type).find(entry => entry.name.toLocaleLowerCase('tr') === name);
      if (match) fillFromHistory(type, match, false);
    });
  });

  // Ayarlar
  $('openSettings').addEventListener('click', openSettings);
  $('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings();
  });

  // Paneller: kapat düğmesi ve arka plana tıklama
  document.querySelectorAll('dialog.sheet').forEach(dialog => {
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });
  });

  $('toastAction').addEventListener('click', () => {
    const handler = toastHandler;
    hideToast();
    handler?.();
  });

  window.addEventListener('online', renderStatus);
  window.addEventListener('offline', renderStatus);
}

async function init() {
  try {
    store = await createStore();
  } catch (error) {
    console.error(error);
    $('loading').textContent = 'Uygulama yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyin.';
    return;
  }

  bindEvents();
  store.onAuthChange(account => {
    if (account) {
      startApp(account);
    } else {
      stopApp();
      showAuthScreen();
    }
  });
}

init();
