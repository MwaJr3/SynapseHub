import type { CaseStudy } from '@/types';

interface ResponsibleNoteProps {
  caseStudy: CaseStudy;
  projectName: string;
}

/**
 * Limitations and next steps, in two clearly labelled columns.
 *
 * Limitations are written as facts about the current implementation, and the
 * improvement list is explicitly labelled as not implemented yet.
 */
export function ResponsibleNote({
  caseStudy,
  projectName,
}: ResponsibleNoteProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-card border border-caution/40 bg-caution/[0.06] p-5">
        <h3 className="flex items-center gap-3 text-sm font-semibold text-ink">
          <span className="chip border-caution/50 text-caution">
            Limitations
          </span>
          What {projectName} does not do yet
        </h3>
        <ul className="mt-4 grid gap-3">
          {caseStudy.limitations.map((limitation) => (
            <li key={limitation} className="flex gap-3 text-sm text-ink-muted">
              <span
                aria-hidden="true"
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-caution"
              />
              <span>{limitation}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-card border border-line bg-panel p-5">
        <h3 className="flex items-center gap-3 text-sm font-semibold text-ink">
          <span className="chip">Roadmap</span>
          Considered next, not implemented
        </h3>
        <ul className="mt-4 grid gap-3">
          {caseStudy.futureImprovements.map((improvement) => (
            <li key={improvement} className="flex gap-3 text-sm text-ink-muted">
              <span
                aria-hidden="true"
                className="mt-2 h-1 w-1 shrink-0 rounded-full bg-line-strong"
              />
              <span>{improvement}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
