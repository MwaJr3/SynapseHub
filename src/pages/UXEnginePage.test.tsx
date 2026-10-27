import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { renderWithProviders } from '@/test/render-app';
import { PATTERNS } from '@/features/ux-engine';

describe('UX engine studio page', () => {
  it('renders the page heading, studio tabs and operating principle', async () => {
    renderWithProviders(<App />, '/ux-engine');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /a senior product designer, auditor and design-systems architect in one engine/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: /audit lab/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /pattern library/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /state matrix/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /design system/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /command console/i })).toBeInTheDocument();
  });

  it('runs a live deterministic audit in the lab with traceable findings', async () => {
    renderWithProviders(<App />, '/ux-engine');
    await screen.findByRole('heading', { level: 1 });

    // Scope to the visible lab panel — other studio panels stay mounted (hidden).
    const labPanel = screen.getByRole('tabpanel', { name: /audit lab/i });

    // The default lab configuration is deliberately flawed.
    expect(within(labPanel).getByRole('img', { name: /audit score/i })).toBeInTheDocument();
    expect(within(labPanel).getByText(/top three fixes/i)).toBeInTheDocument();
    const ruleMentions = within(labPanel).getAllByText(
      /A11Y-CONTRAST-01|RESP-HOVER-01|A11Y-FOCUS-01/,
    );
    expect(ruleMentions.length).toBeGreaterThan(0);
  });

  it('clears findings when all remediations are applied', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/ux-engine');
    await screen.findByRole('heading', { level: 1 });

    const labPanel = screen.getByRole('tabpanel', { name: /audit lab/i });
    await user.click(within(labPanel).getByRole('button', { name: /apply all remediations/i }));
    expect(await within(labPanel).findByText(/no rule violations/i)).toBeInTheDocument();
  });

  it('browses all 76 patterns and opens a detail panel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/ux-engine');
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('tab', { name: /pattern library/i }));
    const search = await screen.findByLabelText(/search the pattern library/i);
    await user.clear(search);
    expect(await screen.findByText(`${PATTERNS.length} of 76 patterns`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^P48/ }));
    const article = screen.getByRole('article');
    expect(within(article).getByText(/Undo UX/)).toBeInTheDocument();
    expect(within(article).getByText(/undo-ux.mp4/)).toBeInTheDocument();
  });

  it('models state matrices and shows the canonical transitions', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/ux-engine');
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('tab', { name: /state matrix/i }));
    expect(await screen.findByText(/canonical transitions/i)).toBeInTheDocument();
  });

  it('runs slash commands against the fixtures and grades the polished screen A', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/ux-engine');
    await screen.findByRole('heading', { level: 1 });

    await user.click(screen.getByRole('tab', { name: /command console/i }));
    await user.click(await screen.findByRole('button', { name: /\/ux-review/ }));
    expect(await screen.findByText(/Must fix/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /polished checkout/ }));
    await user.click(screen.getByRole('button', { name: /\/ux-audit/ }));
    expect(await screen.findByRole('img', { name: /grade A/ })).toBeInTheDocument();
  });
});
