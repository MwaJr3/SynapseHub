import { Link } from 'react-router-dom';
import type { ChallengeRecord } from '@challenges';
import { ChallengeVisual } from './ChallengeVisual';
import { ChallengeLinks } from './ChallengeLinks';

export function ChallengeCard({ project }: { project: ChallengeRecord }) {
  return (
    <article className="challenge-card group">
      <Link to={`/projects/${project.slug}`} className="challenge-card__visual" aria-label={`Open ${project.title} case study`}>
        <ChallengeVisual project={project} compact />
      </Link>
      <div className="challenge-card__body">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">{project.category}</span>
          {project.difficulty && <span className="chip">{project.difficulty}</span>}
          {project.challengeType === 'product' && <span className="chip chip--featured">Product brief</span>}
          {project.featured && <span className="chip chip--featured">Selected brief</span>}
        </div>
        <div className="mt-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight"><Link className="challenge-card__title" to={`/projects/${project.slug}`}>{project.title}</Link></h2>
          <span className="mono-meta shrink-0">{String(project.displayOrder).padStart(2, '0')}</span>
        </div>
        <p className="prose-body mt-2 text-sm">{project.description}</p>
        {project.technologies.length > 0 && <div className="flex flex-wrap gap-2">{project.technologies.slice(0, 4).map((technology) => <span className="chip" key={technology}>{technology}</span>)}</div>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <span className="mono-meta">Interactive prototype available</span>
          <div className="flex flex-wrap gap-3"><Link className="link-inline text-sm" to={`/apps/${project.slug}`}>Try app <span aria-hidden="true">↗</span></Link><Link className="link-inline text-sm" to={`/projects/${project.slug}`}>Challenge notes <span aria-hidden="true">↗</span></Link></div>
        </div>
        <ChallengeLinks project={project} compact />
      </div>
    </article>
  );
}
