## Diagnóstico
- O push foi bloqueado por expor um segredo: `credenciais.json` (service account do Google). 
- Risco: chave comprometida; o arquivo está versionado e precisa ser removido e as chaves rotacionadas.

## Ações Imediatas
1) Remover `credenciais.json` do repositório e adicionar à `.gitignore` (no repo e em qualquer script de build).
2) Rotacionar a chave da service account no Google Cloud (revogar a atual e emitir uma nova).

## Backend Seguro (já preparado)
- Manter a integração de parceiros via função `/.netlify/functions/partners` que lê credenciais de variável de ambiente.
- Variáveis:
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON`: conteúdo JSON completo (ou Base64 do JSON).
  - Opcional: `FIREBASE_CREDENTIALS_PATH` (apenas para dev local; NÃO usar em produção).

## Limpeza de Histórico do Git
- Remover o arquivo de TODO o histórico e reescrever commits:
  - `git rm --cached credenciais.json`
  - `git commit -m "remove credenciais.json do repo"`
  - Usar `git filter-repo` ou BFG para apagar o arquivo do histórico:
    - `git filter-repo --path credenciais.json --invert-paths`
  - Forçar o push (após revisar políticas): `git push --force origin main`
- Alternativa BFG:
  - `bfg --delete-files credenciais.json`
  - `git push --force`

## Configurar Ambiente no Host
- No Netlify (ou provedor): adicionar `GOOGLE_APPLICATION_CREDENTIALS_JSON` com o JSON da nova chave.
- Confirmar que a função partners retorna da coleção `patern-servers` com `serverIcon` e `serverName`.

## Verificação
- Rodar o site e conferir:
  - Seção “Servidores Parceiros”: vitrine animada com ícones/nomes vindo do Firestore.
  - Nenhum segredo no bundle do cliente (HTML/JS não contém credenciais).
  - Push liberado sem violações.

Posso executar a remoção do arquivo, adicionar `.gitignore`, e preparar os comandos de limpeza do histórico. Em seguida, você rotaciona a chave no GCP e me informa quando a nova estiver pronta para configurar a variável de ambiente.