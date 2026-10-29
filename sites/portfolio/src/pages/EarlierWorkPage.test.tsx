import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { earlierProjects } from '@/data/earlierWork';
import { renderAppAt } from '@/test/testUtils';

describe('earlier work data module', () => {
  it('holds the seven archived projects with unique slugs', () => {
    expect(earlierProjects).toHaveLength(7);
    expect(new Set(earlierProjects.map((p) => p.slug)).size).toBe(7);
  });

  it('keeps every case study substantial', () => {
    for (const project of earlierProjects) {
      expect(project.problem.length).toBeGreaterThan(40);
      expect(project.objective.length).toBeGreaterThan(40);
      expect(project.solution.length).toBeGreaterThan(40);
      expect(project.features.length).toBeGreaterThanOrEqual(4);
      expect(project.techStack.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('EarlierWorkPage', () => {
  it('lists all seven archived case studies', async () => {
    renderAppAt('/earlier-work');
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /earlier work/i })).toBeInTheDocument();
    });
    const main = screen.getByRole('main');
    for (const project of earlierProjects) {
      expect(
        within(main).getByRole('heading', { level: 3, name: project.name }),
      ).toBeInTheDocument();
    }
  });

  it('states honestly that no source links exist and publishes none', async () => {
    renderAppAt('/earlier-work');
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /earlier work/i })).toBeInTheDocument();
    });
    expect(screen.getAllByText(/source repositories were never published/i).length).toBe(7);
    const main = screen.getByRole('main');
    for (const anchor of within(main).queryAllByRole('link')) {
      expect(anchor.getAttribute('href') ?? '').not.toMatch(/^https?:/);
    }
  });

  it('exposes the section in the primary navigation', async () => {
    renderAppAt('/earlier-work');
    const nav = screen.getByRole('navigation', { name: /primary/i });
    expect(within(nav).getByRole('link', { name: /earlier work/i })).toHaveAttribute(
      'href',
      '/earlier-work',
    );
  });
});
