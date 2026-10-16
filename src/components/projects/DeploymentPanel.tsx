import type { PortfolioProject } from '@/types';
import { ProjectExternalActions } from './ProjectExternalActions';

interface DeploymentPanelProps {
  project: PortfolioProject;
}

function StatusRow({
  label,
  hint,
  connected,
  children,
}: {
  label: string;
  hint: string;
  connected: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-t border-line py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="sm:max-w-sm">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="prose-body mt-1 text-xs">{hint}</p>
      </div>
      <div className="sm:text-right">
        <p className="chip inline-flex">
          {connected ? 'Connected' : 'Not yet connected'}
        </p>
        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
  );
}

/**
 * The connection status of a project's application and source repository.
 *
 * This is the visible side of the deployment registry (`src/config/deployment.ts`):
 * a project is documented first, and the links appear here — and on its card —
 * the moment the real URL is configured. Nothing is ever invented, and the
 * panel states plainly when a link does not exist yet.
 */
export function DeploymentPanel({ project }: DeploymentPanelProps) {
  const hasAnyLink = Boolean(project.liveDemoUrl || project.repositoryUrl);

  return (
    <section aria-labelledby="deployment-heading" className="card p-5 sm:p-6">
      <h2 id="deployment-heading" className="text-base font-semibold text-ink">
        Application and source
      </h2>
      <p className="prose-body mt-2 text-sm">
        Each project in this portfolio is documented as a case study first. The
        buttons below appear once a real deployment or repository is connected —
        there are no placeholder destinations on this site.
      </p>

      <div className="mt-5">
        <StatusRow
          label="Live application"
          hint={
            project.liveDemoUrl
              ? 'Opens the deployed application in a new tab.'
              : 'No public deployment has been configured for this project yet.'
          }
          connected={Boolean(project.liveDemoUrl)}
        />
        <StatusRow
          label="Source repository"
          hint={
            project.repositoryUrl
              ? 'Opens the repository in a new tab.'
              : 'The repository is not public yet. Implementation detail is described in the case study instead.'
          }
          connected={Boolean(project.repositoryUrl)}
        />
      </div>

      {project.demoRequirements && (
        <p className="prose-body mt-4 border-t border-line pt-4 text-xs">
          <span className="font-semibold text-ink">Running it yourself: </span>
          {project.demoRequirements}
        </p>
      )}

      {hasAnyLink && (
        <ProjectExternalActions project={project} className="mt-5" size="sm" />
      )}
    </section>
  );
}
