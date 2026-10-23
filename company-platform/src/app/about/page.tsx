import type { Metadata } from 'next';
import Link from 'next/link';

import { Section } from '@/components/ui';

export const metadata: Metadata = {
  title: 'About',
  description:
    'About this shared discovery platform: two independent companies, honest presentation rules, and how the work is developed.',
};

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <header className="card">
        <h1 className="text-2xl font-semibold">About this platform</h1>
        <p className="mt-3 max-w-prose text-muted">
          This is a shared discovery platform for two independent companies:
          Velaqori Systems (software and cybersecurity) and Tamuzi Learning
          (education technology). Both are working names pending trademark
          checks. The companies are separate businesses; the platform shares
          presentation, not ownership, staff, liability, or data controllership.
        </p>
      </header>

      <Section title="How the work is developed">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Start from a concrete problem and its real constraints.</li>
          <li>Build in small, testable components with documented interfaces.</li>
          <li>Write the case study alongside the code — problem, workflow, architecture, decisions, testing, limitations.</li>
          <li>Label everything unverified: deployment status, metrics, dates, and outcomes are never invented.</li>
          <li>Ship demo and source links only when real URLs are configured; hide the buttons otherwise.</li>
        </ol>
      </Section>

      <Section title="Honest presentation rules">
        <ul className="list-disc space-y-1 pl-5">
          <li>“Built” does not mean publicly deployed; status labels distinguish prototype, built, pilot, live, maintenance, and archived.</li>
          <li>Case studies use project briefs as their source and flag implementation details requiring verification.</li>
          <li>Seed and demo records are fictional and labelled; visuals are labelled illustrative until genuine screenshots exist.</li>
          <li>People profiles show only published fields; private resumes stay private until published.</li>
          <li>No certification, compliance, or legal status is claimed anywhere without supplied evidence.</li>
        </ul>
      </Section>

      <Section title="Explore">
        <ul className="space-y-1">
          <li><Link href="/companies" className="accent-text hover:underline">The two companies</Link></li>
          <li><Link href="/products" className="accent-text hover:underline">All 25 products</Link></li>
          <li><Link href="/case-studies" className="accent-text hover:underline">Case studies</Link></li>
          <li><Link href="/people" className="accent-text hover:underline">People</Link></li>
          <li><Link href="/contact" className="accent-text hover:underline">Contact</Link></li>
        </ul>
      </Section>
    </div>
  );
}
