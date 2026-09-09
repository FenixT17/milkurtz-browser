'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('milkurtz', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  },
  app: {
    getState: () => ipcRenderer.invoke('app:getState'),
    onDownloadChanged: (callback) => {
      const listener = (_event, record) => callback(record);
      ipcRenderer.on('download:changed', listener);
      return () => ipcRenderer.removeListener('download:changed', listener);
    }
  },
  unlock: (password) => ipcRenderer.invoke('unlock', password),
  lock: () => ipcRenderer.invoke('lock'),
  password: {
    set: (current, next) => ipcRenderer.invoke('password:set', { current, next }),
    disable: (current) => ipcRenderer.invoke('password:disable', current)
  },
  settings: {
    set: (key, value) => ipcRenderer.invoke('settings:set', { key, value })
  },
  bookmarks: {
    add: (bookmark) => ipcRenderer.invoke('bookmarks:add', bookmark),
    remove: (id) => ipcRenderer.invoke('bookmarks:remove', id)
  },
  history: {
    add: (title, url) => ipcRenderer.invoke('history:add', { title, url }),
    clear: () => ipcRenderer.invoke('history:clear'),
    remove: (id) => ipcRenderer.invoke('history:remove', id)
  },
  downloads: {
    clear: () => ipcRenderer.invoke('downloads:clear'),
    remove: (id) => ipcRenderer.invoke('downloads:remove', id),
    openPath: (filePath) => ipcRenderer.invoke('downloads:openPath', filePath)
  },
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    getInfo: () => ipcRenderer.invoke('update:getInfo'),
    onChecking: (cb) => on('update:checking', cb),
    onAvailable: (cb) => on('update:available', cb),
    onNotAvailable: (cb) => on('update:not-available', cb),
    onError: (cb) => on('update:error', cb),
    onProgress: (cb) => on('update:progress', cb),
    onDownloaded: (cb) => on('update:downloaded', cb)
  }
});

function on(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}