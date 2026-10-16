import type { PortfolioProject } from '@/types';
import { ProjectVisual } from '@/components/visuals/ProjectVisual';

interface PreviewGalleryProps {
  project: PortfolioProject;
}

/**
 * Interface gallery for a case study.
 *
 * Entries with a real `screenshotSrc` render the captured image; every other
 * entry renders the project's illustrative composition with an explicit badge
 * and caption, so the two are never confused.
 */
export function PreviewGallery({ project }: PreviewGalleryProps) {
  const hasRealScreenshot = project.previews.some(
    (preview) => preview.screenshotSrc,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {project.previews.map((preview) => (
        <div key={preview.id} className="flex flex-col gap-3">
          {preview.screenshotSrc ? (
            <figure className="overflow-hidden rounded-card border border-line bg-panel">
              <img
                src={preview.screenshotSrc}
                alt={preview.alt}
                loading="lazy"
                decoding="async"
                width={1280}
                height={800}
                className="h-auto w-full"
              />
              <figcaption className="border-t border-line px-4 py-3 text-xs text-ink-muted">
                {preview.caption}
                <span className="mono-meta ml-2">captured screenshot</span>
              </figcaption>
            </figure>
          ) : (
            <ProjectVisual slug={project.slug} view={preview.view} />
          )}
          {!preview.screenshotSrc && (
            <p className="prose-body text-xs">
              <span className="font-semibold text-ink">
                Illustrative preview:{' '}
              </span>
              {preview.caption} This composition demonstrates the intended
              interface and states; it is not a screenshot of a running
              deployment.
            </p>
          )}
        </div>
      ))}

      <p className="prose-body text-xs lg:col-span-2">
        {hasRealScreenshot
          ? 'Screenshots shown here are captured from the application running with synthetic demonstration data.'
          : 'No screenshots are published yet: genuine captures are added when the application is deployed, and this note is replaced by the real images rather than by a mockup.'}
      </p>
    </div>
  );
}
