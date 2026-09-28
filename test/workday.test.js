// Verifies the off-work countdown logic without launching Electron:
//   node test/workday.test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const MINUTE = 60000;

function localDate() {
  const date = new Date();
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
function atTime(base, offsetMinutes) {
  const date = new Date(base + offsetMinutes * MINUTE);
  return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}
function formatRemaining(ms) {
  const total = Math.round(ms / MINUTE);
  if (total < 60) return `${total} 分钟`;
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  if (hour < 24) return minute ? `${hour} 小时 ${minute} 分钟` : `${hour} 小时`;
  return `${Math.floor(hour / 24)} 天 ${hour % 24} 小时`;
}
function testMainProcess() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jokebear-test-'));
  const handlers = {};
  const listeners = {};
  const loginItems = [];
  const readyFns = [];
  const petWindows = [];
  const fakeElectron = {
    app: {
      isPackaged: true,
      getPath: () => dataDir,
      whenReady: () => ({ then: fn => { readyFns.push(fn); } }),
      on: (event, fn) => { listeners[event] = fn; },
      setLoginItemSettings: settings => { loginItems.push(settings); },
      requestSingleInstanceLock: () => true,
      quit: () => { listeners['quit-called'] = true; }
    },
    BrowserWindow: class {
      constructor(options) {
        this.options = options;
        this.x = options.x;
        this.y = options.y;
        this.width = options.width;
        this.height = options.height;
        this.visible = true;
        this.moved = [];
        this.focused = 0;
        this.webContents = { send() {} };
        petWindows.push(this);
      }
      loadFile() {}
      on() {}
      setAlwaysOnTop() {}
      getContentSize() { return [this.width, this.height]; }
      getSize() { return [this.width, this.height]; }
      getPosition() { return [this.x, this.y]; }
      setPosition(x, y) { this.x = x; this.y = y; this.moved.push([x, y]); }
      setContentSize(width, height) { this.width = width; this.height = height; }
      isVisible() { return this.visible; }
      show() { this.visible = true; }
      focus() { this.focused++; }
      isDestroyed() { return false; }
    },
    screen: {
      getPrimaryDisplay: () => ({ bounds: { x: 0, y: 0, width: 2048, height: 1152 }, workArea: { x: 0, y: 0, width: 2048, height: 1104 } }),
      getAllDisplays: () => ([
        { bounds: { x: -1280, y: 0, width: 1280, height: 800 }, workArea: { x: -1280, y: 0, width: 1280, height: 752 } },
        { bounds: { x: 0, y: 0, width: 2048, height: 1152 }, workArea: { x: 0, y: 0, width: 2048, height: 1104 } }
      ])
    },
    Menu: { buildFromTemplate: () => ({ popup: () => {} }) },
    ipcMain: { on: (channel, fn) => { listeners[channel] = fn; }, handle: (channel, fn) => { handlers[channel] = fn; } }
  };
  const load = Module._load;
  Module._load = function (request, ...rest) {
    return request === 'electron' ? fakeElectron : load.call(this, request, ...rest);
  };
  require(path.join(root, 'src/main/main.js'));
  Module._load = load;

  const dataFile = path.join(dataDir, 'jokebear.json');
  const patch = changes => {
    const raw = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    fs.writeFileSync(dataFile, JSON.stringify({ ...raw, ...changes }, null, 2), 'utf8');
  };

  const first = handlers['app:state']();
  assert.strictEqual(first.workday.date, localDate(), '首次启动时间归属今天');
  assert.ok(Math.abs(first.workday.startedAt - Date.now()) < 5 * MINUTE, '首次启动时间取当前时刻');
  const second = handlers['app:state']();
  assert.strictEqual(second.workday.startedAt, first.workday.startedAt, '同一天重复读取不刷新首次启动时间');
  assert.ok(first.settings.workdayEnabled && first.settings.workdayMode === 'auto', '下班倒计时默认按首次启动计算');

  patch({ settings: { ...first.settings, workHours: 8 } });
  assert.strictEqual(handlers['app:state']().workday.startedAt, first.workday.startedAt, '改设置不会重置首次启动时间');

  handlers['reminders:mark'](null, 'leadDate', '2000-01-01');
  assert.strictEqual(handlers['app:state']().reminders.leadDate, '2000-01-01', '节点提醒状态可持久化');
  handlers['reminders:mark'](null, 'overtimeAt', 1234);
  assert.strictEqual(handlers['app:state']().reminders.overtimeAt, 1234, '加班提醒时间戳可持久化');

  // A previous day's launch time must not leak into today's countdown.
  patch({ date: '2000-01-01', workday: { date: '2000-01-01', startedAt: first.workday.startedAt } });
  const rolled = handlers['app:state']();
  assert.strictEqual(rolled.workday.date, localDate(), '跨天后首次启动时间归属新的一天');
  assert.ok(rolled.workday.startedAt >= first.workday.startedAt, '跨天后重新记录首次启动时间');

  // Auto-start: the launch entry is refreshed with a fixed registry value name,
  // so repeated launches rewrite one entry instead of piling up.
  patch({ position: { x: 2024, y: 504 } });
  readyFns[0]();
  const pet = petWindows[petWindows.length - 1];
  assert.deepStrictEqual([pet.x, pet.y], [1808, 504], '越界的窗口位置被拉回屏幕内');
  pet.setPosition(2400, 504);
  listeners['second-instance']();
  assert.deepStrictEqual([pet.x, pet.y], [1808, 504], '再次启动时把窗口拉回屏幕内');
  assert.ok(pet.focused > 0, '再次启动时聚焦已有实例');
  assert.strictEqual(loginItems.length, 1, '启动时刷新一次开机自启注册');
  assert.strictEqual(loginItems[0].openAtLogin, false, '默认不开机自启');
  assert.strictEqual(loginItems[0].name, 'JokeBear Deskpet', '注册表值名固定');
  assert.strictEqual(loginItems[0].path, process.execPath, '非便携版按当前 exe 注册');
  process.env.PORTABLE_EXECUTABLE_FILE = 'D:\\apps\\JokeBear Deskpet-1.0.2-x64.exe';
  handlers['settings:save'](null, { autoStart: true });
  assert.strictEqual(loginItems.length, 2, '保存开关时再注册一次');
  assert.strictEqual(loginItems[1].openAtLogin, true, '勾选后开启开机自启');
  assert.strictEqual(loginItems[1].path, 'D:\\apps\\JokeBear Deskpet-1.0.2-x64.exe', '便携版按便携 exe 注册');
  handlers['settings:save'](null, { autoStart: false });
  assert.strictEqual(loginItems[2].openAtLogin, false, '取消勾选后注销开机自启');
  delete process.env.PORTABLE_EXECUTABLE_FILE;

  // A duplicate launch must bail out before registering startup work at all.
  const windowsBefore = petWindows.length;
  fakeElectron.app.requestSingleInstanceLock = () => false;
  delete require.cache[require.resolve(path.join(root, 'src/main/main.js'))];
  const reload = Module._load;
  Module._load = function (request, ...rest) {
    return request === 'electron' ? fakeElectron : reload.call(this, request, ...rest);
  };
  require(path.join(root, 'src/main/main.js'));
  Module._load = reload;
  assert.strictEqual(readyFns.length, 1, '拿不到单实例锁时不注册启动逻辑');
  assert.strictEqual(petWindows.length, windowsBefore, '拿不到单实例锁时不再创建窗口');
  assert.strictEqual(listeners['quit-called'], true, '拿不到单实例锁时退出');

  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log('ok  主进程：首次启动时间持久化 + 跨天重置 + 提醒状态写入 + 开机自启注册 + 窗口位置钳制 + 单实例');
}

