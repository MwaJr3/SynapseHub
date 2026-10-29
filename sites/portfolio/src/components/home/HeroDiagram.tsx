import { cn } from '@/lib/cn';

/**
 * Hero artwork: three layers of the work — sources, processing, outcomes —
 * connected by data flow.
 *
 * It is decorative and says so: nothing here reads a network, queries a feed or
 * monitors anything. Motion is limited to a slow pulse along the connectors and
 * is disabled entirely for visitors who prefer reduced motion.
 */
export function HeroDiagram({ className }: { className?: string }) {
  const sources = [
    { label: 'email + headers', icon: 'mail' as const, y: 62 },
    { label: 'packet capture', icon: 'network' as const, y: 132 },
    { label: 'intel feeds', icon: 'radar' as const, y: 202 },
    { label: 'source code', icon: 'code' as const, y: 272 },
    { label: 'video transcript', icon: 'book' as const, y: 342 },
  ];

  const outputs = [
    { label: 'explainable findings', y: 78 },
    { label: 'structured records', y: 148 },
    { label: 'learning material', y: 218 },
    { label: 'auditable reports', y: 288 },
  ];

  return (
    <div
      data-panel="dark"
      className={cn(
        'relative overflow-hidden rounded-2xl border border-line bg-canvas',
        'shadow-[var(--shadow-panel)]',
        className,
      )}
    >
      <div aria-hidden="true" className="surface-grid absolute inset-0 opacity-70" />
      <div
        aria-hidden="true"
        className="absolute -right-16 -top-20 size-72 rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--hero-glow-a), transparent 70%)' }}
      />

      <svg viewBox="0 0 540 420" className="relative block w-full" role="img" aria-label={HERO_ALT}>
        <title>{HERO_ALT}</title>

        {/* Layer headings */}
        <LayerLabel x={34} y={26} text="INPUT" />
        <LayerLabel x={218} y={26} text="PROCESS" />
        <LayerLabel x={398} y={26} text="OUTPUT" />

        {/* Connectors: sources -> pipeline */}
        {sources.map((source, index) => (
          <path
            key={`in-${source.label}`}
            d={`M162 ${source.y + 18} C 186 ${source.y + 18}, 186 ${200}, 214 200`}
            fill="none"
            stroke="var(--tw-line-strong)"
            strokeWidth="1.2"
            opacity="0.75"
          >
            <animate
              attributeName="stroke-dasharray"
              values="0 400; 400 0"
              dur={`${4 + index * 0.35}s`}
              repeatCount="indefinite"
            />
          </path>
        ))}

        {/* Connectors: pipeline -> outputs */}
        {outputs.map((output, index) => (
          <path
            key={`out-${output.label}`}
            d={`M326 200 C 352 200, 352 ${output.y + 18}, 378 ${output.y + 18}`}
            fill="none"
            stroke="var(--tw-accent-line)"
            strokeWidth="1.2"
          >
            <animate
              attributeName="stroke-dasharray"
              values="0 400; 400 0"
              dur={`${3.6 + index * 0.4}s`}
              begin={`${index * 0.25}s`}
              repeatCount="indefinite"
            />
          </path>
        ))}

        {/* Source nodes */}
        {sources.map((source) => (
          <g key={source.label}>
            <rect
              x={26}
              y={source.y}
              width={136}
              height={36}
              rx={8}
              fill="var(--tw-surface)"
              stroke="var(--tw-line)"
            />
            <circle cx={44} cy={source.y + 18} r={9} fill="var(--tw-accent-soft)" />
            <IconGlyph name={source.icon} x={44} y={source.y + 18} />
            <text
              x={60}
              y={source.y + 22}
              fontSize="10.5"
              fill="var(--tw-fg-muted)"
              fontFamily="var(--font-sans)"
            >
              {source.label}
            </text>
          </g>
        ))}

        {/* Processing core */}
        <rect
          x={214}
          y={120}
          width={112}
          height={160}
          rx={12}
          fill="var(--tw-raised)"
          stroke="var(--tw-accent-line)"
        />
        <text x={270} y={146} fontSize="10" textAnchor="middle" fill="var(--tw-accent)" fontFamily="var(--font-mono)" letterSpacing="0.1em">
          PIPELINE
        </text>
        {[
          { label: 'validate', y: 168 },
          { label: 'parse', y: 196 },
          { label: 'analyse', y: 224 },
          { label: 'verify', y: 252 },
        ].map((stage, index) => (
          <g key={stage.label}>
            <rect
              x={228}
              y={stage.y}
              width={84}
              height={20}
              rx={6}
              fill="var(--tw-sunken)"
              stroke="var(--tw-line)"
            />
            <text
              x={270}
              y={stage.y + 14}
              fontSize="9.5"
              textAnchor="middle"
              fill="var(--tw-fg)"
              fontFamily="var(--font-mono)"
            >
              {stage.label}
            </text>
            {index < 3 ? (
              <path
                d={`M270 ${stage.y + 20} L270 ${stage.y + 28}`}
                stroke="var(--tw-line-strong)"
                strokeWidth="1.2"
              />
            ) : null}
          </g>
        ))}

        {/* Output nodes */}
        {outputs.map((output) => (
          <g key={output.label}>
            <rect
              x={378}
              y={output.y}
              width={146}
              height={36}
              rx={8}
              fill="var(--tw-surface)"
              stroke="var(--tw-line)"
            />
            <circle cx={394} cy={output.y + 18} r={3.5} fill="var(--tw-accent)" />
            <text
              x={406}
              y={output.y + 22}
              fontSize="10.5"
              fill="var(--tw-fg)"
              fontFamily="var(--font-sans)"
            >
              {output.label}
            </text>
          </g>
        ))}

        {/* Footnote inside the artwork */}
        <text x={26} y={404} fontSize="9" fill="var(--tw-fg-subtle)" fontFamily="var(--font-mono)">
          illustrative — not a live scan
        </text>
      </svg>
    </div>
  );
}

