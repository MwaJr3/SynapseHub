import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { getPreview, getPreviewComponent } from './index';
import { projects, getProject } from '@/data/projects';
import { ProjectCard } from '@/components/project/ProjectCard';
import { ProjectVisual } from '@/components/project/ProjectVisual';

function renderInRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/** Visual key -> artwork component, resolved through the public registry API. */
const artworkRegistry = Object.fromEntries(
  projects.map((project) => [
    project.preview.visual,
    getPreviewComponent(project.preview.visual)!,
  ]),
);

describe('project preview artwork', () => {
  it('registers preview artwork for every project, and nothing is orphaned', () => {
    for (const project of projects) {
      expect(getPreview(project), `artwork missing for ${project.slug}`).toBeDefined();
    }
    const used = new Set(projects.map((project) => project.preview.visual));
    const orphaned = Object.keys(artworkRegistry).filter((key) => !used.has(key));
    expect(orphaned).toEqual([]);
  });

  it('every preview is accessible, accented and self-labelled as representative', () => {
    for (const project of projects) {
      const entry = getPreview(project)!;
      const { container } = render(<entry.Component title={entry.alt} />);
      const svg = container.querySelector('svg[role="img"]');

      expect(svg, `${project.slug}: artwork should expose role="img"`).not.toBeNull();
      expect(svg).toHaveAttribute('aria-label', project.preview.alt);
      expect(svg).toHaveAttribute('data-accent', project.accent);
      expect(svg?.textContent, `${project.slug}: must state it is a representative preview`).toMatch(
        /representative preview/i,
      );
    }
  });

  it('renders meaningful content rather than an empty frame', () => {
    for (const project of projects) {
      const entry = getPreview(project)!;
      const { container } = render(<entry.Component title={entry.alt} />);

      const texts = container.querySelectorAll('text');
      expect(
        texts.length,
        `${project.slug} preview should contain readable labels`,
      ).toBeGreaterThan(8);

      const shapes = container.querySelectorAll('rect, circle, path, line');
      expect(shapes.length, `${project.slug} preview should be drawn, not blank`).toBeGreaterThan(10);
    }
  });

  it('uses theme tokens rather than hardcoded colour literals', () => {
    // Only presentation attributes matter here: sample content inside the
    // artwork may legitimately contain text such as "invoice #4417".
    const colourProps = ['fill', 'stroke', 'stop-color', 'color', 'style'];

    for (const project of projects) {
      const entry = getPreview(project)!;
      const { container } = render(<entry.Component title={entry.alt} />);

      const offenders: string[] = [];
      container.querySelectorAll('*').forEach((node) => {
        for (const attr of node.attributes) {
          if (!colourProps.includes(attr.name.toLowerCase())) continue;
          if (/#[0-9a-fA-F]{3,8}\b/.test(attr.value) || /\brgba?\(/.test(attr.value)) {
            offenders.push(`<${node.tagName.toLowerCase()} ${attr.name}="${attr.value}">`);
          }
        }
      });

      expect(offenders, `${project.slug} preview hardcodes colours`).toEqual([]);
      // Presentation should reference design tokens.
      expect(container.innerHTML).toMatch(/var\(--/);
    }
  });

  it('each preview is visually distinct from the others', () => {
    const seen = new Map<string, string>();
    for (const project of projects) {
      const entry = getPreview(project)!;
      const { container } = render(<entry.Component title={entry.alt} />);
      const signature = container.innerHTML;
      const duplicate = seen.get(signature);
      expect(duplicate, `${project.slug} reuses another project's artwork`).toBeUndefined();
      seen.set(signature, project.slug);
    }
    expect(seen.size).toBe(projects.length);
  });
});

describe('ProjectVisual', () => {
  it('draws the project preview and labels it representative', () => {
    const project = getProject('phishlens')!;
    const { container } = renderInRouter(<ProjectVisual project={project} />);

    const image = container.querySelector('[role="img"]');
    expect(image).toHaveAttribute('aria-label', project.preview.alt);
    // The visible disclaimer badge.
    expect(container.textContent).toMatch(/representative/i);
  });

  it('prefers a real screenshot when one is supplied', () => {
    const project = getProject('phishlens')!;
    const withScreenshot = {
      ...project,
      preview: { ...project.preview, screenshot: '/screenshots/phishlens.png' },
    };
    const { container } = renderInRouter(<ProjectVisual project={withScreenshot} />);

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', '/screenshots/phishlens.png');
    expect(img).toHaveAttribute('alt', project.preview.alt);
    expect(container.querySelector('svg[role="img"]')).toBeNull();
  });
});

describe('ProjectCard', () => {
  it.each(projects.map((p) => [p.slug, p] as const))('%s renders a complete card', (_slug, project) => {
    const { container } = renderInRouter(<ProjectCard project={project} />);

    // Name links to the case study.
    const caseStudyLink = container.querySelector(`a[href="/projects/${project.slug}"]`);
    expect(caseStudyLink).not.toBeNull();
    expect(container.textContent).toContain(project.name);
    expect(container.textContent).toContain(project.tagline);

    // Summary appears in the visible body and in the screen-reader duplicate.
    expect(container.textContent!.split(project.summary).length - 1).toBe(2);

    // Categories (the card shows the first two) and the highlighted tech chips.
    for (const category of project.categories.slice(0, 2)) {
      expect(container.textContent).toContain(category);
    }
    for (const tech of project.keyTech) {
      expect(container.textContent).toContain(tech);
    }

    // Up to two capabilities in the full variant.
    for (const capability of project.capabilities.slice(0, 2)) {
      expect(container.textContent).toContain(capability);
    }

    // Preview artwork with the registry description.
    const artwork = container.querySelector('svg[role="img"]');
    expect(artwork).toHaveAttribute('aria-label', project.preview.alt);

    // No external links while nothing is configured.
    expect(container.querySelector('a[target="_blank"]')).toBeNull();
    expect(container.textContent).not.toMatch(/Live app/i);
  });

  it('shows external actions only when links are configured', () => {
    const project = getProject('netscope')!;
    const configured = {
      ...project,
      liveUrl: 'https://example.test/netscope',
      repoUrl: 'https://github.com/example/netscope',
    };
    const { container } = renderInRouter(<ProjectCard project={configured} />);

    const external = container.querySelectorAll('a[target="_blank"][rel~="noopener"]');
    expect(external.length).toBe(2);
    const hrefs = Array.from(external).map((node) => node.getAttribute('href'));
    expect(hrefs).toContain('https://example.test/netscope');
    expect(hrefs).toContain('https://github.com/example/netscope');
  });

  it('renders a compact variant without the capability list', () => {
    const project = getProject('incidentflow')!;
    const { container } = renderInRouter(<ProjectCard project={project} variant="compact" />);

    expect(container.textContent).toContain(project.name);
    expect(container.textContent).not.toContain(project.capabilities[0]);
    // The artwork still renders, and is still labelled.
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
  });

  it('carries the project accent as a custom property', () => {
    const project = getProject('hashsight')!;
    const { container } = renderInRouter(<ProjectCard project={project} />);
    const card = container.querySelector('[data-accent]');
    expect(card).toHaveAttribute('data-accent', project.accent);
  });
});
