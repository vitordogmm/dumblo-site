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

## Deploy no GitHub Pages
O repositório inclui um workflow (`.github/workflows/deploy-pages.yml`) para publicar no GitHub Pages.

Passos:
1. Faça push para a branch `main` no GitHub.
2. Acesse Settings → Pages e selecione “GitHub Actions” como fonte.
3. O deploy será feito automaticamente a cada push; a URL será `https://<usuario>.github.io/<repo>/`.
4. Se usar domínio próprio, configure o CNAME em Settings → Pages e ajuste o DNS.

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
