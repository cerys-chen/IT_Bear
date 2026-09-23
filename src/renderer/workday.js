const WORKDAY_CHECKS = ['workdayEnabled', 'lunchReminder', 'countdownReminder', 'overtimeReminder', 'clickCountdown'];
const WORKDAY_TIMES = [['workStart', '09:00'], ['workEnd', '18:00'], ['lunchTime', '11:55'], ['afternoonTime', '15:00']];
const WORKDAY_RANGES = [['workHours', '小时'], ['leadMinutes', '分钟'], ['overtimeInterval', '分钟']];

function workdayField(id) { return document.querySelector(`#${id}`); }
function timestampOf(hhmm, fallback) {
  const [hour, minute] = String(hhmm || fallback).split(':').map(Number);
  const date = new Date();
  date.setHours(Number(hour) || 0, Number(minute) || 0, 0, 0);
  return date.getTime();
}
function formatWorkdayTime(value) {
  const date = new Date(value);
  return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}
function formatRemaining(ms) {
  const total = Math.round(ms / 60000);
  if (total < 60) return `${total} 分钟`;
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  if (hour < 24) return minute ? `${hour} 小时 ${minute} 分钟` : `${hour} 小时`;
  return `${Math.floor(hour / 24)} 天 ${hour % 24} 小时`;
}
function fillWorkdayFields(target) {
  for (const key of WORKDAY_CHECKS) { const field = workdayField(`${key}Setting`); if (field) field.checked = Boolean(target[key]); }
  for (const [key, fallback] of WORKDAY_TIMES) { const field = workdayField(`${key}Setting`); if (field) field.value = target[key] || fallback; }
  for (const [key] of WORKDAY_RANGES) { const field = workdayField(`${key}Setting`); if (field) field.value = Number(target[key]) || 0; }
  const mode = workdayField('workdayModeSetting');
  if (mode) mode.value = target.workdayMode === 'fixed' ? 'fixed' : 'auto';
  updateWorkdayLabels(target);
  syncWorkdayVisibility(target);
}
function readWorkdayFields(target, base = {}) {
  const changes = { ...base };
  const mode = workdayField('workdayModeSetting');
  if (mode) changes.workdayMode = mode.value === 'fixed' ? 'fixed' : 'auto';
  for (const key of WORKDAY_CHECKS) { const field = workdayField(`${key}Setting`); if (field) changes[key] = field.checked; }
  for (const [key, fallback] of WORKDAY_TIMES) { const field = workdayField(`${key}Setting`); if (field) changes[key] = field.value || target[key] || fallback; }
  for (const [key] of WORKDAY_RANGES) { const field = workdayField(`${key}Setting`); if (field) changes[key] = Number(field.value) || target[key]; }
  return changes;
}
function updateWorkdayLabels(target) {
  for (const [key, unit] of WORKDAY_RANGES) { const output = workdayField(`${key}Value`); if (output) output.textContent = `${target[key]}${unit}`; }
}
function syncWorkdayVisibility(target) {
  const auto = target.workdayMode !== 'fixed';
  const toggle = (key, hidden) => { const label = workdayField(`${key}Setting`)?.closest('label'); if (label) label.hidden = hidden; };
  toggle('workStart', auto);
  toggle('workEnd', auto);
  toggle('workHours', !auto);
}