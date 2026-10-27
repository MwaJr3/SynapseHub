export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
      <path d="M9 10h14M9 16h14M9 22h8" stroke="var(--color-on-accent)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="23" cy="22" r="2.2" fill="var(--color-on-accent)" />
    </svg>
  );
}
