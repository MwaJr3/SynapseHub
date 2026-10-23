/**
 * Seeds the demonstration dataset. EVERY organization, person and listing
 * here is fictional — sample data for development and evaluation only.
 * Demo password for every account: demo-password-123
 */
import { runMigrations } from '../src/lib/db/migrate';
import { waitDbReady, getPgLite, getDb } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth/password';
import {
  applicationAnswers,
  applicationStatusHistory,
  applications,
  candidateNotes,
  jobCategories,
  jobQuestions,
  jobs,
  jobSkills,
  jobAlerts,
  moderationActions,
  notifications,
  organizationMemberships,
  organizations,
  profiles,
  reports,
  savedJobs,
  skills,
  users,
} from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

const DEMO_PASSWORD = 'demo-password-123';

async function main(): Promise<void> {
  await waitDbReady();
  await runMigrations();
  const db = getDb();

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, 'admin@workniche.example'))
    .limit(1);
  if (existingUser) {
    console.log('Seed data already present (admin@workniche.example exists); skipping.');
    const client = getPgLite();
    if (client) await client.close();
    return;
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  /* ---------------- categories + skills ---------------- */
  const categoryRows = await db
    .insert(jobCategories)
    .values([
      { name: 'Backend Engineering', slug: 'backend-engineering' },
      { name: 'Security Engineering', slug: 'security-engineering' },
      { name: 'Data Engineering', slug: 'data-engineering' },
      { name: 'Technical Writing', slug: 'technical-writing' },
      { name: 'Developer Relations', slug: 'developer-relations' },
      { name: 'Site Reliability', slug: 'site-reliability' },
      { name: 'Program Management', slug: 'program-management' },
    ])
    .returning({ id: jobCategories.id, slug: jobCategories.slug });
  const categoryBySlug = Object.fromEntries(
    categoryRows.map((row) => [row.slug, row.id]),
  );

  const skillNames = [
    'TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'Kubernetes', 'Terraform',
    'AWS', 'Python', 'Go', 'React', 'Security', 'Threat modeling', 'SIEM',
    'Data modeling', 'dbt', 'Airflow', 'Technical writing', 'API design',
    'GraphQL', 'Observability', 'Incident response', 'Accessibility',
  ];
  const skillRows = await db
    .insert(skills)
    .values(skillNames.map((name) => ({ name })))
    .returning({ id: skills.id, name: skills.name });
  const skillByName = Object.fromEntries(
    skillRows.map((row) => [row.name, row.id]),
  );

  /* ---------------- users ---------------- */
  const userDefs = [
    { email: 'admin@workniche.example', name: 'Demo Administrator', role: 'ADMIN' },
    { email: 'amara@example.com', name: 'Amara Simwale', role: 'JOB_SEEKER' },
    { email: 'thabo@example.com', name: 'Thabo Mwansa', role: 'JOB_SEEKER' },
    { email: 'zainab@example.com', name: 'Zainab Phiri', role: 'JOB_SEEKER' },
    { email: 'kefilwe@example.com', name: 'Kefilwe Molefe', role: 'JOB_SEEKER' },
    { email: 'hiring@novastack.example', name: 'NovaStack Hiring', role: 'EMPLOYER' },
    { email: 'recruiter@novastack.example', name: 'NovaStack Recruiting', role: 'RECRUITER' },
    { email: 'talent@cybershield.example', name: 'CyberShield Talent', role: 'EMPLOYER' },
    { email: 'careers@cloudforge.example', name: 'CloudForge Careers', role: 'EMPLOYER' },
    { email: 'jobs@datasphere.example', name: 'DataSphere Jobs', role: 'EMPLOYER' },
    { email: 'join@opengrid.example', name: 'OpenGrid Join', role: 'EMPLOYER' },
  ] as const;

  const userRows = await db
    .insert(users)
    .values(
      userDefs.map((user) => ({
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role as never,
        emailVerifiedAt: new Date(),
      })),
    )
    .returning({ id: users.id, email: users.email });
  const userByEmail = Object.fromEntries(
    userRows.map((row) => [row.email, row.id]),
  );

  await db.insert(profiles).values([
    {
      userId: userByEmail['amara@example.com']!,
      headline: 'Backend engineer focused on learning platforms',
      bio: 'I build APIs and data pipelines that keep course platforms fast and reliable.',
      location: 'Lusaka, Zambia',
      remotePreference: 'REMOTE_ONLY',
      yearsExperience: 5,
      skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Redis'],
      technologies: ['React', 'AWS'],
      visibility: 'VERIFIED_EMPLOYERS',
    },
    {
      userId: userByEmail['thabo@example.com']!,
      headline: 'Technical writer and developer educator',
      bio: 'Documentation, tutorials and API references for developer tools.',
      location: 'Nairobi, Kenya',
      remotePreference: 'HYBRID_OK',
      yearsExperience: 4,
      skills: ['Technical writing', 'API design', 'Accessibility'],
      technologies: ['React'],
      visibility: 'PUBLIC',
    },
    {
      userId: userByEmail['zainab@example.com']!,
      headline: 'Security engineer',
      bio: 'Threat modeling, detection engineering and incident response.',
      location: 'Gaborone, Botswana',
      remotePreference: 'ANY',
      yearsExperience: 6,
      skills: ['Security', 'Threat modeling', 'SIEM', 'Python'],
      technologies: ['AWS'],
      visibility: 'VERIFIED_EMPLOYERS',
    },
    {
      userId: userByEmail['kefilwe@example.com']!,
      headline: 'Data engineer',
      bio: 'Warehouse modeling and dependable pipelines.',
      location: 'Windhoek, Namibia',
      remotePreference: 'REMOTE_ONLY',
      yearsExperience: 3,
      skills: ['Data modeling', 'dbt', 'Airflow', 'Python'],
      technologies: ['PostgreSQL'],
      visibility: 'PRIVATE',
    },
  ]);

  /* ---------------- organizations ---------------- */
  const orgDefs = [
    {
      name: 'NovaStack (fictional)',
      slug: 'novastack',
      industry: 'Developer tooling',
      headquarters: 'Lusaka, Zambia',
      verificationStatus: 'VERIFIED',
      description:
        'Fictional demonstration company building deployment tooling. Not a real employer.',
    },
    {
      name: 'CyberShield (fictional)',
      slug: 'cybershield',
      industry: 'Security',
      headquarters: 'Gaborone, Botswana',
      verificationStatus: 'VERIFIED',
      description:
        'Fictional demonstration security firm. Not a real employer.',
    },
    {
      name: 'CloudForge (fictional)',
      slug: 'cloudforge',
      industry: 'Cloud infrastructure',
      headquarters: 'Kigali, Rwanda',
      verificationStatus: 'UNDER_REVIEW',
      description:
        'Fictional demonstration infrastructure company. Not a real employer.',
    },
    {
      name: 'DataSphere (fictional)',
      slug: 'datasphere',
      industry: 'Analytics',
      headquarters: 'Nairobi, Kenya',
      verificationStatus: 'UNVERIFIED',
      description:
        'Fictional demonstration analytics company. Not a real employer.',
    },
    {
      name: 'OpenGrid (fictional)',
      slug: 'opengrid',
      industry: 'Open source',
      headquarters: 'Remote',
      verificationStatus: 'UNVERIFIED',
      description:
        'Fictional demonstration open-source collective. Not a real employer.',
    },
  ];

  const orgRows = await db
    .insert(organizations)
    .values(
      orgDefs.map((org) => ({
        name: org.name,
        slug: org.slug,
        industry: org.industry,
        headquarters: org.headquarters,
        verificationStatus: org.verificationStatus as never,
        description: org.description,
        website: '',
        createdById: userByEmail['admin@workniche.example']!,
      })),
    )
    .returning({ id: organizations.id, slug: organizations.slug });
  const orgBySlug = Object.fromEntries(
    orgRows.map((row) => [row.slug, row.id]),
  );

  await db.insert(organizationMemberships).values([
    { organizationId: orgBySlug['novastack']!, userId: userByEmail['hiring@novastack.example']!, role: 'OWNER' },
    { organizationId: orgBySlug['novastack']!, userId: userByEmail['recruiter@novastack.example']!, role: 'RECRUITER' },
    { organizationId: orgBySlug['cybershield']!, userId: userByEmail['talent@cybershield.example']!, role: 'OWNER' },
    { organizationId: orgBySlug['cloudforge']!, userId: userByEmail['careers@cloudforge.example']!, role: 'OWNER' },
    { organizationId: orgBySlug['datasphere']!, userId: userByEmail['jobs@datasphere.example']!, role: 'OWNER' },
    { organizationId: orgBySlug['opengrid']!, userId: userByEmail['join@opengrid.example']!, role: 'OWNER' },
  ]);

  /* ---------------- jobs ---------------- */
  const deadlineSoon = new Date(Date.now() + 3 * 86_400_000);
  interface JobDef {
    title: string;
    slug: string;
    org: string;
    category: string;
    employmentType: string;
    experienceLevel: string;
    workplaceType: string;
    location: string;
    salaryMin: number;
    salaryMax: number;
    status: string;
    daysAgo: number;
    description: string;
    skills: string[];
    questions: Array<{ question: string; required: boolean }>;
    applicationDeadline?: Date;
    applicationMethod?: string;
  }
  const jobDefs: JobDef[] = [
    {
      title: 'Senior Backend Engineer', slug: 'senior-backend-engineer',
      org: 'novastack', category: 'backend-engineering', employmentType: 'FULL_TIME',
      experienceLevel: 'SENIOR', workplaceType: 'REMOTE', location: 'Remote (Africa)',
      salaryMin: 60000, salaryMax: 90000, status: 'PUBLISHED', daysAgo: 5,
      description:
        'Own the deployment API that teams use to ship services. You will design job queues, versioned APIs and the PostgreSQL schema behind them, and keep p95 latency honest under load.',
      skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'API design'],
      questions: [
        { question: 'Describe a queue you have designed and its failure modes.', required: true },
      ],
    },
    {
      title: 'Security Engineer', slug: 'security-engineer',
      org: 'cybershield', category: 'security-engineering', employmentType: 'FULL_TIME',
      experienceLevel: 'MID', workplaceType: 'HYBRID', location: 'Gaborone, Botswana',
      salaryMin: 45000, salaryMax: 70000, status: 'PUBLISHED', daysAgo: 12,
      description:
        'Detection engineering and incident response for managed clients. Build detections, run tabletop exercises and write clear post-incident reviews.',
      skills: ['Security', 'Threat modeling', 'SIEM', 'Incident response'],
      questions: [
        { question: 'Walk through a detection you wrote and how you tuned it.', required: true },
      ],
    },
    {
      title: 'Analytics Engineer', slug: 'analytics-engineer',
      org: 'datasphere', category: 'data-engineering', employmentType: 'FULL_TIME',
      experienceLevel: 'MID', workplaceType: 'REMOTE', location: 'Remote',
      salaryMin: 40000, salaryMax: 65000, status: 'PUBLISHED', daysAgo: 20,
      description:
        'Model the warehouse, own dbt pipelines and make metric definitions explicit so reports stop disagreeing.',
      skills: ['Data modeling', 'dbt', 'Airflow', 'Python'],
      questions: [],
    },
    {
      title: 'Technical Writer', slug: 'technical-writer',
      org: 'opengrid', category: 'technical-writing', employmentType: 'CONTRACT',
      experienceLevel: 'MID', workplaceType: 'REMOTE', location: 'Remote',
      salaryMin: 30000, salaryMax: 48000, status: 'PUBLISHED', daysAgo: 8,
      description:
        'Write and restructure the developer documentation: getting-started guides, API references and honest migration notes.',
      skills: ['Technical writing', 'API design', 'Accessibility'],
      questions: [],
    },
    {
      title: 'Developer Advocate', slug: 'developer-advocate',
      org: 'novastack', category: 'developer-relations', employmentType: 'FULL_TIME',
      experienceLevel: 'MID', workplaceType: 'HYBRID', location: 'Lusaka, Zambia',
      salaryMin: 38000, salaryMax: 60000, status: 'DRAFT', daysAgo: 2,
      description:
        'Talk with developers, turn their friction into product feedback and write samples that actually run.',
      skills: ['Technical writing', 'API design', 'Node.js'],
      questions: [],
    },
    {
      title: 'SOC Analyst (Night Shift)', slug: 'soc-analyst-night-shift',
      org: 'cybershield', category: 'security-engineering', employmentType: 'FULL_TIME',
      experienceLevel: 'JUNIOR', workplaceType: 'ONSITE', location: 'Gaborone, Botswana',
      salaryMin: 22000, salaryMax: 34000, status: 'CLOSED', daysAgo: 40,
      description:
        'Monitor alerts, triage incidents and escalate with clear notes. Closed role kept for demonstration history.',
      skills: ['Security', 'SIEM'],
      questions: [],
    },
    {
      title: 'Open Source Program Manager', slug: 'open-source-program-manager',
      org: 'opengrid', category: 'program-management', employmentType: 'FULL_TIME',
      experienceLevel: 'SENIOR', workplaceType: 'REMOTE', location: 'Remote',
      salaryMin: 52000, salaryMax: 78000, status: 'PUBLISHED', daysAgo: 1,
      applicationDeadline: deadlineSoon,
      applicationMethod: 'EXTERNAL',
      description:
        'Coordinate maintainers, releases and community governance across time zones. Applications go to the collective’s own careers page.',
      skills: ['Technical writing', 'Program management'],
      questions: [],
    },
    {
      title: 'Platform Engineer', slug: 'platform-engineer',
      org: 'cloudforge', category: 'site-reliability', employmentType: 'FULL_TIME',
      experienceLevel: 'SENIOR', workplaceType: 'REMOTE', location: 'Remote',
      salaryMin: 55000, salaryMax: 85000, status: 'PUBLISHED', daysAgo: 15,
      description:
        'Kubernetes platforms, Terraform modules and observability that tells the truth during incidents.',
      skills: ['Kubernetes', 'Terraform', 'Observability', 'AWS'],
      questions: [],
    },
    {
      title: 'Frontend Engineer', slug: 'frontend-engineer',
      org: 'novastack', category: 'backend-engineering', employmentType: 'FULL_TIME',
      experienceLevel: 'MID', workplaceType: 'HYBRID', location: 'Lusaka, Zambia',
      salaryMin: 36000, salaryMax: 58000, status: 'PAUSED', daysAgo: 30,
      description:
        'Build the deployment dashboard in React and TypeScript with a strong accessibility bar.',
      skills: ['TypeScript', 'React', 'Accessibility'],
      questions: [],
    },
    {
      title: 'Data Engineer', slug: 'data-engineer',
      org: 'datasphere', category: 'data-engineering', employmentType: 'CONTRACT',
      experienceLevel: 'SENIOR', workplaceType: 'REMOTE', location: 'Remote',
      salaryMin: 50000, salaryMax: 80000, status: 'PUBLISHED', daysAgo: 25,
      description:
        'Airflow orchestration, warehouse modeling and dependable backfills for analytics products.',
      skills: ['Airflow', 'Data modeling', 'Python', 'PostgreSQL'],
      questions: [],
    },
    {
      title: 'Cloud Security Architect', slug: 'cloud-security-architect',
      org: 'cloudforge', category: 'security-engineering', employmentType: 'FULL_TIME',
      experienceLevel: 'LEAD', workplaceType: 'REMOTE', location: 'Remote',
      salaryMin: 70000, salaryMax: 110000, status: 'PUBLISHED', daysAgo: 10,
      description:
        'Own threat models and reference architectures for the platform’s multi-tenant control plane.',
      skills: ['Security', 'Threat modeling', 'AWS', 'Kubernetes'],
      questions: [],
    },
    {
      title: 'API Documentation Engineer', slug: 'api-documentation-engineer',
      org: 'novastack', category: 'technical-writing', employmentType: 'FULL_TIME',
      experienceLevel: 'JUNIOR', workplaceType: 'REMOTE', location: 'Remote',
      salaryMin: 26000, salaryMax: 40000, status: 'PUBLISHED', daysAgo: 3,
      description:
        'Keep the reference docs generated, tested and readable. Pair with engineers to document new endpoints as they ship.',
      skills: ['Technical writing', 'API design', 'TypeScript'],
      questions: [],
    },
    {
      title: 'Site Reliability Engineer', slug: 'site-reliability-engineer',
      org: 'cybershield', category: 'site-reliability', employmentType: 'FULL_TIME',
      experienceLevel: 'MID', workplaceType: 'HYBRID', location: 'Gaborone, Botswana',
      salaryMin: 42000, salaryMax: 68000, status: 'DRAFT', daysAgo: 1,
      description:
        'On-call for the detection platform: dashboards, alert tuning and blameless incident reviews.',
      skills: ['Observability', 'Incident response', 'Kubernetes'],
      questions: [],
    },
    {
      title: 'Community Engineer', slug: 'community-engineer',
      org: 'opengrid', category: 'developer-relations', employmentType: 'PART_TIME',
      experienceLevel: 'JUNIOR', workplaceType: 'REMOTE', location: 'Remote',
      salaryMin: 18000, salaryMax: 28000, status: 'PUBLISHED', daysAgo: 7,
      description:
        'Triage community issues, improve onboarding docs and run the weekly contributor call.',
      skills: ['Technical writing', 'Node.js', 'Accessibility'],
      questions: [],
    },
  ];

  for (const def of jobDefs) {
    const publishedAt =
      def.status === 'DRAFT'
        ? null
        : new Date(Date.now() - def.daysAgo * 86_400_000);
    const [job] = await db
      .insert(jobs)
      .values({
        organizationId: orgBySlug[def.org]!,
        title: def.title,
        slug: def.slug,
        categoryId: categoryBySlug[def.category] ?? null,
        employmentType: def.employmentType as never,
        experienceLevel: def.experienceLevel as never,
        workplaceType: def.workplaceType as never,
        location: def.location,
        salaryMin: def.salaryMin,
        salaryMax: def.salaryMax,
        description: def.description,
        responsibilities: 'See the description for the scope of this role.',
        requiredQualifications: 'Experience with the listed skills.',
        status: def.status as never,
        publishedAt,
        closedAt: def.status === 'CLOSED' ? new Date(Date.now() - 10 * 86_400_000) : null,
        applicationDeadline: def.applicationDeadline ?? null,
        applicationMethod: def.applicationMethod ?? 'INTERNAL',
        externalApplicationUrl:
          def.applicationMethod === 'EXTERNAL'
            ? 'https://careers.example.org/opengrid/apply'
            : '',
      })
      .returning({ id: jobs.id });

    for (const skillName of def.skills) {
      const skillId = skillByName[skillName];
      if (skillId) {
        await db
          .insert(jobSkills)
          .values({ jobId: job!.id, skillId })
          .onConflictDoNothing();
      }
    }
    for (const [index, question] of def.questions.entries()) {
      await db.insert(jobQuestions).values({
        jobId: job!.id,
        question: question.question,
        required: question.required,
        position: index,
      });
    }
  }

  /* ---------------- applications ---------------- */
  const jobBySlugRows = await db
    .select({ id: jobs.id, slug: jobs.slug })
    .from(jobs);
  const jobBySlug = Object.fromEntries(
    jobBySlugRows.map((row) => [row.slug, row.id]),
  );

  const appDefs = [
    {
      job: 'senior-backend-engineer', applicant: 'amara@example.com',
      status: 'SHORTLISTED', cover:
        'I have shipped queue-backed deployment systems on PostgreSQL and would bring that experience here.',
      note: 'Strong systems background; schedule the technical conversation.',
    },
    {
      job: 'senior-backend-engineer', applicant: 'thabo@example.com',
      status: 'UNDER_REVIEW', cover:
        'My backend experience is lighter but I write clear design docs and want to grow into this role.',
      note: '',
    },
    {
      job: 'security-engineer', applicant: 'zainab@example.com',
      status: 'INTERVIEW', cover:
        'Detection engineering is my day job — I tune SIEM rules and run incident reviews.',
      note: 'Onsite interview scheduled with the security lead.',
    },
    {
      job: 'analytics-engineer', applicant: 'amara@example.com',
      status: 'REJECTED', cover:
        'Data modeling and dbt work from my last platform team.',
      note: 'Role required deeper warehouse experience.',
    },
    {
      job: 'api-documentation-engineer', applicant: 'thabo@example.com',
      status: 'SUBMITTED', cover:
        'Documentation is my craft — references, tutorials and changelogs.',
      note: '',
    },
  ];

  for (const def of appDefs) {
    const [application] = await db
      .insert(applications)
      .values({
        jobId: jobBySlug[def.job]!,
        applicantId: userByEmail[def.applicant]!,
        status: def.status as never,
        coverLetter: def.cover,
      })
      .returning({ id: applications.id });

    await db.insert(applicationStatusHistory).values([
      {
        applicationId: application!.id,
        status: 'SUBMITTED',
        actorId: userByEmail[def.applicant]!,
        note: 'Application submitted',
      },
      ...(def.status !== 'SUBMITTED'
        ? [
            {
              applicationId: application!.id,
              status: def.status as never,
              actorId: userByEmail['hiring@novastack.example']!,
              note: 'Initial review',
            },
          ]
        : []),
    ]);
    if (def.note) {
      await db.insert(candidateNotes).values({
        applicationId: application!.id,
        authorId: userByEmail['hiring@novastack.example']!,
        body: def.note,
      });
    }
    await db.insert(applicationAnswers).values({
      applicationId: application!.id,
      question: 'Describe a queue you have designed and its failure modes.',
      answer: 'A Postgres-backed job queue with advisory locks; failure mode was duplicate delivery after worker crashes.',
    });
  }

  /* ---------------- saves, alerts, notifications, report ---------------- */
  await db.insert(savedJobs).values([
    { userId: userByEmail['amara@example.com']!, jobId: jobBySlug['platform-engineer']! },
    { userId: userByEmail['amara@example.com']!, jobId: jobBySlug['cloud-security-architect']! },
    { userId: userByEmail['thabo@example.com']!, jobId: jobBySlug['community-engineer']! },
  ]);

  await db.insert(jobAlerts).values([
    {
      userId: userByEmail['amara@example.com']!,
      keywords: 'backend, platform',
      skills: ['TypeScript', 'PostgreSQL'],
      remoteOnly: true,
      enabled: true,
    },
    {
      userId: userByEmail['thabo@example.com']!,
      keywords: 'documentation, writing',
      skills: ['Technical writing'],
      enabled: true,
    },
  ]);

  await db.insert(notifications).values([
    {
      userId: userByEmail['amara@example.com']!,
      type: 'APPLICATION_STATUS',
      title: 'Your application moved to shortlisted',
      body: 'NovaStack (fictional) shortlisted your application for Senior Backend Engineer.',
      link: '/dashboard/applications',
      dedupeKey: 'seed:amara-shortlisted',
    },
  ]);

  await db.insert(reports).values({
    reporterId: userByEmail['thabo@example.com']!,
    jobId: jobBySlug['technical-writer']!,
    organizationId: orgBySlug['opengrid']!,
    reason: 'MISLEADING',
    details: 'The description mentions tools not listed anywhere else; flagging for review.',
    status: 'OPEN',
  });

  console.log(
    'Seeded fictional demo data: 11 users, 5 organizations, 14 jobs, 5 applications. Password: demo-password-123',
  );
  const client = getPgLite();
  if (client) await client.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
