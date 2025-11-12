## Objetivos

* Manter a identidade laranja como cor primária e elevar consistência.

* Tornar a UI mais fluida com transições suaves e microinterações leves.

* Padronizar tokens (cores, tipografia, espaçamento, sombras) para fácil manutenção.

* Melhorar responsividade, acessibilidade e performance visual.

## Escopo

* Arquivos principais: `styles.css` (tokens e componentes), `index.html`, `comandos.html`, `termos.html`, `changelog.html` (apenas ajustes mínimos se necessário), `scripts.js` (nenhuma cor inline; só garantir classes corretas).

* Sem mudanças em backend/Netlify; apenas UI/UX.

## Design System (Tokens)

* Consolidar e nomear tokens no `:root` em `styles.css`:

  * Cores base

    * `--bg: #0a0a0a`, `--surface: #121212`, `--surface-2: #1a1a1a`, `--border: #2a2a2a`.

    * `--text: #f5f5f5`, `--muted: #cfcfcf`.

    * `--primary: #ff7a1a`, `--primary-2: #ff9a3d`, `--primary-rgb: 255,122,26`.

  * Estados

    * `--success: #2ecc71`, `--warning: #ffcc00`, `--error: #ff4d4f`, com variantes `-bg`, `-border`.

  * Tipografia

    * `--font-sans: 'Inter', system-ui, -apple-system, Segoe UI, Roboto`.

    * Escala: `--fs-1..6` via `clamp()` (ex.: `--fs-3: clamp(1rem, 1vw + 0.9rem, 1.2rem)`).

  * Espaçamento/Raios

    * `--space-1..6: 4,8,12,16,24,32px`.

    * `--radius-sm/md/lg/xl: 6,10,14,20px`.

  * Sombra/Glow

    * `--shadow: 0 6px 24px rgba(0,0,0,.25)`, `--shadow-lg: 0 12px 32px rgba(0,0,0,.35)`.

    * `--glow: 0 0 20px rgba(var(--primary-rgb), .35)`, `--glow-strong: 0 0 32px rgba(var(--primary-rgb), .5)`.

  * Gradientes

    * `--grad-primary: linear-gradient(90deg, #ff6a00 0%, #ff9a3d 100%)`.

    * `--grad-surface: linear-gradient(180deg, #121212 0%, #0d0d0d 100%)`.

* Ação: substituir cores hardcoded (`#ff7a1a`, `#ff6a00`, rgba laranja) por `var(--primary)`/`var(--primary-2)`/`rgba(var(--primary-rgb), .X)`.

## Tipografia

* Título/hero com escala fluida via `clamp()`; reduzir tracking e usar `text-wrap: balance`.

* Peso consistente (600–700 para títulos; 400–500 para corpo); `line-height` confortável (1.4–1.6).

* Substituir gradiente de texto por `--grad-primary` onde aplicável.

## Espaçamento e Layout

* Adotar escala `--space-*` em seções, cards, grids.

* Containers com largura máxima e paddings fluídos (`clamp(16px, 4vw, 32px)`).

* Grid responsivo: 1–2–3 colunas com gaps em `--space-*`.

## Componentes

* Botões

  * `background: var(--grad-primary)`, `border: 1px solid rgba(var(--primary-rgb), .25)`, `border-radius: var(--radius-md)`.

  * Estados `:hover` com leve `translateY(-1px)` e `box-shadow: var(--glow)`; `:active` reduz glow.

* Cards (features, stats, parceiros, comandos)

  * `background: var(--surface)`, `border: 1px solid var(--border)`, `box-shadow: var(--shadow)`.

  * Header de card com underline laranja sutil (`background: var(--grad-primary)` em 2px).

* Badges/Chips

  * Usar `--grad-primary` com opacidade baixa ou borda laranja; texto em `--text`/escuro conforme contraste.

* FAQ, Timeline, Underlines

  * Animar expandir FAQ com `max-height` + `opacity` suaves; timeline com dots laranja de brilho baixo.

* Toasts

  * Padronizar cores por estado via tokens; reduzir blur e glow.

* Forms/Modais

  * Foco visível `outline: 2px solid rgba(var(--primary-rgb), .6)`; inputs com `background: var(--surface-2)`.

* Header/Nav

  * Fundo semitransparente com blur leve (`backdrop-filter: blur(6px)` opcional); sticky com sombra discreta.

* Footer

  * Contraste alto, links com underline animado usando `--grad-primary`.

## Movimento e Fluidez

* Transições

  * Dur. padrão `150–250ms`, `--ease: cubic-bezier(.22,1,.36,1)`.

  * Aplicar em `color`, `background`, `transform`, `opacity`.

* Reduzir animações pesadas

  * Limitar glows e pulsos; preferir `transform` para performance.

* Suporte a `prefers-reduced-motion` com fallback sem animações.

## Responsividade

* Breakpoints: `480px`, `768px`, `1024px`.

* Ajustar hero-grid, cards e nav para colapsar com `gap` e `stack` limpos.

* Tocar áreas interativas para 44px mínimos.

## Acessibilidade

* Contraste mínimo AA nas combinações laranja/escuro.

* Foco visível em todos os elementos interativos.

* Sem dependência de cor para estado (ícones/labels).

## Performance Visual

* Reduzir `filter: blur()` e sombras muito grandes.

* Evitar `will-change` excessivo; usar apenas quando necessário.

* Preferir `transform` + `opacity` para transições.

## Fases de Implementação

1. Tokens e base

   * Criar/normalizar tokens no `:root` e substituir cores hardcoded em `styles.css`.
2. Tipografia e espaçamento

   * Aplicar escala fluida e `--space-*` nos principais blocos.
3. Componentes

   * Atualizar botões, cards, chips, toasts, header/nav, footer para novos tokens.
4. Movimento

   * Adicionar transições padrão e reduzir animações pesadas; incluir `prefers-reduced-motion`.
5. Responsividade e acessibilidade

   * Revisar breakpoints, foco e contraste; ajustar grids.
6. Polimento

   * Refinar gradientes/underlines e revisar detalhes visuais.

## Validação

* Abrir preview local e navegar pelas páginas principais.

* Checklist de contraste, foco, responsividade e performance (Lighthouse básico).

* Revisar com conteúdo real (parceiros, comandos, stats) carregado.

## Critérios de Aceite

* Paleta laranja consistente via tokens; sem cores hardcoded relevantes.

* Transições suaves e microinterações leves sem perda de performance.

* Componentes visuais alinhados e responsivos em 3 breakpoints.

* Acessibilidade básica (foco visível, contraste AA).

