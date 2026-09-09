'use strict';

const api = window.milkurtz;

const state = {
  tabs: [],
  activeTabId: null,
  locked: false,
  settings: {
    theme: 'milkurtz',
    searchEngine: 'duckduckgo',
    homepage: 'milkurtz://home',
    showMotivation: true
  },
  bookmarks: [],
  history: [],
  downloads: [],
  version: '0.0.0'
};

const MOTIVATIONS = [
  'A internet é sua — navegue com propósito.',
  'Cada aba é uma nova ideia esperando para acontecer.',
  'Velocidade e foco, do seu jeito.',
  'O mundo cabe na sua barra de endereço.'
];

const updateState = {
  current: '0.0.0',
  updateUrl: '',
  changelog: '',
  checking: false,
  available: null,
  downloading: false,
  progress: 0,
  downloaded: false
};

const SEARCH_ENGINES = {
  duckduckgo: 'https://duckduckgo.com/?q=',
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
  brave: 'https://search.brave.com/search?q=',
  ecosia: 'https://www.ecosia.org/search?q='
};

// ---------- Elementos ----------
const els = {
  lockScreen: document.getElementById('lock-screen'),
  lockForm: document.getElementById('lock-form'),
  lockPassword: document.getElementById('lock-password'),
  lockError: document.getElementById('lock-error'),
  tabs: document.getElementById('tabs'),
  newTab: document.getElementById('new-tab'),
  addressForm: document.getElementById('address-form'),
  addressInput: document.getElementById('address-input'),
  homePage: document.getElementById('home-page'),
  webviewHost: document.getElementById('webview-host'),
  homeMotto: document.getElementById('home-motto'),
  sidePanel: document.getElementById('side-panel'),
  panelTitle: document.getElementById('panel-title'),
  panelContent: document.getElementById('panel-content')
};

// ---------- Helpers ----------
function normalizeUrl(input) {
  const value = input.trim();
  if (!value) return 'milkurtz://home';
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return `https://${value}`;
  const engine = SEARCH_ENGINES[state.settings?.searchEngine] || SEARCH_ENGINES.duckduckgo;
  return `${engine}${encodeURIComponent(value)}`;
}

function isHome(url) {
  return !url || url === 'milkurtz://home';
}

function showHome() {
  els.webviewHost.classList.add('hidden');
  els.homePage.classList.remove('hidden');
  if (state.settings.showMotivation) {
    els.homeMotto.textContent = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
    els.homeMotto.classList.remove('hidden');
  } else {
    els.homeMotto.classList.add('hidden');
  }
}

function showWebview() {
  els.homePage.classList.add('hidden');
  els.webviewHost.classList.remove('hidden');
}

function createWebview(url) {
  const webview = document.createElement('webview');
  webview.className = 'webview';
  webview.setAttribute('src', url === 'milkurtz://home' ? '' : url);
  webview.setAttribute('partition', 'persist:milkurtz');
  webview.setAttribute('allowpopups', 'false');
  webview.setAttribute('webpreferences', 'contextIsolation=yes, nodeIntegration=no');
  els.webviewHost.appendChild(webview);
  return webview;
}

// ---------- Abas ----------
function renderTabs() {
  els.tabs.innerHTML = '';
  for (const tab of state.tabs) {
    const el = document.createElement('button');
    el.className = 'tab' + (tab.id === state.activeTabId ? ' active' : '');
    el.dataset.tabId = tab.id;

    const title = document.createElement('span');
    title.className = 'tab-title';
    title.textContent = tab.title;

    const close = document.createElement('span');
    close.className = 'tab-close';
    close.textContent = '×';
    close.title = 'Fechar aba';
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });

    el.appendChild(title);
    el.appendChild(close);
    el.addEventListener('click', () => activateTab(tab.id));
    els.tabs.appendChild(el);
  }
}

function addTab(url, { activate = true } = {}) {
  const tab = {
    id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
    title: 'Nova aba',
    url: url || state.settings.homepage || 'milkurtz://home',
    webview: null
  };
  state.tabs.push(tab);
  renderTabs();
  if (activate) activateTab(tab.id);
  return tab;
}

