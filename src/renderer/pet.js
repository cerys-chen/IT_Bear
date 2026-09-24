const gifs = [];
const bear = document.querySelector('#bear');
const image = document.querySelector('#bearImage');
const paper = document.querySelector('#paper');
const hidePaper = document.querySelector('#hidePaper');
const form = document.querySelector('#form');
const input = document.querySelector('#input');
const list = document.querySelector('#list');
const empty = document.querySelector('#empty');
const summary = document.querySelector('#summary');
const title = document.querySelector('#todoTitle');
const deskpet = document.querySelector('.deskpet');
const bearResize = document.querySelector('#bearResize');
const paperResize = document.querySelector('#paperResize');
const settingsPanel = document.querySelector('#settingsPanel');
const reminderPanel = document.querySelector('#reminderPanel');
const speech = document.querySelector('#speech');
const settings = { bearWidth: 184, bearHeight: 220, paperWidth: 160, paperHeight: 260, todoFontSize: 13, latinFontSize: 11, morningReminder: true, eveningReminder: true, eveningTime: '17:30', standingReminder: true, standingInterval: 60, workdayEnabled: true, workdayMode: 'auto', workStart: '09:00', workEnd: '18:00', workHours: 9, lunchReminder: true, lunchTime: '11:55', countdownReminder: true, afternoonTime: '15:00', leadMinutes: 30, overtimeReminder: true, overtimeInterval: 30, clickCountdown: true, autoStart: false };
const WORKDAY_KINDS = ['lunch', 'afternoon', 'lead', 'offwork', 'overtime'];
let reminderState = {};
let resizeMode = false;
let activeReminder = null;
let standingReminderVisible = false;
let lastStandingAt = Date.now();
let workday = {};
let workdayFetchedDate = '';
let lastOvertimeAt = 0;
let speechTimer = null;
const SHOWN_SIZE = { width: 240, height: 460 };
const HIDDEN_SIZE = { width: 240, height: 235 };

