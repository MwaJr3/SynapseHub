import { Link, useParams } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';
import { challengeManifest } from '@challenges';
import { getAppDefinition } from '@challenges';
import { CollectionApp } from '@challenges/components/CollectionApp';
import { GameApp } from '@challenges/components/GameApp';
import { CalculatorApp, TextEditorApp } from '@challenges/components/UtilityApp';
import { ApiApp } from '@challenges/components/ApiApp';
import { KanbanApp } from '@challenges/components/KanbanApp';
import { TimerApp, ClockApp } from '@challenges/components/TimerApp';
import { LocalDemoForm, StoreApp } from '@challenges/components/FormAndStoreApps';
import { EditorialApp } from '@challenges/components/EditorialApp';
import { GalleryApp } from '@challenges/components/GalleryApp';

export default function ChallengeAppPage() {
  const { slug } = useParams();
  const project = challengeManifest.find((item) => item.slug === slug);
  usePageMeta({ title: project ? `${project.title} — Interactive prototype` : 'Prototype not found', description: project ? `${project.description} Open a local-first interactive prototype; check the page for data and integration limitations.` : 'The requested prototype is not part of this collection.', path: `/apps/${slug ?? ''}` });
  if (!project) return <section className="shell section-pad"><p className="eyebrow">404 · Prototype not found</p><h1 className="page-title mt-4">That app is not in this collection.</h1><Link className="btn btn-primary mt-6" to="/apps">Browse all prototypes</Link></section>;
  const definition = getAppDefinition(project);
  const content = (() => {
    switch (definition.mode) {
      case 'collection': return <CollectionApp project={project} />;
      case 'calculator': return <CalculatorApp project={project} />;
      case 'game': return <GameApp project={project} />;
      case 'api': return <ApiApp project={project} />;
      case 'editor': return <TextEditorApp project={project} />;
      case 'kanban': return <KanbanApp project={project} />;
      case 'timer': return <TimerApp />;
      case 'clock': return <ClockApp />;
      case 'store': return <StoreApp project={project} />;
      case 'gallery': return <GalleryApp project={project} />;
      case 'editorial': return <EditorialApp project={project} />;
      case 'form': return <LocalDemoForm project={project} />;
      default: return <CollectionApp project={project} />;
    }
  })();
  return <>
    <section data-tone="contrast" className="case-hero app-case-hero"><div className="shell"><Link className="case-back" to="/apps">← All prototypes</Link><div className="case-hero__grid"><div><p className="eyebrow">Interactive prototype {String(project.displayOrder).padStart(2, '0')} / 60 · {project.category}</p><h1>{project.title}</h1><p className="case-lede">{definition.lead}</p><div className="case-meta"><span className="status-pill"><i /> Local-first prototype</span><span>{definition.mode} · browser-based</span></div><div className="hero-actions mt-6"><a className="btn btn-primary" href={project.originalChallengeUrl} target="_blank" rel="noopener noreferrer">Original challenge ↗</a><Link className="btn btn-secondary" to={`/projects/${project.slug}`}>Challenge notes</Link></div></div><div className="app-summary-card"><p className="app-kicker">Before you begin</p><h2>Prototype boundaries</h2><ul><li>Browser-only state is stored locally and may be cleared with site data.</li><li>No user account, shared backend, or external project deployment is configured.</li><li>Public API tools identify their service and report errors instead of inventing results.</li><li>Starter files and licensed design assets were not supplied; this is not a pixel-match claim.</li></ul></div></div></div></section>
    <section className="shell app-prototype-section"><div className="app-prototype-heading"><div><p className="eyebrow">Working interaction</p><h2>Try the prototype.</h2></div><p>Progress is local unless the tool explicitly retrieves public data from its named provider.</p></div><div className="app-prototype-surface">{content}</div><p className="app-privacy-note app-boundary-note">This prototype demonstrates browser-side functionality. It is not a production service, and no full-stack, synchronization, financial, booking, or email behavior is implied.</p></section>
  </>;
}
