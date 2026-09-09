# Arquitetura do Milkurtz Browser

## Visão geral

Navegador web Electron focado em usuários de língua portuguesa, com:
- Sistema de instalação via NSIS (electron-builder)
- Sistema de atualizações automáticas (baseado em `version.json`)
- Perfil local com favoritos, histórico e downloads
- Proteção por senha com criptografia local

## Estrutura

```
src/
  main.js          Processo principal: janela, IPC, downloads, políticas de navegação
  preload.js       contextBridge expondo APIs seguras ao renderer
  renderer/
    index.html     Interface do navegador
    styles.css     Tema (milkurtz / dark / light)
    app.js         Abas, navegação, favoritos, histórico, downloads, configurações
  storage/
    store.js       Armazenamento local (settings, bookmarks, history, downloads)
  security/
    password.js    Proteção por senha (scrypt + safeStorage)
  updates/
    updater.js     Leitura/comparação de version.json
  installer/       Notas sobre instalação
scripts/
  disable-sac.ps1     Desativa o Smart App Control (quando necessário)
  check-sac.ps1       Verifica o estado do Smart App Control
  create-signing-cert.ps1  Cria certificado de assinatura local
```

## Segurança

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- `webviewTag: true` com uso controlado e sessão persistente `persist:milkurtz`
- URLs externas abertas com `shell.openExternal`; `window.open` negado
- Senha local com hash `scrypt` + salt e criptografia adicional via `safeStorage` (DPAPI no Windows)
- Escrita atômica em disco (`.tmp` + rename) para os dados do perfil
- CSP no `index.html` cobrindo requisições web normais

## Dados do perfil

Os dados ficam em `%APPDATA%/milkurtz-browser/user_data/`:
- `data/settings.json` — tema, motor de pesquisa, página inicial, frase motivacional
- `data/bookmarks.json` — favoritos
- `data/history.json` — histórico (máx. 500 entradas)
- `data/downloads.json` — downloads (máx. 200 entradas)
- `password.json` — hash scrypt da senha (quando ativada)

## Página inicial

`milkurtz://home` é uma página customizada com links rápidos e uma frase motivacional
(ajustável nas configurações).

## Atualizações

O `updater.js` lê `version.json` e compara com a versão remota (`compareVersions`).
O fluxo completo (download + instalação do novo pacote) é o próximo passo do roadmap.