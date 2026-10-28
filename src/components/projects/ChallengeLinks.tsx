import type { ChallengeRecord } from '@challenges';
import { resolveExternalUrl } from '@/config/site';

export function ChallengeLinks({ project, compact = false }: { project: ChallengeRecord; compact?: boolean }) {
  const liveDemoUrl = resolveExternalUrl(project.liveDemoUrl);
  const repositoryUrl = resolveExternalUrl(project.repositoryUrl);
  if (!liveDemoUrl && !repositoryUrl) return null;
  return <div className={`challenge-links ${compact ? 'challenge-links--compact' : ''}`}>
    {liveDemoUrl && <a href={liveDemoUrl} target="_blank" rel="noopener noreferrer">Live demo <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>}
    {repositoryUrl && <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">Source code <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>}
  </div>;
}
