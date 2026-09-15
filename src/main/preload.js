const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
contextBridge.exposeInMainWorld('jokeBear', { assetUrl: file =>
  pathToFileURL(path.join(__dirname, '../../assets/gif', file)).href, gifs: () => ipcRenderer.invoke('assets:gifs'), quit: () => ipcRenderer.send('app:quit'), move: (dx, dy) => ipcRenderer.send('pet:move', dx, dy), resize: (width, height) => ipcRenderer.send('window:resize', width, height), menu: () => ipcRenderer.send('pet:menu'), list: date => ipcRenderer.invoke('todos:list', date), dates: () => ipcRenderer.invoke('todos:dates'), add: text => ipcRenderer.invoke('todos:add', text), toggle: id => ipcRenderer.invoke('todos:toggle', id), remove: id => ipcRenderer.invoke('todos:delete', id), onDateChange: callback => ipcRenderer.on('todos:date', (_, date) => callback(date)) });



