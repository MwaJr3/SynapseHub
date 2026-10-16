import { Link } from 'react-router-dom';
import { principles } from '@/data/focus-areas';
import { approachStages } from '@/data/approach';
import { contactConfig, links } from '@/config/site';
import { featuredProjects } from '@/data/projects';
import { Button } from '@/components/ui/Button';

/** Responsible-technology principles reflected across the nine projects. */
export function PrinciplesGrid() {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {principles.map((principle, index) => (
        <li
          key={principle.id}
          className="rounded-card border border-line bg-panel p-5"
        >
          <p className="mono-meta">{String(index + 1).padStart(2, '0')}</p>
          <h3 className="mt-2 text-base font-semibold text-ink">
            {principle.title}
          </h3>
          <p className="prose-body mt-2 text-sm">{principle.description}</p>
        </li>
      ))}
    </ul>
  );
}

/** Compact five-stage process preview linking to the full approach page. */
export function ApproachPreview() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-start">
      <ol className="grid gap-3">
        {approachStages.map((stage, index) => (
          <li
            key={stage.id}
            className="flex items-start gap-4 rounded-card border border-line bg-panel p-4"
          >
            <span className="font-mono text-xs text-ink-subtle">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{stage.title}</p>
              <p className="prose-body mt-1 text-sm">{stage.summary}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-card border border-line bg-panel p-5 sm:p-6">
        <h3 className="text-base font-semibold text-ink">
          Quality is demonstrated, not asserted
        </h3>
        <p className="prose-body mt-3 text-sm">
          Each project aims to show working workflows, tests for the behaviours
          that carry risk, responsible defaults and documentation — including a
          plain list of what is not finished. Where a number could not be
          measured honestly, no number is published.
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-ink-muted">
          <li className="flex gap-3">
            <span aria-hidden="true" className="mono-meta">
              →
            </span>{' '}
            Failure states designed with the happy path
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true" className="mono-meta">
              →
            </span>{' '}
            Provider boundaries isolated behind adapters
          </li>
          <li className="flex gap-3">
            <span aria-hidden="true" className="mono-meta">
              →
            </span>{' '}
            Limitations written down, not implied
          </li>
        </ul>
        <Button to="/approach" variant="secondary" className="mt-6">
          Read the development approach
        </Button>
      </div>
    </div>
  );
}

/** Short introduction that links through to the full About page. */
export function AboutPreview() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
      <blockquote className="border-l-2 border-accent pl-6">
        <p className="text-xl font-medium leading-relaxed text-ink sm:text-2xl">
          “I&apos;m interested in understanding how systems work, identifying
          problems worth solving, and building software that makes complex tasks
          more manageable.”
        </p>
      </blockquote>

      <div>
        <p className="prose-body">
          The collection explores how software can support learners and
          educators across connected and low-connectivity environments — with
          attention to usability, privacy, and the limits of automation. Some
          projects are about surviving a bad connection. Others are about
          knowing what a learner needs next, or making a funding decision
          auditable.
        </p>
        <Button to="/about" variant="secondary" className="mt-6">
          Get to know me
        </Button>
      </div>
    </div>
  );
}

/** Closing call to action. Availability wording only appears when configured. */
export function ClosingCta() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Have a meaningful learning problem to solve?
        </h2>
        <p className="prose-lead mt-4">
          I&apos;m interested in building useful software, exploring technical
          challenges, and learning through projects that make technology more
          practical and accessible.
        </p>
        {contactConfig.availabilityStatement && (
          <p className="prose-body mt-4 border-l-2 border-accent pl-4 text-sm">
            {contactConfig.availabilityStatement}
          </p>
        )}
      </div>

      <div className="rounded-card border border-line bg-panel p-5 sm:p-6">
        <p className="eyebrow">Next step</p>
        <p className="prose-body mt-2 text-sm">
          Read a case study in detail, or get in touch with a problem
          description, a constraint, and what a good outcome would look like.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button to="/contact" variant="primary">
            Get in touch
          </Button>
          <Button
            to={`/projects/${featuredProjects[0]?.slug ?? 'learnbridge'}`}
            variant="secondary"
          >
            Start with a case study
          </Button>
        </div>
        {!links.email && !links.github && !links.linkedin && (
          <p className="mono-meta mt-4">
            Contact channels are configured per deployment — see the Contact
            page for current options.
          </p>
        )}
      </div>
    </div>
  );
}

/** Small link list used at the end of the featured section. */
export function LibraryCta({ remaining }: { remaining: number }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-panel px-5 py-4">
      <p className="prose-body text-sm">
        {remaining > 0
          ? `${remaining} more projects cover teacher authoring, open resources, analytics, phone delivery and access funding.`
          : 'Browse the complete library with search, filters and sorting.'}
      </p>
      <Link to="/projects" className="btn btn-secondary px-3.5 py-2 text-sm">
        Open the project library
      </Link>
    </div>
  );
}
