import { describe, expect, it } from 'vitest';
import {
  catalogue,
  connectProjects,
  featuredProjects,
  getProject,
  getRelatedProjects,
  projects,
} from './index';
import { categories } from '@/data/categories';
import { deploymentRegistry } from '@/config/deployment';
import { projectDataErrors, projectDataIssues } from '@/lib/validate';
import type { PortfolioProject } from '@/types';

const EXPECTED_SLUGS = [
  'learnbridge',
  'classconnect',
  'tutorspring',
  'pathwise',
  'teachcraft',
  'openlearn-commons',
  'learnpulse',
  'reachlearn',
  'eduaccess',
  'workniche',
];

describe('project catalogue', () => {
  it('contains all ten projects with unique slugs and ids', () => {
    expect(catalogue).toHaveLength(10);
    expect(catalogue.map((project) => project.slug)).toEqual(EXPECTED_SLUGS);
    expect(new Set(catalogue.map((project) => project.id)).size).toBe(10);
  });

  it('has no structural data errors', () => {
    expect(projectDataErrors()).toEqual([]);
  });

  it('reports no catalogue warnings either', () => {
    // Warnings are softer rules (related-link reciprocity, tag counts, preview
    // captions) that this catalogue is expected to satisfy too.
    expect(
      projectDataIssues().filter((issue) => issue.level === 'warning'),
    ).toEqual([]);
  });

  it('gives every project a distinct case study', () => {
    const problems = new Set(
      catalogue.map((project) => project.caseStudy.problem),
    );
    const descriptions = new Set(
      catalogue.map((project) => project.shortDescription),
    );
    const workflows = new Set(
      catalogue.map((project) =>
        project.caseStudy.workflow.map((step) => step.title).join('|'),
      ),
    );

    expect(problems.size).toBe(10);
    expect(descriptions.size).toBe(10);
    expect(workflows.size).toBe(10);
  });

  it('only references categories that exist', () => {
    const known = new Set(categories.map((category) => category.id));
    for (const project of catalogue) {
      for (const categoryId of project.categories) {
        expect(known.has(categoryId), `${project.slug} → ${categoryId}`).toBe(
          true,
        );
      }
    }
  });

  it('keeps related-project links inside the catalogue and reciprocal', () => {
    for (const project of catalogue) {
      for (const relatedSlug of project.relatedSlugs) {
        const related = getProject(relatedSlug);
        expect(related, `${project.slug} → ${relatedSlug}`).toBeDefined();
        expect(related?.relatedSlugs).toContain(project.slug);
      }
    }
  });

  it('marks exactly four projects as featured', () => {
    expect(featuredProjects).toHaveLength(4);
    expect(featuredProjects.map((project) => project.slug)).toEqual([
      'learnbridge',
      'tutorspring',
      'pathwise',
      'reachlearn',
    ]);
    expect(
      projectDataIssues().filter((issue) => issue.message.includes('featured')),
    ).toEqual([]);
  });

  it('marks every published preview as illustrative and none as a screenshot', () => {
    for (const project of catalogue) {
      expect(project.previews.length).toBeGreaterThanOrEqual(2);
      for (const preview of project.previews) {
        expect(preview.isIllustrative).toBe(true);
        expect(preview.screenshotSrc).toBeUndefined();
        expect(preview.caption.length).toBeGreaterThan(20);
        expect(preview.caption.toLowerCase()).not.toContain('screenshot');
        expect(preview.alt.length).toBeGreaterThan(20);
      }
    }
  });

  it('connects every architecture node to real neighbours', () => {
    for (const project of catalogue) {
      const ids = new Set(project.architecture.map((node) => node.id));
      for (const node of project.architecture) {
        for (const target of node.connectsTo ?? []) {
          expect(
            ids.has(target),
            `${project.slug}: ${node.id} → ${target}`,
          ).toBe(true);
        }
      }
    }
  });
});

describe('deployment registry', () => {
  it('starts empty: no application or repository is invented', () => {
    expect(Object.keys(deploymentRegistry)).toHaveLength(0);
    for (const project of projects) {
      expect(project.liveDemoUrl).toBeUndefined();
      expect(project.repositoryUrl).toBeUndefined();
    }
  });

  it('connects a project when a registry entry is added', () => {
    const connected = connectProjects(
      {
        learnbridge: {
          liveDemoUrl: 'https://demo.example-app.org/learnbridge',
          repositoryUrl: 'https://github.com/MwaJr3/learnbridge',
        },
      },
      catalogue,
    );

    const learnbridge = connected.find(
      (project) => project.slug === 'learnbridge',
    );
    expect(learnbridge?.liveDemoUrl).toBe(
      'https://demo.example-app.org/learnbridge',
    );
    expect(learnbridge?.repositoryUrl).toBe(
      'https://github.com/MwaJr3/learnbridge',
    );

    // Untouched projects keep no links at all.
    const pathwise = connected.find((project) => project.slug === 'pathwise');
    expect(pathwise?.liveDemoUrl).toBeUndefined();
    expect(pathwise?.repositoryUrl).toBeUndefined();
  });

  it('drops malformed URLs instead of rendering them', () => {
    const connected = connectProjects(
      {
        pathwise: {
          liveDemoUrl: 'javascript:alert(1)',
          repositoryUrl: 'not a url',
        },
      },
      catalogue,
    );

    const pathwise = connected.find((project) => project.slug === 'pathwise');
    expect(pathwise?.liveDemoUrl).toBeUndefined();
    expect(pathwise?.repositoryUrl).toBeUndefined();
  });

  it('never swaps repository and demo fields', () => {
    const connected = connectProjects(
      { tutorspring: { liveDemoUrl: 'https://github.com/MwaJr3/tutorspring' } },
      catalogue,
    );
    const tutorspring = connected.find(
      (project) => project.slug === 'tutorspring',
    );

    // The value is kept in the field it was configured for…
    expect(tutorspring?.liveDemoUrl).toBe(
      'https://github.com/MwaJr3/tutorspring',
    );
    // …and no repository link is invented from it.
    expect(tutorspring?.repositoryUrl).toBeUndefined();
  });

  it('keeps the catalogue immutable when connecting projects', () => {
    const before: PortfolioProject | undefined = catalogue.find(
      (project) => project.slug === 'eduaccess',
    );
    connectProjects(
      { eduaccess: { repositoryUrl: 'https://github.com/MwaJr3/eduaccess' } },
      catalogue,
    );
    const after = catalogue.find((project) => project.slug === 'eduaccess');

    expect(before?.repositoryUrl).toBeUndefined();
    expect(after?.repositoryUrl).toBeUndefined();
  });
});

describe('related projects', () => {
  it('returns resolved project records for a project', () => {
    const project = getProject('learnbridge');
    expect(project).toBeDefined();
    const related = getRelatedProjects(project!);

    expect(related.length).toBe(project!.relatedSlugs.length);
    for (const item of related) {
      expect(item.name).toBeTruthy();
      expect(
        item.categories.some((category) =>
          project!.categories.includes(category),
        ),
      ).toBe(true);
    }
  });
});
