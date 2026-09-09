'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { safeStorage } = require('electron');

const FILE = 'password.json';

function scryptHash(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

/**
 * Proteção por senha local.
 * - Hash scrypt com salt aleatório.
 * - Criptografia adicional via safeStorage (DPAPI no Windows) quando disponível.
 */
class PasswordManager {
  constructor(userDataPath) {
    this.file = path.join(userDataPath, FILE);
    this.locked = false;
    this._load();
    // Se há senha configurada, o navegador inicia bloqueado até o desbloqueio.
    this.locked = this.data != null;
  }

  _load() {
    try {
      this.data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      this.data = null;
    }
  }

  _save() {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  isLocked() {
    return this.locked;
  }

  hasPassword() {
    return this.data != null;
  }

  _encryptPayload(plain) {
    if (safeStorage.isEncryptionAvailable()) {
      return { v: 2, encrypted: safeStorage.encryptString(plain).toString('base64') };
    }
    return { v: 1, plain };
  }

  _decryptPayload(payload) {
    if (payload && payload.v === 2 && payload.encrypted) {
      try {
        return safeStorage.decryptString(Buffer.from(payload.encrypted, 'base64'));
      } catch {
        return null;
      }
    }
    return payload ? payload.plain : null;
  }

  async setPassword(current, next) {
    if (this.data && !(await this.unlock(current))) {
      throw new Error('Senha atual incorreta.');
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const payload = this._encryptPayload(next);
    this.data = { salt, hash: scryptHash(next, salt), payload };
    this._save();
    this.locked = false;
    return true;
  }

  async disable(current) {
    if (this.data && !(await this.unlock(current))) {
      throw new Error('Senha incorreta.');
    }
    this.data = null;
    this.locked = false;
    try {
      fs.unlinkSync(this.file);
    } catch {}
    return true;
  }

  async unlock(password) {
    if (!this.data) {
      this.locked = false;
      return true;
    }
    const hash = scryptHash(password, this.data.salt);
    const match = hash === this.data.hash;
    if (match) this.locked = false;
    return match;
  }

  lock() {
    this.locked = true;
  }
}

module.exports = { PasswordManager };