function localDate() {
  const date = new Date();
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
function resizeWindow(size, anchorLeft = false) { window.jokeBear.resize(size.width, size.height, anchorLeft); }
function windowSize(extraWidth = 0) { return { width: Math.max(240, 60 + settings.bearWidth, 75 + settings.paperWidth) + extraWidth, height: Math.max(460, 215 + settings.paperHeight, 28 + settings.bearHeight) }; }
function applySettings(next = {}) { Object.assign(settings, next); const root = document.documentElement; root.style.setProperty('--bear-width', `${settings.bearWidth}px`); root.style.setProperty('--bear-height', `${settings.bearHeight}px`); root.style.setProperty('--paper-width', `${settings.paperWidth}px`); root.style.setProperty('--paper-height', `${settings.paperHeight}px`); root.style.setProperty('--todo-font-size', `${settings.todoFontSize}px`); root.style.setProperty('--latin-font-size', `${settings.latinFontSize}px`); const panelWidth = settingsPanel?.classList.contains('open') ? 250 : 0; resizeWindow(paper.style.display === 'none' ? { width: Math.max(240, 60 + settings.bearWidth) + panelWidth, height: Math.max(235, 28 + settings.bearHeight) } : windowSize(panelWidth), Boolean(panelWidth)); updateRangeLabels(); }
function updateRangeLabels() { const entries = [['bearWidth', 'px'], ['bearHeight', 'px'], ['paperWidth', 'px'], ['paperHeight', 'px'], ['todoFontSize', 'px'], ['latinFontSize', 'px'], ['standingInterval', '分钟']]; for (const [key, unit] of entries) { const input = document.querySelector(`#${key}Setting`); const output = document.querySelector(`#${key}Value`); if (input) input.value = settings[key]; if (output) output.textContent = `${settings[key]}${unit}`; } updateWorkdayLabels(settings); }
function setResizeMode(value) { resizeMode = Boolean(value); deskpet.classList.toggle('resize-mode', resizeMode); updateMouseMode(); }

let gifIndex = 0;
let todos = [];
let activeDate = localDate();
let today = activeDate;
let draggedTodoId = null;
let mouseIgnored = false;

function updateMouseMode() {
  if (dragging) return;
  const target = document.elementFromPoint(lastMouseX, lastMouseY);
  const interactive = target?.closest('.bear, .paper, .settings-panel, .reminder-panel, .resize-handle');
  const nextIgnored = !interactive;
  if (nextIgnored !== mouseIgnored) {
    mouseIgnored = nextIgnored;
    window.jokeBear.ignoreMouse(mouseIgnored);
  }
}

let lastMouseX = 0;
let lastMouseY = 0;
document.addEventListener('mousemove', event => {
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
  updateMouseMode();
});

function setGif() {
  if (!gifs.length) return;
  image.src = window.jokeBear.assetUrl(gifs[gifIndex]);
  image.alt = 'JokeBear action ' + (gifIndex + 1);
}

function appendTodoText(container, value) {
  const parts = String(value).split(/([A-Za-z0-9]+)/g);
  for (const part of parts) {
    if (!part) continue;
    if (/^[A-Za-z0-9]+$/.test(part)) {
      const latin = document.createElement('span');
      latin.className = 'todo-text-latin';
      latin.textContent = part;
      container.append(latin);
    } else {
      container.append(document.createTextNode(part));
    }
  }
}

function closePanels() { const wasSettingsOpen = settingsPanel.classList.contains('open'); settingsPanel.classList.remove('open'); deskpet.classList.remove('settings-open'); reminderPanel.classList.remove('open'); settingsPanel.setAttribute('aria-hidden', 'true'); reminderPanel.setAttribute('aria-hidden', 'true'); activeReminder = null; resizeWindow(paper.style.display === 'none' ? { width: Math.max(240, 60 + settings.bearWidth), height: Math.max(235, 28 + settings.bearHeight) } : windowSize(), wasSettingsOpen); }
function openSettings() { closePanels(); deskpet.classList.add('settings-open'); settingsPanel.classList.add('open'); settingsPanel.setAttribute('aria-hidden', 'false'); updateRangeLabels(); document.querySelector('#morningReminderSetting').checked = Boolean(settings.morningReminder); document.querySelector('#eveningReminderSetting').checked = Boolean(settings.eveningReminder); document.querySelector('#eveningTimeSetting').value = settings.eveningTime || '17:30'; document.querySelector('#autoStartSetting').checked = Boolean(settings.autoStart); fillWorkdayFields(settings); resizeWindow({ width: windowSize(250).width, height: Math.max(460, settingsPanel.offsetHeight + 25) }, true); updateMouseMode(); }
function showReminder(kind, data) { if (!data) return; closePanels(); activeReminder = { kind, data }; const isMorning = kind === 'morning'; document.querySelector('#reminderTitle').textContent = isMorning ? '昨日总结' : '下班前提醒'; document.querySelector('#reminderSummary').textContent = isMorning ? `昨天完成 ${data.todos.filter(todo => todo.done).length} 件，还有 ${data.todos.filter(todo => !todo.done).length} 件未完成。` : `今天还有 ${data.todos.filter(todo => !todo.done).length} 件事没有完成。`; const listElement = document.querySelector('#reminderList'); listElement.replaceChildren(); data.todos.filter(todo => !todo.done).forEach(todo => { const li = document.createElement('li'); li.textContent = todo.text; listElement.append(li); }); document.querySelector('#carryoverButton').style.display = isMorning && data.todos.some(todo => !todo.done) ? '' : 'none'; document.querySelector('#dismissReminder').textContent = '稍后处理'; reminderPanel.classList.add('open'); reminderPanel.setAttribute('aria-hidden', 'false'); resizeWindow({ width: 240, height: Math.max(460, reminderPanel.offsetHeight + 100) }); updateMouseMode(); }
function showStandingReminder() { closePanels(); activeReminder = { kind: 'standing' }; standingReminderVisible = true; document.querySelector('#reminderTitle').textContent = '起来活动一下'; document.querySelector('#reminderSummary').textContent = `已经工作 ${settings.standingInterval} 分钟，站起来走动一下吧。`; document.querySelector('#reminderList').replaceChildren(); document.querySelector('#carryoverButton').style.display = 'none'; document.querySelector('#dismissReminder').textContent = '知道了'; reminderPanel.classList.add('open'); reminderPanel.setAttribute('aria-hidden', 'false'); resizeWindow({ width: 240, height: Math.max(460, reminderPanel.offsetHeight + 100) }); updateMouseMode(); }
async function dismissReminder() { if (!activeReminder) return; if (activeReminder.kind === 'standing' || WORKDAY_KINDS.includes(activeReminder.kind)) { standingReminderVisible = false; if (activeReminder.kind === 'standing') lastStandingAt = Date.now(); closePanels(); applySettings(); return; } await window.jokeBear.acknowledgeReminder(activeReminder.kind); reminderState[activeReminder.kind + 'Date'] = localDate(); closePanels(); applySettings(); }
function setupSettings() { const fields = ['bearWidth', 'bearHeight', 'paperWidth', 'paperHeight', 'todoFontSize', 'latinFontSize']; fields.forEach(key => document.querySelector(`#${key}Setting`).addEventListener('input', event => { settings[key] = Number(event.target.value); applySettings(); })); ['standingInterval', ...WORKDAY_RANGES.map(([key]) => key)].forEach(key => document.querySelector(`#${key}Setting`)?.addEventListener('input', event => { settings[key] = Number(event.target.value); applySettings(); })); document.querySelector('#workdayModeSetting')?.addEventListener('change', event => { settings.workdayMode = event.target.value === 'fixed' ? 'fixed' : 'auto'; syncWorkdayVisibility(settings); }); document.querySelector('#saveSettings').onclick = async () => { const changes = readWorkdayFields(settings, { ...settings, morningReminder: document.querySelector('#morningReminderSetting')?.checked ?? settings.morningReminder, eveningReminder: document.querySelector('#eveningReminderSetting')?.checked ?? settings.eveningReminder, eveningTime: document.querySelector('#eveningTimeSetting')?.value || settings.eveningTime || '17:30', standingReminder: document.querySelector('#standingIntervalSetting') ? document.querySelector('#standingReminderSetting')?.checked ?? settings.standingReminder : settings.standingReminder, autoStart: document.querySelector('#autoStartSetting')?.checked ?? settings.autoStart }); Object.assign(settings, changes); await window.jokeBear.saveSettings(changes); closePanels(); applySettings(); }; document.querySelector('#closeSettings').onclick = closePanels; document.querySelector('#dismissReminder').onclick = dismissReminder; document.querySelector('#carryoverButton').onclick = async () => { if (!activeReminder?.data?.date) return; await window.jokeBear.carryover(activeReminder.data.date); await window.jokeBear.acknowledgeReminder('morning'); closePanels(); await loadDate(today); }; }
function setupResizeHandle(handle, type) {
  let resizing = false;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  handle.addEventListener('pointerdown', event => {
    if (!resizeMode || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    resizing = true;
    startX = event.screenX;
    startY = event.screenY;
    startWidth = settings[type + 'Width'];
    startHeight = settings[type + 'Height'];
    handle.setPointerCapture(event.pointerId);
    window.jokeBear.ignoreMouse(false);
  });
  handle.addEventListener('pointermove', event => {
    if (!resizing) return;
    const next = {
      [`${type}Width`]: Math.max(type === 'bear' ? 100 : 120, Math.min(type === 'bear' ? 320 : 280, startWidth + event.screenX - startX)),
      [`${type}Height`]: Math.max(type === 'bear' ? 120 : 160, Math.min(type === 'bear' ? 360 : 420, startHeight + event.screenY - startY))
    };
    Object.assign(settings, next);
    applySettings(next);
  });
  const finish = async event => {
    if (!resizing) return;
    resizing = false;
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    await window.jokeBear.saveResize({ [`${type}Width`]: settings[type + 'Width'], [`${type}Height`]: settings[type + 'Height'] });
    updateMouseMode();
  };
  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', finish);
}

async function checkStandingReminder() {
  if (!settings.standingReminder || standingReminderVisible || settingsPanel.classList.contains('open') || reminderPanel.classList.contains('open')) return;
  const interval = Math.max(15, Number(settings.standingInterval) || 60) * 60 * 1000;
  if (Date.now() - lastStandingAt < interval) return;
  lastStandingAt = Date.now();
  if (gifs.length) {
    gifIndex = (gifIndex + 1) % gifs.length;
    setGif();
  }
  showStandingReminder();
}
async function checkReminders() {
  if (settingsPanel.classList.contains('open') || reminderPanel.classList.contains('open')) return;
  const state = await window.jokeBear.state();
  Object.assign(settings, state.settings || {});
  reminderState = state.reminders || {};
  applySettings();
  const yesterday = state.yesterday;
  if (settings.morningReminder && yesterday && reminderState.morningDate !== localDate()) {
    showReminder('morning', yesterday);
  }
  const now = new Date();
  const [hour, minute] = String(settings.eveningTime || '17:30').split(':').map(Number);
  const due = now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute);
  if (settings.eveningReminder && due && todos.some(todo => !todo.done) && reminderState.eveningDate !== localDate()) {
    showReminder('evening', { date: today, todos });
  }
}

function offWorkPlan() {
  if (!settings.workdayEnabled) return null;
  const startedAt = Number(workday.startedAt);
  if (settings.workdayMode === 'auto') {
    if (!Number.isFinite(startedAt)) return null;
    return { start: startedAt, end: startedAt + Math.max(1, Number(settings.workHours) || 9) * 3600000 };
  }
  return { start: timestampOf(settings.workStart, '09:00'), end: timestampOf(settings.workEnd, '18:00') };
}
function say(text) {
  speech.textContent = text;
  speech.classList.add('show');
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => speech.classList.remove('show'), 9000);
}
function countdownText() {
  const plan = offWorkPlan();
  if (!plan) return '还没有设置下班时间，去设置里开启下班倒计时吧。';
  const left = plan.end - Date.now();
  if (left > 0) return `人，距离下班还有 ${formatRemaining(left)}（${formatWorkdayTime(plan.end)} 下班）`;
  return `人，已经过了下班时间 ${formatRemaining(-left)}了！（${formatWorkdayTime(plan.end)} 下班）`;
}
function workdayCopy(kind, plan) {
  const left = plan.end - Date.now();
  if (kind === 'lunch') return { title: '饿饿饿', summary: `到午饭时间噜，吃饭吃饭，下午也才过一半，${formatWorkdayTime(plan.end)} 下班。` };
  if (kind === 'afternoon') return { title: '下班倒计时', summary: `人，现在 ${formatWorkdayTime(Date.now())}，距离下班还有 ${formatRemaining(left)}，再撑一下。` };
  if (kind === 'lead') return { title: '累累累', summary: `人，还有 ${formatRemaining(left)} 就下班了，收尾一下吧。` };
  if (kind === 'offwork') return { title: '耶耶耶', summary: `人，${formatWorkdayTime(plan.end)} 了，到点收工，剩下的明天再搞。` };
  return { title: '还不下班？！', summary: `人，已经过了下班时间 ${formatRemaining(-left)}，还不跑路吗？` };
}
function planStartOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
function workdayFired(kind) {
  return reminderState[kind + 'Date'] === localDate();
}
async function refreshWorkdayState() {
  const state = await window.jokeBear.state();
  Object.assign(settings, state.settings || {});
  reminderState = state.reminders || {};
  workday = state.workday || {};
  workdayFetchedDate = localDate();
  applySettings();
}
function showWorkdayReminder(kind) {
  const plan = offWorkPlan();
  if (!plan) return;
  const copy = workdayCopy(kind, plan);
  closePanels();
  activeReminder = { kind };
  document.querySelector('#reminderTitle').textContent = copy.title;
  document.querySelector('#reminderSummary').textContent = copy.summary;
  document.querySelector('#reminderList').replaceChildren();
  document.querySelector('#carryoverButton').style.display = 'none';
  document.querySelector('#dismissReminder').textContent = '知道了';
  reminderPanel.classList.add('open');
  reminderPanel.setAttribute('aria-hidden', 'false');
  resizeWindow({ width: 240, height: Math.max(460, reminderPanel.offsetHeight + 100) });
  updateMouseMode();
}
async function checkWorkdayReminders() {
  if (workdayFetchedDate !== localDate()) await refreshWorkdayState();
  if (!settings.workdayEnabled || settingsPanel.classList.contains('open') || reminderPanel.classList.contains('open')) return;
  const plan = offWorkPlan();
  if (!plan) return;
  const now = Date.now();
  const stages = [
    { kind: 'lunch', on: settings.lunchReminder, at: timestampOf(settings.lunchTime, '11:55') },
    { kind: 'afternoon', on: settings.countdownReminder, at: timestampOf(settings.afternoonTime, '15:00') },
    { kind: 'lead', on: settings.countdownReminder, at: plan.end - Math.max(5, Number(settings.leadMinutes) || 30) * 60000 },
    { kind: 'offwork', on: settings.countdownReminder, at: plan.end }
  ];
  const eligible = stages.filter(stage => stage.on && now >= stage.at && now >= plan.start && now - stage.at <= 45 * 60000);
  const stage = eligible[eligible.length - 1];
  if (stage && !workdayFired(stage.kind)) {
    markWorkdayFired(stage.kind, now);
    showWorkdayReminder(stage.kind);
    return;
  }
  const interval = Math.max(5, Number(settings.overtimeInterval) || 30) * 60000;
  if (!settings.overtimeReminder || now - plan.end < interval) return;
  const alreadyAsked = Number(reminderState.overtimeAt) >= planStartOfToday() || lastOvertimeAt >= planStartOfToday();
  if (alreadyAsked && now - Math.max(Number(reminderState.overtimeAt) || 0, lastOvertimeAt) < interval) return;
  markWorkdayFired('overtime', now);
  showWorkdayReminder('overtime');
}
function markWorkdayFired(kind, now) {
  if (kind === 'overtime') {
    lastOvertimeAt = now;
    reminderState.overtimeAt = now;
    window.jokeBear.markReminder('overtimeAt', now).catch(error => console.error(error));
    return;
  }
  reminderState[kind + 'Date'] = localDate();
  window.jokeBear.markReminder(kind + 'Date', localDate()).catch(error => console.error(error));
}

