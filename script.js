// Veri Yapısı
const state = {
  users: [
    { id: 'ayse', name: 'Sema Hatun' },
    { id: 'ali', name: 'Ya Sin' }
  ],
  selectedUser: 'ayse',
  currentView: 'month', // 'month' veya 'week'
  currentDate: new Date(),
  foods: {},
  exercises: {}
};

// Veri başlatma
function initStorage() {
  const saved = localStorage.getItem('fitIkiliData');
  if (saved) {
    const data = JSON.parse(saved);
    state.foods = data.foods || {};
    state.exercises = data.exercises || {};
    state.users = data.users || state.users;
    state.selectedUser = data.selectedUser || 'ayse';
    state.currentDate = new Date(data.currentDate || new Date());
  }

  // Her kullanıcı için boş veri yapıları oluştur
  state.users.forEach(user => {
    if (!state.foods[user.id]) state.foods[user.id] = {};
    if (!state.exercises[user.id]) state.exercises[user.id] = {};
  });
}

// Veriyi kaydet
function saveStorage() {
  localStorage.setItem('fitIkiliData', JSON.stringify({
    foods: state.foods,
    exercises: state.exercises,
    users: state.users,
    selectedUser: state.selectedUser,
    currentDate: state.currentDate.toISOString()
  }));
}

// Takvim oluştur
function renderCalendar() {
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const year = state.currentDate.getFullYear();
  const month = state.currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Haftalık görünümde sadece 7 gün göster
  if (state.currentView === 'week') {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Pazar günü başla
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);

      const dayStr = day.toISOString().split('T')[0]; // YYYY-MM-DD
      const dayNum = day.getDate();

      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day';
      if (day.toDateString() === new Date().toDateString()) {
        dayEl.classList.add('selected');
      }

      // Veri var mı?
      if (state.foods[state.selectedUser] && state.foods[state.selectedUser][dayStr]) dayEl.classList.add('has-food');
      if (state.exercises[state.selectedUser] && state.exercises[state.selectedUser][dayStr]) dayEl.classList.add('has-exercise');

      dayEl.innerHTML = `
        <div class="day-number">${dayNum}</div>
        ${state.foods[state.selectedUser] && state.foods[state.selectedUser][dayStr] ? '<div class="icon">🍎</div>' : ''}
        ${state.exercises[state.selectedUser] && state.exercises[state.selectedUser][dayStr] ? '<div class="icon">🏋️‍♂️</div>' : ''}
      `;
      dayEl.addEventListener('click', () => selectDay(dayStr));
      calendar.appendChild(dayEl);
    }
  } else {
    // Aylık görünüm
    for (let i = 0; i < startingDayOfWeek; i++) {
      const empty = document.createElement('div');
      empty.className = 'calendar-day empty';
      calendar.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayStr = date.toISOString().split('T')[0];

      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day';
      if (date.toDateString() === new Date().toDateString()) {
        dayEl.classList.add('selected');
      }

      // Veri var mı?
      if (state.foods[state.selectedUser] && state.foods[state.selectedUser][dayStr]) dayEl.classList.add('has-food');
      if (state.exercises[state.selectedUser] && state.exercises[state.selectedUser][dayStr]) dayEl.classList.add('has-exercise');

      dayEl.innerHTML = `
        <div class="day-number">${day}</div>
        ${state.foods[state.selectedUser] && state.foods[state.selectedUser][dayStr] ? '<div class="icon">🍎</div>' : ''}
        ${state.exercises[state.selectedUser] && state.exercises[state.selectedUser][dayStr] ? '<div class="icon">🏋️‍♂️</div>' : ''}
      `;
      dayEl.addEventListener('click', () => selectDay(dayStr));
      calendar.appendChild(dayEl);
    }
  }

  document.getElementById('currentMonth').textContent = `${new Date(year, month).toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}`;
}

