import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePageMeta } from '@/hooks/usePageMeta';
import { challengeManifest } from '@challenges';

const themes = [
  { title: 'Layout and responsive design', category: 'Landing pages', text: 'Page composition, content hierarchy and responsive presentation.' },
  { title: 'Interactive interfaces', category: 'Interactive applications', text: 'Input, state, user feedback and repeatable workflows.' },
  { title: 'Data-driven experiences', category: 'API-powered applications', text: 'Search-oriented interfaces and ways to make information legible.' },
  { title: 'Connected multi-page sites', category: 'Multi-page websites', text: 'Shared identity, navigation and pages with distinct roles.' },
  { title: 'Games and feedback loops', category: 'Games & interactive experiences', text: 'Rules, changing state and clear responses to user choices.' },
  { title: 'Product and commerce journeys', category: 'Commerce & product experiences', text: 'Decision-making, product information and meaningful task flow.' },
];

export default function JourneyPage() {
  usePageMeta({ title: 'Development journey', description: 'Explore practice themes suggested by Mwangala’s catalogue of 60 frontend challenge briefs.', path: '/journey' });
  return <><PageHeader eyebrow="Development journey · thematic, not chronological" title="A collection can show breadth without pretending to be a timeline." summary="The challenge briefs are grouped by the kinds of frontend problems they invite a developer to explore. These themes are not completed builds, dates or claims about a linear progression." /><section className="shell section-pad"><div className="journey-intro"><p className="eyebrow">60 briefs · multiple directions</p><p className="prose-body">From composed landing pages to interactive tools, each group suggests a different lens on interface engineering. This is a practice roadmap; implementation evidence can be attached when real builds are supplied.</p></div><div className="journey-list">{themes.map((theme, index) => { const records = challengeManifest.filter((project) => project.category === theme.category); return <article className="journey-row" key={theme.category}><span className="journey-index">0{index + 1}</span><div><p className="eyebrow">{String(records.length).padStart(2, '0')} challenge records</p><h2>{theme.title}</h2><p>{theme.text}</p><div className="journey-projects">{records.slice(0, 5).map((project) => <Link key={project.slug} to={`/projects/${project.slug}`}>{project.title}<span aria-hidden="true"> ↗</span></Link>)}{records.length > 5 && <Link to={`/projects?category=${encodeURIComponent(theme.category)}`}>+ {records.length - 5} more briefs →</Link>}</div></div></article>; })}</div><p className="collection-note">Category totals are derived from the 60 supplied challenge records. No implementation completion dates are claimed.</p></section></>;
}