function createPet() {
  const elements = new Map();
  function element(selector) {
    if (!elements.has(selector)) elements.set(selector, makeElement());
    return elements.get(selector);
  }
  function makeElement() {
    const classes = new Set();
    const node = {
      style: { display: 'block', setProperty() {} },
      dataset: {},
      textContent: '',
      className: '',
      title: '',
      alt: '',
      src: '',
      value: '',
      checked: false,
      hidden: false,
      disabled: false,
      maxLength: 0,
      draggable: false,
      offsetHeight: 120,
      classList: {
        add: name => classes.add(name),
        remove: name => classes.delete(name),
        toggle: (name, on) => (on === undefined ? (classes.has(name) ? classes.delete(name) : classes.add(name)) : on ? classes.add(name) : classes.delete(name)),
        contains: name => classes.has(name)
      },
      setAttribute() {},
      getAttribute: () => null,
      addEventListener() {},
      append() {},
      replaceChildren() {},
      querySelector: selector => element(selector),
      querySelectorAll: () => [],
      focus() {},
      select() {},
      replaceWith() {},
      setPointerCapture() {},
      releasePointerCapture() {},
      hasPointerCapture: () => false,
      getBoundingClientRect: () => ({ width: 0, height: 0 })
    };
    node.closest = () => node.labelNode || (node.labelNode = makeElement());
    return node;
  }

  const document = {
    querySelector: selector => element(selector),
    createElement: () => makeElement(),
    createTextNode: () => ({}),
    addEventListener() {},
    elementFromPoint: () => null,
    documentElement: makeElement()
  };

  const state = { settings: {}, reminders: {}, workday: {}, resizeMode: false, yesterday: null };
  const marks = [];
  const jokeBear = {
    assetUrl: file => `file:///${file}`,
    gifs: () => Promise.resolve([]),
    state: () => Promise.resolve({ ...state, settings: { ...state.settings }, reminders: { ...state.reminders }, workday: { ...state.workday } }),
    list: () => Promise.resolve([]),
    dates: () => Promise.resolve([]),
    resize() {},
    ignoreMouse() {},
    move() {},
    menu() {},
    saveSettings: next => { Object.assign(state.settings, next); return Promise.resolve(state.settings); },
    saveResize: () => Promise.resolve({}),
    acknowledgeReminder: () => Promise.resolve({}),
    markReminder: (key, value) => { marks.push([key, value]); state.reminders[key] = value; return Promise.resolve(state.reminders); },
    onDateChange() {},
    onSettingsOpen() {},
    onSettingsChanged() {},
    onResizeMode() {}
  };

  const context = { document, console, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, window: { jokeBear }, Math, Date, Promise, JSON, Number, String, Boolean, Array, Object, Set, Map, Intl, RegExp, Error, TypeError, MINUTE };
  context.globalThis = context;
  vm.createContext(context);
  for (const file of ['workday.js', 'pet.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src/renderer', file), 'utf8'), context, { filename: file });
  }
  return {
    context,
    state,
    marks,
    element,
    run: code => vm.runInContext(code, context)
  };
}