function activateTab(id) {
  const tab = state.tabs.find((t) => t.id === id);
  if (!tab) return;
  state.activeTabId = id;
  renderTabs();

  if (isHome(tab.url)) {
    showHome();
  } else {
    showWebview();
    if (!tab.webview || !tab.webview.isConnected) {
      tab.webview = createWebview(tab.url);
      wireWebview(tab);
    }
    for (const t of state.tabs) {
      if (t.webview && t.webview.isConnected) t.webview.style.display = t.id === id ? 'flex' : 'none';
    }
  }
  els.addressInput.value = isHome(tab.url) ? '' : tab.url;
}

function closeTab(id) {
  const idx = state.tabs.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const [tab] = state.tabs.splice(idx, 1);
  if (tab.webview && tab.webview.isConnected) tab.webview.remove();
  if (state.tabs.length === 0) {
    addTab();
  } else if (state.activeTabId === id) {
    const next = state.tabs[Math.min(idx, state.tabs.length - 1)];
    activateTab(next.id);
  } else {
    renderTabs();
  }
}

function wireWebview(tab) {
  if (!tab.webview) return;
  tab.webview.addEventListener('page-title-updated', (e) => {
    tab.title = e.title || tab.url;
    if (tab.id === state.activeTabId) renderTabs();
  });
  tab.webview.addEventListener('did-start-loading', () => {
    els.addressInput.value = tab.webview.getURL();
  });
  tab.webview.addEventListener('did-stop-loading', () => {
    const url = tab.webview.getURL();
    if (url) {
      tab.url = url;
      els.addressInput.value = url;
      recordHistory(tab);
    }
  });
  tab.webview.addEventListener('did-navigate', (e) => {
    tab.url = e.url;
    tab.title = tab.title || e.url;
    els.addressInput.value = e.url;
    recordHistory(tab);
  });
  tab.webview.addEventListener('did-navigate-in-page', (e) => {
    tab.url = e.url;
    els.addressInput.value = e.url;
  });
  tab.webview.addEventListener('new-window', (e) => {
    e.preventDefault();
  });
  tab.webview.addEventListener('dom-ready', () => {
    recordHistory(tab);
  });
}

function recordHistory(tab) {
  const url = tab && tab.url ? tab.url : (tab.webview ? tab.webview.getURL() : '');
  if (!url || isHome(url)) return;
  api.history.add(tab.title || url, url).then((history) => {
    state.history = history;
  }).catch(() => {});
}

// ---------- Navegação ----------
function activeWebview() {
  const tab = state.tabs.find((t) => t.id === state.activeTabId);
  return tab && tab.webview && tab.webview.isConnected ? tab.webview : null;
}

function navigate(url) {
  const tab = state.tabs.find((t) => t.id === state.activeTabId);
  if (!tab) return;
  tab.url = url;
  if (isHome(url)) {
    showHome();
    if (tab.webview && tab.webview.isConnected) tab.webview.remove();
    tab.webview = null;
  } else {
    showWebview();
    if (!tab.webview || !tab.webview.isConnected) {
      tab.webview = createWebview(url);
      wireWebview(tab);
    } else {
      tab.webview.loadURL(url);
    }
  }
  els.addressInput.value = isHome(url) ? '' : url;
  renderTabs();
}

// ---------- Painéis ----------
let currentPanel = null;

function closePanel() {
  currentPanel = null;
  els.sidePanel.classList.add('hidden');
}

function openPanel(name) {
  currentPanel = name;
  const titles = {
    bookmarks: 'Favoritos',
    history: 'Histórico',
    downloads: 'Downloads',
    settings: 'Configurações'
  };
  els.panelTitle.textContent = titles[name] || 'Painel';
  renderPanel();
  els.sidePanel.classList.remove('hidden');
}

function renderPanel() {
  if (currentPanel === 'bookmarks') return renderBookmarks();
  if (currentPanel === 'history') return renderHistory();
  if (currentPanel === 'downloads') return renderDownloads();
  if (currentPanel === 'settings') return renderSettings();
}

