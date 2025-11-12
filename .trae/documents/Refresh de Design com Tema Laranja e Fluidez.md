## Objetivos
- Consolidar um design system baseado em laranja, moderno e consistente.
- Tornar a UI mais fluida: tipografia, espaçamento e layouts responsivos.
- Melhorar microinterações, acessibilidade (WCAG AA) e performance.

## Contexto da Base
- Stack estático: `HTML + CSS + JS` sem frameworks.
- Estilos globais em `styles.css` (tokens já existentes em `:root`).
- Páginas: `index.html`, `comandos.html`, `termos.html`, `changelog.html`.
- Scripts: `scripts.js` para interações; sem dependência de cores.

## Design System (Tokens)
- Cores (consolidar e padronizar)
  - Neutros: `--bg`, `--surface`, `--surface-2`, `--text`, `--muted`, `--border-color`.
  - Primários: `--primary` (laranja base), `--primary-2` (laranja claro), `--primary-rgb`.
  - Estado: `--success`, `--warning`, `--error` com variantes `-bg` e `-border` onde necessário.
  - Acento: `--accent` (dourado/âmbar) para detalhes e gradientes.
- Tipografia
  - `--font-sans` (confirmar família atual), escala fluida com `clamp`.
  - Hierarquia consistente para títulos (`.title-xl`, `.title-lg`) e corpo.
- Espaçamento/Raios/Sombras/Glow
  - `--space-1..4`, `--radius-sm/md/lg/xl`, `--shadow`, `--shadow-lg`, `--glow`, `--glow-strong`.
- Gradientes
  - `--grad-primary` e `--grad-surface` para reutilização em botões, badges, sublinhados.

## Fluidez e Responsividade
- Tipografia fluida com `clamp`: base, títulos e subtítulos.
- Containers responsivos: `width: min(100%, 1200px)` com `padding` lateral.
- Substituir larguras fixas por flex/grid e porcentagens; reduzir `position: absolute` onde não essencial.
- Breakpoints claros: `sm/md/lg/xl` com media queries consistentes.

## Componentes
- Navbar/Header
  - Espaçamento, alinhamento e transições do menu mobile; foco visível.
- Botões
  - Variantes: `primary`, `secondary`, `ghost`; estados `hover/active/disabled` com transições.
- Cards
  - Padronizar `padding`, `radius`, `shadow`; hover leve (elevação/tilt sutil).
- Badges/Chips
  - Mapeadas para tokens de estado; contraste garantido.
- Inputs/Modais/Toasts
  - Bordas, foco, `backdrop` com opacidade e blur padronizados; cores via tokens.

## Páginas
- Home (hero, orb, seções)
  - Suavizar gradientes e glow laranja, espaçamento vertical uniforme, sublinhados com `--grad-primary`.
- Comandos
  - Grid mais legível, filtros/chips com estados claros; possível sticky dos filtros.
- Changelog
  - Linha do tempo com melhor ritmo visual; contraste no conteúdo.
- Termos
  - Leiturabilidade: largura de coluna, entrelinhas, cores de texto.

## Acessibilidade
- Contraste AA em botões, textos e estados.
- `:focus-visible` consistente; tamanho alvo mínimo em interativos.
- Respeito a `prefers-reduced-motion` e `prefers-contrast`.

## Performance
- Eliminar CSS não utilizado e duplicações.
- Otimizar sombras/glows para reduzir custo de pintura.
- Comprimir assets e revisar tamanhos de imagens.

## Entregáveis
- Atualização de `styles.css`: nova seção de tokens, gradientes e substituição de cores hardcoded.
- Ajustes pontuais em classes HTML apenas se necessário (mantendo estrutura atual).
- `scripts.js`: sem mudança substancial; apenas hooks para estados se precisarmos.

## Fases de Execução
1. Auditoria e definição de tokens (cores, tipografia, espaçamento, motion).
2. Refactor dos componentes base (botões, cards, navbar, badges/chips).
3. Ajustes por página (home, comandos, changelog, termos) com foco em fluidez.
4. Acessibilidade e microinterações; preferência de movimento.
5. Performance, limpeza de CSS e QA (Lighthouse/contrast).

## Snippets Propostos (referência)
```css
:root {
  --bg: #0b0c0f;
  --surface: #121317;
  --surface-2: #1a1c22;
  --text: #eaeef2;
  --muted: #a6aab3;

  --primary: #ff7a1a;
  --primary-2: #ff9a3d;
  --primary-rgb: 255,122,26;
  --accent: #ffd166;

  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;

  --border-color: rgba(255,255,255,.08);
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow: 0 8px 24px rgba(0,0,0,.3);
  --glow: 0 0 32px rgba(var(--primary-rgb), .25);
  --grad-primary: linear-gradient(180deg, #ff9a3d 0%, #ff7a1a 100%);
}
html { font-size: clamp(14px, 1.5vw, 16px); }
.title-xl { font-size: clamp(32px, 6vw, 64px); line-height: 1.05; }
.container { width: min(100%, 1200px); padding: 0 24px; }
.button { transition: transform .15s ease, box-shadow .15s ease, background .2s ease; }
.button:hover { transform: translateY(-1px); box-shadow: var(--shadow); }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
```

## Validação
- Revisão visual página a página; testes de contraste e Lighthouse.
- Testes de responsividade (320px–1920px) e motion reduzido.

Confirme para iniciar: aplico os tokens em `styles.css`, refatoro componentes e páginas em fases, mantendo o tema laranja como padrão e elevando fluidez e consistência.