async function flush() {
  for (let i = 0; i < 30; i++) await new Promise(resolve => setImmediate(resolve));
}

async function testRenderer() {
  const { context, state, marks, element, run } = createPet();
  await flush();

  assert.strictEqual(context.formatRemaining(25 * MINUTE), '25 分钟');
  assert.strictEqual(context.formatRemaining(2 * 3600000 + 30 * MINUTE), '2 小时 30 分钟');
  assert.strictEqual(context.formatRemaining(3 * 3600000), '3 小时');
  assert.strictEqual(context.formatRemaining(27 * 3600000), '1 天 3 小时');

  // Auto mode: launched three hours ago with a nine hour workday leaves six hours left.
  run(`Object.assign(settings, { workdayEnabled: true, workdayMode: 'auto', workHours: 9 });
       workday = { date: localDate(), startedAt: Date.now() - 3 * 3600000 };`);
  const plan = context.offWorkPlan();
  assert.ok(Math.abs(plan.end - (Date.now() + 6 * 3600000)) < MINUTE, '自动模式下班时间 = 首次启动 + 工时');
  assert.match(context.countdownText(), /距离下班还有 6 小时/);

  // Fixed mode follows the wall clock instead of the launch time.
  const target = atTime(Date.now(), 150);
  const [targetHour, targetMinute] = target.split(':').map(Number);
  const targetDate = new Date();
  targetDate.setHours(targetHour, targetMinute, 0, 0);
  run(`Object.assign(settings, { workdayMode: 'fixed', workEnd: '${target}' });`);
  const fixed = context.offWorkPlan();
  assert.strictEqual(fixed.end, targetDate.getTime(), '固定模式下班点 = 今天钟表上的设定时间');
  assert.ok(context.countdownText().includes(fixed.end > Date.now() ? `距离下班还有 ${formatRemaining(fixed.end - Date.now())}` : `已经过了下班时间 ${formatRemaining(Date.now() - fixed.end)}`), '固定模式播报与设定时间一致');

  // Switching off the countdown yields a hint instead of an invented time.
  run('settings.workdayEnabled = false;');
  assert.strictEqual(context.offWorkPlan(), null);
  assert.match(context.countdownText(), /还没有设置下班时间/);
  run(`settings.workdayEnabled = true; settings.workdayMode = 'auto';`);

  // Lunch reminder fires once per day.
  run(`Object.assign(settings, { lunchReminder: true, countdownReminder: false, overtimeReminder: false, lunchTime: '${atTime(Date.now(), 0)}' });`);
  await context.checkWorkdayReminders();
  assert.strictEqual(element('#reminderTitle').textContent, '饿饿饿');
  assert.ok(element('#reminderSummary').textContent.includes('午饭'), '午饭气泡说明午饭');
  assert.ok(marks.some(([key]) => key === 'lunchDate'), '午饭提醒写入当天已提醒标记');
  context.closePanels();
  element('#reminderTitle').textContent = '';
  await context.checkWorkdayReminders();
  assert.strictEqual(element('#reminderTitle').textContent, '', '午饭提醒当天不重复');

  // The periodic tick refreshes the reminder cache and picks a stage in the
  // same turn, so the refresh must not erase the mark the stage check wrote.
  run(`Object.assign(settings, { workdayMode: 'auto', workHours: 9, lunchReminder: false, countdownReminder: true, overtimeReminder: false, morningReminder: false, eveningReminder: false, afternoonTime: '${atTime(Date.now(), 0)}' });
       workday = { date: localDate(), startedAt: Date.now() - 3 * 3600000 };
       workdayFetchedDate = localDate();
       reminderState = {};`);
  element('#reminderTitle').textContent = '';
  let refresh = context.checkReminders();
  await context.checkWorkdayReminders();
  await refresh;
  assert.strictEqual(element('#reminderTitle').textContent, '下班倒计时', '到点推送下班倒计时');
  context.closePanels();
  element('#reminderTitle').textContent = '';
  refresh = context.checkReminders();
  await context.checkWorkdayReminders();
  await refresh;
  assert.strictEqual(element('#reminderTitle').textContent, '', '状态刷新不会把刚写入的标记冲掉，当天不重复播报');

  // A stage missed by hours is skipped instead of announced late.
  run(`Object.assign(settings, { countdownReminder: true, lunchTime: '${atTime(Date.now(), -8 * 60)}', afternoonTime: '${atTime(Date.now(), 90)}' });`);
  await context.checkWorkdayReminders();
  assert.strictEqual(element('#reminderTitle').textContent, '', '错过过久的节点不补提醒');

  // The pre-off-work stage is derived from the off-work moment, not the clock.
  run(`Object.assign(settings, { lunchReminder: false, leadMinutes: 30, workHours: 9 });
       workday = { date: localDate(), startedAt: Date.now() + 30 * MINUTE - 9 * 3600000 };`);
  await context.checkWorkdayReminders();
  assert.strictEqual(element('#reminderTitle').textContent, '累累累');
  assert.ok(element('#reminderSummary').textContent.includes('30 分钟'), '下班前提醒按剩余时间播报');
  context.closePanels();

  // Nothing is announced before the configured start time.
  element('#reminderTitle').textContent = '';
  run(`Object.assign(settings, { workdayMode: 'fixed', workStart: '${atTime(Date.now(), 60)}', workEnd: '${atTime(Date.now(), 600)}', lunchTime: '${atTime(Date.now(), 0)}', afternoonTime: '${atTime(Date.now(), 0)}' });
       reminderState = {};`);
  await context.checkWorkdayReminders();
  assert.strictEqual(element('#reminderTitle').textContent, '', '上班前不推送倒计时节点');
  // The reminder times are wall-clock minutes of "today", so a time derived
  // from (now - 10 min) would wrap to a future minute near midnight.
  const minutesToday = new Date().getHours() * 60 + new Date().getMinutes();
  if (minutesToday >= 65) {
    run(`Object.assign(settings, { workStart: '${atTime(Date.now(), -60)}', afternoonTime: '${atTime(Date.now(), -10)}' });`);
    element('#reminderTitle').textContent = '';
    await context.checkWorkdayReminders();
    assert.strictEqual(element('#reminderTitle').textContent, '下班倒计时', '过了上班时间后正常推送');
    context.closePanels();
  }

  // Off-work fires once, then overtime repeats on its own interval.
  run(`Object.assign(settings, { workdayMode: 'auto', overtimeReminder: true, overtimeInterval: 30 });
       workday = { date: localDate(), startedAt: Date.now() - 9 * 3600000 - 35 * MINUTE };`);
  element('#reminderTitle').textContent = '';
  await context.checkWorkdayReminders();
  assert.strictEqual(element('#reminderTitle').textContent, '耶耶耶');
  context.closePanels();
  element('#reminderTitle').textContent = '';
  await context.checkWorkdayReminders();
  assert.strictEqual(element('#reminderTitle').textContent, '还不下班？！', '超过加班间隔后转为加班提醒');
  assert.ok(marks.some(([key]) => key === 'overtimeAt'), '加班提醒记录时间戳');
  element('#reminderTitle').textContent = '';
  await context.checkWorkdayReminders();
  assert.strictEqual(element('#reminderTitle').textContent, '', '同一个加班间隔内不重复');

  assert.match(context.countdownText(), /已经过了下班时间/, '点击播报会说明已经下班');

  // Clicking the bear shows the countdown bubble.
  context.say(context.countdownText());
  assert.strictEqual(element('#speech').classList.contains('show'), true);
  assert.ok(element('#speech').textContent.includes('下班'), '气泡内容是下班倒计时');

  // Settings round-trip through the shared field helpers.
  element('#workdayModeSetting').value = 'fixed';
  element('#workEndSetting').value = '19:30';
  element('#workHoursSetting').value = '7.5';
  element('#clickCountdownSetting').checked = false;
  const changes = context.readWorkdayFields({ workdayMode: 'auto', workEnd: '18:00', workHours: 9, clickCountdown: true }, {});
  assert.strictEqual(changes.workdayMode, 'fixed');
  assert.strictEqual(changes.workEnd, '19:30');
  assert.strictEqual(changes.workHours, 7.5);
  assert.strictEqual(changes.clickCountdown, false);
  assert.strictEqual(changes.workStart, '09:00', '未改动的字段保留原值');
  context.fillWorkdayFields(changes);
  assert.strictEqual(element('#workHoursValue').textContent, '7.5小时', 'range 标签带单位');
  const labelOf = selector => element(selector).closest('label');
  assert.strictEqual(labelOf('#workHoursSetting').hidden, true, '固定模式下隐藏工作小时数');
  assert.strictEqual(labelOf('#workEndSetting').hidden, false, '固定模式显示下班时间');
  assert.strictEqual(labelOf('#workStartSetting').hidden, false, '固定模式显示上班时间');
  element('#workdayModeSetting').value = 'auto';
  context.fillWorkdayFields({ ...changes, workdayMode: 'auto' });
  assert.strictEqual(labelOf('#workHoursSetting').hidden, false, '自动模式显示工作小时数');
  assert.strictEqual(labelOf('#workEndSetting').hidden, true, '自动模式隐藏下班时间');
  assert.strictEqual(labelOf('#workStartSetting').hidden, true, '自动模式隐藏上班时间');

  // The auto-start checkbox reflects the stored setting when the panel opens,
  // and the save button sends whatever the checkbox currently shows.
  run('settings.autoStart = true;');
  context.openSettings();
  assert.strictEqual(element('#autoStartSetting').checked, true, '打开设置面板时回填开机自启状态');
  element('#autoStartSetting').checked = false;
  await element('#saveSettings').onclick();
  assert.strictEqual(state.settings.autoStart, false, '保存时提交开机自启字段');
}

(async () => {
  testMainProcess();
  await testRenderer();
  console.log('ok  渲染进程：倒计时计算、节点触发、加班重复提醒、设置读写');
  console.log('\n全部通过');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