function renderBookmarks() {
  if (!state.bookmarks.length) {
    els.panelContent.innerHTML = '<div class="empty-state">Nenhum favorito ainda. Clique na estrela para salvar a página atual.</div>';
    return;
  }
  els.panelContent.innerHTML = `
    <div class="panel-list">
      ${state.bookmarks.map((b) => `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(b.title)}</strong>
            <small>${escapeHtml(b.url)}</small>
          </div>
          <div class="list-actions">
            <button class="address-action" data-open-bookmark="${b.id}" title="Abrir">&#x2197;</button>
            <button class="danger-button" data-remove-bookmark="${b.id}">Remover</button>
          </div>
        </div>`).join('')}
    </div>`;
  els.panelContent.querySelectorAll('[data-open-bookmark]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const b = state.bookmarks.find((x) => x.id === btn.dataset.openBookmark);
      if (b) {
        navigate(b.url);
        closePanel();
      }
    });
  });
  els.panelContent.querySelectorAll('[data-remove-bookmark]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.bookmarks = await api.bookmarks.remove(btn.dataset.removeBookmark);
      renderPanel();
    });
  });
}

function renderHistory() {
  if (!state.history.length) {
    els.panelContent.innerHTML = '<div class="empty-state">Nenhum histórico ainda. Suas visitas aparecerão aqui.</div>';
    return;
  }
  els.panelContent.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
      <button class="danger-button" id="clear-history">Limpar histórico</button>
    </div>
    <div class="panel-list">
      ${state.history.map((h) => `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(h.title)}</strong>
            <small>${escapeHtml(h.url)}</small>
          </div>
          <div class="list-actions">
            <button class="address-action" data-open-history="${h.id}" title="Abrir">&#x2197;</button>
            <button class="danger-button" data-remove-history="${h.id}">Remover</button>
          </div>
        </div>`).join('')}
    </div>`;
  document.getElementById('clear-history').addEventListener('click', async () => {
    state.history = await api.history.clear();
    renderPanel();
  });
  els.panelContent.querySelectorAll('[data-open-history]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const h = state.history.find((x) => x.id === btn.dataset.openHistory);
      if (h) {
        navigate(h.url);
        closePanel();
      }
    });
  });
  els.panelContent.querySelectorAll('[data-remove-history]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.history = await api.history.remove(btn.dataset.removeHistory);
      renderPanel();
    });
  });
}

function renderDownloads() {
  if (!state.downloads.length) {
    els.panelContent.innerHTML = '<div class="empty-state">Nenhum download ainda. Arquivos baixados aparecerão aqui.</div>';
    return;
  }
  els.panelContent.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
      <button class="danger-button" id="clear-downloads">Limpar lista</button>
    </div>
    <div class="panel-list">
      ${state.downloads.map((d) => `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(d.filename)}</strong>
            <small>${d.state === 'completed' ? 'Concluído' : d.state} · ${formatBytes(d.totalBytes)}</small>
          </div>
          <div class="list-actions">
            <button class="address-action" data-open-download="${d.id}" title="Mostrar na pasta">&#x1F5C2;</button>
            <button class="danger-button" data-remove-download="${d.id}">Remover</button>
          </div>
        </div>`).join('')}
    </div>`;
  document.getElementById('clear-downloads').addEventListener('click', async () => {
    state.downloads = await api.downloads.clear();
    renderPanel();
  });
  els.panelContent.querySelectorAll('[data-open-download]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const d = state.downloads.find((x) => x.id === btn.dataset.openDownload);
      if (d && d.path) api.downloads.openPath(d.path);
    });
  });
  els.panelContent.querySelectorAll('[data-remove-download]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.downloads = await api.downloads.remove(btn.dataset.removeDownload);
      renderPanel();
    });
  });
}

function renderSettings() {
  els.panelContent.innerHTML = `
    <nav class="settings-nav">
      <button class="settings-nav-item active" data-settings-tab="general">Geral</button>
      <button class="settings-nav-item" data-settings-tab="appearance">Aparência</button>
      <button class="settings-nav-item" data-settings-tab="security">Segurança</button>
      <button class="settings-nav-item" data-settings-tab="updates">Atualizações</button>
    </nav>
    <div id="settings-body"></div>`;
  els.panelContent.querySelectorAll('[data-settings-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      els.panelContent.querySelectorAll('[data-settings-tab]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderSettingsTab(btn.dataset.settingsTab);
    });
  });
  renderSettingsTab('general');
}

