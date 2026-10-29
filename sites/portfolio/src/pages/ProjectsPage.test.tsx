import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { filters as filterDefinitions } from '@/config/nav';
import { getProject, projects, projectsByFilter, searchProjects } from '@/data/projects';
import { renderAppAt } from '@/test/testUtils';
import type { FilterId } from '@/types/project';

async function openDirectory(route = '/projects') {
  renderAppAt(route);
  await waitFor(() => {
    expect(screen.getByRole('heading', { level: 1, name: /Nine applications/i })).toBeInTheDocument();
  });
  return screen.getByRole('searchbox', { name: /search projects/i });
}

function visibleProjectNames(): string[] {
  // queryAll so an empty result set is reported as [] rather than throwing.
  return screen
    .queryAllByRole('link', { name: /— open case study$/ })
    .map((link) => (link.getAttribute('aria-label') ?? '').replace(' — open case study', ''));
}

/**
 * The result counter lives in an aria-live region whose sentence is split by a
 * nested <span>, so assert on the normalised text of the status element.
 */
function expectStatusCount(shown: number, total = projects.length) {
  expect(screen.getByRole('status')).toHaveTextContent(`Showing ${shown} of ${total} projects`);
}

describe('project directory', () => {
  it('lists all nine projects by default', async () => {
    await openDirectory();
    expect(visibleProjectNames()).toHaveLength(projects.length);
    expectStatusCount(9, 9);
  });

  it.each(filterDefinitions.filter((f) => f.id !== 'all').map((f) => [f.id, f.label] as const))(
    'the "%s" filter returns exactly the projects tagged with it',
    async (filter) => {
      await openDirectory();
      const expected = projectsByFilter(filter).map((p) => p.name).sort();

      await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${filterDefinitions.find((f) => f.id === filter)!.label}`) }));

      await waitFor(() => {
        expect(visibleProjectNames().sort()).toEqual(expected);
      });
      expectStatusCount(expected.length);
    },
  );

  it('shows a real count on every filter chip', async () => {
    await openDirectory();
    for (const definition of filterDefinitions) {
      const chip = screen.getByRole('button', { name: new RegExp(`^${definition.label}`) });
      expect(chip).toHaveTextContent(String(projectsByFilter(definition.id as FilterId).length));
    }
  });

  it('marks the active filter with aria-pressed', async () => {
    await openDirectory();
    const chip = screen.getByRole('button', { name: /^Cybersecurity/ });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    await waitFor(() => expect(chip).toHaveAttribute('aria-pressed', 'true'));
  });

  it('puts the filter state in the URL so a filtered view is shareable', async () => {
    await openDirectory('/projects?filter=network-analysis');
    await waitFor(() => {
      expect(visibleProjectNames().sort()).toEqual(
        projectsByFilter('network-analysis').map((p) => p.name).sort(),
      );
    });
    expect(screen.getByRole('button', { name: /^Network Analysis/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('ignores an unknown filter value in the URL instead of showing nothing', async () => {
    await openDirectory('/projects?filter=nonsense');
    await waitFor(() => {
      expect(visibleProjectNames()).toHaveLength(projects.length);
    });
  });

  it('restores the full list when filters are cleared', async () => {
    await openDirectory('/projects?filter=education&q=quiz');
    const clear = screen.getByRole('button', { name: /clear filters/i });
    await userEvent.click(clear);

    await waitFor(() => {
      expect(visibleProjectNames()).toHaveLength(projects.length);
    });
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });
});

describe('project search', () => {
  it('filters by name as the visitor types', async () => {
    const user = userEvent.setup();
    const search = await openDirectory();

    await user.type(search, 'netscope');
    await waitFor(() => {
      expect(visibleProjectNames()).toEqual(['NetScope']);
    });
    expectStatusCount(1, 9);
  });

  it('searches technologies, categories and feature text', async () => {
    const user = userEvent.setup();
    const search = await openDirectory();

    await user.type(search, 'bandit');
    await waitFor(() => expect(visibleProjectNames()).toEqual(['SecureCode Workbench']));

    await user.clear(search);
    await user.type(search, 'deduplication');
    await waitFor(() => expect(visibleProjectNames()).toEqual(['ThreatIntel Desk']));

    await user.clear(search);
    await user.type(search, 'flashcards');
    await waitFor(() => expect(visibleProjectNames()).toEqual(['TranscriptWise']));
  });

  it('reads the query from the URL', async () => {
    await openDirectory('/projects?q=pcap');
    await waitFor(() => {
      expect(visibleProjectNames()).toEqual(searchProjects('pcap').map((p) => p.name));
    });
    expect(screen.getByRole('searchbox', { name: /search projects/i })).toHaveValue('pcap');
  });

  it('shows a helpful empty state with a recovery action when nothing matches', async () => {
    const user = userEvent.setup();
    const search = await openDirectory();

    await user.type(search, 'zzzznothing');

    await waitFor(() => {
      expect(screen.getByText(/No projects match those filters/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/“zzzznothing”/)).toBeInTheDocument();
    expect(visibleProjectNames()).toHaveLength(0);

    // Two controls can say "Clear filters" at once (the live counter and the
    // empty state); click the one inside the empty state.
    const emptyState = screen
      .getByText(/No projects match those filters/i)
      .closest('.border-dashed') as HTMLElement;
    expect(emptyState, 'the empty state should render as a distinct block').not.toBeNull();
    await user.click(within(emptyState).getByRole('button', { name: /clear filters/i }));
    await waitFor(() => {
      expect(visibleProjectNames()).toHaveLength(projects.length);
    });
  });

  it('announces the result count to assistive technology', async () => {
    await openDirectory();
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Showing 9 of 9 projects');
  });

  it('clears the query with the inline control', async () => {
    const user = userEvent.setup();
    const search = await openDirectory();
    await user.type(search, 'hash');
    const matches = searchProjects('hash');
    expect(matches.length, 'the fixture query should still match something').toBeGreaterThan(0);
    await waitFor(() =>
      expect(visibleProjectNames().sort()).toEqual(matches.map((p) => p.name).sort()),
    );

    await user.click(screen.getByRole('button', { name: /clear search/i }));
    await waitFor(() => {
      expect(visibleProjectNames()).toHaveLength(projects.length);
    });
    expect(search).toHaveValue('');
  });
});

describe('sorting', () => {
  it('sorts by name', async () => {
    const user = userEvent.setup();
    await openDirectory();

    await user.selectOptions(screen.getByLabelText(/^Sort$/), 'name');

    await waitFor(() => {
      expect(visibleProjectNames()).toEqual([...projects].map((p) => p.name).sort((a, b) => a.localeCompare(b)));
    });
  });

  it('sorts by broadest stack', async () => {
    const user = userEvent.setup();
    await openDirectory();

    await user.selectOptions(screen.getByLabelText(/^Sort$/), 'tech');

    await waitFor(() => {
      const counts = visibleProjectNames().map((name) => {
        const project = projects.find((p) => p.name === name)!;
        return project.tech.length;
      });
      const sorted = [...counts].sort((a, b) => b - a);
      expect(counts).toEqual(sorted);
    });
  });

  it('returns to curated order and drops the parameter from the URL', async () => {
    const user = userEvent.setup();
    await openDirectory('/projects?sort=name');
    await user.selectOptions(screen.getByLabelText(/^Sort$/), 'curated');

    await waitFor(() => {
      expect(visibleProjectNames()).toEqual(projects.map((p) => p.name));
    });
  });
});

describe('project cards', () => {
  it('links every card to its own case study', async () => {
    await openDirectory();
    for (const project of projects) {
      const link = screen.getByRole('link', { name: `${project.name} — open case study` });
      expect(link).toHaveAttribute('href', `/projects/${project.slug}`);
    }
  });

  it('shows the primary category, tagline, summary, capabilities and key technologies', async () => {
    await openDirectory();
    const project = getProject('incidentflow')!;
    const card = screen.getByRole('link', { name: /IncidentFlow — open case study/ }).closest('article')!;

    expect(card).toHaveTextContent(project.categories[0]);
    expect(card).toHaveTextContent(project.tagline);
    expect(card).toHaveTextContent(project.summary);
    for (const capability of project.capabilities) {
      expect(card).toHaveTextContent(capability);
    }
    for (const tech of project.keyTech) {
      expect(card).toHaveTextContent(tech);
    }
  });

  it('renders preview artwork with a descriptive accessible label', async () => {
    await openDirectory();
    const images = screen.getAllByRole('img');
    expect(images.length).toBe(projects.length);
    for (const project of projects) {
      expect(screen.getByRole('img', { name: project.preview.alt })).toBeInTheDocument();
    }
  });

  it('hides live-demo and source links while no URLs are configured', async () => {
    await openDirectory();
    expect(screen.queryByRole('link', { name: /^Live app$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Source$/ })).not.toBeInTheDocument();
  });

  it('gives each project a distinct accent so cards are not interchangeable', async () => {
    await openDirectory();
    const accents = projects.map((project) => project.accent);
    expect(new Set(accents).size).toBe(accents.length);

    const cards = screen.getAllByRole('link', { name: /— open case study$/ }).map((l) => l.closest('article')!);
    const applied = cards.map((card) => card.getAttribute('data-accent'));
    expect(new Set(applied).size).toBe(projects.length);
  });
});

describe('directory header facts', () => {
  it('reports the real project and category counts', async () => {
    await openDirectory();
    const header = screen.getByRole('heading', { level: 1, name: /Nine applications/i }).parentElement!;
    expect(header).toHaveTextContent(String(projects.length));
    expect(within(header).getByText(String(filterDefinitions.length - 1))).toBeInTheDocument();
  });
});