const HERO_ALT =
  'Diagram showing five kinds of technical input — email headers, packet captures, intelligence feeds, source code and video transcripts — flowing through a validate, parse, analyse and verify pipeline into four kinds of output: explainable findings, structured records, learning material and auditable reports. Decorative illustration, not a live system.';

function LayerLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text
      x={x}
      y={y}
      fontSize="8.5"
      fill="var(--tw-fg-subtle)"
      fontFamily="var(--font-mono)"
      letterSpacing="0.16em"
    >
      {text}
    </text>
  );
}

/** Tiny inline glyph reused from the icon language, drawn at diagram scale. */
function IconGlyph({ name, x, y }: { name: 'mail' | 'network' | 'radar' | 'code' | 'book'; x: number; y: number }) {
  const stroke = 'var(--tw-accent)';
  const common = {
    fill: 'none',
    stroke,
    strokeWidth: 1.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (name) {
    case 'mail':
      return (
        <g transform={`translate(${x - 6} ${y - 4.5})`} {...common}>
          <rect x="0" y="0" width="12" height="9" rx="1.6" />
          <path d="M0.6 1.2 6 5.2l5.4-4" />
        </g>
      );
    case 'network':
      return (
        <g transform={`translate(${x - 6} ${y - 5})`} {...common}>
          <circle cx="6" cy="1.6" r="1.5" />
          <circle cx="1.8" cy="8.4" r="1.5" />
          <circle cx="10.2" cy="8.4" r="1.5" />
          <path d="M6 3.1v2.6M6 5.7 2.6 7.6M6 5.7l3.4 1.9" />
        </g>
      );
    case 'radar':
      return (
        <g transform={`translate(${x - 5.5} ${y - 5.5})`} {...common}>
          <circle cx="5.5" cy="5.5" r="5" />
          <circle cx="5.5" cy="5.5" r="2.2" />
          <path d="M5.5 5.5 9 2.4" />
        </g>
      );
    case 'code':
      return (
        <g transform={`translate(${x - 6} ${y - 4.5})`} {...common}>
          <path d="M4 1 1 4.5 4 8M8 1l3 3.5L8 8" />
        </g>
      );
    case 'book':
      return (
        <g transform={`translate(${x - 5.5} ${y - 5})`} {...common}>
          <path d="M1 1h9v9H1z" />
          <path d="M1 3.4h9M4 1v9" />
        </g>
      );
    default:
      return null;
  }
}
