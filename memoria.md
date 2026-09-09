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

## Problemas conhecidos
- Binários sem assinatura podem ser bloqueados pelo Smart App Control.
- `webviewTag: true` exige cuidado extra de segurança.
- A desativação da senha usa `window.prompt()` (melhorar UX no futuro).