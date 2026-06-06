# Design tokens — Fortify Web

Tokens centralizados para trocar a identidade visual do app sem alterar componentes.

## Estrutura

```
styles/
├── themes/
│   ├── fortify.css   # tema padrão (:root + data-theme="fortify")
│   └── ocean.css    # exemplo alternativo (data-theme="ocean")
└── tokens/
    └── theme-map.css  # mapeia primitivos → utilitários Tailwind (@theme)
```

## Trocar o tema

1. **Runtime:** altere `data-theme` no `<html>` em `index.html`:

   ```html
   <html lang="pt-BR" data-theme="ocean">
   ```

2. **Novo tema:** copie `themes/ocean.css`, renomeie (ex. `forest.css`), ajuste os valores `--palette-*` e importe em `index.css`.

3. **Editar tema atual:** altere apenas variáveis em `themes/fortify.css` — cores, fontes, radius e sombras.

## Variáveis primitivas (por tema)

| Variável | Uso |
|----------|-----|
| `--palette-brand`, `--palette-brand-light` | marca, CTAs |
| `--palette-on-brand`, `--palette-on-brand-muted` | texto sobre fundo brand |
| `--palette-surface`, `--palette-surface-elevated` | fundos |
| `--palette-border`, `--palette-ink`, `--palette-ink-muted` | bordas e texto |
| `--palette-success`, `--palette-warning`, `--palette-danger` | status |
| `--font-body`, `--font-display-family` | tipografia |
| `--token-radius-card` | cantos de cards |
| `--effect-shadow-card`, `--effect-shadow-sm`, `--effect-glow-brand` | elevação e glow |

## Classes Tailwind geradas

Use sempre tokens semânticos nos componentes:

- `bg-brand`, `text-on-brand`, `text-ink-muted`, `border-border`
- `rounded-card`, `shadow-card`, `shadow-sm`
- `font-sans`, `font-display`

## Variáveis shadcn (bridge)

Além dos primitivos Fortify, cada tema define variáveis consumidas por shadcn/ui:

| Variável | Origem típica |
|----------|----------------|
| `--background`, `--foreground` | surface / ink |
| `--primary`, `--primary-foreground` | brand / on-brand |
| `--destructive` | danger |
| `--muted`, `--muted-foreground` | surface elevado / ink-muted |
| `--border`, `--ring` | border |
| `--radius` | token-radius-card |

Componentes shadcn usam `bg-background`, `text-muted-foreground`, etc. Feature pages devem preferir essas classes ou tokens Fortify legados (`bg-brand`) — nunca hex inline.

**Não use:** `text-white`, hex (`#...`), ou cores Tailwind default (`slate-500`, etc.).

Ver ADR-011 e [[2-Areas/Frontend/01-Componentes-shadcn]].