// Gün seçimi
function selectDay(dayStr) {
  // Seçili günleri temizle
  document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
  // Yeni seçiliği ekle
  const selectedDayEl = [...document.querySelectorAll('.calendar-day')].find(d => {
    const dayNumber = d.querySelector('.day-number');
    if (!dayNumber) return false;
    
    if (state.currentView === 'week') {
      // Haftalık görünümde tarih karşılaştırması yap
      const date = new Date(dayStr);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    } else {
      // Aylık görünümde gün numarası karşılaştırması yap
      const date = new Date(dayStr);
      return dayNumber.textContent === date.getDate().toString();
    }
  });
  if (selectedDayEl) selectedDayEl.classList.add('selected');

  // Günlük verileri yükle
  loadDailyData(dayStr);
}

// Günlük verileri yükle
function loadDailyData(dayStr) {
  const foodList = document.getElementById('foodList');
  const exerciseList = document.getElementById('exerciseList');
  const totalCal = document.getElementById('totalCalories');

  foodList.innerHTML = '';
  exerciseList.innerHTML = '';

  let total = 0;

  // Beslenme
  if (state.foods[state.selectedUser] && state.foods[state.selectedUser][dayStr]) {
    state.foods[state.selectedUser][dayStr].forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'item';
      itemEl.innerHTML = `
        ${item.name} (${item.meal}) - ${item.calories} kcal
        <button class="delete" data-id="${item.id}">x</button>
      `;
      foodList.appendChild(itemEl);
      total += parseInt(item.calories) || 0;
    });
  }

  // Spor
  if (state.exercises[state.selectedUser] && state.exercises[state.selectedUser][dayStr]) {
    state.exercises[state.selectedUser][dayStr].forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'item';
      itemEl.innerHTML = `
        ${item.name} - ${item.duration}
        ${item.notes ? ` (${item.notes})` : ''}
        <button class="delete" data-id="${item.id}">x</button>
      `;
      exerciseList.appendChild(itemEl);
    });
  }

  totalCal.textContent = total;
}

// Formları aç/kapat
function toggleForm(formId) {
  const form = document.getElementById(formId);
  form.classList.toggle('active');
}

// Şu anki seçili günün stringini döndürür
function getCurrentDayStr() {
  const selectedDayEl = document.querySelector('.calendar-day.selected');
  if (!selectedDayEl) return new Date().toISOString().split('T')[0];

  const dayNum = selectedDayEl.querySelector('.day-number').textContent;
  
  if (state.currentView === 'week') {
    // Haftalık görünümde bugünün tarihini döndür
    return new Date().toISOString().split('T')[0];
  } else {
    // Aylık görünümde seçili günün tarihini döndür
    const month = state.currentDate.getMonth();
    const year = state.currentDate.getFullYear();
    const date = new Date(year, month, parseInt(dayNum));
    return date.toISOString().split('T')[0];
  }
}

