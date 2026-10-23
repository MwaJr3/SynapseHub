import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { renderWithProviders } from '@/test/render-app';
import { challengeManifest, validateChallengeManifest } from '@/data/challengeManifest';

describe('verified challenge collection', () => {
  it('contains exactly 60 unique records with source URLs', () => {
    expect(challengeManifest).toHaveLength(60);
    expect(validateChallengeManifest()).toEqual([]);
    expect(new Set(challengeManifest.map((item) => item.slug)).size).toBe(60);
    expect(challengeManifest.every((item) => !item.completed)).toBe(true);
  });

  it('renders the homepage narrative and links to the collection', async () => {
    renderWithProviders(<App />, '/');
    expect(await screen.findByRole('heading', { level: 1, name: /exploring interfaces.*studying experiences.*one brief at a time/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /try the interactive prototypes/i })).toHaveAttribute('href', '/apps');
    expect(screen.getAllByText('60').length).toBeGreaterThan(0);
  });

  it.each(challengeManifest.map((project) => [project.slug, project.title] as const))('opens the %s case study directly', async (slug, title) => {
    renderWithProviders(<App />, `/projects/${slug}`);
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /original challenge/i }).every((link) => link.getAttribute('href') === challengeManifest.find((item) => item.slug === slug)?.originalChallengeUrl)).toBe(true);
    expect(screen.getByRole('heading', { level: 2, name: 'Representative visual' })).toBeInTheDocument();
  });

  it('lists the 60 interactive prototype routes', async () => {
    const { container } = renderWithProviders(<App />, '/apps');
    expect(await screen.findByRole('heading', { level: 1, name: /open a challenge prototype/i })).toBeInTheDocument();
    expect(container.querySelector('.collection-status')).toHaveTextContent('60 interactive prototypes');
    expect(screen.getAllByRole('link', { name: /open prototype/i })[0]).toHaveAttribute('href', '/apps/poll-creator-app');
  });

  it.each(challengeManifest.map((project) => [project.slug, project.title] as const))('opens the %s app prototype directly', async (slug, title) => {
    renderWithProviders(<App />, `/apps/${slug}`);
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText('Local-first prototype', { exact: true })).toBeInTheDocument();
  });

  it('supports creating and voting once on a local poll', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/apps/poll-creator-app');
    await screen.findByRole('heading', { level: 1, name: 'Poll creator app' });
    await user.type(screen.getByLabelText(/poll question/i), 'Choose a time');
    await user.type(screen.getByLabelText(/answer option/i), 'Morning, Evening');
    await user.click(screen.getByRole('button', { name: /create local poll/i }));
    const option = await screen.findByRole('button', { name: /morning/i });
    await user.click(option);
    expect(await screen.findAllByText(/voted on this device/i)).toHaveLength(2);
  });

  it('plays a complete tic-tac-toe round', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/apps/tic-tac-toe-game');
    await screen.findByRole('heading', { level: 1, name: 'Tic Tac Toe game' });
    for (const square of [1, 4, 2, 5, 3]) await user.click(screen.getByRole('gridcell', { name: `Square ${square}, empty` }));
    expect(await screen.findByRole('heading', { name: /x wins the round/i })).toBeInTheDocument();
  });

  it('shows a useful not-found state for unknown challenge slugs and routes', async () => {
    const { unmount } = renderWithProviders(<App />, '/projects/not-a-real-slug');
    expect(await screen.findByRole('heading', { name: /project not found/i })).toBeInTheDocument();
    unmount();
    renderWithProviders(<App />, '/not-a-real-page');
    expect(await screen.findByRole('heading', { name: /this page does not exist/i })).toBeInTheDocument();
  });
});

describe('project discovery', () => {
  it('searches the manifest and reports a matching result count', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<App />, '/projects');
    await screen.findByRole('heading', { name: /sixty briefs/i });
    await user.type(screen.getByRole('searchbox', { name: /search the collection/i }), 'poll creator');
    await screen.findByRole('heading', { level: 2, name: 'Poll creator app' });
    expect(container.querySelector('.collection-status')).toHaveTextContent('1 project match your selection');
    expect(screen.getByRole('heading', { level: 2, name: 'Poll creator app' })).toBeInTheDocument();
  });

  it('filters by category and clears back to all records', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/projects');
    await screen.findByRole('heading', { name: /sixty briefs/i });
    await user.selectOptions(screen.getByLabelText(/category/i), 'Games & interactive experiences');
    expect(await screen.findByText(/projects match your selection/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Hangman game' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reset search and filters/i }));
    expect(await screen.findByText(/projects in the collection/)).toBeInTheDocument();
  });

  it('combines challenge-type and difficulty filters', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<App />, '/projects');
    await screen.findByRole('heading', { name: /sixty briefs/i });
    await user.selectOptions(screen.getByLabelText(/challenge type/i), 'product');
    await user.selectOptions(screen.getByLabelText(/difficulty/i), 'intermediate');
    expect(container.querySelector('.collection-status')).toHaveTextContent('3 projects match your selection');
    expect(screen.getByRole('heading', { level: 2, name: 'Poll creator app' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Restaurant ranking app' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Skills learning tracker' })).toBeInTheDocument();
  });

  it('sorts the collection by name and paginates', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/projects');
    await screen.findByRole('heading', { name: /sixty briefs/i });
    await user.selectOptions(screen.getByLabelText(/sort by/i), 'name');
    expect(await screen.findByRole('heading', { level: 2, name: 'Art gallery website' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(12);
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
  });
});

describe('portfolio pages and controls', () => {
  it.each(['/about', '/skills', '/journey', '/approach', '/contact', '/system', '/operations'])('renders %s', async (route) => {
    renderWithProviders(<App />, route);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('retains the responsive menu and theme controls', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/');
    await screen.findByRole('heading', { level: 1 });
    const menu = screen.getByRole('button', { name: /^menu$/i });
    await user.click(menu);
    expect(screen.getByRole('button', { name: /^close$/i })).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: /^menu$/i })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Light' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
