const { app, BrowserWindow, ipcMain, Menu, screen } = require('electron');
const fs = require('fs'); const path = require('path'); const crypto = require('crypto');
let windowRef; let quitting = false;
const today = () => { const date = new Date(); return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); };
const dataFile = () => path.join(app.getPath('userData'), 'jokebear.json');
function readRaw() { try { return JSON.parse(fs.readFileSync(dataFile(), 'utf8')); } catch { return {}; } }
function save(data) { fs.mkdirSync(path.dirname(dataFile()), { recursive: true }); fs.writeFileSync(dataFile(), JSON.stringify(data, null, 2), 'utf8'); return data; }
function getData() { const current = today(); const data = readRaw(); const next = { date: data.date || current, todos: Array.isArray(data.todos) ? data.todos : [], history: data.history && typeof data.history === 'object' ? data.history : {} }; if (next.date !== current) { if (next.todos.length) next.history[next.date] = next.todos; next.date = current; next.todos = []; save(next); } return next; }
function updateData(fn) { return save(fn(getData())); }
function sendDate(date) { if (windowRef && !windowRef.isDestroyed()) windowRef.webContents.send('todos:date', date); }
function openDate(date = today()) { if (!windowRef || windowRef.isDestroyed()) return; windowRef.show(); windowRef.focus(); sendDate(date); }
function createWindow() { const data = getData(); const area = screen.getPrimaryDisplay().workArea; const pos = data.position || { x: area.x + area.width - 280, y: area.y + area.height - 500 }; windowRef = new BrowserWindow({ width: 240, height: 405, x: pos.x, y: pos.y, transparent: true, frame: false, resizable: false, alwaysOnTop: true, skipTaskbar: true, hasShadow: false, webPreferences: { preload: path.resolve(__dirname, 'preload.js'), sandbox: false, contextIsolation: true, nodeIntegration: false } }); windowRef.loadFile(path.join(__dirname, '../renderer/pet.html')); windowRef.setAlwaysOnTop(true, 'floating'); let timer; windowRef.on('move', () => { clearTimeout(timer); timer = setTimeout(() => { if (windowRef && !windowRef.isDestroyed()) { const [x, y] = windowRef.getPosition(); updateData(d => ({ ...d, position: { x, y } })); } }, 200); }); windowRef.on('closed', () => { windowRef = null; if (!quitting) app.quit(); }); }
function historyMenu() { const data = getData(); const dates = Object.keys(data.history).sort().reverse(); return dates.length ? dates.map(date => ({ label: date, click: () => openDate(date) })) : [{ label: '暂无历史记录', enabled: false }]; }
ipcMain.on('pet:move', (_, dx, dy) => { if (!windowRef || windowRef.isDestroyed()) return; const [x, y] = windowRef.getPosition(); windowRef.setPosition(Math.round(x + Number(dx || 0)), Math.round(y + Number(dy || 0))); });
ipcMain.on('app:quit', () => app.quit());
ipcMain.on('window:resize', (_, width, height) => { if (!windowRef || windowRef.isDestroyed()) return; windowRef.setContentSize(Math.max(1, Math.round(Number(width) || 240)), Math.max(1, Math.round(Number(height) || 365))); });
ipcMain.on('pet:menu', () => Menu.buildFromTemplate([{ label: '打开今天待办', click: () => openDate(today()) }, { label: '待办事项历史记录', submenu: historyMenu() }, { type: 'separator' }, { label: '始终置顶', type: 'checkbox', checked: windowRef?.isAlwaysOnTop() ?? true, click: item => windowRef?.setAlwaysOnTop(item.checked, 'floating') }, { type: 'separator' }, { label: '退出自嘲熊', click: () => app.quit() }]).popup({ window: windowRef }));
ipcMain.handle('assets:gifs', () => fs.readdirSync(path.join(__dirname, '../../assets/gif')).filter(name => /\.gif$/i.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
ipcMain.handle('todos:list', (_, date = today()) => { const data = getData(); return date === data.date ? data.todos : (data.history[date] || []); });
ipcMain.handle('todos:dates', () => { const data = getData(); return [data.date, ...Object.keys(data.history).filter(date => date !== data.date).sort().reverse()]; });
ipcMain.handle('todos:add', (_, text) => { const value = String(text || '').trim().slice(0, 120); if (!value) return getData().todos; return updateData(d => ({ ...d, todos: [{ id: crypto.randomUUID(), text: value, done: false }, ...d.todos] })).todos; });
ipcMain.handle('todos:toggle', (_, id) => updateData(d => ({ ...d, todos: d.todos.map(todo => todo.id === id ? { ...todo, done: !todo.done } : todo) })).todos);
ipcMain.handle('todos:delete', (_, id) => updateData(d => ({ ...d, todos: d.todos.filter(todo => todo.id !== id) })).todos);
app.whenReady().then(createWindow); app.on('before-quit', () => quitting = true); app.on('window-all-closed', () => app.quit());






