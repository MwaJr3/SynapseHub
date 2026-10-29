import type { ReactNode, SVGProps } from 'react';

/**
 * Hand-drawn stroke icon set (24x24, currentColor, 1.6 stroke).
 * No icon dependency — keeps the bundle small and the visual language
 * consistent with the rest of the design system.
 */
export type IconName =
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up-right'
  | 'chevron-down'
  | 'chevron-right'
  | 'check'
  | 'close'
  | 'menu'
  | 'search'
  | 'filter'
  | 'copy'
  | 'mail'
  | 'github'
  | 'linkedin'
  | 'external'
  | 'code'
  | 'shield'
  | 'network'
  | 'radar'
  | 'alert'
  | 'book'
  | 'layers'
  | 'terminal'
  | 'file'
  | 'database'
  | 'spark'
  | 'target'
  | 'clock'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'blend'
  | 'info'
  | 'lock'
  | 'beaker'
  | 'git-branch'
  | 'eye'
  | 'user';

const paths: Record<IconName, ReactNode> = {
  'arrow-right': <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" />,
  'arrow-left': <path d="M20 12H5m0 0 5.5-5.5M5 12l5.5 5.5" />,
  'arrow-up-right': <path d="M7 17 17 7m0 0h-7.5M17 7v7.5" />,
  'chevron-down': <path d="m6 9.5 6 6 6-6" />,
  'chevron-right': <path d="m9.5 6 6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.25" />
      <path d="m16 16 4 4" />
    </>
  ),
  filter: <path d="M4 6h16l-6.2 7.3V19l-3.6-2v-3.7L4 6Z" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.2" />
      <path d="M15 6.2A2.2 2.2 0 0 0 12.8 4H6.2A2.2 2.2 0 0 0 4 6.2v6.6A2.2 2.2 0 0 0 6.2 15" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.2" />
      <path d="m3.8 7 7.3 5.4a1.5 1.5 0 0 0 1.8 0L20.2 7" />
    </>
  ),
  github: (
    <path d="M9.3 20.4c-4 1.2-4-2.1-5.6-2.5m11.2 4.6v-3.4c0-1 .1-1.4-.5-2 2.3-.3 4.6-1.1 4.6-5a3.9 3.9 0 0 0-1.1-2.7 3.6 3.6 0 0 0-.1-2.7s-.9-.3-2.9 1.1a10 10 0 0 0-5.2 0C7.7 4.4 6.8 4.7 6.8 4.7a3.6 3.6 0 0 0-.1 2.7 3.9 3.9 0 0 0-1.1 2.8c0 3.8 2.3 4.6 4.6 4.9-.6.6-.6 1.2-.5 2v3.3" />
  ),
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M8 10.5V16M8 7.6v.1M12 16v-3.2a2 2 0 0 1 4 0V16" />
    </>
  ),
  external: <path d="M14 4h6v6m0-6-9 9M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />,
  code: <path d="m9 8-4.5 4L9 16m6-8 4.5 4L15 16m-1.5-9.5-3 13" />,
  shield: <path d="M12 3.5 5.5 6v5.4c0 4 2.7 7.6 6.5 9.1 3.8-1.5 6.5-5.1 6.5-9.1V6L12 3.5Z" />,
  network: (
    <>
      <circle cx="12" cy="5.5" r="2.2" />
      <circle cx="5.5" cy="18" r="2.2" />
      <circle cx="18.5" cy="18" r="2.2" />
      <path d="M12 7.7v4.6m0 0-5 3.9m5-3.9 5 3.9" />
    </>
  ),
  radar: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 12 18 6.5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.8 3.6 19h16.8L12 4.8Z" />
      <path d="M12 10v4m0 2.4v.1" />
    </>
  ),
  book: <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v13.5H6.5A1.5 1.5 0 0 0 5 19V5.5Zm0 13.5A1.5 1.5 0 0 1 6.5 17.5H19V20H6.5A1.5 1.5 0 0 1 5 18.5Z" />,
  layers: <path d="m12 4 8 4.2-8 4.2-8-4.2L12 4Zm8 8.4-8 4.2-8-4.2m16 3.9-8 4.2-8-4.2" />,
  terminal: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.2" />
      <path d="m7.5 10 2.5 2-2.5 2m5 0h4" />
    </>
  ),
  file: <path d="M13.5 4H7.8A1.8 1.8 0 0 0 6 5.8v12.4A1.8 1.8 0 0 0 7.8 20h8.4a1.8 1.8 0 0 0 1.8-1.8V8.5L13.5 4Zm0 0v4.5H18" />,
  database: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="2.8" />
      <path d="M5 6v12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" />
    </>
  ),
  spark: <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9L4.5 10.8 10.2 9 12 3.5Z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.8v2.4m0 13.6v2.4M4.5 4.5l1.7 1.7m11.6 11.6 1.7 1.7M2.8 12h2.4m13.6 0h2.4M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7" />
    </>
  ),
  moon: <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z" />,
  monitor: (
    <>
      <rect x="3" y="4.5" width="18" height="12" rx="2" />
      <path d="M8.5 20h7M12 16.5V20" />
    </>
  ),
  blend: (
    <>
      <circle cx="9.5" cy="12" r="5.5" />
      <circle cx="14.5" cy="12" r="5.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 11v5.2m0-8.4v.1" />
    </>
  ),
  lock: (
    <>
      <rect x="4.8" y="10.5" width="14.4" height="9.5" rx="2" />
      <path d="M8.4 10.5V8a3.6 3.6 0 0 1 7.2 0v2.5" />
    </>
  ),
  beaker: <path d="M9.5 3.5h5M10.5 3.5v6L5.8 17.6A1.9 1.9 0 0 0 7.4 20.5h9.2a1.9 1.9 0 0 0 1.6-2.9L13.5 9.5v-6M8 14.5h8" />,
  'git-branch': (
    <>
      <circle cx="7" cy="6" r="2.4" />
      <circle cx="7" cy="18" r="2.4" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M7 8.4v7.2M17 11.4c0 3-2.6 4.2-5.6 4.6" />
    </>
  ),
  eye: (
    <>
      <path d="M2.8 12S6 6.5 12 6.5 21.2 12 21.2 12 18 17.5 12 17.5 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M5 19.5c1.2-3.2 3.8-4.8 7-4.8s5.8 1.6 7 4.8" />
    </>
  ),
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  title?: string;
}

export function Icon({ name, size = 20, title, className, ...rest }: IconProps) {
  const labelled = Boolean(title);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={labelled ? 'img' : 'presentation'}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {paths[name]}
    </svg>
  );
}
