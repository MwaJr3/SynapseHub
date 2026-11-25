import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { OfflineBanner } from '@/components/offline-banner';
import { MotionProvider } from '@/components/motion-provider';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { getSessionActor } from '@/lib/auth';

import './globals.css';
import '@/components/decor/decor.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://company-platform-ivory.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: './' },
  openGraph: { type: 'website', siteName: 'Velaqori & Tamuzi Platform', locale: 'en' },
  twitter: { card: 'summary_large_image' },
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
        <script
          type="application/ld+json"
          // Static, first-party JSON: no user input reaches this string.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Velaqori Systems & Tamuzi Learning',
              url: SITE_URL,
              description: 'Software and cybersecurity (Velaqori Systems) and education technology (Tamuzi Learning).',
            }),
          }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <MotionProvider>
        <OfflineBanner />
        <SiteHeader actor={actor} />
        <main id="main" className="mx-auto max-w-6xl px-4 py-10">
          {children}
        </main>
        <SiteFooter />
        </MotionProvider>
      </body>
    </html>
  );
}
