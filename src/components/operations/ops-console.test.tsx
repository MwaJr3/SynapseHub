import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import App from '@/App';
import { renderWithProviders } from '@/test/render-app';
import { operationsModules } from '@/data/operations';

describe('operations console', () => {
  it('renders the operations page with its honesty statement', async () => {
    renderWithProviders(<App />, '/operations');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /dashboards that refuse to flatter/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no uptime percentages, no revenue, no churn/i),
    ).toBeInTheDocument();
  });

  it('renders all seven modules with their states, metrics and integrity rules', async () => {
    renderWithProviders(<App />, '/operations');

    for (const module of operationsModules) {
      const card = await screen.findByRole('article', {
        name: new RegExp(module.title, 'i'),
      });
      expect(
        within(card).getByText('Integrity rule', { exact: true }),
      ).toBeInTheDocument();
      expect(within(card).getByText(/adapted from/i)).toBeInTheDocument();
      // Every state label and metric name is present in the card.
      for (const state of module.states) {
        expect(within(card).getByText(state.label)).toBeInTheDocument();
      }
      for (const metric of module.metrics) {
        expect(within(card).getByText(metric.name)).toBeInTheDocument();
      }
    }
  });

  it('keeps the page free of demonstration figures', async () => {
    const { container } = renderWithProviders(<App />, '/operations');
    await screen.findByRole('heading', { level: 1 });
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\d+(\.\d+)?\s?%/);
    expect(text).not.toMatch(/\b\d{1,3}(,\d{3})+\b/);
    expect(text).not.toMatch(/[$€£]\s?\d/);
  });
});
