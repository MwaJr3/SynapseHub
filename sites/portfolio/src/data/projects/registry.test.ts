import { describe, expect, it } from 'vitest';
import {
  excludedProjectNames,
  expectedProjectCount,
  featuredProjects,
  getAdjacentProjects,
  getProject,
  projects,
  projectSlugs,
  validateRegistry,
} from './index';
import { getPreview, getPreviewComponent } from '@/components/previews';

/**
 * The registry is the portfolio's contract. These tests fail the build if an
 * excluded project reappears, a project goes missing, or a record is too thin
 * to support a real case study.
 */
describe('project registry', () => {
  it(`contains exactly ${expectedProjectCount} projects`, () => {
    expect(projects).toHaveLength(expectedProjectCount);
    expect(projectSlugs).toHaveLength(expectedProjectCount);
    expect(new Set(projectSlugs).size).toBe(expectedProjectCount);
  });

  it('validates without throwing', () => {
    expect(() => validateRegistry()).not.toThrow();
    expect(validateRegistry()).toEqual([]);
  });

  it.each([...excludedProjectNames])('never mentions the excluded project "%s"', (excluded) => {
    const haystack = JSON.stringify(projects).toLowerCase();
    const needle = excluded.toLowerCase().replace(/[^a-z0-9]/g, '');
    const flattened = haystack.replace(/[^a-z0-9]/g, '');
    expect(flattened).not.toContain(needle);
    expect(projectSlugs).not.toContain(excluded.toLowerCase().replace(/\s+/g, '-'));
  });

  it('exposes the eight specified cybersecurity projects plus TranscriptWise', () => {
    expect(projectSlugs).toEqual([
      'phishlens',
      'netscope',
      'threatintel-desk',
      'incidentflow',
      'hashsight',
      'assetwatch',
      'securecode-workbench',
      'cyberaware-lab',
      'transcriptwise',
    ]);
  });

  it('gives every project a unique accent, id and order', () => {
    expect(new Set(projects.map((p) => p.accent)).size).toBe(projects.length);
    expect(new Set(projects.map((p) => p.id)).size).toBe(projects.length);
    expect(new Set(projects.map((p) => p.order)).size).toBe(projects.length);
  });

  it('marks the recommended highlights (plus TranscriptWise) as featured', () => {
    expect(featuredProjects.map((p) => p.slug)).toEqual([
      'phishlens',
      'netscope',
      'incidentflow',
      'securecode-workbench',
      'transcriptwise',
    ]);
    for (const project of featuredProjects) {
      expect(projects).toContain(project);
    }
  });

  it('resolves projects by slug and returns undefined for unknown slugs', () => {
    expect(getProject('netscope')?.name).toBe('NetScope');
    expect(getProject('does-not-exist')).toBeUndefined();
    expect(getProject(undefined)).toBeUndefined();
  });
});

describe('every project record is substantial enough for a case study', () => {
  it.each(projects.map((p) => [p.slug, p] as const))('%s has complete content', (_slug, project) => {
    expect(project.name.trim().length).toBeGreaterThan(1);
    expect(project.tagline.trim().length).toBeGreaterThan(10);
    expect(project.summary.trim().length).toBeGreaterThan(40);
    expect(project.description.length).toBeGreaterThanOrEqual(2);
    expect(project.features.length).toBeGreaterThanOrEqual(4);
    expect(project.demonstrates.length).toBeGreaterThanOrEqual(4);
    expect(project.tech.length).toBeGreaterThanOrEqual(4);
    expect(project.caseStudy.limitations.length).toBeGreaterThanOrEqual(3);

    const study = project.caseStudy;
    expect(study.problem.length).toBeGreaterThanOrEqual(2);
    expect(study.whoBenefits.length).toBeGreaterThanOrEqual(3);
    expect(study.objectives.length).toBeGreaterThanOrEqual(3);
    expect(study.solution.length).toBeGreaterThanOrEqual(2);
    expect(study.workflow.steps.length).toBeGreaterThanOrEqual(4);
    expect(study.architecture.layers.length).toBeGreaterThanOrEqual(3);
    expect(study.decisions.length).toBeGreaterThanOrEqual(2);
    expect(study.testing.items.length).toBeGreaterThanOrEqual(3);
    expect(study.challenges.length).toBeGreaterThanOrEqual(2);
    expect(study.demonstration.steps.length).toBeGreaterThanOrEqual(3);
    expect(study.limitations.length).toBeGreaterThanOrEqual(3);

    for (const decision of study.decisions) {
      expect(decision.context.trim().length).toBeGreaterThan(20);
      expect(decision.decision.trim().length).toBeGreaterThan(20);
      expect(decision.tradeoff.trim().length).toBeGreaterThan(20);
    }
    for (const challenge of study.challenges) {
      expect(challenge.problem.trim().length).toBeGreaterThan(20);
      expect(challenge.approach.trim().length).toBeGreaterThan(20);
      expect(challenge.reasoning.trim().length).toBeGreaterThan(20);
      expect(challenge.lesson.trim().length).toBeGreaterThan(10);
    }
  });

  it('has distinct taglines and summaries (no duplicated boilerplate)', () => {
    const taglines = projects.map((p) => p.tagline);
    const summaries = projects.map((p) => p.summary);
    expect(new Set(taglines).size).toBe(taglines.length);
    expect(new Set(summaries).size).toBe(summaries.length);
  });
});

describe('external links are never fabricated', () => {
  it.each(projects.map((p) => [p.slug, p] as const))(
    '%s only exposes https URLs or nothing at all',
    (_slug, project) => {
      for (const url of [project.liveUrl, project.repoUrl]) {
        if (url === '') continue;
        expect(url).toMatch(/^https:\/\/[^\s]+$/);
        expect(url).not.toMatch(/example\.com|placeholder|todo|your-|lorem/i);
      }
    },
  );

  it('ships with no live or repository URLs configured (so nothing points anywhere fake)', () => {
    const configured = projects.filter((p) => p.liveUrl || p.repoUrl);
    expect(configured).toEqual([]);
  });
});

describe('preview artwork', () => {
  it.each(projects.map((p) => [p.slug, p] as const))('%s has registered preview artwork', (_slug, project) => {
    expect(getPreviewComponent(project.preview.visual)).toBeTypeOf('function');
    expect(getPreview(project)?.alt).toBe(project.preview.alt);
    expect(project.preview.alt.length).toBeGreaterThan(40);
    expect(project.preview.screenshotNote).toMatch(/representative|not a screenshot/i);
    expect(project.preview.screenshot ?? '').toBe('');
  });

  it('has one distinct preview component per project', () => {
    const visuals = projects.map((p) => p.preview.visual);
    expect(new Set(visuals).size).toBe(visuals.length);
    expect(projects.every((project) => getPreview(project) !== undefined)).toBe(true);
  });
});

describe('adjacent project navigation', () => {
  it.each(projects.map((p) => p.slug))('%s has a previous and next project', (slug) => {
    const { previous, next } = getAdjacentProjects(slug);
    expect(previous).toBeDefined();
    expect(next).toBeDefined();
    expect(previous?.slug).not.toBe(slug);
    expect(next?.slug).not.toBe(slug);
  });

  it('wraps around the ends of the list', () => {
    const first = projects[0];
    const last = projects[projects.length - 1];
    expect(getAdjacentProjects(first.slug).previous?.slug).toBe(last.slug);
    expect(getAdjacentProjects(last.slug).next?.slug).toBe(first.slug);
  });

  it('returns nothing for an unknown slug', () => {
    expect(getAdjacentProjects('nope')).toEqual({ previous: undefined, next: undefined });
  });
});
