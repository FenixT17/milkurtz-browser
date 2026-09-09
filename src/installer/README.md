# Instalador

O Milkurtz Browser usa `electron-builder` com alvo NSIS.

## Build

```bash
npm install
npm run build
```

Resultado em `release/`:
- `milkurtz-<versão>-setup.exe` — instalador NSIS
- `win-unpacked/` — versão portátil descompactada

## Configuração do instalador

Definida em `package.json` → `build.nsis`:
- `oneClick: false` — assistente com opção de escolher o diretório
- `createDesktopShortcut: true` — atalho no desktop
- `createStartMenuShortcut: true` — atalho no menu iniciar
- `perMachine: true` — instalação para todos os usuários
- `runAfterFinish: true` — abre o navegador ao terminar a instalação

## Smart App Control

Binários não assinados podem ser bloqueados pelo Windows Smart App Control.
Opções:
1. Assinar os binários com um certificado de assinatura de código.
2. Desativar o SAC (apenas em máquinas de desenvolvimento) com `scripts/disable-sac.ps1`.