import { NavLink } from 'react-router-dom';
import { contactConfig, links, profileConfig } from '@/config/site';
import { challengeManifest } from '@/data/challengeManifest';

const footerNav = [
  { to: '/about', label: 'About' },
  { to: '/projects', label: 'Projects' },
  { to: '/apps', label: 'Apps' },
  { to: '/system', label: 'Personal system' },
  { to: '/operations', label: 'Operations' },
  { to: '/ux-engine', label: 'UX engine' },
  { to: '/skills', label: 'Skills' },
  { to: '/journey', label: 'Journey' },
  { to: '/approach', label: 'Approach' },
  { to: '/contact', label: 'Contact' },
];

export function SiteFooter() {
  return <footer data-tone="contrast" className="site-footer"><div className="shell footer-grid"><div><p className="eyebrow">Portfolio · 2026</p><p className="footer-name">{profileConfig.name}</p><p className="prose-body mt-3 max-w-sm text-sm">A portfolio catalogue with 60 local-first challenge prototypes; full challenge verification is still in progress.</p><p className="mono-meta mt-5">{profileConfig.role}</p></div><nav aria-label="Footer"><p className="eyebrow">Navigate</p><ul className="footer-links">{footerNav.map((item) => <li key={item.to}><NavLink to={item.to} end={item.to === '/'} className={({ isActive }) => (isActive ? 'footer-link is-current' : 'footer-link')}>{item.label}</NavLink></li>)}</ul></nav><div><p className="eyebrow">Elsewhere</p><ul className="footer-links">{links.github && <li><a href={links.github} target="_blank" rel="noopener noreferrer">GitHub ↗</a></li>}{links.linkedin && <li><a href={links.linkedin} target="_blank" rel="noopener noreferrer">Professional profile ↗</a></li>}{links.mailto && <li><a href={links.mailto}>{contactConfig.email}</a></li>}{!links.github && !links.linkedin && !links.mailto && <li className="footer-muted">External profiles and contact details are not configured.</li>}</ul></div></div><div className="footer-bottom shell"><span>© {new Date().getFullYear()} {profileConfig.name}</span><span>{challengeManifest.length} challenge records · independent portfolio, not affiliated with Frontend Mentor</span></div></footer>;
}
