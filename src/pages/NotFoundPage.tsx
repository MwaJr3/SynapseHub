import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { usePageMeta } from '@/hooks/usePageMeta';
import { projects } from '@/data/projects';

export default function NotFoundPage() {
  usePageMeta({
    title: 'Page not found',
    description:
      'This address does not match any page on the portfolio. The project library and case studies are one click away.',
    path: '/404',
    noIndex: true,
  });

  return (
    <>
      <PageHeader
        tone="contrast"
        eyebrow="404"
        title="This page does not exist"
        summary="The link may be mistyped, or a page may have moved. Nothing was lost — the catalogue is intact."
        aside={
          <div className="flex flex-wrap gap-3">
            <Button to="/" variant="primary">
              Back to the home page
            </Button>
            <Button to="/projects" variant="secondary">
              Open the project library
            </Button>
          </div>
        }
      />

      <Section
        tone="surface"
        eyebrow="Try instead"
        title={`All ${projects.length} projects are still reachable`}
        description="Every case study has its own address, so a refresh or a direct link always works."
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.slug}>
              <Link
                to={`/projects/${project.slug}`}
                className="card card-interactive flex flex-col gap-1 p-4 text-sm"
              >
                <span className="font-semibold text-ink">{project.name}</span>
                <span className="mono-meta">{project.primaryCategory}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
