import type { ChallengeRecord } from '@challenges';

const palette = [
  ['#e9efea', '#28483e', '#e5a96f'],
  ['#f4e9df', '#723e32', '#d5a36a'],
  ['#e8eafa', '#343b74', '#8e91eb'],
  ['#e3f0f2', '#205566', '#71bdba'],
  ['#f2e9f2', '#57345e', '#cd94bb'],
  ['#eef0e4', '#394b2f', '#aac176'],
];

export function ChallengeVisual({ project, compact = false }: { project: ChallengeRecord; compact?: boolean }) {
  const colors = palette[(project.displayOrder - 1) % palette.length] ?? palette[0]!;
  const title = project.title;
  return (
    <div
      className={`challenge-art challenge-art--variant-${(project.displayOrder - 1) % 4} ${compact ? 'challenge-art--compact' : ''}`}
      style={{ '--art-paper': colors[0], '--art-ink': colors[1], '--art-accent': colors[2] } as React.CSSProperties}
      role="img"
      aria-label={project.thumbnail.label}
    >
      <div className="art-window">
        <div className="art-window__bar"><span /><span /><span /><i>mw / interface study</i></div>
        <div className="art-window__body">
          <div className="art-copy">
            <span className="art-kicker">{project.category}</span>
            <strong>{title}</strong>
            <span className="art-line art-line--wide" /><span className="art-line" />
            <span className="art-button">Explore interface <b>↗</b></span>
          </div>
          <div className="art-module" aria-hidden="true">
            <span className="art-module__badge">{String(project.displayOrder).padStart(2, '0')}</span>
            <span className="art-module__shape" />
            <span className="art-module__line" /><span className="art-module__line art-module__line--short" />
            <span className="art-module__dot" />
          </div>
        </div>
      </div>
      <span className="art-caption">Representative visual · not an implementation screenshot</span>
    </div>
  );
}
