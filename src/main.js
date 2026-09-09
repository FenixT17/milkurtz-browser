'use strict';

const { app, BrowserWindow, ipcMain, shell, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const { Store } = require('./storage/store.js');
const { PasswordManager } = require('./security/password.js');
const { Updater } = require('./updates/updater.js');

let mainWindow = null;
let store = null;
let passwordManager = null;
let updater = null;
let isUnlocked = false;

const isDev = process.argv.includes('--dev');

function getUserDataPath() {
  return path.join(app.getPath('userData'), 'user_data');
}

function requireUnlocked() {
  if (!isUnlocked) throw new Error('Navegador bloqueado.');
}

function isWebUrl(value) {
  return /^https?:\/\//i.test(value) || /^file:\/\//i.test(value);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 980,
    minHeight: 640,
    title: 'Milkurtz Browser',
    backgroundColor: '#0b0a12',
    show: false,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
      spellcheck: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Política: abrir links externos no navegador do sistema, nunca em nova janela interna.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isWebUrl(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Política de navegação: impedir que o shell saia da página inicial customizada.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== 'file://' + path.join(__dirname, 'renderer', 'index.html')) {
      event.preventDefault();
      if (isWebUrl(url)) shell.openExternal(url);
    }
  });
}

function registerUpdateIpc() {
  ipcMain.handle('update:check', async () => {
    return updater.check();
  });

  ipcMain.handle('update:download', async () => {
    return updater.download();
  });

  ipcMain.handle('update:install', () => {
    updater.quitAndInstall();
    return true;
  });

  ipcMain.handle('update:getInfo', () => {
    return {
      current: updater.getCurrentVersion(),
      updateUrl: updater.getUpdateUrl(),
      changelog: updater.getChangelog()
    };
  });

  // Encaminhar eventos do updater para o renderer
  const send = (channel, payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload);
    }
  };

  updater.on('checking', () => send('update:checking'));
  updater.on('available', (info) => send('update:available', info));
  updater.on('not-available', (info) => send('update:not-available', info));
  updater.on('error', (err) => send('update:error', { message: err.message || String(err) }));
  updater.on('progress', (p) => send('update:progress', p));
  updater.on('downloaded', (info) => send('update:downloaded', info));
}

function registerIpc() {
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('app:getState', () => {
    return {
      locked: passwordManager.isLocked(),
      settings: store.getSettings(),
      bookmarks: store.getBookmarks(),
      history: store.getHistory(),
      downloads: store.getDownloads(),
      version: updater.getCurrentVersion()
    };
  });

  ipcMain.handle('unlock', async (_event, password) => {
    const ok = await passwordManager.unlock(password);
    if (ok) isUnlocked = true;
    return ok;
  });

  ipcMain.handle('lock', () => {
    isUnlocked = false;
    passwordManager.lock();
    return true;
  });

  ipcMain.handle('password:set', async (_event, { current, next }) => {
    requireUnlocked();
    await passwordManager.setPassword(current, next);
    return true;
  });

  ipcMain.handle('password:disable', async (_event, current) => {
    requireUnlocked();
    await passwordManager.disable(current);
    return true;
  });

  ipcMain.handle('settings:set', (_event, { key, value }) => {
    requireUnlocked();
    const allowed = ['theme', 'searchEngine', 'homepage', 'showMotivation'];
    if (!allowed.includes(key)) throw new Error('Configuração inválida.');
    if (key === 'theme' && !['milkurtz', 'dark', 'light'].includes(value)) throw new Error('Tema inválido.');
    if (key === 'searchEngine' && !['duckduckgo', 'google', 'bing', 'brave', 'ecosia'].includes(value)) throw new Error('Motor de pesquisa inválido.');
    if (key === 'showMotivation' && typeof value !== 'boolean') throw new Error('Valor inválido.');
    if (key === 'homepage' && !isWebUrl(value) && value !== 'milkurtz://home') throw new Error('Página inicial inválida.');
    return store.patchSettings({ [key]: value });
  });

  ipcMain.handle('bookmarks:add', (_event, bookmark) => {
    requireUnlocked();
    if (!bookmark || typeof bookmark.url !== 'string' || !isWebUrl(bookmark.url)) {
      throw new Error('Favorito inválido.');
    }
    return store.addBookmark({
      title: String(bookmark.title || bookmark.url),
      url: bookmark.url
    });
  });

  ipcMain.handle('bookmarks:remove', (_event, id) => {
    requireUnlocked();
    return store.removeBookmark(id);
  });

  ipcMain.handle('history:add', (_event, entry) => {
    requireUnlocked();
    if (!entry || typeof entry.url !== 'string' || !entry.url) return store.getHistory();
    return store.addHistory({
      title: String(entry.title || entry.url),
      url: entry.url
    });
  });

  ipcMain.handle('history:clear', () => {
    requireUnlocked();
    return store.clearHistory();
  });

  ipcMain.handle('history:remove', (_event, id) => {
    requireUnlocked();
    return store.removeHistory(id);
  });

  ipcMain.handle('downloads:clear', () => {
    requireUnlocked();
    return store.clearDownloads();
  });

  ipcMain.handle('downloads:remove', (_event, id) => {
    requireUnlocked();
    return store.removeDownload(id);
  });

  ipcMain.handle('downloads:openPath', (_event, filePath) => {
    if (typeof filePath === 'string' && filePath) {
      shell.showItemInFolder(filePath);
    }
    return true;
  });
}

function setupDownloadHandling() {
  if (!mainWindow) return;
  const ses = session.fromPartition('persist:milkurtz');

  ses.on('will-download', (event, item) => {
    const filename = item.getFilename();
    const defaultPath = path.join(app.getPath('downloads'), filename);
    item.setSavePath(defaultPath);

    item.once('done', (_e, state) => {
      if (!mainWindow) return;
      const record = {
        id: String(Date.now()),
        filename,
        path: defaultPath,
        url: item.getURL(),
        totalBytes: item.getTotalBytes(),
        receivedBytes: item.getReceivedBytes(),
        state,
        timestamp: Date.now()
      };
      store.addDownload(record);
      mainWindow.webContents.send('download:changed', record);
    });
  });
}

async function bootstrap() {
  const userDataPath = getUserDataPath();
  fs.mkdirSync(userDataPath, { recursive: true });

  store = new Store(userDataPath);
  passwordManager = new PasswordManager(userDataPath);
  updater = new Updater(path.join(__dirname, '..', 'version.json'));

  // Sem senha configurada → já desbloqueado.
  isUnlocked = !passwordManager.isLocked();

  registerIpc();
  registerUpdateIpc();

  app.whenReady().then(() => {
    createWindow();
    setupDownloadHandling();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    store.flush();
  });
}

bootstrap().catch((err) => {
  console.error('[milkurtz] falha ao iniciar:', err);
  dialog.showErrorBox('Milkurtz Browser', 'Falha ao iniciar o navegador: ' + err.message);
  app.quit();
});