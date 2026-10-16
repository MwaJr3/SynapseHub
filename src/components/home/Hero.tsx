import { Button } from '@/components/ui/Button';
import { HeroDiagram } from './HeroDiagram';
import { links, profileConfig } from '@/config/site';
import { projects } from '@/data/projects';
import { focusAreas } from '@/data/focus-areas';
import { pluralise } from '@/lib/format';
import { ArrowUpRightIcon } from '@/components/projects/ProjectExternalActions';

/**
 * The hero sets the technical identity: what is built, for which problems,
 * and with what emphasis — offline access, transparent systems, responsible AI.
 */
export function Hero() {
  return (
    <section
      data-tone="contrast"
      className="motif-grid relative overflow-hidden border-b border-line bg-surface text-ink"
    >
      <div className="shell relative grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-24">
        <div>
          <p className="eyebrow">{profileConfig.role}</p>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Building Better Ways to Learn. Engineering Tools That Open Access.
          </h1>
          <p className="prose-lead mt-6 max-w-prose">
            I&apos;m {profileConfig.name}, a developer exploring how software
            can make learning more accessible, personal and practical. I build
            applications for offline study, teaching, learning support,
            education workflows and responsible AI-assisted learning.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button to="/projects" variant="primary">
              Explore the projects
            </Button>
            <Button to="/about" variant="secondary">
              About my work
            </Button>
            {links.github && (
              <Button
                href={links.github}
                variant="ghost"
                icon={<ArrowUpRightIcon />}
              >
                View GitHub
              </Button>
            )}
          </div>

          <dl className="mt-10 grid max-w-prose grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6 sm:grid-cols-3">
            <div>
              <dt className="mono-meta">Projects</dt>
              <dd className="mt-1 text-sm text-ink-muted">
                {pluralise(projects.length, 'documented application')}
              </dd>
            </div>
            <div>
              <dt className="mono-meta">Focus areas</dt>
              <dd className="mt-1 text-sm text-ink-muted">
                {focusAreas.length} accessibility domains
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="mono-meta">Strongest thread</dt>
              <dd className="mt-1 text-sm text-ink-muted">
                Offline-first delivery, explainable systems, human review
              </dd>
            </div>
          </dl>
        </div>

        <HeroDiagram />
      </div>
    </section>
  );
}
