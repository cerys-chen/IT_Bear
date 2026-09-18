const settings = { bearWidth: 184, bearHeight: 220, paperWidth: 160, paperHeight: 260, todoFontSize: 13, latinFontSize: 11, morningReminder: true, eveningReminder: true, eveningTime: '17:30', standingReminder: true, standingInterval: 60 };
const fields = ['bearWidth', 'bearHeight', 'paperWidth', 'paperHeight', 'todoFontSize', 'latinFontSize', 'standingInterval'];

function updateLabels() {
  for (const key of fields) {
    document.querySelector(`#${key}Setting`).value = settings[key];
    const unit = key === 'standingInterval' ? '分钟' : 'px';
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
}

for (const key of fields) {
  document.querySelector(`#${key}Setting`).addEventListener('input', event => {
    settings[key] = Number(event.target.value);
    updateLabels();
  });
}

document.querySelector('#saveSettings').addEventListener('click', async () => {
  Object.assign(settings, {
    morningReminder: document.querySelector('#morningReminderSetting').checked,
    eveningReminder: document.querySelector('#eveningReminderSetting').checked,
    eveningTime: document.querySelector('#eveningTimeSetting').value || '17:30',
    standingReminder: document.querySelector('#standingReminderSetting').checked
  });
  await window.jokeBear.saveSettings(settings);
  window.close();
});

load().catch(error => console.error(error));