function renderSettingsTab(tabName) {
  const body = document.getElementById('settings-body');
  if (!body) return;

  const sections = {
    general: `
      <div class="setting-section">
        <h3>Preferências gerais</h3>
        <p>Escolha como o Milkurtz se comporta no dia a dia.</p>
        <div class="setting-row">
          <div><strong>Motor de pesquisa</strong><small>Use o DuckDuckGo, Google, Bing, Brave ou Ecosia na barra de endereço.</small></div>
          <select id="search-engine" class="text-input" style="width:auto;">
            ${Object.keys(SEARCH_ENGINES).map((e) => `<option value="${e}" ${state.settings.searchEngine === e ? 'selected' : ''}>${e[0].toUpperCase() + e.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="setting-row">
          <div><strong>Mostrar frase na página inicial</strong><small>Uma pequena inspiração a cada nova aba.</small></div>
          <button class="toggle ${state.settings.showMotivation ? 'on' : ''}" data-toggle-setting="showMotivation" aria-label="Alternar frase"></button>
        </div>
      </div>`,
    appearance: `
      <div class="setting-section">
        <h3>Uma aparência que combina com você</h3>
        <p>As alterações são salvas automaticamente e continuam após atualizações.</p>
        <div class="theme-grid">
          ${[['milkurtz', 'Milkurtz', 'Roxo e moderno'], ['dark', 'Escuro', 'Preto e confortável'], ['light', 'Claro', 'Branco e limpo']]
            .map(([id, name, description]) => `
              <button class="theme-option ${state.settings.theme === id ? 'active' : ''}" data-theme-choice="${id}">
                <div class="theme-preview ${id}"></div>
                <strong>${name}</strong>
                <span>${description}</span>
              </button>`).join('')}
        </div>
      </div>`,
    security: `
      <div class="setting-section">
        <h3>Proteção do navegador</h3>
        <p>Sua senha fica no perfil local. Ela nunca é salva em texto puro e continua após atualizações.</p>
        ${state.locked ? `
          <div class="setting-row">
            <div><strong>Senha do navegador ativa</strong><small>O navegador pedirá sua senha ao abrir.</small></div>
            <button class="danger-button" data-security-action="disable">Desativar</button>
          </div>` : `
          <form id="password-form" class="stack-form">
            <label for="new-password">Nova senha</label>
            <input id="new-password" type="password" class="text-input" minlength="4">
            <label for="confirm-password">Confirmar senha</label>
            <input id="confirm-password" type="password" class="text-input" minlength="4">
            <button class="primary-button" type="submit">Ativar proteção</button>
            <p id="password-error" class="form-error"></p>
          </form>`}
      </div>`
  };

  body.innerHTML = sections[tabName] || '';

  // Eventos: geral
  const engineSelect = document.getElementById('search-engine');
  if (engineSelect) {
    engineSelect.addEventListener('change', () => {
      api.settings.set('searchEngine', engineSelect.value).then((s) => { state.settings = s; });
    });
  }
  const toggle = document.querySelector('[data-toggle-setting]');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = !state.settings.showMotivation;
      toggle.classList.toggle('on', next);
      api.settings.set('showMotivation', next).then((s) => { state.settings = s; });
    });
  }

  // Eventos: aparência
  els.panelContent.querySelectorAll('[data-theme-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      api.settings.set('theme', btn.dataset.themeChoice).then((s) => {
        state.settings = s;
        applyTheme(s.theme);
        renderSettingsTab('appearance');
      });
    });
  });

  // Atualizações
  if (tabName === 'updates') {
    renderUpdatesTab();
  }

  // Eventos: segurança
  const passwordForm = document.getElementById('password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const next = document.getElementById('new-password').value;
      const confirm = document.getElementById('confirm-password').value;
      const errorEl = document.getElementById('password-error');
      if (next !== confirm) {
        errorEl.textContent = 'As senhas não coincidem.';
        return;
      }
      try {
        await api.password.set('', next);
        state.locked = true;
        renderSettingsTab('security');
      } catch (err) {
        errorEl.textContent = err.message || 'Erro ao ativar proteção.';
      }
    });
  }
  const disableBtn = document.querySelector('[data-security-action="disable"]');
  if (disableBtn) {
    disableBtn.addEventListener('click', async () => {
      const current = window.prompt('Digite sua senha atual para desativar a proteção:');
      if (current == null) return;
      try {
        await api.password.disable(current);
        state.locked = false;
        renderSettingsTab('security');
      } catch (err) {
        alert(err.message || 'Senha incorreta.');
      }
    });
  }
}

function renderUpdatesTab() {
  const body = document.getElementById('settings-body');
  if (!body) return;

  const statusText = () => {
    if (updateState.downloading) return `Baixando... ${updateState.progress}%`;
    if (updateState.downloaded) return 'Download concluído. Pronto para instalar.';
    if (updateState.available) return `Atualização ${updateState.available.version} disponível!`;
    if (updateState.checking) return 'Verificando...';
    if (updateState.available === null) return 'Verifique se há uma nova versão disponível.';
    return 'Você está usando a versão mais recente.';
  };

  const canDownload = updateState.available && !updateState.downloading && !updateState.downloaded;
  const canInstall = updateState.downloaded;
  const canCheck = !updateState.checking && !updateState.downloading;

  body.innerHTML = `
    <div class="setting-section">
      <h3>Atualizações automáticas</h3>
      <p>O Milkurtz verifica novas versões no servidor de atualizações e baixa a instalação em segundo plano.</p>
      <div class="setting-row">
        <div><strong>Versão atual</strong><small>${escapeHtml(updateState.current)}</small></div>
      </div>
      <div class="setting-row">
        <div><strong>Status</strong><small>${escapeHtml(statusText())}</small></div>
      </div>
      ${updateState.progress > 0 && updateState.downloading ? `
        <div style="height:8px;background:var(--surface);border-radius:99px;overflow:hidden;margin:10px 0;">
          <div style="height:100%;width:${updateState.progress}%;background:var(--accent);transition:width .3s;"></div>
        </div>` : ''}
      ${updateState.available && !updateState.downloaded ? `
        <div style="margin-top:14px;">
          <p style="color:var(--muted);font-size:12px;line-height:1.6;">${escapeHtml(updateState.available.releaseDate ? 'Lançada em ' + new Date(updateState.available.releaseDate).toLocaleDateString('pt-BR') : '')}</p>
        </div>` : ''}
      <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;">
        ${canCheck ? '<button class="primary-button" id="update-check">Verificar atualizações</button>' : ''}
        ${canDownload ? '<button class="primary-button" id="update-download">Baixar atualização</button>' : ''}
        ${canInstall ? '<button class="primary-button" id="update-install">Instalar e reiniciar</button>' : ''}
      </div>
      <p id="update-message" class="form-error"></p>
    </div>`;

  const msg = document.getElementById('update-message');
  const btnCheck = document.getElementById('update-check');
  const btnDownload = document.getElementById('update-download');
  const btnInstall = document.getElementById('update-install');

  if (btnCheck) {
    btnCheck.addEventListener('click', async () => {
      updateState.checking = true;
      renderUpdatesTab();
      const res = await api.update.check();
      updateState.checking = false;
      if (res.status === 'error' && msg) msg.textContent = res.message || 'Erro ao verificar atualizações.';
      if (res.status === 'no-feed' && msg) msg.textContent = res.message || 'Nenhum servidor configurado.';
      renderUpdatesTab();
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', async () => {
      updateState.downloading = true;
      renderUpdatesTab();
      const res = await api.update.download();
      if (res.status === 'error' && msg) msg.textContent = res.message || 'Erro ao baixar atualização.';
    });
  }

  if (btnInstall) {
    btnInstall.addEventListener('click', () => api.update.install());
  }
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  const root = document.documentElement;
  if (theme === 'light') {
    root.style.setProperty('--bg', '#f4f2f9');
    root.style.setProperty('--panel', '#ffffff');
    root.style.setProperty('--panel-2', '#f0eef5');
    root.style.setProperty('--surface', '#ffffff');
    root.style.setProperty('--surface-hover', '#e9e6f0');
    root.style.setProperty('--text', '#1c1926');
    root.style.setProperty('--muted', '#6b6478');
    root.style.setProperty('--line', 'rgba(20, 16, 40, .12)');
  } else if (theme === 'dark') {
    root.style.setProperty('--bg', '#080808');
    root.style.setProperty('--panel', '#101010');
    root.style.setProperty('--panel-2', '#181818');
    root.style.setProperty('--surface', '#1e1e1e');
    root.style.setProperty('--surface-hover', '#2a2a2a');
    root.style.setProperty('--text', '#f2f2f2');
    root.style.setProperty('--muted', '#9c9c9c');
    root.style.setProperty('--line', 'rgba(255,255,255,.09)');
  } else {
    root.style.setProperty('--bg', '#0b0a12');
    root.style.setProperty('--panel', '#12101c');
    root.style.setProperty('--panel-2', '#191625');
    root.style.setProperty('--surface', '#211d30');
    root.style.setProperty('--surface-hover', '#2c2640');
    root.style.setProperty('--text', '#f5f2fc');
    root.style.setProperty('--muted', '#a9a2b9');
    root.style.setProperty('--line', 'rgba(255,255,255,.09)');
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}

// ---------- Inicialização ----------
async function init() {
  const appState = await api.app.getState();
  state.locked = appState.locked;
  state.settings = { ...state.settings, ...appState.settings };
  state.bookmarks = appState.bookmarks || [];
  state.history = appState.history || [];
  state.downloads = appState.downloads || [];
  state.version = appState.version;

  applyTheme(state.settings.theme);

  api.app.onDownloadChanged((record) => {
    state.downloads.unshift(record);
    if (currentPanel === 'downloads') renderPanel();
  });

  // Eventos de atualização
  const updateInfo = await api.update.getInfo();
  updateState.current = updateInfo.current || '0.0.0';
  updateState.updateUrl = updateInfo.updateUrl || '';
  updateState.changelog = updateInfo.changelog || '';

  api.update.onChecking(() => { updateState.checking = true; });
  api.update.onAvailable((info) => {
    updateState.available = info;
    updateState.checking = false;
    updateState.downloading = false;
    if (currentPanel === 'settings') renderPanel();
  });
  api.update.onNotAvailable(() => {
    updateState.available = null;
    updateState.checking = false;
    updateState.downloaded = false;
    if (currentPanel === 'settings') renderPanel();
  });
  api.update.onError((err) => {
    updateState.checking = false;
    updateState.downloading = false;
    if (currentPanel === 'settings') renderPanel();
  });
  api.update.onProgress((p) => {
    updateState.progress = p.percent || 0;
    if (currentPanel === 'settings') renderUpdatesTab();
  });
  api.update.onDownloaded((info) => {
    updateState.downloading = false;
    updateState.downloaded = true;
    updateState.available = info;
    if (currentPanel === 'settings') renderPanel();
  });

  if (state.locked) {
    els.lockScreen.classList.remove('hidden');
  } else {
    startBrowser();
  }
}

function startBrowser() {
  els.lockScreen.classList.add('hidden');
  addTab();
  wireEvents();
}

function wireEvents() {
  // Controles de janela
  document.querySelectorAll('[data-window-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.windowAction;
      if (action === 'minimize') api.window.minimize();
      else if (action === 'maximize') api.window.maximize();
      else if (action === 'close') api.window.close();
    });
  });

  // Nova aba
  els.newTab.addEventListener('click', () => addTab());

  // Barra de endereço
  els.addressForm.addEventListener('submit', (e) => {
    e.preventDefault();
    navigate(normalizeUrl(els.addressInput.value));
  });

  // Navegação
  document.querySelectorAll('[data-nav-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wv = activeWebview();
      const action = btn.dataset.navAction;
      if (action === 'back' && wv) wv.goBack();
      else if (action === 'forward' && wv) wv.goForward();
      else if (action === 'reload') {
        if (wv) wv.reload();
        else {
          const tab = state.tabs.find((t) => t.id === state.activeTabId);
          if (tab) navigate(tab.url);
        }
      } else if (action === 'home') navigate(state.settings.homepage || 'milkurtz://home');
    });
  });

  // Painéis
  document.querySelectorAll('[data-panel-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.panelAction;
      if (currentPanel === name) closePanel();
      else openPanel(name);
    });
  });
  document.querySelector('[data-panel-close]').addEventListener('click', closePanel);

  // Links rápidos da home
  document.querySelectorAll('[data-quick]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.quick));
  });

  // Atalhos de teclado
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      addTab();
    } else if (e.ctrlKey && e.key === 'w') {
      e.preventDefault();
      closeTab(state.activeTabId);
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      els.addressInput.focus();
      els.addressInput.select();
    } else if (e.key === 'Escape') {
      closePanel();
    }
  });
}

// Tela de bloqueio
els.lockForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = els.lockPassword.value;
  const ok = await api.unlock(password);
  if (ok) {
    els.lockError.textContent = '';
    state.locked = false;
    startBrowser();
  } else {
    els.lockError.textContent = 'Senha incorreta. Tente novamente.';
  }
});

init().catch((err) => {
  console.error('[milkurtz] falha no renderer:', err);
});