function startEditing(item, text, todo) {
  if (activeDate !== today) return;
  item.draggable = false;
  const editor = document.createElement('input');
  editor.className = 'todo-edit';
  editor.value = todo.text;
  editor.maxLength = 120;
  editor.autocomplete = 'off';
  editor.spellcheck = false;
  text.replaceWith(editor);

  let finished = false;
  const finish = async save => {
    if (finished) return;
    finished = true;
    const value = editor.value.trim();
    if (save && value && value !== todo.text) {
      todos = await window.jokeBear.edit(todo.id, value);
    }
    render();
  };

  editor.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      finish(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finish(false);
    }
  });
  editor.addEventListener('blur', () => finish(true));
  editor.focus();
  editor.select();
}


function render() {
  list.replaceChildren();
  empty.className = todos.length ? 'empty hide' : 'empty';
  const left = todos.filter(todo => !todo.done).length;
  const current = activeDate === today;
  title.textContent = current ? '今日待办' : `${activeDate} 待办`;
  summary.textContent = !todos.length
    ? (current ? '暂时没有待办' : '这一天没有记录')
    : current
      ? (left ? `还有 ${left} 件事` : '全部完成')
      : `共 ${todos.length} 件`;
  paper.classList.toggle('readonly', !current);
  input.disabled = !current;
  for (const todo of todos) {
    const item = document.createElement('li');
    item.className = `todo-item${todo.done ? ' done' : ''}`;
    item.draggable = current;
    item.dataset.todoId = todo.id;
    item.addEventListener('dragstart', event => {
      draggedTodoId = todo.id;
      item.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', todo.id);
    });
    item.addEventListener('dragend', () => {
      draggedTodoId = null;
      item.classList.remove('dragging');
      list.querySelectorAll('.drag-over').forEach(target => target.classList.remove('drag-over'));
    });
    item.addEventListener('dragover', event => {
      if (!current || !draggedTodoId || draggedTodoId === todo.id) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', async event => {
      event.preventDefault();
      item.classList.remove('drag-over');
      if (!current || !draggedTodoId || draggedTodoId === todo.id) return;
      const from = todos.findIndex(entry => entry.id === draggedTodoId);
      const to = todos.findIndex(entry => entry.id === todo.id);
      if (from < 0 || to < 0) return;
      const next = [...todos];
      const [movedTodo] = next.splice(from, 1);
      next.splice(to, 0, movedTodo);
      todos = await window.jokeBear.reorder(next.map(entry => entry.id));
      render();
    });
    const check = document.createElement('button');
    check.className = 'todo-check';
    check.textContent = todo.done ? '✓' : '';
    check.title = todo.done ? '恢复待办' : '完成待办';
    check.disabled = !current;
    check.onclick = async () => { todos = await window.jokeBear.toggle(todo.id); render(); };
    const text = document.createElement('span');
    text.className = 'todo-text';
    appendTodoText(text, todo.text);
    text.title = todo.text;
    text.addEventListener('dblclick', event => {
      event.preventDefault();
      event.stopPropagation();
      startEditing(item, text, todo);
    });
    const remove = document.createElement('button');
    remove.className = 'delete-button';
    remove.textContent = '×';
    remove.title = '删除待办';
    remove.disabled = !current;
    remove.onclick = async () => { todos = await window.jokeBear.remove(todo.id); render(); };
    item.append(check, text, remove);
    list.append(item);
  }
}
async function loadDate(date) {
  activeDate = date;
  today = localDate();
  paper.style.display = 'block';
  resizeWindow(windowSize());
  todos = await window.jokeBear.list(date);
  render();
}

