import type { Metadata } from 'next';
import type { JSX } from 'react';

import { SiteFooter, SiteHeader } from '@/components/site';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'WorkNiche — specialized technical work',
    template: '%s · WorkNiche',
  },
  description:
    'A demonstration job marketplace for specialized technical work. All companies, people and listings are fictional sample data.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="mx-auto min-h-[70vh] w-full max-w-6xl px-4 py-8">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
