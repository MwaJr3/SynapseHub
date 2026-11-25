# Vendored magicui components (optional set)

Copied unchanged (except the `@/lib/utils` import, now `./utils`) from https://github.com/MwaJr3/magicui,
MIT licence in `LICENSE`. `magicui.css` is ours: it adds a reduced-motion fallback the upstream lacks. This is the *optional* second set; the dependency-free kit in `packages/decor`
stays the default.

Needs in the target app: React 18+, Tailwind 4, `motion`, `clsx`, `tailwind-merge`.
Install with `northstar add magicui <name…> <srcDir>`; it copies the files, `utils.ts` and `magicui.css`
and prints the install and import lines. Components: blur-fade, number-ticker, marquee, border-beam,
shine-border, animated-shiny-text, magic-card, scroll-progress, dot-pattern.
Motion components must still respect `prefers-reduced-motion` (check `no-reduced-motion`).
