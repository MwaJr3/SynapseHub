import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import { renderWithProviders } from '@/test/render-app';
import { catalogue, getProject } from '@/data/projects';
import { THEME_STORAGE_KEY } from '@/lib/theme';

describe('routes', () => {
  it('renders the home page with the primary call to action', async () => {
    renderWithProviders(<App />, '/');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /building better ways to learn/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /explore the projects/i }),
    ).toHaveAttribute('href', '/projects');
  });

  it.each(catalogue.map((project) => [project.slug, project.name] as const))(
    'renders a case study for %s',
    async (slug, name) => {
      renderWithProviders(<App />, `/projects/${slug}`);

      expect(
        await screen.findByRole('heading', { level: 1, name }),
      ).toBeInTheDocument();
      // The workflow, architecture and limitation sections are part of every case study.
      expect(
        screen.getByRole('heading', { name: /how the application is used/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /components and connections/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', {
          name: /what is unfinished, stated plainly/i,
        }),
      ).toBeInTheDocument();
    },
  );

  it('handles an unknown project slug without a broken detail page', async () => {
    renderWithProviders(<App />, '/projects/ghost-project');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /that project is not in this catalogue/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /back to the project library/i }),
    ).toHaveAttribute('href', '/projects');
  });

  it('renders the custom 404 for unknown routes', async () => {
    renderWithProviders(<App />, '/does-not-exist');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /this page does not exist/i,
      }),
    ).toBeInTheDocument();
  });

  it('renders the about, skills, journey, approach and contact pages', async () => {
    const expectations: Array<[string, RegExp]> = [
      ['/about', /understanding systems/i],
      ['/skills', /technologies and capabilities/i],
      ['/journey', /five themes, not a timeline/i],
      ['/approach', /understand → design → build → test → improve/i],
      ['/contact', /describe the problem, the constraint/i],
      ['/system', /the system turns self-knowledge into a weekly operating rhythm/i],
    ];

    for (const [path, heading] of expectations) {
      const { unmount } = renderWithProviders(<App />, path);
      expect(
        await screen.findByRole('heading', { level: 1, name: heading }),
      ).toBeInTheDocument();
      unmount();
    }
  });
});

describe('project library filtering', () => {
  it('searches project data and reports the result count', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/projects');

    await screen.findByRole('heading', { level: 1, name: /nine projects/i });
    expect(screen.getByRole('status')).toHaveTextContent(
      /Showing 9 projects of 9/i,
    );

    await user.type(screen.getByLabelText(/search projects/i), 'pathwise');

    expect(
      await screen.findByText(/Showing 1 project of 9/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'PathWise' }),
    ).toBeInTheDocument();
  });

  it('searches technologies and problem statements, not just names', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/projects');

    await screen.findByRole('heading', { level: 1, name: /nine projects/i });
    await user.type(screen.getByLabelText(/search projects/i), 'basic phones');

    const cards = await screen.findAllByRole('heading', { level: 3 });
    const names = cards.map((card) => card.textContent);
    expect(names).toContain('ReachLearn');
  });

  it('combines category filters and shows an empty state for impossible combinations', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/projects');

    await screen.findByRole('heading', { level: 1, name: /nine projects/i });

    await user.click(
      screen.getByRole('button', { name: /^AI & Personalized Learning$/ }),
    );
    await user.click(screen.getByRole('button', { name: /^Python$/ }));

    expect(
      await screen.findByText(/Showing 2 projects of 9/i),
    ).toBeInTheDocument();
    const twoResults = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(twoResults.sort()).toEqual(['PathWise', 'TutorSpring']);

    await user.click(
      screen.getByRole('button', { name: /^Virtual Classrooms$/ }),
    );

    expect(
      await screen.findByText(/no projects match this combination/i),
    ).toBeInTheDocument();
    // No project cards remain, and the empty state explains why.
    expect(
      screen.queryByRole('heading', { level: 3, name: 'TutorSpring' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 3, name: 'PathWise' }),
    ).not.toBeInTheDocument();
    // Both the filter panel and the empty state offer a way out.
    expect(
      screen.getAllByRole('button', { name: /clear all filters/i }),
    ).toHaveLength(2);
  });

  it('clears filters back to the full library', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/projects?category=affordable-access');

    await screen.findByRole('heading', { level: 1, name: /nine projects/i });
    expect(
      await screen.findByText(/Showing 1 project of 9/i),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /clear all filters/i }),
    );

    expect(
      await screen.findByText(/Showing 9 projects of 9/i),
    ).toBeInTheDocument();
  });

  it('renders the active filter summary from the URL', async () => {
    renderWithProviders(<App />, '/projects?category=offline-first&q=sync');

    await screen.findByRole('heading', { level: 1, name: /nine projects/i });
    expect(screen.getByText(/active view:/i)).toBeInTheDocument();
  });
});

describe('navigation and theme', () => {
  it('exposes every primary route in the header and footer', async () => {
    renderWithProviders(<App />, '/');

    await screen.findByRole('heading', { level: 1 });
    // jsdom exposes every <header> as a banner and <section> headers are not
    // scoped the way browsers scope them, so query the primary navigation.
    const primaryNav = screen.getByRole('navigation', { name: 'Primary' });
    for (const label of [
      'Home',
      'System',
      'About',
      'Projects',
      'Skills',
      'Journey',
      'Contact',
    ]) {
      expect(
        within(primaryNav).getByRole('link', { name: label }),
      ).toBeInTheDocument();
    }

    const footer = screen.getByRole('contentinfo');
    expect(
      within(footer).getByRole('link', { name: /all projects/i }),
    ).toHaveAttribute('href', '/projects');
  });

  it('switches theme, persists the preference and follows the system setting', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    renderWithProviders(<App />, '/');

    await screen.findByRole('heading', { level: 1 });

    // System preference resolves to dark first.
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Light' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    await user.click(screen.getByRole('button', { name: 'Dark' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('opens and closes the mobile menu with keyboard support', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/');

    await screen.findByRole('heading', { level: 1 });
    const toggle = screen.getByRole('button', { name: /^menu$/i });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(screen.getByRole('button', { name: /^close$/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: /^menu$/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('skips unavailable external actions but keeps internal navigation working', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, '/');

    await screen.findByRole('heading', { level: 1 });
    expect(
      screen.queryByRole('link', { name: /view github/i }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('link', { name: /explore the projects/i }),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: /nine projects/i }),
    ).toBeInTheDocument();
  });

  it('sets a unique document title per page', async () => {
    renderWithProviders(<App />, '/projects/learnbridge');
    await screen.findByRole('heading', { level: 1, name: 'LearnBridge' });
    expect(document.title).toContain('LearnBridge');

    const project = getProject('learnbridge')!;
    expect(document.title).toContain(project.name);
  });
});
