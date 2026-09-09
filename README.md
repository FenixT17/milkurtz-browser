# Milkurtz Browser

Navegador web focado em usuários de língua portuguesa, com sistema de instalação e atualizações automáticas.

## Funcionalidades

- Abas com sessão persistente (`persist:milkurtz`)
- Página inicial customizada (`milkurtz://home`) com links rápidos
- Barra de endereço com pesquisa automática (DuckDuckGo, Google, Bing, Brave, Ecosia)
- Favoritos, histórico e downloads no perfil local
- Proteção por senha (scrypt + criptografia do sistema)
- Temas: Milkurtz (roxo), Escuro e Claro
- Barra de título customizada (janela sem moldura nativa)
- Base para atualizações automáticas via `version.json`

## Requisitos

- Node.js 18+
- Windows 10/11

## Desenvolvimento

```bash
npm install
npm start          # roda o navegador em modo desenvolvimento
npm run dev        # mesmo que npm start (com flag --dev)
```

## Build / instalação

```bash
npm run build
```

O instalador é gerado em `release/milkurtz-<versão>-setup.exe`.

> Se o Windows Smart App Control bloquear a instalação de binários não assinados,
> veja `src/installer/README.md` para as opções (assinatura ou `scripts/disable-sac.ps1`).

## Estrutura

```
src/
  main.js          Processo principal (janela, IPC, downloads, navegação)
  preload.js       APIs seguras para o renderer
  renderer/        Interface (index.html, styles.css, app.js)
  storage/         Armazenamento local (store.js)
  security/        Proteção por senha (password.js)
  updates/         Atualizações (updater.js)
  installer/       Notas do instalador
docs/              Arquitetura e release
scripts/           Utilitários (SAC, certificado de assinatura)
```

Veja `docs/ARCHITECTURE.md` para detalhes de arquitetura e `docs/RELEASE.md` para notas de release.