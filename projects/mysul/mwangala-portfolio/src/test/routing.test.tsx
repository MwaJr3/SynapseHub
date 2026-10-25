import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { allRoutes } from '@/config/routes';
import { getProject, projects } from '@/data/projects';
import { profile, contactEmails } from '@/config/profile';
import { renderAppAt } from '@/test/testUtils';

describe('routing', () => {
  it.each(allRoutes().map((route) => [route.path, route.path] as const))(
    '%s renders content and sets a document title',
    async (path) => {
      renderAppAt(path);

      await waitFor(() => {
        expect(screen.queryByText('Loading page…')).not.toBeInTheDocument();
      });

      expect(document.title).not.toBe('');
      expect(document.title).toContain('Mwangala');
      expect(screen.getByRole('main')).toBeInTheDocument();
      // The 404 copy must never appear for a valid route.
      expect(screen.queryByText(/isn't part of this portfolio/i)).not.toBeInTheDocument();
    },
  );

  it('renders the 404 state for an unknown route', async () => {
    renderAppAt('/this-route-does-not-exist');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /isn't part of this portfolio/i })).toBeInTheDocument();
    });
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText(/this-route-does-not-exist/)).toBeInTheDocument();
    // Recovery: links to the project directory and every real project route.
    // A project name can legitimately appear in more than one link (the 404
    // recovery list plus related suggestions), so assert presence, not count.
    expect(screen.getAllByRole('link', { name: /browse all .* projects/i }).length).toBeGreaterThan(0);
    for (const project of projects) {
      const matches = screen.getAllByRole('link', { name: new RegExp(project.name, 'i') });
      expect(matches.length, `${project.slug} should be reachable from the 404 page`).toBeGreaterThan(0);
      expect(matches[0]).toHaveAttribute('href', `/projects/${project.slug}`);
    }
  });

  it('renders the 404 state for an unknown project slug and lists real projects', async () => {
    renderAppAt('/projects/sentinelcore');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /isn't part of this portfolio/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/sentinelcore/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /NetScope/i }).length).toBeGreaterThan(0);
    // The excluded project itself must never become a route.
    expect(screen.queryByRole('link', { name: /SentinelCore/i })).not.toBeInTheDocument();
  });

  it.each(['sentinellog', 'fileguard', 'dependsecure', 'campusflow', 'circuitlab-calc', 'chessscope', 'sentinelcore'])(
    'has no route for the excluded project "%s"',
    async (slug) => {
      renderAppAt(`/projects/${slug}`);
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /isn't part of this portfolio/i })).toBeInTheDocument();
      });
    },
  );

  it('redirects the /engineering alias to /approach', async () => {
    renderAppAt('/engineering');
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Understand/i })).toBeInTheDocument();
    });
  });
});

describe('homepage', () => {
  it('leads with the core message and both calls to action', async () => {
    renderAppAt('/');
    await waitFor(() => expect(screen.queryByText('Loading page…')).not.toBeInTheDocument());

    expect(
      screen.getByRole('heading', { level: 1, name: /Building Software\./i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /explore my projects/i })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('link', { name: /get in touch/i })).toHaveAttribute('href', '/contact');
  });

  it('does not offer a GitHub link while no profile URL is configured', async () => {
    renderAppAt('/');
    await waitFor(() => expect(screen.queryByText('Loading page…')).not.toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /view github/i })).not.toBeInTheDocument();
    // The homepage and the footer both point at the config file to edit.
    expect(screen.getAllByText(/src\/config\/profile\.ts/).length).toBeGreaterThan(0);
  });

  it('highlights featured projects and links each card to its case study', async () => {
    renderAppAt('/');
    await waitFor(() => expect(screen.queryByText('Loading page…')).not.toBeInTheDocument());

    const highlights = screen.getByRole('heading', { level: 2, name: /projects that show how I work/i });
    expect(highlights).toBeInTheDocument();

    for (const slug of ['phishlens', 'netscope', 'incidentflow', 'securecode-workbench', 'transcriptwise']) {
      const project = getProject(slug)!;
      const links = screen.getAllByRole('link', { name: new RegExp(`^${project.name} — open case study$`) });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute('href', `/projects/${slug}`);
    }

    expect(screen.getByRole('link', { name: /view all .* projects/i })).toHaveAttribute('href', '/projects');
  });

  it('labels the artwork as representative rather than as screenshots', async () => {
    renderAppAt('/');
    await waitFor(() => expect(screen.queryByText('Loading page…')).not.toBeInTheDocument());
    expect(screen.getByText(/Previews are representative artwork/i)).toBeInTheDocument();
  });

  it('shows the five-stage engineering process', async () => {
    renderAppAt('/');
    await waitFor(() => expect(screen.queryByText('Loading page…')).not.toBeInTheDocument());
    for (const stage of ['Understand', 'Design', 'Build', 'Test', 'Improve']) {
      expect(screen.getAllByRole('heading', { name: stage, level: 3 }).length).toBeGreaterThan(0);
    }
  });
});

