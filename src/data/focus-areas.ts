import type { FocusArea, Principle } from '@/types';

/**
 * The nine project domains introduced on the home page. Each card links into
 * the project library using a real filter (or a specific case study where the
 * domain is represented by one project).
 */
export const focusAreas: FocusArea[] = [
  {
    id: 'offline-first-learning',
    title: 'Offline-First Learning',
    description:
      'Downloads, local progress queues and explicit sync states, so studying does not depend on a connection that is not there.',
    categoryId: 'offline-first',
  },
  {
    id: 'ai-assisted-tutoring',
    title: 'AI-Assisted Tutoring',
    description:
      'Grounded explanations and graduated hints from approved material, with source references, review queues and labelled demo mode.',
    categoryId: 'ai-personalized',
  },
  {
    id: 'virtual-classrooms',
    title: 'Virtual Classrooms',
    description:
      'Scheduling, materials, attendance and asynchronous follow-up around a configurable real-time provider.',
    categoryId: 'virtual-classrooms',
  },
  {
    id: 'adaptive-learning-assessment',
    title: 'Adaptive Learning and Assessment',
    description:
      'Skills, prerequisites, evidence-backed mastery estimates and explainable recommendations instead of a completion percentage.',
    categoryId: 'assessment-analytics',
  },
  {
    id: 'teacher-content-tools',
    title: 'Teacher Content Tools',
    description:
      'Authoring, review and publishing workflows with version history, question banks and export adapters that state their limits.',
    categoryId: 'teacher-tools',
  },
  {
    id: 'open-educational-resources',
    title: 'Open Educational Resources',
    description:
      'Discovery, licence metadata, attribution, localisation and translation review for responsibly reusable learning material.',
    categoryId: 'open-resources',
  },
  {
    id: 'learning-analytics',
    title: 'Learning Analytics',
    description:
      'Idempotent event ingestion, defined metrics and transparent support flags that prompt a teacher rather than judge a learner.',
    projectSlug: 'learnpulse',
  },
  {
    id: 'sms-ussd-access',
    title: 'SMS / USSD Learning Access',
    description:
      'Short lessons, menus and voice scripts delivered to basic phones, with consent, quiet hours and honest delivery states.',
    projectSlug: 'reachlearn',
  },
  {
    id: 'affordable-access',
    title: 'Affordable Education Access',
    description:
      'Free plans, scholarships, fee waivers and sponsored seats with reviewed decisions and auditable allocation.',
    categoryId: 'affordable-access',
  },
];

/**
 * Design principles reflected across the projects. These describe how the
 * software is built; they are not claims of formal compliance or certification.
 */
export const principles: Principle[] = [
  {
    id: 'complement-educators',
    title: 'Learning support complements educators',
    description:
      'TutorSpring opens a source and defers to a teacher when the material does not support an answer; PathWise recommendations can be overridden with a recorded reason. Software advises, educators decide.',
  },
  {
    id: 'grounded-ai',
    title: 'AI output is grounded, validated and reviewable',
    description:
      'Explanations cite the approved material they used, citations are verified against retrieved passages, retrieved text is treated as untrusted data, and learners can flag an answer for human review.',
  },
  {
    id: 'support-not-label',
    title: 'Analytics support rather than permanently label',
    description:
      'LearnPulse raises flags from rules that display their own evidence, keeps "no data" distinct from "not learning", suppresses small cohorts, and lets teachers annotate or dismiss every flag.',
  },
  {
    id: 'honest-offline',
    title: 'Offline and low-bandwidth support is stated precisely',
    description:
      'LearnBridge marks offline availability per lesson and per asset, ReachLearn distinguishes the simulator from live carrier delivery, and ClassConnect reports a missing real-time provider instead of simulating a call.',
  },
  {
    id: 'privacy-context',
    title: 'Privacy, accessibility, language and context matter',
    description:
      'Records are minimised, phone numbers are redacted from logs, sponsor access is bounded to aggregates, interfaces stay keyboard accessible, and localisation keeps its source and licence attached.',
  },
  {
    id: 'accountable-decisions',
    title: 'Access and financial decisions are explainable',
    description:
      'EduAccess records a reason and a reviewer for every decision, keeps pending, failed, refunded and manually reconciled states distinct, and reserves seats transactionally so a funded place cannot be promised twice.',
  },
];
