const settings = { bearWidth: 184, bearHeight: 220, paperWidth: 160, paperHeight: 260, todoFontSize: 13, latinFontSize: 11, morningReminder: true, eveningReminder: true, eveningTime: '17:30', standingReminder: true, standingInterval: 60, workdayEnabled: true, workdayMode: 'auto', workStart: '09:00', workEnd: '18:00', workHours: 9, lunchReminder: true, lunchTime: '11:55', countdownReminder: true, afternoonTime: '15:00', leadMinutes: 30, overtimeReminder: true, overtimeInterval: 30, clickCountdown: true, autoStart: false };
const fields = ['bearWidth', 'bearHeight', 'paperWidth', 'paperHeight', 'todoFontSize', 'latinFontSize', 'standingInterval', 'workHours', 'leadMinutes', 'overtimeInterval'];

function updateLabels() {
  for (const key of fields) {
    document.querySelector(`#${key}Setting`).value = settings[key];
    const unit = key === 'standingInterval' || key === 'leadMinutes' || key === 'overtimeInterval' ? '分钟' : key === 'workHours' ? '小时' : 'px';
    document.querySelector(`#${key}Value`).textContent = `${settings[key]}${unit}`;
  }
}

async function load() {
  const state = await window.jokeBear.state();
  Object.assign(settings, state.settings || {});
  updateLabels();
  document.querySelector('#morningReminderSetting').checked = Boolean(settings.morningReminder);
  document.querySelector('#eveningReminderSetting').checked = Boolean(settings.eveningReminder);
  document.querySelector('#eveningTimeSetting').value = settings.eveningTime || '17:30';
  document.querySelector('#standingReminderSetting').checked = Boolean(settings.standingReminder);
  document.querySelector('#autoStartSetting').checked = Boolean(settings.autoStart);
  fillWorkdayFields(settings);
}

for (const key of fields) {
  document.querySelector(`#${key}Setting`).addEventListener('input', event => {
    settings[key] = Number(event.target.value);
    updateLabels();
  });
}

document.querySelector('#workdayModeSetting').addEventListener('change', event => {
  settings.workdayMode = event.target.value === 'fixed' ? 'fixed' : 'auto';
  syncWorkdayVisibility(settings);
});

document.querySelector('#saveSettings').addEventListener('click', async () => {
  Object.assign(settings, readWorkdayFields(settings, {
    morningReminder: document.querySelector('#morningReminderSetting').checked,
    eveningReminder: document.querySelector('#eveningReminderSetting').checked,
    eveningTime: document.querySelector('#eveningTimeSetting').value || '17:30',
    standingReminder: document.querySelector('#standingReminderSetting').checked,
    autoStart: document.querySelector('#autoStartSetting').checked
  }));
  await window.jokeBear.saveSettings(settings);
  window.close();
});

load().catch(error => console.error(error));
