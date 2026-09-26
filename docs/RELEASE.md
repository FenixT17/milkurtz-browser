# Notas de release — Milkurtz Browser

## v1.0.0

### Novo
- Navegador Electron com abas e sessão persistente.
- Página inicial customizada (`milkurtz://home`) com links rápidos e frase motivacional.
- Barra de endereço com pesquisa automática (DuckDuckGo, Google, Bing, Brave, Ecosia).
- Favoritos, histórico e downloads salvos no perfil local.
- Painel de configurações: tema (Milkurtz/Escuro/Claro), motor de pesquisa, frase motivacional.
- Proteção por senha local (scrypt + safeStorage/DPAPI).
- Barra de título customizada (janela sem moldura nativa).
- Instalador NSIS (oneClick desativado, diretório configurável).
- Base do sistema de atualizações via `version.json`.

### Conhecido
- `webviewTag` é funcional, porém menos seguro que alternativas sem webview; uso controlado.
- O histórico deduplica por URL: visitas repetidas sobem para o topo em vez de gerar entradas duplicadas.
- A desativação da senha usa um modal no tema do app (`window.prompt()` não é suportado pelo Electron).

## Build

```bash
npm install
npm run build        # gera release/win-unpacked e o instalador
npm start            # roda em desenvolvimento
```

O instalador é gerado em `release/milkurtz-<versão>-setup.exe`.