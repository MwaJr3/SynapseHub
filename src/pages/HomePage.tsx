import { Hero } from '@/components/home/Hero';
import { FocusAreaGrid } from '@/components/home/FocusAreaGrid';
import { FeaturedProjects } from '@/components/home/FeaturedProjects';
import {
  AboutPreview,
  ApproachPreview,
  ClosingCta,
  LibraryCta,
  PrinciplesGrid,
} from '@/components/home/HomeSections';
import { Section } from '@/components/ui/Section';
import { usePageMeta } from '@/hooks/usePageMeta';
import { projects } from '@/data/projects';
import { profileConfig, siteConfig } from '@/config/site';

export default function HomePage() {
  usePageMeta({
    title: 'Building better ways to learn',
    description: siteConfig.description,
    path: '/',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: profileConfig.name,
      description: profileConfig.role,
      knowsAbout: [
        'Offline-first e-learning',
        'AI-assisted tutoring',
        'Learning assessment and analytics',
        'Low-bandwidth education delivery',
        'Education access and affordability workflows',
      ],
      ...(siteConfig.url ? { url: siteConfig.url } : {}),
    },
  });

  const featuredCount = projects.filter((project) => project.featured).length;

  return (
    <>
      <Hero />

      <Section
        id="focus"
        tone="surface"
        eyebrow="01 — Areas of focus"
        title="Nine domains across the education-access problem"
        description="Each domain below is demonstrated by at least one portfolio project. The links go straight into the filtered library, so the overview leads somewhere useful."
      >
        <FocusAreaGrid />
      </Section>

      <Section
        id="featured"
        tone="quiet"
        eyebrow="02 — Featured work"
        title="Four projects that carry the central ideas"
        description="Learner access, AI-assisted support, evidence-aware personalization, and low-connectivity delivery — shown as they are built, with the honest states included."
      >
        <FeaturedProjects />
        <LibraryCta remaining={projects.length - featuredCount} />
      </Section>

      <Section
        id="approach"
        tone="contrast"
        eyebrow="03 — Engineering approach"
        title="Understand → Design → Build → Test → Improve"
        description="A method for keeping products honest: design the failure states, test the risky behaviours, and document what is not finished."
        motif
      >
        <ApproachPreview />
      </Section>

      <Section
        id="responsible"
        tone="surface"
        eyebrow="04 — Responsible technology"
        title="Design principles these projects are held to"
        description="These describe how the software is built. They are not claims of compliance, certification or measured learning impact."
      >
        <PrinciplesGrid />
      </Section>

      <Section
        id="about-preview"
        tone="quiet"
        eyebrow="05 — About"
        title="How I work"
      >
        <AboutPreview />
      </Section>

      <Section
        id="contact-preview"
        tone="contrast"
        eyebrow="06 — Contact"
        motif
      >
        <ClosingCta />
      </Section>
    </>
  );
}
