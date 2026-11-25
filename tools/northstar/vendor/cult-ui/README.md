# Vendored cult-ui components (optional set)

Copied unchanged (except the `@/lib/utils` import, now `./utils`) from https://github.com/MwaJr3/cult-ui,
MIT licence in `LICENSE`. Optional; the dependency-free kit in `packages/decor` stays the default.

Needs: React 18+, Tailwind, `motion`, `clsx`, `tailwind-merge`, `class-variance-authority`,
`@radix-ui/react-slot`, `react-use-measure` (only the ones a copied component imports).
Install with `northstar add cult-ui <name…> <srcDir>`. Components: texture-card, shadow-card,
direction-aware-tabs, bg-animate-button, edge-blur, expandable.
Motion must still respect `prefers-reduced-motion` (see the `no-reduced-motion` rule).
