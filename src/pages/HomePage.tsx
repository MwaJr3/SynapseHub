import { Link } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';
import { challengeManifest } from '@/data/challengeManifest';
import { ChallengeCard } from '@/components/projects/ChallengeCard';
import { profileConfig, links } from '@/config/site';

const featured = challengeManifest.filter((project) => project.featured).slice(0, 6);
const themes = [
  { no: '01', title: 'Responsive interfaces', text: 'A close look at layout, hierarchy and how content behaves across screen sizes.', href: '/projects?category=Landing+pages' },
  { no: '02', title: 'Interactive applications', text: 'A collection spanning forms, stateful interfaces, games and productivity tools.', href: '/projects?category=Interactive+applications' },
  { no: '03', title: 'Product thinking', text: 'Commerce, finance, data and multi-page experiences—each approached as a user journey.', href: '/projects?category=Commerce+%26+product+experiences' },
];

export default function HomePage() {
  usePageMeta({ title: 'Mwangala — Frontend Developer', description: 'A frontend portfolio catalogue of 60 Frontend Mentor challenge briefs, with implementation status clearly identified.', path: '/' });
  return <>
    <section data-tone="contrast" className="hero-shell">
      <div className="shell hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">{profileConfig.role}</p>
          <h1>Exploring Interfaces.<br /><span>Studying Experiences.</span><br />One Brief at a Time.</h1>
          <p className="hero-description">I’m Mwangala, a developer building a roadmap for frontend practice through design challenges. This catalogue includes 60 browser-side prototypes; full completion against each official brief has not been verified.</p>
          <div className="hero-actions"><Link className="btn btn-primary" to="/apps">Try the interactive prototypes <span aria-hidden="true">↗</span></Link><Link className="btn btn-secondary" to="/projects">Browse challenge records</Link><Link className="btn btn-secondary" to="/about">About my work</Link>{links.github && <a className="btn btn-secondary" href={links.github} target="_blank" rel="noreferrer">View GitHub ↗</a>}</div>
          <div className="hero-foot"><span><b>{challengeManifest.length}</b> challenge briefs catalogued</span><span>Independent work inspired by Frontend Mentor</span></div>
        </div>
        <div className="hero-art" aria-label="An editorial illustration representing interface and code">
          <div className="hero-art__label"><span className="pulse-dot" /> Interface / in progress</div>
          <div className="hero-code"><span className="code-muted">01</span> <span className="code-pink">const</span> <span className="code-blue">experience</span> = {'{'}</div>
          <div className="hero-code"><span className="code-muted">02</span> &nbsp;intent: <span className="code-green">'clear'</span>,</div>
          <div className="hero-code"><span className="code-muted">03</span> &nbsp;details: <span className="code-green">'considered'</span>,</div>
          <div className="hero-code"><span className="code-muted">04</span> &nbsp;briefs: <span className="code-orange">{challengeManifest.length}</span>,</div>
          <div className="hero-code"><span className="code-muted">05</span> {'}'}</div>
          <div className="hero-art__card"><span className="mini-eyebrow">Selected brief</span><strong>Small decisions.<br />Better experiences.</strong><span className="mini-rule" /><span className="mini-lines" /></div>
          <div className="hero-art__footer"><span>DESIGN WITH INTENTION</span><span>BUILD WITH PRECISION</span></div>
        </div>
      </div>
      <div className="hero-bottom shell"><span>01 / 05</span><span>Scroll to explore <i aria-hidden="true">↓</i></span><span>Frontend · UI engineering · interaction</span></div>
    </section>

    <section className="shell section-pad" aria-labelledby="collection-intro">
      <div className="section-heading"><div><p className="eyebrow">A growing practice, made visible</p><h2 id="collection-intro">A collection of <em>{challengeManifest.length}</em> challenges.</h2></div><p className="prose-body">Sixty distinct challenge briefs create a broad playground for practicing how interfaces look, feel and work. Explore the range, then open a case study for source context and implementation notes.</p></div>
      <div className="stats-strip"><div><strong>60</strong><span>challenge records</span></div><div><strong>06</strong><span>areas of practice</span></div><div><strong>01</strong><span>curious developer</span></div><Link to="/projects">Explore the full collection <span aria-hidden="true">↗</span></Link></div>
    </section>

    <section data-tone="quiet" className="section-pad">
      <div className="shell"><div className="section-heading"><div><p className="eyebrow">Selected briefs · 01—06</p><h2>Different briefs. <em>Different questions.</em></h2></div><Link className="link-inline" to="/projects">View all 60 briefs ↗</Link></div><div className="challenge-grid challenge-grid--featured">{featured.map((project) => <ChallengeCard key={project.slug} project={project} />)}</div></div>
    </section>

    <section className="shell section-pad">
      <div className="section-heading"><div><p className="eyebrow">Practice areas</p><h2>What the collection <em>explores.</em></h2></div><p className="prose-body">Categories are a starting point for discovery, not a claim about a single implementation technique.</p></div>
      <div className="theme-grid">{themes.map((theme) => <Link to={theme.href} className="theme-card" key={theme.no}><span className="eyebrow">{theme.no} / 03</span><h3>{theme.title}</h3><p>{theme.text}</p><span className="theme-arrow" aria-hidden="true">↗</span></Link>)}</div>
    </section>

    <section data-tone="contrast" className="process-section section-pad"><div className="shell"><div className="section-heading"><div><p className="eyebrow">A considered process</p><h2>Understand. Design. <em>Build. Test. Refine.</em></h2></div><p className="prose-body">A useful working loop for turning a brief into a considered experience. It is a guiding approach—not a claim that every past build followed the same formal process.</p></div><ol className="process-list">{['Understand the brief and intended user','Translate structure into responsive design','Build useful interaction and application logic','Test behaviour, keyboard use and layouts','Refine the details that make it feel complete'].map((step, index) => <li key={step}><span>0{index + 1}</span><p>{step}</p></li>)}</ol></div></section>

    <section className="closing-section"><div className="shell closing-grid"><div><p className="eyebrow">Keep exploring</p><h2>Good interfaces are built <em>one decision at a time.</em></h2></div><div><p className="prose-body">Explore the challenge records and source context. Add implementation details when verified builds are available.</p><div className="hero-actions"><Link className="btn btn-primary" to="/projects">Explore all 60 briefs ↗</Link><Link className="btn btn-secondary" to="/contact">Get in touch</Link></div></div></div></section>
  </>;
}
