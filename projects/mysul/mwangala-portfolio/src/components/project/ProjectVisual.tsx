import { getPreview } from '@/components/previews';
import type { Project } from '@/types/project';
import { cn } from '@/lib/cn';

/**
 * The visual for a project.
 *
 * If a real screenshot has been configured (`preview.screenshot`) it is used;
 * otherwise the project-specific drawn preview renders. The drawn artwork is
 * always labelled as representative, never as a screenshot of a deployed app.
 */
export function ProjectVisual({
  project,
  className,
  labelArtwork = true,
}: {
  project: Project;
  className?: string;
  labelArtwork?: boolean;
}) {
  const preview = getPreview(project);

  return (
    <div
      data-accent={project.accent}
      className={cn('relative isolate overflow-hidden bg-canvas', className)}
    >
      {project.preview.screenshot ? (
        <img
          src={project.preview.screenshot}
          alt={project.preview.alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-top"
        />
      ) : preview ? (
        <preview.Component title={preview.alt} />
      ) : (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-fg-subtle">
          No preview configured for this project.
        </div>
      )}

      {labelArtwork && !project.preview.screenshot ? (
        <p className="pointer-events-none absolute bottom-2 left-2 rounded-md border border-line bg-surface/90 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-fg-subtle backdrop-blur-sm">
          Representative preview
        </p>
      ) : null}
    </div>
  );
}