// Olaylar
document.addEventListener('DOMContentLoaded', () => {
  initStorage();

  // Kullanıcı seçimi
  document.getElementById('userSelect').value = state.selectedUser;
  document.getElementById('userSelect').addEventListener('change', (e) => {
    state.selectedUser = e.target.value;
    renderCalendar();
    loadDailyData(getCurrentDayStr());
  });

  // Takvim kontrolü
  document.getElementById('prevMonth').addEventListener('click', () => {
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    renderCalendar();
  });

  // Görünüm geçişi
  document.getElementById('viewMonth').addEventListener('click', () => {
    state.currentView = 'month';
    document.getElementById('viewMonth').classList.add('active');
    document.getElementById('viewWeek').classList.remove('active');
    renderCalendar();
  });

  document.getElementById('viewWeek').addEventListener('click', () => {
    state.currentView = 'week';
    document.getElementById('viewWeek').classList.add('active');
    document.getElementById('viewMonth').classList.remove('active');
    renderCalendar();
  });

  // Form butonları
  document.getElementById('addFoodBtn').addEventListener('click', () => toggleForm('foodForm'));
  document.getElementById('addExerciseBtn').addEventListener('click', () => toggleForm('exerciseForm'));

  document.getElementById('cancelFood').addEventListener('click', () => toggleForm('foodForm'));
  document.getElementById('cancelExercise').addEventListener('click', () => toggleForm('exerciseForm'));

  // Kaydet butonları
  document.getElementById('saveFood').addEventListener('click', () => {
    const name = document.getElementById('foodName').value.trim();
    const calories = document.getElementById('foodCalories').value.trim();
    const meal = document.getElementById('foodMeal').value;

    if (!name || !calories) return alert('Lütfen tüm alanları doldurun!');

    const dayStr = getCurrentDayStr();
    if (!state.foods[state.selectedUser]) state.foods[state.selectedUser] = {};
    if (!state.foods[state.selectedUser][dayStr]) state.foods[state.selectedUser][dayStr] = [];

    state.foods[state.selectedUser][dayStr].push({
      id: Date.now().toString(),
      name,
      calories: parseInt(calories) || 0,
      meal
    });

    saveStorage();
    toggleForm('foodForm');
    document.getElementById('foodName').value = '';
    document.getElementById('foodCalories').value = '';
    renderCalendar();
    loadDailyData(dayStr);
  });

  document.getElementById('saveExercise').addEventListener('click', () => {
    const name = document.getElementById('exerciseName').value.trim();
    const duration = document.getElementById('exerciseDuration').value.trim();
    const notes = document.getElementById('exerciseNotes').value.trim();

    if (!name || !duration) return alert('Lütfen tüm zorunlu alanları doldurun!');

    const dayStr = getCurrentDayStr();
    if (!state.exercises[state.selectedUser]) state.exercises[state.selectedUser] = {};
    if (!state.exercises[state.selectedUser][dayStr]) state.exercises[state.selectedUser][dayStr] = [];

    state.exercises[state.selectedUser][dayStr].push({
      id: Date.now().toString(),
      name,
      duration,
      notes
    });

    saveStorage();
    toggleForm('exerciseForm');
    document.getElementById('exerciseName').value = '';
    document.getElementById('exerciseDuration').value = '';
    document.getElementById('exerciseNotes').value = '';
    renderCalendar();
    loadDailyData(dayStr);
  });

  // Silme
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete')) {
      const id = e.target.dataset.id;
      const dayStr = getCurrentDayStr();

      // Beslenme sil
      if (state.foods[state.selectedUser] && state.foods[state.selectedUser][dayStr]) {
        state.foods[state.selectedUser][dayStr] = state.foods[state.selectedUser][dayStr].filter(item => item.id !== id);
      }

      // Spor sil
      if (state.exercises[state.selectedUser] && state.exercises[state.selectedUser][dayStr]) {
        state.exercises[state.selectedUser][dayStr] = state.exercises[state.selectedUser][dayStr].filter(item => item.id !== id);
      }

      saveStorage();
      loadDailyData(dayStr);
    }
  });

  // Ayarlar Modal
  document.getElementById('openSettings').addEventListener('click', () => {
    document.getElementById('user1Name').value = state.users[0].name;
    document.getElementById('user2Name').value = state.users[1].name;
    document.getElementById('settingsModal').style.display = 'flex';
  });

  document.getElementById('closeSettings').addEventListener('click', () => {
    document.getElementById('settingsModal').style.display = 'none';
  });

  document.getElementById('saveSettings').addEventListener('click', () => {
    const name1 = document.getElementById('user1Name').value.trim();
    const name2 = document.getElementById('user2Name').value.trim();

    if (!name1 || !name2) return alert('İsimler boş olamaz!');

    state.users[0].name = name1;
    state.users[1].name = name2;

    // Dropdown'u güncelle
    const select = document.getElementById('userSelect');
    select.innerHTML = '';
    state.users.forEach(user => {
      const opt = document.createElement('option');
      opt.value = user.id;
      opt.textContent = user.name;
      select.appendChild(opt);
    });

    if (state.selectedUser === 'ayse') {
      select.value = 'ayse';
    } else {
      select.value = 'ali';
    }

    saveStorage();
    document.getElementById('settingsModal').style.display = 'none';
  });

  // Başlangıçta takvimi yükle
  renderCalendar();
  loadDailyData(getCurrentDayStr());
});