describe('project case study pages', () => {
  it.each(projects.map((project) => [project.slug, project] as const))(
    '%s renders the full case-study structure',
    async (_slug, project) => {
      renderAppAt(`/projects/${project.slug}`);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: project.name })).toBeInTheDocument();
      });

      // Introduction
      expect(screen.getByText(project.tagline)).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Overview' })).toBeInTheDocument();

      // Required case-study sections
      for (const heading of [
        'The problem',
        'Objectives',
        'Solution',
        'Key features',
        'Technology & architecture',
        'Engineering decisions',
        'Testing & reliability',
        'Challenges & lessons',
        'Demonstration',
        'Known limitations',
      ]) {
        expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
      }

      // Every feature and decision is rendered
      for (const feature of project.features) {
        expect(screen.getByRole('heading', { level: 3, name: feature.title })).toBeInTheDocument();
      }
      for (const decision of project.caseStudy.decisions) {
        expect(screen.getByText(decision.title)).toBeInTheDocument();
      }
      for (const limitation of project.caseStudy.limitations) {
        expect(screen.getByText(limitation)).toBeInTheDocument();
      }

      // Document title is project specific
      expect(document.title).toContain(project.name);
    },
  );

  it('navigates to the previous and next project', async () => {
    const user = userEvent.setup();
    renderAppAt('/projects/netscope');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'NetScope' })).toBeInTheDocument();
    });

    const nav = screen.getByRole('navigation', { name: /project navigation/i });
    const previous = within(nav).getByRole('link', { name: /previous project/i });
    const next = within(nav).getByRole('link', { name: /next project/i });

    expect(previous).toHaveAttribute('href', '/projects/phishlens');
    expect(next).toHaveAttribute('href', '/projects/threatintel-desk');

    await user.click(next);
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'ThreatIntel Desk' })).toBeInTheDocument();
    });
  });

  it('links back to the project directory from the breadcrumb and the actions', async () => {
    renderAppAt('/projects/hashsight');
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'HashSight' })).toBeInTheDocument();
    });

    const backLinks = screen.getAllByRole('link', { name: /back to (all )?projects/i });
    expect(backLinks.length).toBeGreaterThanOrEqual(2);
    for (const link of backLinks) {
      expect(link).toHaveAttribute('href', '/projects');
    }
  });

  it('does not render live-demo or source-code actions while no URL is configured', async () => {
    renderAppAt('/projects/phishlens');
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'PhishLens' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('link', { name: /live application/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /source code/i })).not.toBeInTheDocument();
    expect(screen.getByText(/has not been configured yet/i)).toBeInTheDocument();
  });

  it('offers a copyable technology stack', async () => {
    // userEvent installs its own clipboard stub, so the assertion reads the
    // clipboard back instead of spying on a mock the library would replace.
    const user = userEvent.setup();
    renderAppAt('/projects/netscope');
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'NetScope' })).toBeInTheDocument();
    });

    const project = getProject('netscope')!;
    const copy = screen.getByRole('button', {
      name: new RegExp(`copy the ${project.name} technology stack`, 'i'),
    });
    await user.click(copy);

    await waitFor(async () => {
      expect(await navigator.clipboard.readText()).toBe(project.tech.join(', '));
    });
    // Honest confirmation only after the write succeeds.
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/copied to clipboard/i);
    });
  });
});

