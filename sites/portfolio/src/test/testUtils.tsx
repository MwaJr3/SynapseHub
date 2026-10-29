import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/hooks/useTheme';
import { AppShell } from '@/App';

/**
 * Renders a component inside the providers every route depends on.
 * `route` sets the initial URL so tests can exercise URL-driven state.
 */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </ThemeProvider>,
  );
}

/** Renders the whole application shell at a given route. */
export function renderAppAt(route: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[route]}>
        <AppShell />
      </MemoryRouter>
    </ThemeProvider>,
  );
}
