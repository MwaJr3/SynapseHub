import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { App } from '@/App';

/**
 * The whole-app composition.
 *
 * Component tests mount `AppShell` inside a MemoryRouter, which is the right
 * way to test routes — but it means a mistake in the outer composition (the
 * providers, or the entry module) is invisible to them. A nested `<Router>`
 * throws and renders a completely blank page while every other test still
 * passes, so both layers are asserted here.
 */
describe('app composition', () => {
  it('renders the homepage from the real App component (providers + BrowserRouter)', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
    // Header, main and footer all mounted.
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    // The theme provider applied its attributes to <html>.
    expect(document.documentElement).toHaveAttribute('data-theme-mode');
  });

  it('renders a case study when the browser is already on that URL', async () => {
    window.history.pushState({}, '', '/portfolio/projects/netscope');
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'NetScope' })).toBeInTheDocument();
    });
  });

  it('entry module does not wrap App in a second router', () => {
    // `App` already provides BrowserRouter + ThemeProvider. A second router in
    // main.tsx throws "You cannot render a <Router> inside another <Router>"
    // and leaves #root empty in the browser.
    const source = readFileSync(resolve(process.cwd(), 'src/main.tsx'), 'utf8');
    // Ignore comments: the file documents the rule in prose.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/BrowserRouter|MemoryRouter|HashRouter|createBrowserRouter/);
    expect(source).toMatch(/<App\s*\/>/);
  });
});