describe('about, skills, approach and contact pages', () => {
  it('about page states that no education or certifications are claimed', async () => {
    renderAppAt('/about');
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: profile.about.heading })).toBeInTheDocument();
    });

    expect(profile.education).toEqual([]);
    expect(profile.certifications).toEqual([]);
    expect(screen.getByText(/No listed education or certifications/i)).toBeInTheDocument();

    for (const value of profile.about.values) {
      expect(screen.getByRole('heading', { level: 3, name: value.title })).toBeInTheDocument();
    }
  });

  it('skills page ties skills to projects and shows no proficiency percentages', async () => {
    renderAppAt('/skills');
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Every skill here points at something I built/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/No proficiency bars and no percentages/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\b\d{1,3}%\s*(proficien|skill)/i);

    for (const project of projects) {
      expect(screen.getByRole('heading', { level: 3, name: project.name })).toBeInTheDocument();
    }
    // Learning interests are separated from demonstrated skills.
    expect(screen.getByRole('heading', { level: 2, name: /Current Learning Interests/i })).toBeInTheDocument();
    expect(screen.getAllByText(/learning interest/i).length).toBeGreaterThan(0);
  });

  it('approach page documents the five stages and the recurring practices', async () => {
    renderAppAt('/approach');
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Understand → Design → Build → Test → Improve/i })).toBeInTheDocument();
    });
    for (const stage of ['Understand', 'Design', 'Build', 'Test', 'Improve']) {
      expect(screen.getByRole('heading', { level: 2, name: stage })).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { level: 2, name: /Eight habits/i })).toBeInTheDocument();
  });

  it('contact page offers both nominated inboxes', async () => {
    renderAppAt('/contact');
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Have a Problem Worth Solving/i })).toBeInTheDocument();
    });

    // Both monitored addresses are published, and the mailto hand-off addresses
    // all of them — the client can never pick a different recipient.
    expect(profile.email).toBe(contactEmails[0]);
    const mailto = screen
      .getAllByRole('link')
      .find((link) => (link.getAttribute('href') ?? '').startsWith('mailto:'));
    expect(mailto).toBeDefined();
    for (const email of contactEmails) {
      expect(mailto?.getAttribute('href')).toContain(email);
    }
  });
});

describe('navigation shell', () => {
  it('renders every primary navigation item with working hrefs', async () => {
    renderAppAt('/');
    await waitFor(() => expect(screen.queryByText('Loading page…')).not.toBeInTheDocument());

    const nav = screen.getByRole('navigation', { name: /primary/i });
    const expected: [string, string][] = [
      ['Home', '/'],
      ['About', '/about'],
      ['Projects', '/projects'],
      ['Skills', '/skills'],
      ['Engineering Approach', '/approach'],
      ['Contact', '/contact'],
    ];
    for (const [label, href] of expected) {
      expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });

  it('marks the current route as active', async () => {
    renderAppAt('/skills');
    await waitFor(() => expect(screen.queryByText('Loading page…')).not.toBeInTheDocument());
    const nav = screen.getByRole('navigation', { name: /primary/i });
    expect(within(nav).getByRole('link', { name: 'Skills' })).toHaveAttribute('aria-current', 'page');
  });

  it('provides a skip link as the first focusable element', async () => {
    renderAppAt('/');
    await waitFor(() => expect(screen.queryByText('Loading page…')).not.toBeInTheDocument());
    const skip = screen.getByRole('link', { name: /skip to main content/i });
    expect(skip).toHaveAttribute('href', '#main');
    expect(skip).toBeInTheDocument();
  });

  it('discloses the artwork disclaimer in the footer', async () => {
    renderAppAt('/');
    await waitFor(() => expect(screen.queryByText('Loading page…')).not.toBeInTheDocument());
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent(/representative preview artwork/i);
    expect(footer).toHaveTextContent(/sets no cookies/i);
  });
});

describe('mobile navigation', () => {
  it('opens, lists every project, and closes again', async () => {
    const user = userEvent.setup();
    renderAppAt('/');
    await waitFor(() => expect(screen.queryByText('Loading page…')).not.toBeInTheDocument());

    const toggle = screen.getByRole('button', { name: /open navigation menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    const menu = screen.getByRole('navigation', { name: /mobile/i });
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close navigation menu/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    for (const project of projects) {
      expect(within(menu).getByRole('link', { name: project.name })).toHaveAttribute(
        'href',
        `/projects/${project.slug}`,
      );
    }

    // The first link receives focus when the menu opens.
    expect(within(menu).getByRole('link', { name: 'Home' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: /mobile/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open navigation menu/i })).toHaveFocus();
  });

  it('closes the menu after navigating to a project', async () => {
    const user = userEvent.setup();
    renderAppAt('/');
    await waitFor(() => expect(screen.queryByText('Loading page…')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /open navigation menu/i }));
    const menu = screen.getByRole('navigation', { name: /mobile/i });
    await user.click(within(menu).getByRole('link', { name: 'NetScope' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'NetScope' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('navigation', { name: /mobile/i })).not.toBeInTheDocument();
  });
});
