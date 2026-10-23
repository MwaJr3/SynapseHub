import { describe, expect, it } from 'vitest';
import { filters as filterDefinitions } from '@/config/nav';
import {
  projects,
  projectsByFilter,
  searchProjects,
  technologyIndex,
  projectSearchText,
} from './index';
import type { FilterId } from '@/types/project';

const allFilterIds = filterDefinitions.map((definition) => definition.id);

describe('filter facets', () => {
  it.each(allFilterIds.filter((id) => id !== 'all'))(
    '"%s" returns a non-empty, correct subset',
    (filter) => {
      const result = projectsByFilter(filter);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(projects.length);
      for (const project of result) {
        expect(project.filters).toContain(filter);
      }
    },
  );

  it('"all" returns the complete registry in curated order', () => {
    const result = projectsByFilter('all');
    expect(result).toHaveLength(projects.length);
    expect(result.map((p) => p.order)).toEqual([...result.map((p) => p.order)].sort((a, b) => a - b));
  });

  it('every project is reachable from at least one non-"all" facet', () => {
    for (const project of projects) {
      const reachable = allFilterIds.some(
        (filter) => filter !== 'all' && projectsByFilter(filter).includes(project),
      );
      expect(reachable, `${project.slug} is unreachable from any filter`).toBe(true);
    }
  });

  it('returns an empty array for an unknown filter rather than throwing', () => {
    expect(projectsByFilter('nonexistent' as FilterId)).toEqual([]);
  });

  it('classifies projects into the facets a reviewer would expect', () => {
    const slugs = (filter: FilterId) => projectsByFilter(filter).map((p) => p.slug);
    expect(slugs('network-analysis')).toEqual(expect.arrayContaining(['netscope', 'assetwatch']));
    expect(slugs('security-operations')).toEqual(
      expect.arrayContaining(['threatintel-desk', 'incidentflow']),
    );
    expect(slugs('application-security')).toEqual(
      expect.arrayContaining(['securecode-workbench', 'phishlens']),
    );
    expect(slugs('education')).toEqual(expect.arrayContaining(['cyberaware-lab', 'transcriptwise']));
    expect(slugs('developer-tools')).toEqual(
      expect.arrayContaining(['securecode-workbench', 'transcriptwise']),
    );
    expect(slugs('ai-data')).toEqual(expect.arrayContaining(['transcriptwise', 'netscope']));
    // Every project is a full-stack React + FastAPI application.
    expect(slugs('full-stack')).toHaveLength(projects.length);
    // TranscriptWise is a learning platform, not a security tool.
    expect(slugs('cybersecurity')).not.toContain('transcriptwise');
  });
});

describe('search', () => {
  it('returns everything for an empty query', () => {
    expect(searchProjects('')).toHaveLength(projects.length);
    expect(searchProjects('   ')).toHaveLength(projects.length);
  });

  it('matches project names case-insensitively', () => {
    expect(searchProjects('netscope').map((p) => p.slug)).toEqual(['netscope']);
    expect(searchProjects('NETSCOPE').map((p) => p.slug)).toEqual(['netscope']);
    expect(searchProjects('hashsight').map((p) => p.slug)).toContain('hashsight');
  });

  it('matches technologies', () => {
    const results = searchProjects('scapy').map((p) => p.slug);
    expect(results).toEqual(['netscope']);
    expect(searchProjects('bandit').map((p) => p.slug)).toEqual(['securecode-workbench']);
  });

  it('matches categories and descriptions', () => {
    expect(searchProjects('threat intelligence').map((p) => p.slug)).toContain('threatintel-desk');
    expect(searchProjects('packet capture').map((p) => p.slug)).toContain('netscope');
    expect(searchProjects('flashcards').map((p) => p.slug)).toContain('transcriptwise');
  });

  it('treats multiple terms as AND', () => {
    expect(searchProjects('python fastapi').length).toBe(projects.length);
    expect(searchProjects('fastapi pcap').map((p) => p.slug)).toEqual(['netscope']);
    expect(searchProjects('netscope bandit')).toEqual([]);
  });

  it('returns an empty array for a query that matches nothing', () => {
    expect(searchProjects('zzzz-no-match')).toEqual([]);
  });

  it('searches only within the supplied subset', () => {
    const subset = projectsByFilter('education');
    expect(searchProjects('network', subset).map((p) => p.slug)).not.toContain('netscope');
  });

  it('indexes the fields the UI promises to search', () => {
    const netscope = projects.find((p) => p.slug === 'netscope')!;
    const text = projectSearchText(netscope);
    expect(text).toContain('netscope');
    expect(text).toContain('scapy');
    expect(text).toContain('network analysis');
    expect(text).toContain(netscope.features[0].title.toLowerCase());
  });

  it('never surfaces an excluded project name through search', () => {
    for (const excluded of ['sentinello', 'fileguard', 'dependsecure', 'campusflow', 'chessscope', 'sentinelcore']) {
      expect(searchProjects(excluded)).toEqual([]);
    }
  });
});

describe('technology index', () => {
  it('maps every technology to the projects that declare it', () => {
    const index = technologyIndex();
    expect(index.length).toBeGreaterThan(10);
    for (const entry of index) {
      for (const project of entry.projects) {
        expect(project.tech).toContain(entry.tech);
      }
    }
  });

  it('sorts by usage then alphabetically', () => {
    const index = technologyIndex();
    for (let i = 1; i < index.length; i += 1) {
      const previous = index[i - 1];
      const current = index[i];
      const ordered =
        previous.projects.length > current.projects.length ||
        (previous.projects.length === current.projects.length &&
          previous.tech.localeCompare(current.tech) <= 0);
      expect(ordered, `${previous.tech} should precede ${current.tech}`).toBe(true);
    }
  });

  it('lists Python and FastAPI for every project', () => {
    const index = technologyIndex();
    expect(index.find((entry) => entry.tech === 'Python')?.projects).toHaveLength(projects.length);
    expect(index.find((entry) => entry.tech === 'FastAPI')?.projects).toHaveLength(projects.length);
  });
});
