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
const SHOWN_SIZE = { width: 240, height: 405 };
const HIDDEN_SIZE = { width: 240, height: 235 };

function localDate() {
  const date = new Date();
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
function resizeWindow(size) { window.jokeBear.resize(size.width, size.height); }

let gifIndex = 0;
let todos = [];
let activeDate = localDate();
let today = activeDate;
function setGif() {
  if (!gifs.length) return;
  image.src = window.jokeBear.assetUrl(gifs[gifIndex]);
  image.alt = 'JokeBear action ' + (gifIndex + 1);
}

function render() {
  list.replaceChildren();
  empty.className = todos.length ? 'empty hide' : 'empty';
  const left = todos.filter(todo => !todo.done).length;
  const current = activeDate === today;
  title.textContent = current ? '今日待办' : `${activeDate} 待办`;
  summary.textContent = !todos.length ? (current ? '暂时没有待办' : '这一天没有记录') : current ? (left ? `还有 ${left} 件事` : '全部完成') : `共 ${todos.length} 件`;
  paper.classList.toggle('readonly', !current);
  input.disabled = !current;
  for (const todo of todos) {
    const item = document.createElement('li');
    item.className = `todo-item${todo.done ? ' done' : ''}`;
    const check = document.createElement('button');
    check.className = 'todo-check';
    check.textContent = todo.done ? '✓' : '';
    check.title = todo.done ? '恢复待办' : '完成待办';
    check.disabled = !current;
    check.onclick = async () => { todos = await window.jokeBear.toggle(todo.id); render(); };
    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;
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
  resizeWindow(SHOWN_SIZE);
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
});
bear.addEventListener('pointercancel', () => { dragging = false; });
bear.addEventListener('dragstart', event => event.preventDefault());
hidePaper.onclick = () => { paper.style.display = 'none'; resizeWindow(HIDDEN_SIZE); };
bear.addEventListener('contextmenu', event => { event.preventDefault(); window.jokeBear.menu(); });
form.onsubmit = async event => {
  event.preventDefault();
  if (!input.value.trim() || activeDate !== today) return;
  todos = await window.jokeBear.add(input.value);
  input.value = '';
  render();
  input.focus();
};
window.jokeBear.onDateChange(loadDate);
window.jokeBear.gifs().then(files => { gifs.push(...files); setGif(); }).catch(error => {
  image.alt = 'GIF folder could not be read';
  console.error(error);
});
loadDate(today);
