import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { ThemeProvider } from '@/providers/ThemeProvider';

/** Renders a component (usually the routed app) inside the theme provider and a router. */
export function renderWithProviders(
  ui: ReactElement,
  initialPath = '/',
): RenderResult {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
    </ThemeProvider>,
  );
}

export function renderWithRouter(
  ui: ReactElement,
  initialPath = '/',
): RenderResult {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>,
  );
}
