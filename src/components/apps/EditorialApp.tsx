import { useMemo, useState } from 'react';
import type { ChallengeRecord } from '@/data/challengeManifest';

const scrollToSection = (id: string) => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
};

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'brief', label: 'Challenge context' },
  { id: 'experience', label: 'Explore' },
  { id: 'details', label: 'Details' },
];

export function EditorialApp({ project }: { project: ChallengeRecord }) {
  const accent = useMemo(() => { let hash = 0; for (const ch of project.slug) hash = (hash * 31 + ch.charCodeAt(0)) | 0; return `hsl(${Math.abs(hash) % 360} 48% 50%)`; }, [project.slug]);
  const [active, setActive] = useState('overview');
  const [expanded, setExpanded] = useState(false);
  const [session, setSession] = useState('');
  const [sessions, setSessions] = useState<string[]>([]);
  if (project.slug === 'planets-fact-site') return <PlanetFacts />;
  const conference = project.slug === 'tech-conference-site';
  return <div className="editorial-app" style={{ '--app-accent': accent } as React.CSSProperties}>
    <nav className="editorial-app-nav" aria-label="Prototype sections">{sections.map((item) => <button key={item.id} className={active === item.id ? 'is-active' : ''} aria-current={active === item.id ? 'page' : undefined} onClick={() => { setActive(item.id); scrollToSection(item.id); }}>{item.label}</button>)}</nav>
    <section id="overview" className="editorial-hero"><div className="editorial-orbit" aria-hidden="true"><span /><span /><span /></div><div className="editorial-hero-copy"><p className="app-kicker">{project.category} · prototype</p><h2>{project.title}</h2><p>{project.description}</p><a className="app-button" href="#experience">Explore this concept ↓</a><span className="editorial-note">Independent concept layout · not an official challenge design capture</span></div><div className="editorial-card" aria-hidden="true"><span>01</span><div className="editorial-card-bars"><i /><i /><i /><i /></div><b>Responsive<br />by design</b></div></section>
    <section id="brief" className="editorial-section"><p className="app-kicker">01 / Challenge context</p><h3>What this brief explores</h3><p>{project.description}</p><p className="editorial-disclaimer">This page is an original content-first prototype built from the supplied prompt. No starter design assets, licensed brand imagery, or official acceptance tests were supplied.</p></section>
    <section id="experience" className="editorial-feature"><div><p className="app-kicker">02 / Interface preview</p><h3>{conference ? 'Add sessions to a local programme' : 'A clear path through the experience'}</h3><p>{conference ? 'No speaker or schedule data was supplied, so this programme begins empty. Add only real event details.' : 'The section controls and navigation are functional. Replace this concept copy and artwork with verified challenge content and licensed assets before presenting it as a design-fidelity reproduction.'}</p><button className="app-button app-button--quiet" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Hide details' : 'Show implementation notes'}</button>{expanded && <div className="editorial-expanded"><strong>Implementation note</strong><p>Content is responsive and uses no third-party images. This prototype does not claim the original brief's visual fidelity or any production deployment.</p></div>}</div><div className="editorial-visual" aria-hidden="true"><span className="editorial-visual-line" /><span className="editorial-visual-line short" /><div className="editorial-visual-blocks"><i /><i /><i /></div></div></section>
    {conference && <section className="editorial-section"><p className="app-kicker">Programme data · local to this tab</p><form className="app-entry-form app-entry-form--inline" onSubmit={(event) => { event.preventDefault(); if (session.trim()) { setSessions((items) => [...items, session.trim()]); setSession(''); } }}><label>Session title<input value={session} onChange={(e) => setSession(e.target.value)} placeholder="Use a confirmed session title" required /></label><button className="app-button">Add session</button></form>{sessions.length ? <ul className="editorial-session-list">{sessions.map((item, index) => <li key={`${item}-${index}`}>{item}<button onClick={() => setSessions((current) => current.filter((_, i) => i !== index))} aria-label={`Remove ${item}`}>Remove</button></li>)}</ul> : <p className="app-small-note">No sessions added. Schedule, track filters, speakers, and venue data require real conference content.</p>}</section>}
    <section id="details" className="editorial-section editorial-details"><p className="app-kicker">03 / Prototype notes</p><h3>Useful next steps</h3><div className="editorial-detail-grid"><article><span>01</span><h4>Use genuine assets</h4><p>Connect the official starter assets and content before tuning visual details.</p></article><article><span>02</span><h4>Verify the brief</h4><p>Check all interactions and responsive states against the source challenge page.</p></article><article><span>03</span><h4>Keep evidence honest</h4><p>Only publish project screenshots, links, metrics, and implementation claims after verification.</p></article></div><a className="editorial-source" href={project.originalChallengeUrl} target="_blank" rel="noreferrer">View original challenge ↗</a></section>
  </div>;
}

const planets = [
  { name: 'Mercury', kind: 'Terrestrial', fact: 'The smallest planet and the closest planet to the Sun.' },
  { name: 'Venus', kind: 'Terrestrial', fact: 'A rocky planet with a very dense atmosphere.' },
  { name: 'Earth', kind: 'Terrestrial', fact: 'The only world currently known to support life.' },
  { name: 'Mars', kind: 'Terrestrial', fact: 'A cold, rocky planet with a thin atmosphere.' },
  { name: 'Jupiter', kind: 'Gas giant', fact: 'The largest planet in the Solar System.' },
  { name: 'Saturn', kind: 'Gas giant', fact: 'A gas giant known for its extensive ring system.' },
  { name: 'Uranus', kind: 'Ice giant', fact: 'An ice giant with an unusually steep axial tilt.' },
  { name: 'Neptune', kind: 'Ice giant', fact: 'A distant ice giant with a dynamic atmosphere.' },
];

function PlanetFacts() {
  const [planet, setPlanet] = useState(planets[0]!);
  const [tab, setTab] = useState<'Overview' | 'Structure' | 'Geology'>('Overview');
  return <div className="planet-tool"><div className="planet-tabs" role="tablist" aria-label="Planets">{planets.map((item) => <button role="tab" aria-selected={planet.name === item.name} key={item.name} onClick={() => setPlanet(item)}>{item.name}</button>)}</div><div className="planet-view"><div className={`planet-orb planet-orb--${planet.name.toLowerCase()}`} aria-hidden="true" /><div><p className="app-kicker">{planet.kind} · Solar System</p><h3>{planet.name}</h3><p>{planet.fact}</p><div className="planet-tabs planet-tabs--details" role="tablist" aria-label={`${planet.name} information`}>{(['Overview', 'Structure', 'Geology'] as const).map((item) => <button role="tab" aria-selected={tab === item} key={item} onClick={() => setTab(item)}>{item}</button>)}</div><p className="planet-detail-copy">{tab === 'Overview' ? planet.fact : tab === 'Structure' ? `${planet.name} is classified as a ${planet.kind.toLowerCase()}.` : 'Detailed composition and geology are not included in this concise dataset.'}</p></div></div><p className="app-privacy-note">Concise reference facts, not a complete planetary dataset. Add sourced scientific details before publishing a fact sheet.</p></div>;
}
