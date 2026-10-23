/**
 * Demo people for the seed. Everything here is synthetic demo data except the
 * profile record for Mwangala Chisuse, whose content is limited to themes
 * already documented in his own portfolio work in this repository — no
 * education history, credentials, or links are invented. His personal
 * portfolio URL is left unconfigured (empty) until he supplies it: the
 * "Visit Personal Portfolio" button stays hidden meanwhile.
 */

export interface DemoPersonSeed {
  email: string;
  name: string;
  password: string;
  role: 'MEMBER' | 'EDITOR' | 'ADMIN' | 'PLATFORM_OPERATOR';
  companySlugs: Array<'velaqori-systems' | 'tamuzi-learning'>;
  profile: {
    slug: string;
    displayName: string;
    pronouns: string;
    headline: string;
    shortBio: string;
    longBio: string;
    technicalSkills: string[];
    softSkills: string[];
    domains: string[];
    personalPortfolioUrl: string;
    githubUrl: string;
    professionalProfileUrl: string;
    contactVisible: boolean;
    publicationState: 'DRAFT' | 'PUBLISHED';
    education: Array<{
      institution: string;
      qualification: string;
      subject: string;
      period: string;
      description: string;
    }>;
    experience: Array<{
      role: string;
      organization: string;
      period: string;
      description: string;
      linkUrl: string;
    }>;
    certifications: Array<{
      name: string;
      issuer: string;
      period: string;
      note: string;
    }>;
    links: Array<{ label: string; url: string }>;
  };
}

export const demoPeople: DemoPersonSeed[] = [
  {
    email: 'demo.member@example.com',
    name: 'Mwangala Chisuse',
    password: 'demo-password-123',
    role: 'MEMBER',
    companySlugs: [],
    profile: {
      slug: 'mwangala-chisuse',
      displayName: 'Mwangala Chisuse',
      pronouns: '',
      headline: 'Software and cybersecurity builder; education-technology practitioner',
      shortBio:
        'Builds practical software across cybersecurity and education — from security utilities and full-stack platforms to campus and learning tools — with a habit of documenting what is real and labelling what is not.',
      longBio:
        'Mwangala Chisuse is a software and cybersecurity practitioner whose portfolio work spans both companies on this platform: security tooling, developer applications, engineering utilities, and education technology. His project record in this repository includes full-stack applications (such as WorkNiche), cybersecurity utilities, and learning tools built to documented, tested standards. This profile deliberately contains no education history, certifications, or external links beyond what he has verified and configured — those fields stay empty until he supplies them. His personal portfolio remains a standalone site; when its URL is configured, a "Visit Personal Portfolio" button appears on this profile.',
      technicalSkills: [
        'Software engineering',
        'Cybersecurity tooling',
        'Full-stack web development',
        'Education technology',
        'Data analysis',
        'Technical documentation',
      ],
      softSkills: [
        'Clear written communication',
        'Structured problem solving',
        'Honest scoping',
      ],
      domains: ['Cybersecurity', 'Software engineering', 'Education technology'],
      // Unconfigured on purpose — never invented. Configure via member dashboard.
      personalPortfolioUrl: '',
      githubUrl: '',
      professionalProfileUrl: '',
      contactVisible: false,
      publicationState: 'PUBLISHED',
      // Populated from verified records only — intentionally empty in the seed.
      education: [],
      experience: [],
      certifications: [],
      links: [],
    },
  },
  {
    email: 'demo.editor.velaqori@example.com',
    name: 'Demo Velaqori Editor',
    password: 'demo-password-123',
    role: 'EDITOR',
    companySlugs: ['velaqori-systems'],
    profile: {
      slug: 'demo-velaqori-editor',
      displayName: 'Demo Velaqori Editor',
      pronouns: 'they/them',
      headline: 'Fictional demo profile — Velaqori Systems editorial',
      shortBio:
        'Fictional demo record used to exercise the review and editorial flows. Not a real person.',
      longBio:
        'This profile is fictional demo data (synthetic, labelled) used to demonstrate the member and editorial workflows of this platform. It makes no claims about a real person and should be replaced or removed before any public launch.',
      technicalSkills: ['Technical writing', 'Security review'],
      softSkills: ['Editorial judgement'],
      domains: ['Cybersecurity'],
      personalPortfolioUrl: '',
      githubUrl: '',
      professionalProfileUrl: '',
      contactVisible: false,
      publicationState: 'PUBLISHED',
      education: [],
      experience: [],
      certifications: [],
      links: [],
    },
  },
  {
    email: 'demo.member.tamuzi@example.com',
    name: 'Demo Tamuzi Member',
    password: 'demo-password-123',
    role: 'MEMBER',
    companySlugs: ['tamuzi-learning'],
    profile: {
      slug: 'demo-tamuzi-member',
      displayName: 'Demo Tamuzi Member',
      pronouns: '',
      headline: 'Fictional demo profile — Tamuzi Learning member',
      shortBio:
        'Fictional demo record used to exercise the draft → review → publish flow. Not a real person.',
      longBio:
        'This profile is fictional demo data (synthetic, labelled) used to demonstrate the member profile workflow. It represents the draft state: the profile is complete enough to submit for review but is not published publicly.',
      technicalSkills: ['Learning design', 'Accessibility testing'],
      softSkills: ['Facilitation'],
      domains: ['Education technology'],
      personalPortfolioUrl: '',
      githubUrl: '',
      professionalProfileUrl: '',
      contactVisible: false,
      publicationState: 'DRAFT',
      education: [],
      experience: [],
      certifications: [],
      links: [],
    },
  },
];
