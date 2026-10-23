import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { getSessionActor } from '@/lib/auth';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Velaqori Systems & Tamuzi Learning — shared discovery platform',
    template: '%s — Velaqori & Tamuzi Platform',
  },
  description:
    'One shared discovery platform for two independent companies: Velaqori Systems (software and cybersecurity) and Tamuzi Learning (education technology). Working names pending trademark checks.',
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const actor = await getSessionActor();
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader actor={actor} />
        <main id="main" className="mx-auto max-w-6xl px-4 py-10">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
