/**
 * Hero composition: how the nine projects fit together around one learning
 * journey, with the offline/connected boundary made explicit.
 *
 * This is a conceptual map drawn with the site's own tokens — deliberately not
 * a screenshot — and the same information is repeated as text below it.
 */
export function HeroDiagram() {
  const pipeline = [
    { x: 40, label: 'Lesson' },
    { x: 168, label: 'Practice' },
    { x: 296, label: 'Feedback' },
    { x: 424, label: 'Progress' },
  ];

  return (
    <figure className="card overflow-hidden bg-panel" data-tone="contrast">
      <figcaption className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <span className="mono-meta text-ink-muted">
          portfolio map · 9 projects
        </span>
        <span className="chip">Conceptual</span>
      </figcaption>

      <svg
        viewBox="0 0 620 400"
        role="img"
        aria-label="Conceptual map of the portfolio"
        className="h-auto w-full"
      >
        <title>
          Learning journey across the portfolio, split between what works
          offline and what needs a connection
        </title>

        <text x="40" y="42" fontSize="11" className="fill-ink-subtle font-mono">
          learner journey
        </text>
        {pipeline.map((node, index) => (
          <g key={node.label}>
            <rect
              x={node.x}
              y={56}
              width={104}
              height={44}
              rx={10}
              className="fill-panel-strong stroke-line-strong"
              strokeWidth="1"
            />
            <circle cx={node.x + 18} cy={78} r="4" className="fill-accent" />
            <text x={node.x + 30} y={82} fontSize="12" className="fill-ink">
              {node.label}
            </text>
            {index < pipeline.length - 1 && (
              <line
                x1={node.x + 104}
                y1={78}
                x2={node.x + 128}
                y2={78}
                className="stroke-line-strong"
                strokeWidth="1.5"
              />
            )}
          </g>
        ))}

        <rect
          x="40"
          y="126"
          width="252"
          height="150"
          rx="14"
          className="fill-accent/[0.07] stroke-accent/40"
          strokeWidth="1.5"
          strokeDasharray="6 5"
        />
        <text x="58" y="152" fontSize="11" className="fill-accent font-mono">
          works offline
        </text>
        <text x="58" y="180" fontSize="12" className="fill-ink">
          Local lesson packs
        </text>
        <text x="58" y="202" fontSize="12" className="fill-ink">
          Progress queue · notes
        </text>
        <text x="58" y="224" fontSize="12" className="fill-ink">
          SMS · USSD · voice
        </text>
        <text
          x="58"
          y="252"
          fontSize="10"
          className="fill-ink-subtle font-mono"
        >
          LearnBridge · ReachLearn
        </text>

        <rect
          x="328"
          y="126"
          width="252"
          height="150"
          rx="14"
          className="fill-panel stroke-line-strong"
          strokeWidth="1"
        />
        <text
          x="346"
          y="152"
          fontSize="11"
          className="fill-ink-subtle font-mono"
        >
          needs a connection
        </text>
        <text x="346" y="180" fontSize="12" className="fill-ink">
          Grounded AI tutoring
        </text>
        <text x="346" y="202" fontSize="12" className="fill-ink">
          Live sessions · provider
        </text>
        <text x="346" y="224" fontSize="12" className="fill-ink">
          Shared resources · payments
        </text>
        <text
          x="346"
          y="252"
          fontSize="10"
          className="fill-ink-subtle font-mono"
        >
          TutorSpring · ClassConnect · OpenLearn · EduAccess
        </text>

        <line
          x1="292"
          y1="201"
          x2="328"
          y2="201"
          className="stroke-accent"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <text
          x="310"
          y="192"
          fontSize="9"
          className="fill-accent font-mono"
          textAnchor="middle"
        >
          sync
        </text>

        <rect
          x="40"
          y="296"
          width="540"
          height="76"
          rx="14"
          className="fill-panel-strong stroke-line"
          strokeWidth="1"
        />
        <text
          x="58"
          y="322"
          fontSize="11"
          className="fill-ink-subtle font-mono"
        >
          human oversight layer
        </text>
        <text x="58" y="346" fontSize="12" className="fill-ink">
          Teacher review queues · transparent flags · overrides · recorded
          decisions
        </text>
        <text
          x="58"
          y="364"
          fontSize="10"
          className="fill-ink-subtle font-mono"
        >
          PathWise · LearnPulse · TeachCraft · EduAccess
        </text>
      </svg>

      <ul className="grid gap-2 border-t border-line px-4 py-4 text-xs text-ink-muted sm:grid-cols-3">
        <li className="flex gap-2">
          <span
            aria-hidden="true"
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-accent"
          />
          Offline-capable: downloaded content, local progress, phone channels
        </li>
        <li className="flex gap-2">
          <span
            aria-hidden="true"
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-line-strong"
          />
          Connection required: AI providers, live sessions, shared services
        </li>
        <li className="flex gap-2">
          <span
            aria-hidden="true"
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent"
          />
          Human decision points in every workflow
        </li>
      </ul>
    </figure>
  );
}
