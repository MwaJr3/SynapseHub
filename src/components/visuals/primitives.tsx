import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Shared building blocks for the illustrative project previews.
 *
 * Every visual is drawn with the site's own tokens and component language
 * rather than mocked-up screenshots, and each one is labelled "Illustrative
 * preview" in the frame so a concept composition is never mistaken for a
 * screenshot of running software.
 */

export const VISUAL_BADGE = 'Illustrative preview';

interface VisualFrameProps {
  /** Short description of what this composition represents. */
  label: string;
  /** Optional view name shown in the frame chrome. */
  viewLabel?: string;
  children: ReactNode;
  className?: string;
  /** Accessible description — required, since the artwork is meaningful. */
  description: string;
  /**
   * Cropped, decorative variant used inside project cards. It is hidden from
   * assistive technology because the card already carries the same information
   * as text.
   */
  compact?: boolean;
}

export function VisualFrame({
  label,
  viewLabel,
  children,
  className,
  description,
  compact = false,
}: VisualFrameProps) {
  if (compact) {
    return (
      <div
        role="presentation"
        aria-hidden="true"
        className={cn(
          'relative h-[152px] overflow-hidden rounded-[10px] border border-line bg-panel',
          className,
        )}
      >
        <svg
          viewBox="0 0 640 380"
          preserveAspectRatio="xMidYMin slice"
          aria-hidden="true"
          focusable="false"
          className="h-full w-full"
        >
          {children}
        </svg>
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-pill border border-line bg-panel-strong px-2 py-0.5 font-mono text-2xs uppercase tracking-[0.08em] text-ink-subtle">
          {VISUAL_BADGE}
        </span>
      </div>
    );
  }

  return (
    <figure
      className={cn(
        'overflow-hidden rounded-card border border-line bg-panel',
        className,
      )}
    >
      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-panel-strong px-4 py-2.5">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="block h-2 w-2 rounded-full bg-line-strong" />
          <span className="block h-2 w-2 rounded-full bg-line-strong" />
          <span className="block h-2 w-2 rounded-full bg-accent/70" />
        </span>
        <span className="mono-meta text-ink-muted">{label}</span>
        {viewLabel && <span className="chip ml-auto">{viewLabel}</span>}
      </figcaption>
      <div className="p-3 sm:p-4">
        <svg
          viewBox="0 0 640 380"
          role="img"
          aria-label={`${description} ${VISUAL_BADGE}, not a screenshot.`}
          className="h-auto w-full"
        >
          {children}
        </svg>
      </div>
      <p className="border-t border-line px-4 py-2 font-mono text-2xs uppercase tracking-[0.1em] text-ink-subtle">
        {VISUAL_BADGE} — composed from the portfolio design system, not a
        screenshot
      </p>
    </figure>
  );
}

interface ChipProps {
  x: number;
  y: number;
  text: string;
  tone?: 'neutral' | 'accent' | 'signal' | 'caution';
  fontSize?: number;
  width?: number;
}

const chipTone: Record<
  NonNullable<ChipProps['tone']>,
  { fill: string; text: string; stroke: string }
> = {
  neutral: {
    fill: 'fill-panel-strong',
    text: 'fill-ink-muted',
    stroke: 'stroke-line',
  },
  accent: {
    fill: 'fill-accent/15',
    text: 'fill-accent',
    stroke: 'stroke-accent/40',
  },
  signal: {
    fill: 'fill-signal/15',
    text: 'fill-signal',
    stroke: 'stroke-signal/40',
  },
  caution: {
    fill: 'fill-caution/15',
    text: 'fill-caution',
    stroke: 'stroke-caution/40',
  },
};

/** A small pill label. Width can be supplied when text length is known. */
export function Chip({
  x,
  y,
  text,
  tone = 'neutral',
  fontSize = 11,
  width,
}: ChipProps) {
  const computedWidth =
    width ?? Math.max(38, text.length * fontSize * 0.62 + 16);
  const styles = chipTone[tone];

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={computedWidth}
        height={fontSize + 12}
        rx={(fontSize + 12) / 2}
        className={cn(styles.fill, styles.stroke)}
        strokeWidth={1}
      />
      <text
        x={x + computedWidth / 2}
        y={y + fontSize + 6}
        textAnchor="middle"
        fontSize={fontSize}
        className={cn('font-mono', styles.text)}
      >
        {text}
      </text>
    </g>
  );
}

interface LabelProps {
  x: number;
  y: number;
  text: string;
  size?: number;
  tone?: 'ink' | 'muted' | 'subtle' | 'accent';
  anchor?: 'start' | 'middle' | 'end';
  strong?: boolean;
  mono?: boolean;
}

const labelTone: Record<NonNullable<LabelProps['tone']>, string> = {
  ink: 'fill-ink',
  muted: 'fill-ink-muted',
  subtle: 'fill-ink-subtle',
  accent: 'fill-accent',
};

export function Label({
  x,
  y,
  text,
  size = 13,
  tone = 'ink',
  anchor = 'start',
  strong = false,
  mono = false,
}: LabelProps) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      textAnchor={anchor}
      className={cn(
        mono && 'font-mono',
        labelTone[tone],
        strong && 'font-semibold',
      )}
    >
      {text}
    </text>
  );
}

interface BarProps {
  x: number;
  y: number;
  width: number;
  height?: number;
  progress: number;
  hue?: string;
  className?: string;
}

/** A progress bar, drawn as track + fill so it reads on any tone. */
export function Bar({
  x,
  y,
  width,
  height = 6,
  progress,
  hue,
  className,
}: BarProps) {
  const filled = Math.max(0, Math.min(1, progress)) * width;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={height / 2}
        className="fill-line"
      />
      <rect
        x={x}
        y={y}
        width={filled}
        height={height}
        rx={height / 2}
        className={cn(!hue && 'fill-accent', className)}
        fill={hue}
      />
    </g>
  );
}

export function Row({
  x,
  y,
  width,
  height,
  children,
  emphasis = false,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  children?: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={10}
        className={
          emphasis
            ? 'fill-accent/[0.08] stroke-accent/40'
            : 'fill-panel stroke-line'
        }
        strokeWidth={1}
      />
      {children}
    </g>
  );
}

/** Decorative status dot with a matching text label — never colour alone. */
export function StatusDot({
  x,
  y,
  hue,
  className,
}: {
  x: number;
  y: number;
  hue?: string;
  className?: string;
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r={4}
      fill={hue}
      className={cn(!hue && 'fill-accent', className)}
    />
  );
}
