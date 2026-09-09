'use strict';

const { EventEmitter } = require('events');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');

/**
 * Sistema de atualizações automáticas.
 *
 * Usa electron-updater (padrão electron-builder), que:
 * 1. Consulta o feed de atualizações (latest.yml publicado no servidor/GitHub Releases)
 * 2. Compara a versão remota com a local
 * 3. Baixa o instalador, verifica o hash sha512
 * 4. Executa a instalação (NSIS) e reinicia o app
 *
 * O feed é configurado em version.json (campo "updateUrl") e pode ser
 * sobrescrito por MILKURTZ_UPDATE_URL no ambiente.
 */
class Updater extends EventEmitter {
  constructor(versionFile) {
    super();
    this.versionFile = versionFile;
    this.info = { version: '0.0.0', updateUrl: '', changelog: '' };
    this.checking = false;
    this._load();
    this._configure();
  }

  _load() {
    try {
      this.info = JSON.parse(fs.readFileSync(this.versionFile, 'utf8'));
    } catch {
      this.info = { version: '0.0.0', updateUrl: '', changelog: '' };
    }
  }

  _configure() {
    const feedUrl =
      process.env.MILKURTZ_UPDATE_URL ||
      this.info.updateUrl ||
      '';

    if (feedUrl) {
      autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl });
    }

    autoUpdater.autoDownload = false; // download manual (com progresso na UI)
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;

    // Eventos → encaminhados para o main process / renderer
    autoUpdater.on('checking-for-update', () => {
      this.emit('checking');
    });
    autoUpdater.on('update-available', (info) => {
      this.emit('available', { version: info.version, releaseDate: info.releaseDate });
    });
    autoUpdater.on('update-not-available', (info) => {
      this.emit('not-available', { version: info.version });
    });
    autoUpdater.on('error', (err) => {
      this.emit('error', err);
    });
    autoUpdater.on('download-progress', (progressObj) => {
      this.emit('progress', {
        percent: Math.round(progressObj.percent || 0),
        transferred: progressObj.transferred || 0,
        total: progressObj.total || 0,
        bytesPerSecond: progressObj.bytesPerSecond || 0
      });
    });
    autoUpdater.on('update-downloaded', (info) => {
      this.emit('downloaded', { version: info.version });
    });
  }

  getCurrentVersion() {
    return this.info.version || '0.0.0';
  }

  getUpdateUrl() {
    return process.env.MILKURTZ_UPDATE_URL || this.info.updateUrl || '';
  }

  getChangelog() {
    return this.info.changelog || '';
  }

  /**
   * Verifica se há atualização disponível.
   * Retorna { status, version?, message? }.
   */
  async check() {
    if (this.checking) return { status: 'busy' };
    this.checking = true;
    try {
      if (!this.getUpdateUrl()) {
        return { status: 'no-feed', message: 'Nenhum servidor de atualizações configurado (updateUrl vazio em version.json).' };
      }
      const result = await autoUpdater.checkForUpdates();
      this.checking = false;
      return result ? { status: 'checked', version: result.updateInfo?.version } : { status: 'checked' };
    } catch (err) {
      this.checking = false;
      return { status: 'error', message: err.message };
    }
  }

  /**
   * Baixa a atualização já detectada. Emite 'progress' e 'downloaded'.
   */
  async download() {
    try {
      await autoUpdater.downloadUpdate();
      return { status: 'downloaded' };
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  }

  /**
   * Instala a atualização baixada e reinicia o app.
   */
  quitAndInstall() {
    autoUpdater.quitAndInstall(false, true);
  }
}

module.exports = { Updater, compareVersions };

// Comparador de versões semver simples (mantido para testes/uso externo).
function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da !== db) return da - db;
  }
  return 0;
}