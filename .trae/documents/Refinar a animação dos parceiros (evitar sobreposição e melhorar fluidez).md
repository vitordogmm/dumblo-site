## Problema
Os ícones/nomes dos parceiros estão se sobrepondo e a faixa não parece contínua. A causa é estrutural: as duas tracks estão na mesma linha e a animação está dimensionada para metade do conteúdo (50%), o que pode gerar acúmulo e cortes.

## Solução
- Separar as faixas em duas linhas independentes.
- Ajustar a animação para percorrer 100% do conteúdo com duplicação interna (loop perfeito).
- Garantir espaçamento mínimo por item e margem entre as faixas.
- Preservar acessibilidade e compatibilidade com `prefers-reduced-motion`.

## Alterações
### CSS (styles.css)
1) Introduzir `.partners-row` (container da linha) e tornar cada linha bloco:
- `.partners-row { display:block; overflow:hidden; padding:6px 0; }`
- `.partners-track { display:flex; gap:24px; align-items:center; will-change:transform; }`
- `.partners-track + .partners-track { margin-top: 12px; }`
2) Corrigir keyframes para 100%:
- `@keyframes marquee-left { from { transform: translateX(0); } to { transform: translateX(-100%); } }`
- `@keyframes marquee-right { from { transform: translateX(-100%); } to { transform: translateX(0); } }`
3) Garantir largura mínima por item:
- `.partner-item { min-width: 140px; }`
4) Responsivo:
- Em mobile, reduzir avatar para 56px, e diminuir `gap` para 16px.

### JS (scripts.js)
1) Em `setupPartners()` (c. 291–369), criar duas `.partners-row` e dentro de cada uma uma `.partners-track` duplicada:
- `renderTicker(list)`: 
  - `base = list.slice(0, limit)`
  - `loop = [...base, ...base]` (duplicação para seamless)
  - `rowA` com `.partners-track track-a` animando `marquee-left`.
  - `rowB` com `.partners-track track-b` animando `marquee-right`.
2) Cada item: apenas ícone circular e nome abaixo; links permanecem opcionais (se existir invite).
3) `prefers-reduced-motion`: desabilitar a animação via CSS (já suportado).

## Verificação
- Visual: duas linhas, sem sobreposição; nomes legíveis; bordas com fade; pausa no hover.
- Dados: carregamento vindo do Firestore continua inalterado.

Posso aplicar essas alterações agora para corrigir a sobreposição e suavizar o loop.