let dragging = false;
let moved = false;
let lastX = 0;
let lastY = 0;
bear.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  dragging = true;
  moved = false;
  lastX = event.screenX;
  lastY = event.screenY;
  if (mouseIgnored) {
    mouseIgnored = false;
    window.jokeBear.ignoreMouse(false);
  }
  bear.setPointerCapture(event.pointerId);
});
bear.addEventListener('pointermove', event => {
  if (!dragging) return;
  const dx = event.screenX - lastX;
  const dy = event.screenY - lastY;
  if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
  if (dx || dy) window.jokeBear.move(dx, dy);
  lastX = event.screenX;
  lastY = event.screenY;
});
bear.addEventListener('pointerup', event => {
  if (!dragging || event.button !== 0) return;
  dragging = false;
  bear.releasePointerCapture(event.pointerId);
  if (!moved && gifs.length) {
    gifIndex = (gifIndex + 1) % gifs.length;
    setGif();
  }
  if (!moved && settings.clickCountdown) say(countdownText());
  updateMouseMode();
});
bear.addEventListener('pointercancel', () => { dragging = false; updateMouseMode(); });
bear.addEventListener('dragstart', event => event.preventDefault());
hidePaper.onclick = () => { paper.style.display = 'none'; resizeWindow({ width: Math.max(240, 60 + settings.bearWidth), height: Math.max(235, 28 + settings.bearHeight) }); };
bear.addEventListener('contextmenu', event => { event.preventDefault(); window.jokeBear.menu(); });
form.onsubmit = async event => {
  event.preventDefault();
  if (!input.value.trim() || activeDate !== today) return;
  todos = await window.jokeBear.add(input.value);
  input.value = '';
  render();
  input.focus();
};
setupSettings();
setupResizeHandle(bearResize, 'bear');
setupResizeHandle(paperResize, 'paper');
window.jokeBear.onSettingsOpen(openSettings);
window.jokeBear.onSettingsChanged(changes => { applySettings(changes); if (!settings.standingReminder && standingReminderVisible) { standingReminderVisible = false; closePanels(); applySettings(); } if (!settings.workdayEnabled && WORKDAY_KINDS.includes(activeReminder?.kind)) closePanels(); if (settingsPanel.classList.contains('open')) fillWorkdayFields(settings); });
window.jokeBear.onResizeMode(setResizeMode);
window.jokeBear.onDateChange(loadDate);
window.jokeBear.gifs().then(files => { gifs.push(...files); if (gifs.length) gifIndex = Math.floor(Math.random() * gifs.length); setGif(); }).catch(error => {
  image.alt = 'GIF folder could not be read';
  console.error(error);
});
window.jokeBear.state().then(state => { Object.assign(settings, state.settings || {}); workday = state.workday || {}; workdayFetchedDate = localDate(); setResizeMode(state.resizeMode); applySettings(); return loadDate(today); }).then(checkReminders).catch(error => console.error(error));
setInterval(() => { if (settings.eveningReminder || settings.morningReminder) checkReminders(); checkStandingReminder(); checkWorkdayReminders().catch(error => console.error(error)); }, 30000);
