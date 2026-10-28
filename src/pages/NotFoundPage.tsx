import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePageMeta } from '@/hooks/usePageMeta';
import { challengeManifest } from '@challenges';

export default function NotFoundPage() {
  usePageMeta({ title: 'Page not found', description: 'This address does not match a page in Mwangala’s portfolio.', path: '/404', noIndex: true });
  return <><PageHeader tone="contrast" eyebrow="404 · Lost in the interface" title="This page does not exist." summary="The address may be mistyped or the page may have moved. The project collection is still here." aside={<div className="flex flex-wrap gap-3"><Link className="btn btn-primary" to="/">Go home</Link><Link className="btn btn-secondary" to="/projects">Browse projects</Link></div>} /><section className="shell section-pad"><p className="eyebrow">Try a project instead</p><h2 className="mt-3 text-2xl font-semibold">All {challengeManifest.length} case studies are reachable.</h2><ul className="not-found-list mt-6">{challengeManifest.slice(0, 8).map((project) => <li key={project.slug}><Link to={`/projects/${project.slug}`}><span>{String(project.displayOrder).padStart(2, '0')}</span>{project.title} <b aria-hidden="true">↗</b></Link></li>)}</ul><Link className="link-inline mt-5 inline-block" to="/projects">Find another project in the collection ↗</Link></section></>;
}
