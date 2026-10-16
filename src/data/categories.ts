import type { CategoryDefinition } from '@/types';

/**
 * Filter definitions for the project library. `id` values are referenced by
 * `PortfolioProject.categories`, and `projectDataIssues()` in
 * `src/lib/validate.ts` fails the test suite if a project references an
 * unknown category.
 */
export const categories: CategoryDefinition[] = [
  {
    id: 'offline-first',
    label: 'Offline-First Learning',
    description:
      'Content that stays usable when the connection drops, with progress that survives it.',
    group: 'domain',
  },
  {
    id: 'ai-personalized',
    label: 'AI & Personalized Learning',
    description:
      'Tutoring, hints and adaptive next steps — with grounding, transparency and human oversight.',
    group: 'domain',
  },
  {
    id: 'virtual-classrooms',
    label: 'Virtual Classrooms',
    description:
      'Scheduled sessions, low-bandwidth participation and asynchronous follow-up.',
    group: 'domain',
  },
  {
    id: 'assessment-analytics',
    label: 'Assessment & Analytics',
    description:
      'Skills, evidence, mastery estimates and metric definitions that can be explained.',
    group: 'domain',
  },
  {
    id: 'teacher-tools',
    label: 'Teacher Tools',
    description:
      'Authoring, review, class management and the workflows educators live in.',
    group: 'domain',
  },
  {
    id: 'open-resources',
    label: 'Open Educational Resources',
    description:
      'Discovery, licensing, attribution, localization and responsible reuse.',
    group: 'domain',
  },
  {
    id: 'mobile-low-bandwidth',
    label: 'Mobile & Low-Bandwidth Learning',
    description:
      'Delivery designed for basic phones, thin connections and expensive data.',
    group: 'domain',
  },
  {
    id: 'affordable-access',
    label: 'Affordable Access',
    description:
      'Scholarships, fee waivers, sponsored seats and transparent allocation workflows.',
    group: 'domain',
  },
  {
    id: 'python',
    label: 'Python',
    description:
      'FastAPI services, Pydantic validation, SQLAlchemy models and data processing.',
    group: 'technology',
  },
  {
    id: 'full-stack',
    label: 'Full-Stack Development',
    description:
      'React and TypeScript clients talking to typed APIs and relational data.',
    group: 'technology',
  },
];

export const categoryById = new Map(
  categories.map((category) => [category.id, category]),
);

export const categoryLabels: Record<string, string> = Object.fromEntries(
  categories.map((category) => [category.id, category.label]),
);

export function getCategory(id: string): CategoryDefinition | undefined {
  return categoryById.get(id);
}
