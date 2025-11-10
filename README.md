# Dumblo Site

Landing page estática do bot de RPG Dumblo.

## Preview local
- Requisitos: Python 3 instalado.
- Comando: `python -m http.server 8000`
- Acesse: `http://localhost:8000/`

## Estrutura
- `index.html` — Home (Hero, Sobre, Roadmap, FAQ)
- `comandos.html` — Lista de comandos do bot
- `styles.css` — Estilos globais com tema laranja
- `scripts.js` — Links dinâmicos (convite/suporte) e animações
- `dumblo-logo.png` — Logo utilizada no site

## Deploy no Netlify
Há um arquivo `netlify.toml` com configuração pronta (headers de segurança e cache).

Opção 1 — Conectar com GitHub:
1. No Netlify, crie um novo site “Import from Git”.
2. Selecione este repositório e a branch `main`.
3. Build command: deixe em branco (site estático). Publish directory: `.` (raiz).
4. Deploy automático a cada push.

Opção 2 — CLI (local):
```bash
npm i -g netlify-cli
netlify login
netlify init    # escolha criar um novo site ou vincular a um existente
netlify deploy --prod --dir .
```

## Deploy no GitHub Pages (alternativo)
O repositório também inclui um workflow (`.github/workflows/deploy-pages.yml`) para publicar no GitHub Pages, caso prefira.

## Subir para o GitHub
```bash
git init
git add .
git commit -m "chore: initial public release"
git branch -M main
git remote add origin https://github.com/<seu-usuario>/<seu-repo>.git
git push -u origin main
```

## Personalização rápida
- Troque textos e CTAs em `index.html` e `comandos.html`.
- Ajuste cores e animações em `styles.css`.
- Links de convite/suporte são gerados por `scripts.js`.

## Licença
Código licenciado sob MIT (veja `LICENSE`). A marca e o arquivo `dumblo-logo.png` não fazem parte da licença e não devem ser reutilizados sem permissão.

## Contribuição
Leia `CONTRIBUTING.md` para abrir issues e PRs.
Respeite o `CODE_OF_CONDUCT.md`.

## Segurança
Consulte `SECURITY.md` para reportar vulnerabilidades de forma responsável.
