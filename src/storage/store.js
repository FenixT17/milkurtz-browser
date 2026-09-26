'use strict';

const fs = require('fs');
const path = require('path');

let idCounter = 0;

/** Gera um id único mesmo quando duas entradas são criadas no mesmo milissegundo. */
function uniqueId() {
  idCounter = (idCounter + 1) % 1000;
  return `${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

const DEFAULTS = {
  settings: {
    theme: 'milkurtz',
    searchEngine: 'duckduckgo',
    homepage: 'milkurtz://home',
    showMotivation: true
  },
  bookmarks: [],
  history: [],
  downloads: []
};

/**
 * Armazenamento local do navegador.
 * Grava cada coleção em um arquivo JSON separado dentro do perfil,
 * usando escrita atômica (.tmp + rename) para evitar corrupção.
 */
class Store {
  constructor(userDataPath) {
    this.dir = path.join(userDataPath, 'data');
    fs.mkdirSync(this.dir, { recursive: true });
    this.cache = {};
    this._loadAll();
  }

  _file(name) {
    return path.join(this.dir, `${name}.json`);
  }

  _read(name, fallback) {
    try {
      const raw = fs.readFileSync(this._file(name), 'utf8');
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  _write(name, value) {
    const file = this._file(name);
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  }

  _loadAll() {
    this.cache.settings = { ...DEFAULTS.settings, ...this._read('settings', {}) };
    this.cache.bookmarks = this._read('bookmarks', []);
    this.cache.history = this._read('history', []);
    this.cache.downloads = this._read('downloads', []);
  }

  getSettings() {
    return { ...this.cache.settings };
  }

  patchSettings(patch) {
    Object.assign(this.cache.settings, patch);
    this._write('settings', this.cache.settings);
    return this.getSettings();
  }

  getBookmarks() {
    return [...this.cache.bookmarks];
  }

  addBookmark({ title, url }) {
    const existing = this.cache.bookmarks.find((b) => b.url === url);
    if (existing) return this.getBookmarks();
    const bookmark = {
      id: uniqueId(),
      title,
      url,
      timestamp: Date.now()
    };
    this.cache.bookmarks.push(bookmark);
    this._write('bookmarks', this.cache.bookmarks);
    return this.getBookmarks();
  }

  removeBookmark(id) {
    this.cache.bookmarks = this.cache.bookmarks.filter((b) => b.id !== id);
    this._write('bookmarks', this.cache.bookmarks);
    return this.getBookmarks();
  }

  getHistory() {
    return [...this.cache.history];
  }

  addHistory({ title, url }) {
    if (!url || url === 'milkurtz://home') return this.getHistory();
    // Deduplica por URL: a mesma página não gera entradas repetidas —
    // a visita mais recente sobe para o topo.
    this.cache.history = this.cache.history.filter((h) => h.url !== url);
    const entry = {
      id: uniqueId(),
      title: title || url,
      url,
      timestamp: Date.now()
    };
    this.cache.history.unshift(entry);
    if (this.cache.history.length > 500) this.cache.history.length = 500;
    this._write('history', this.cache.history);
    return this.getHistory();
  }

  removeHistory(id) {
    this.cache.history = this.cache.history.filter((h) => h.id !== id);
    this._write('history', this.cache.history);
    return this.getHistory();
  }

  clearHistory() {
    this.cache.history = [];
    this._write('history', this.cache.history);
    return this.getHistory();
  }

  getDownloads() {
    return [...this.cache.downloads];
  }

  addDownload(record) {
    this.cache.downloads.unshift(record);
    if (this.cache.downloads.length > 200) this.cache.downloads.length = 200;
    this._write('downloads', this.cache.downloads);
    return this.getDownloads();
  }

  removeDownload(id) {
    this.cache.downloads = this.cache.downloads.filter((d) => d.id !== id);
    this._write('downloads', this.cache.downloads);
    return this.getDownloads();
  }

  clearDownloads() {
    this.cache.downloads = [];
    this._write('downloads', this.cache.downloads);
    return this.getDownloads();
  }

  flush() {
    for (const name of ['settings', 'bookmarks', 'history', 'downloads']) {
      this._write(name, this.cache[name]);
    }
  }
}

module.exports = { Store, DEFAULTS };