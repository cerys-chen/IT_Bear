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
const SHOWN_SIZE = { width: 240, height: 460 };
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
let draggedTodoId = null;
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
window.jokeBear.gifs().then(files => { gifs.push(...files); if (gifs.length) gifIndex = Math.floor(Math.random() * gifs.length); setGif(); }).catch(error => {
  image.alt = 'GIF folder could not be read';
  console.error(error);
});
loadDate(today);
