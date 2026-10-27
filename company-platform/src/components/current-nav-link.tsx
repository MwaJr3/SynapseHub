'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';

/**
 * A navigational link that says which page you are on.
 *
 * The header is a server component, so the current path is not available as a
 * prop; `usePathname` is the one client-side hook this needs. The active item is
 * marked with `aria-current="page"` for assistive technology and with weight plus
 * an underline for everyone else — never colour alone.
 */
export function CurrentNavLink({
  href,
  activeClassName = 'font-semibold text-ink underline decoration-2 underline-offset-4',
  className,
  ...rest
}: ComponentProps<typeof Link> & { activeClassName?: string }) {
  const pathname = usePathname() ?? '';
  const target = String(href);
  const active = target === '/' ? pathname === '/' : pathname === target || pathname.startsWith(`${target}/`);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={[className, active ? activeClassName : ''].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
