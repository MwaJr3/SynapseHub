import type { ReactNode, SVGProps } from 'react';
import { cn } from '@/lib/cn';
import type { AccentName } from '@/types/project';

/**
 * Shared building blocks for the project preview artwork.
 *
 * These are hand-drawn, representative interface previews — not screenshots of
 * deployed applications, and never labelled as such. They are drawn on a fixed
 * 800x500 viewBox so layout stays stable at any container width.
 */

export const PREVIEW_VIEWBOX = { w: 800, h: 500 } as const;

export function PreviewFrame({
  accent,
  title,
  chrome = 'app',
  label,
  children,
  className,
  ...rest
}: {
  accent: AccentName;
  title: string;
  /** `app` = window chrome, `dash` = sidebar app shell, `doc` = plain sheet. */
  chrome?: 'app' | 'dash' | 'doc';
  label?: string;
  children: ReactNode;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, 'title'>) {
  return (
    <svg
      viewBox={`0 0 ${PREVIEW_VIEWBOX.w} ${PREVIEW_VIEWBOX.h}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={title}
      data-accent={accent}
      className={cn('block h-full w-full', className)}
      {...rest}
    >
      <defs>
        <linearGradient id={`bg-${accent}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--tw-canvas)" />
          <stop offset="100%" stopColor="var(--tw-canvas-alt)" />
        </linearGradient>
        <clipPath id={`clip-${accent}`}>
          <rect x="0" y="0" width={PREVIEW_VIEWBOX.w} height={PREVIEW_VIEWBOX.h} />
        </clipPath>
      </defs>

      <g clipPath={`url(#clip-${accent})`}>
        <rect width={PREVIEW_VIEWBOX.w} height={PREVIEW_VIEWBOX.h} fill={`url(#bg-${accent})`} />
        <rect
          width={PREVIEW_VIEWBOX.w}
          height={PREVIEW_VIEWBOX.h}
          fill="none"
          stroke="var(--tw-line)"
          strokeWidth="1"
        />

        {chrome === 'app' ? (
          <>
            <rect width={PREVIEW_VIEWBOX.w} height="34" fill="var(--tw-surface)" />
            <line x1="0" y1="34" x2={PREVIEW_VIEWBOX.w} y2="34" stroke="var(--tw-line)" />
            <circle cx="20" cy="17" r="4" fill="var(--tw-line-strong)" />
            <circle cx="36" cy="17" r="4" fill="var(--tw-line-strong)" />
            <circle cx="52" cy="17" r="4" fill="var(--tw-line-strong)" />
            <rect x="300" y="9" width="200" height="16" rx="8" fill="var(--tw-sunken)" />
            <rect x="308" y="15" width="60" height="4" rx="2" fill="var(--tw-line-strong)" />
          </>
        ) : null}

        {chrome === 'dash' ? (
          <>
            <rect width="150" height={PREVIEW_VIEWBOX.h} fill="var(--tw-surface)" />
            <line x1="150" y1="0" x2="150" y2={PREVIEW_VIEWBOX.h} stroke="var(--tw-line)" />
            <rect x="18" y="20" width="22" height="22" rx="6" fill="var(--prj-soft)" stroke="var(--prj-line)" />
            <rect x="48" y="26" width="70" height="8" rx="4" fill="var(--tw-line-strong)" />
            {[70, 98, 126, 154, 182].map((y, index) => (
              <g key={y}>
                <rect
                  x="18"
                  y={y}
                  width="114"
                  height="18"
                  rx="5"
                  fill={index === 0 ? 'var(--prj-soft)' : 'transparent'}
                />
                <rect x="28" y={y + 6} width={index === 0 ? 68 : 54} height="5" rx="2.5"
                  fill={index === 0 ? 'var(--prj)' : 'var(--tw-line-strong)'} opacity={index === 0 ? 0.85 : 0.7} />
              </g>
            ))}
            <rect x="18" y="440" width="114" height="1" fill="var(--tw-line)" />
            <rect x="28" y="456" width="48" height="5" rx="2.5" fill="var(--tw-line-strong)" opacity="0.6" />
          </>
        ) : null}

        {children}

        {label ? (
          <g>
            <rect
              x={PREVIEW_VIEWBOX.w - 194}
              y={PREVIEW_VIEWBOX.h - 26}
              width="182"
              height="18"
              rx="9"
              fill="var(--tw-surface)"
              stroke="var(--tw-line)"
              opacity="0.95"
            />
            <text
              x={PREVIEW_VIEWBOX.w - 103}
              y={PREVIEW_VIEWBOX.h - 13.5}
              textAnchor="middle"
              fontSize="9.5"
              letterSpacing="0.08em"
              fill="var(--tw-fg-subtle)"
              fontFamily="var(--font-mono)"
            >
              {label.toUpperCase()}
            </text>
          </g>
        ) : null}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ atoms --- */

export function PText({
  x,
  y,
  children,
  size = 11,
  weight = 400,
  fill = 'var(--tw-fg-muted)',
  mono = false,
  anchor = 'start',
  letterSpacing,
  opacity = 1,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  weight?: number;
  fill?: string;
  mono?: boolean;
  anchor?: 'start' | 'middle' | 'end';
  letterSpacing?: number;
  opacity?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={weight}
      fill={fill}
      textAnchor={anchor}
      opacity={opacity}
      letterSpacing={letterSpacing}
      fontFamily={mono ? 'var(--font-mono)' : 'var(--font-sans)'}
    >
      {children}
    </text>
  );
}

/** A rounded "text line" placeholder — used where real copy is not the point. */
export function PLine({
  x,
  y,
  w,
  h = 5,
  fill = 'var(--tw-line-strong)',
  opacity = 0.75,
  rx = 2.5,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  fill?: string;
  opacity?: number;
  rx?: number;
}) {
  return <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} opacity={opacity} />;
}

export function PCard({
  x,
  y,
  w,
  h,
  fill = 'var(--tw-surface)',
  stroke = 'var(--tw-line)',
  rx = 8,
  opacity = 1,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  stroke?: string;
  rx?: number;
  opacity?: number;
}) {
  return <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={stroke} opacity={opacity} />;
}

export function PChip({
  x,
  y,
  w = 54,
  label,
  tone = 'neutral',
}: {
  x: number;
  y: number;
  w?: number;
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const palette: Record<string, { bg: string; fg: string; line: string }> = {
    neutral: { bg: 'var(--tw-sunken)', fg: 'var(--tw-fg-muted)', line: 'var(--tw-line)' },
    accent: { bg: 'var(--prj-soft)', fg: 'var(--prj)', line: 'var(--prj-line)' },
    success: { bg: 'var(--tw-success-soft)', fg: 'var(--tw-success)', line: 'var(--tw-line)' },
    warning: { bg: 'var(--tw-warning-soft)', fg: 'var(--tw-warning)', line: 'var(--tw-line)' },
    danger: { bg: 'var(--tw-danger-soft)', fg: 'var(--tw-danger)', line: 'var(--tw-line)' },
    info: { bg: 'var(--tw-info-soft)', fg: 'var(--tw-info)', line: 'var(--tw-line)' },
  };
  const colors = palette[tone];
  return (
    <g>
      <rect x={x} y={y} width={w} height="16" rx="8" fill={colors.bg} stroke={colors.line} />
      <text
        x={x + w / 2}
        y={y + 11.2}
        fontSize="8.5"
        textAnchor="middle"
        fill={colors.fg}
        fontFamily="var(--font-mono)"
      >
        {label}
      </text>
    </g>
  );
}

export function PBar({
  x,
  y,
  w,
  h = 8,
  value,
  color = 'var(--prj)',
  track = 'var(--tw-sunken)',
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  /** 0..1 */
  value: number;
  color?: string;
  track?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={track} />
      <rect
        x={x}
        y={y}
        width={Math.max(h, w * Math.min(1, Math.max(0, value)))}
        height={h}
        rx={h / 2}
        fill={color}
      />
    </g>
  );
}

export function PRowLines({ x, y, widths, gap = 10 }: { x: number; y: number; widths: number[]; gap?: number }) {
  return (
    <g>
      {widths.map((w, index) => (
        <PLine key={index} x={x} y={y + index * gap} w={w} opacity={0.7 - index * 0.08} />
      ))}
    </g>
  );
}

/** Column chart. */
export function PColumns({
  x,
  y,
  w,
  h,
  values,
  color = 'var(--prj)',
  gap = 4,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  values: number[];
  color?: string;
  gap?: number;
}) {
  const max = Math.max(...values, 1);
  const bw = (w - gap * (values.length - 1)) / values.length;
  return (
    <g>
      {values.map((value, index) => {
        const bh = (value / max) * h;
        return (
          <rect
            key={index}
            x={x + index * (bw + gap)}
            y={y + h - bh}
            width={bw}
            height={Math.max(2, bh)}
            rx="2"
            fill={color}
            opacity={0.35 + 0.65 * (value / max)}
          />
        );
      })}
      <line x1={x} y1={y + h} x2={x + w} y2={y + h} stroke="var(--tw-line)" />
    </g>
  );
}

/** Area/line series. */
export function PSeries({
  x,
  y,
  w,
  h,
  values,
  color = 'var(--prj)',
  fill = true,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  values: number[];
  color?: string;
  fill?: boolean;
}) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = w / Math.max(1, values.length - 1);
  const points = values.map((value, index) => {
    const px = x + index * step;
    const py = y + h - ((value - min) / range) * h;
    return `${px.toFixed(1)},${py.toFixed(1)}`;
  });
  const linePath = `M${points.join(' L')}`;
  const areaPath = `${linePath} L${(x + w).toFixed(1)},${y + h} L${x.toFixed(1)},${y + h} Z`;
  return (
    <g>
      {fill ? <path d={areaPath} fill={color} opacity="0.14" /> : null}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <line x1={x} y1={y + h} x2={x + w} y2={y + h} stroke="var(--tw-line)" />
    </g>
  );
}

/** Horizontal stacked severity bar. */
export function PStack({
  x,
  y,
  w,
  h = 10,
  segments,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  segments: { value: number; color: string }[];
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  let cursor = x;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="var(--tw-sunken)" />
      {segments.map((segment, index) => {
        const sw = (segment.value / total) * w;
        const rect = (
          <rect
            key={index}
            x={cursor}
            y={y}
            width={Math.max(0, sw - (index === segments.length - 1 ? 0 : 1.5))}
            height={h}
            rx={h / 2}
            fill={segment.color}
          />
        );
        cursor += sw;
        return rect;
      })}
    </g>
  );
}

export type ChipTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export type PreviewCell =
  | { kind?: 'lines'; widths: number[] }
  | { kind: 'chip'; label: string; tone?: ChipTone }
  | { kind: 'text'; value: string; mono?: boolean };

/**
 * Simple table: header row plus data rows. Cells are placeholders unless real
 * text makes the preview clearer.
 */
export function PTable({
  x,
  y,
  w,
  columns,
  rows,
  rowHeight = 26,
}: {
  x: number;
  y: number;
  w: number;
  columns: { label: string; width: number }[];
  rows: PreviewCell[][];
  rowHeight?: number;
}) {
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0) || 1;
  const scaled = columns.map((column) => (column.width / totalWidth) * w);
  let cursorX = x;
  const offsets = scaled.map((columnWidth) => {
    const offset = cursorX;
    cursorX += columnWidth;
    return offset;
  });

  return (
    <g>
      <rect x={x} y={y} width={w} height="22" rx="6" fill="var(--tw-sunken)" />
      {columns.map((column, index) => (
        <PText
          key={column.label}
          x={offsets[index] + 10}
          y={y + 14.5}
          size={8.5}
          mono
          fill="var(--tw-fg-subtle)"
          letterSpacing={0.6}
        >
          {column.label.toUpperCase()}
        </PText>
      ))}
      {rows.map((row, rowIndex) => {
        const ry = y + 22 + rowIndex * rowHeight;
        return (
          <g key={rowIndex}>
            <line x1={x} y1={ry} x2={x + w} y2={ry} stroke="var(--tw-line)" opacity={rowIndex === 0 ? 0 : 1} />
            {row.map((cell, columnIndex) => {
              const cellWidth = scaled[columnIndex] - 20;
              const cellX = offsets[columnIndex] + 10;
              const kind = cell.kind ?? 'lines';

              if (kind === 'chip' && 'label' in cell) {
                return (
                  <PChip
                    key={columnIndex}
                    x={cellX}
                    y={ry + 6}
                    w={Math.min(72, cellWidth)}
                    label={cell.label}
                    tone={cell.tone ?? 'neutral'}
                  />
                );
              }

              if (kind === 'text' && 'value' in cell) {
                return (
                  <PText
                    key={columnIndex}
                    x={cellX}
                    y={ry + 16}
                    size={9.5}
                    mono={cell.mono ?? false}
                    fill="var(--tw-fg)"
                  >
                    {cell.value}
                  </PText>
                );
              }

              if ('widths' in cell) {
                return (
                  <g key={columnIndex}>
                    {cell.widths.map((lineWidth, lineIndex) => (
                      <PLine
                        key={lineIndex}
                        x={cellX}
                        y={ry + 8 + lineIndex * 8}
                        w={Math.min(cellWidth, lineWidth)}
                        h={4}
                        opacity={0.62 - lineIndex * 0.18}
                      />
                    ))}
                  </g>
                );
              }

              return null;
            })}
          </g>
        );
      })}
    </g>
  );
}

/** Donut / gauge. */
export function PDonut({
  cx,
  cy,
  r = 34,
  segments,
  centerLabel,
  centerSub,
}: {
  cx: number;
  cy: number;
  r?: number;
  segments: { value: number; color: string }[];
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--tw-sunken)" strokeWidth="10" />
      {segments.map((segment, index) => {
        const length = (segment.value / total) * circumference;
        const circle = (
          <circle
            key={index}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={segment.color}
            strokeWidth="10"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
        offset += length;
        return circle;
      })}
      {centerLabel ? (
        <PText x={cx} y={cy + 2} size={16} weight={600} fill="var(--tw-fg)" anchor="middle">
          {centerLabel}
        </PText>
      ) : null}
      {centerSub ? (
        <PText x={cx} y={cy + 16} size={8.5} mono fill="var(--tw-fg-subtle)" anchor="middle">
          {centerSub}
        </PText>
      ) : null}
    </g>
  );
}
