# Memória do Projeto

## Regras para AIs que trabalham no projeto

1. Nome do AI: GitHub Copilot / assistente de desenvolvimento
   - Função: assistente de desenvolvimento e manutenção do projeto.
   - Deve registrar o que fez no projeto, incluindo mudanças de código, builds e diagnósticos.
   - Deve evitar alterar o projeto se o usuário pedir para não mexer, a menos que seja autorizado explicitamente.
   - Deve manter respostas curtas, objetivas e em português, salvo solicitação de outro idioma.

2. Procedimentos de escrita e revisão
   - Usar a pasta do workspace atual para criar ou editar arquivos.
   - Ao editar, seguir as instruções de formatação e substituir texto com contexto suficiente.
   - Ao criar arquivos, usar nomes exatos conforme pedido do usuário.
   - Quando fizer builds ou verificações, registrar o resultado e os caminhos dos artefatos.

3. Controle de mudanças
   - Registrar cada sessão numerada com incrementos sequenciais.
   - Incluir o que foi feito: diagnóstico, ajustes, builds, verificações e resultados.
   - Anotar problemas conhecidos e o estado atual da solução.

## Sessões registradas

### Sessão 1
- Iniciei análise do projeto `milkurtz-browser` no workspace.
- Verifiquei arquivos principais: `package.json`, `src/main.js`, `src/preload.js`, `src/renderer/app.js`, `src/renderer/index.html`, `src/security/password.js`, `src/storage/store.js`, `src/updates/updater.js`.
- Identifiquei arquitetura Electron, segurança de `contextIsolation`, e uso de `webview` com perfil persistente.

### Sessão 2
- Detectei problemas de layout no renderer e barra duplicada.
- Ajustei `src/main.js` para usar `frame: false` no `BrowserWindow` e corrigi CSS em `src/renderer/styles.css` para permitir `html, body, #app` com altura total.
- Expliquei o impacto e preparei para testar a correção.

### Sessão 3
- Executei o build com `npm run build`.
- O instalador gerado foi `release/milkurtz-1.0.0-setup.exe` e o executável empacotado foi `release/win-unpacked/Milkurtz.exe`.

### Sessão 4
- Usuário relatou bloqueio do Windows Smart App Control após instalação.
- Verifiquei assinaturas com `Get-AuthenticodeSignature` e confirmei que os binários não estavam assinados.
- Constatei que o bloqueio foi causado por falta de assinatura ou assinatura não confiável.

### Sessão 5
- Ajustei `package.json` para `nsis.runAfterFinish: false` para evitar auto-launch após instalação.
- Rebuild feito com sucesso.
- Confirmado instalador em `release/`.

### Sessão 6 (reconstrução)
- A pasta do projeto foi perdida; reconstruí o navegador do zero em `Documents/Milkurtz Browser` com base na arquitetura documentada.
- Estrutura recriada: `src/main.js`, `src/preload.js`, `src/renderer/`, `src/storage/`, `src/security/`, `src/updates/`, `docs/`, `scripts/`, `assets/`.
- Funcionalidades: abas com webview persistente, página inicial customizada, favoritos/histórico/downloads, proteção por senha, temas, motor de pesquisa configurável.
- Próximos passos: assinar binários ou desativar SAC para instalação limpa; implementar fluxo completo de atualizações automáticas.

### Sessão 7
- Corrigi o botão de favoritar: adicionada uma estrela na barra de endereço (`#bookmark-toggle`) que salva/remove a página atual (`bookmarks:add` antes era código morto).
- Deduplicação de histórico por URL em `src/storage/store.js`; ids passaram a ser únicos mesmo no mesmo milissegundo.
- Substituído `window.prompt()` (não suportado pelo Electron) por um modal no tema do app para desativar a senha.
- Ajustes em `src/renderer/index.html` e `src/renderer/styles.css` (modal, botão de favoritar).
- Corrigi `will-navigate` em `src/main.js`: comparava `'file://' + path.join(...)` (barras invertidas no Windows) e bloqueava navegação legítima; agora usa `pathToFileURL(...).href` normalizado.
- Removi o `allowpopups` (atributo booleano: qualquer valor ativa popups) e o evento depreciado `new-window` do webview; `window.open` passou a ser negado globalmente via `web-contents-created` + `setWindowOpenHandler` no `main.js`.
- Versão unificada: `package.json` é a fonte única (`app.getVersion()` passado ao `Updater`); removido `version` do `version.json`, que agora só tem feed e changelog (com aviso em `console.warn` se o campo reaparecer divergente).
- Endureci o IPC do perfil: `app:getState` só devolve favoritos/histórico/downloads depois do desbloqueio (o renderer recarrega o estado com `applyAppState` ao desbloquear); `downloads:openPath` exige desbloqueio e só aceita caminhos da lista de downloads.
- Adicionado modal no tema do app para **alterar a senha** (`#password-modal`, `promptChangePassword`): valida senha atual (via `password:set`) e confirmação da nova.
- Corrigido estado da UI de segurança: novo campo `hasPassword` (de `passwordManager.hasPassword()`) separa "tem senha" de "está bloqueado"; antes `state.locked` era usado para os dois e o painel mostrava "Ativar proteção" mesmo com senha definida.
- Verificação: `node --check` sem erros em `app.js`, `store.js`, `main.js`, `preload.js` e `updater.js`; `version.json` válido.
- Pendente: testar a interface no Electron (`npm start`).

### Sessão 8
- Build do instalador Windows feito a partir do Linux: instalados `wine` e `wine32:i386` (multiarch i386) e recriado o prefixo `~/.wine`, que estava corrompido em modo wow64.
- Artefato: `release/milkurtz-1.0.0-setup.exe` (78.779.258 bytes) + `latest.yml` + `.blockmap`.
- Publicado como assets do release `v1.0.0` no GitHub (assets antigos removidos e substituídos). O `latest.yml` publicado confere com o local (sha512 idêntico).
- Verificação: `releases/latest/download/latest.yml` responde com `version: 1.0.0`.
- Observação: mantendo a versão 1.0.0, o updater **não** propaga esta correção para quem já tem 1.0.0 (versão igual). Para atualização automática é preciso subir para 1.0.1.

## Problemas conhecidos
- Binários sem assinatura podem ser bloqueados pelo Smart App Control.
- `webviewTag: true` exige cuidado extra de segurança.
- `update:*` não exigem desbloqueio (não expõem dados do perfil).