/**
 * Challenge catalogue supplied for Mwangala's portfolio.
 *
 * Official challenge titles, URLs, challenge types, access tiers and difficulty
 * labels are recorded from the supplied links and official catalogue. Each slug
 * has a local-first prototype, but official starter code and licensed assets were
 * not supplied and full brief conformance is not verified. Nothing here implies
 * Frontend Mentor endorsement.
 */
export type ChallengeDifficulty = 'newbie' | 'junior' | 'intermediate' | 'advanced' | 'guru';
export type ChallengeType = 'design' | 'product' | 'unknown';
export type AccessTier = 'free' | 'premium' | 'unknown';

export interface ChallengeRecord {
  id: string;
  slug: string;
  title: string;
  originalChallengeUrl: string;
  challengeType: ChallengeType;
  accessTier: AccessTier;
  difficulty?: ChallengeDifficulty;
  category: string;
  categories: string[];
  description: string;
  implementationSummary: string;
  technologies: string[];
  features: string[];
  thumbnail: { kind: 'representative-illustration'; label: string };
  screenshots: { src: string; alt: string; caption?: string }[];
  liveDemoUrl?: string;
  repositoryUrl?: string;
  completed: boolean;
  responsive?: boolean;
  accessibilityNotes?: string[];
  engineeringHighlights: string[];
  lessonsLearned: string[];
  featured: boolean;
  displayOrder: number;
}

type ChallengeSeed = readonly [slug: string, title: string, category: string, url: string];

const seeds: ChallengeSeed[] = [
  ['poll-creator-app', 'Poll creator app', 'Interactive applications', 'https://www.frontendmentor.io/challenges/poll-creator-app'],
  ['restaurant-ranking-app', 'Restaurant ranking app', 'Interactive applications', 'https://www.frontendmentor.io/challenges/restaurant-ranking-app'],
  ['expense-splitter', 'Expense splitter app', 'Finance & calculators', 'https://www.frontendmentor.io/challenges/expense-splitter'],
  ['foreign-exchange-currency-converter', 'Foreign exchange currency converter', 'Finance & calculators', 'https://www.frontendmentor.io/challenges/foreign-exchange-currency-converter'],
  ['tech-conference-site', 'Tech conference site', 'Multi-page websites', 'https://www.frontendmentor.io/challenges/tech-conference-site'],
  ['savings-tracker', 'Savings tracker', 'Dashboards & data', 'https://www.frontendmentor.io/challenges/savings-tracker'],
  ['skills-learning-tracker', 'Skills learning tracker', 'Dashboards & data', 'https://www.frontendmentor.io/challenges/skills-learning-tracker'],
  ['personal-reading-list', 'Personal reading list', 'Interactive applications', 'https://www.frontendmentor.io/challenges/personal-reading-list'],
  ['flashcard-app', 'Flashcard app', 'Interactive applications', 'https://www.frontendmentor.io/challenges/flashcard-app'],
  ['bookmark-manager-app', 'Bookmark manager app', 'Interactive applications', 'https://www.frontendmentor.io/challenges/bookmark-manager-app'],
  ['recipe-finder-website', 'Recipe finder website', 'API-powered applications', 'https://www.frontendmentor.io/challenges/recipe-finder-website--Ui-TZTPxN'],
  ['mood-tracking-app', 'Mood tracking app', 'Interactive applications', 'https://www.frontendmentor.io/challenges/mood-tracking-app-E2XeKhDF0B'],
  ['personal-blog', 'Personal blog', 'Multi-page websites', 'https://www.frontendmentor.io/challenges/personal-blog-lJpVCnmozL'],
  ['character-counter', 'Character counter', 'Responsive UI components', 'https://www.frontendmentor.io/challenges/character-counter-znSgeWs_i6'],
  ['tech-book-club-landing-page', 'Tech book club landing page', 'Landing pages', 'https://www.frontendmentor.io/challenges/tech-book-club-landing-page-fZQidjHU73'],
  ['note-taking-web-app', 'Note-taking web app', 'Interactive applications', 'https://www.frontendmentor.io/challenges/note-taking-web-app-773r7bUfOG'],
  ['personal-finance-app', 'Personal finance app', 'Finance & calculators', 'https://www.frontendmentor.io/challenges/personal-finance-app-JfjtZgyMt1'],
  ['hangman-game', 'Hangman game', 'Games & interactive experiences', 'https://www.frontendmentor.io/challenges/hangman-game-rsQiSVLGWn'],
  ['frontend-quiz-app', 'Frontend Quiz app', 'Games & interactive experiences', 'https://www.frontendmentor.io/challenges/frontend-quiz-app-BE7xkzXQnU'],
  ['linksharing-app', 'Link-sharing app', 'Interactive applications', 'https://www.frontendmentor.io/challenges/linksharing-app-Fbt7yweGsT'],
  ['body-mass-index-calculator', 'Body Mass Index calculator', 'Finance & calculators', 'https://www.frontendmentor.io/challenges/body-mass-index-calculator-brrBkfSz1T'],
  ['workit-landing-page', 'Workit landing page', 'Landing pages', 'https://www.frontendmentor.io/challenges/workit-landing-page-2fYnyle5lu'],
  ['dictionary-web-app', 'Dictionary web app', 'API-powered applications', 'https://www.frontendmentor.io/challenges/dictionary-web-app-h5wwnyuKFL'],
  ['singlepage-developer-portfolio', 'Single-page developer portfolio', 'Landing pages', 'https://www.frontendmentor.io/challenges/singlepage-developer-portfolio-bBVj2ZPi-x'],
  ['connect-four-game', 'Connect Four game', 'Games & interactive experiences', 'https://www.frontendmentor.io/challenges/connect-four-game-6G8QVH923s'],
  ['password-generator-app', 'Password generator app', 'Interactive applications', 'https://www.frontendmentor.io/challenges/password-generator-app-Mr8CLycqjh'],
  ['singlepage-design-portfolio', 'Single-page design portfolio', 'Landing pages', 'https://www.frontendmentor.io/challenges/singlepage-design-portfolio-2MMhyhfKVo'],
  ['kanban-task-management-web-app', 'Kanban task management web app', 'Interactive applications', 'https://www.frontendmentor.io/challenges/kanban-task-management-web-app-wgQLt-HlbB'],
  ['skilled-elearning-landing-page', 'Skilled e-learning landing page', 'Landing pages', 'https://www.frontendmentor.io/challenges/skilled-elearning-landing-page-S1ObDrZ8q'],
  ['inbrowser-markdown-editor', 'In-browser markdown editor', 'Interactive applications', 'https://www.frontendmentor.io/challenges/inbrowser-markdown-editor-r16TrrQX9'],
  ['entertainment-web-app', 'Entertainment web app', 'Multi-page websites', 'https://www.frontendmentor.io/challenges/entertainment-web-app-J-UhgAW1X'],
  ['suite-landing-page', 'Suite landing page', 'Landing pages', 'https://www.frontendmentor.io/challenges/suite-landing-page-tj_eaU-Ra'],
  ['tic-tac-toe-game', 'Tic Tac Toe game', 'Games & interactive experiences', 'https://www.frontendmentor.io/challenges/tic-tac-toe-game-Re7ZF_E2v'],
  ['art-gallery-website', 'Art gallery website', 'Multi-page websites', 'https://www.frontendmentor.io/challenges/art-gallery-website-yVdrZlxyA'],
  ['equalizer-landing-page', 'Equalizer landing page', 'Landing pages', 'https://www.frontendmentor.io/challenges/equalizer-landing-page-7VJ4gp3DE'],
  ['memory-game', 'Memory game', 'Games & interactive experiences', 'https://www.frontendmentor.io/challenges/memory-game-vse4WFPvM'],
  ['github-user-search-app', 'GitHub user search app', 'API-powered applications', 'https://www.frontendmentor.io/challenges/github-user-search-app-Q09YOgaH6'],
  ['galleria-slideshow-site', 'Galleria slideshow site', 'Multi-page websites', 'https://www.frontendmentor.io/challenges/galleria-slideshow-site-tEA4pwsa6'],
  ['product-feedback-app', 'Product feedback app', 'Interactive applications', 'https://www.frontendmentor.io/challenges/product-feedback-app-wbvUYqjR6'],
  ['planets-fact-site', 'Planets fact site', 'Multi-page websites', 'https://www.frontendmentor.io/challenges/planets-fact-site-gazqN8w_f'],
  ['audiophile-ecommerce-website', 'Audiophile e-commerce website', 'Commerce & product experiences', 'https://www.frontendmentor.io/challenges/audiophile-ecommerce-website-C8cuSd_wx'],
  ['meet-landing-page', 'Meet landing page', 'Landing pages', 'https://www.frontendmentor.io/challenges/meet-landing-page-rbTDS6OUR'],
  ['typemaster-prelaunch-landing-page', 'Typemaster pre-launch landing page', 'Landing pages', 'https://www.frontendmentor.io/challenges/typemaster-prelaunch-landing-page-J6-Yj5J-X'],
  ['invoice-app', 'Invoice app', 'Finance & calculators', 'https://www.frontendmentor.io/challenges/invoice-app-i7KaLTQjl'],
  ['coffeeroasters-subscription-site', 'Coffeeroasters subscription site', 'Commerce & product experiences', 'https://www.frontendmentor.io/challenges/coffeeroasters-subscription-site-5Fc26HVY6'],
  ['maker-prelaunch-landing-page', 'Maker pre-launch landing page', 'Landing pages', 'https://www.frontendmentor.io/challenges/maker-prelaunch-landing-page-WVZIJtKLd'],
  ['pomodoro-app', 'Pomodoro app', 'Interactive applications', 'https://www.frontendmentor.io/challenges/pomodoro-app-KBFnycJ6G'],
  ['creative-agency-singlepage-site', 'Creative agency single-page site', 'Landing pages', 'https://www.frontendmentor.io/challenges/creative-agency-singlepage-site-Pq6V3I2RM'],
  ['pod-request-access-landing-page', 'Pod request access landing page', 'Landing pages', 'https://www.frontendmentor.io/challenges/pod-request-access-landing-page-eyTmdkLSG'],
  ['clock-app', 'Clock app', 'Interactive applications', 'https://www.frontendmentor.io/challenges/clock-app-LMFaxFwrM'],
  ['officelite-coming-soon-site', 'Officelite coming soon site', 'Landing pages', 'https://www.frontendmentor.io/challenges/officelite-coming-soon-site-M4DIPNz8g'],
  ['designo-multipage-website', 'Designo multi-page website', 'Multi-page websites', 'https://www.frontendmentor.io/challenges/designo-multipage-website-G48K6rfUT'],
  ['devjobs-web-app', 'Devjobs web app', 'Interactive applications', 'https://www.frontendmentor.io/challenges/devjobs-web-app-HuvC_LP4l'],
  ['payapi-multipage-website', 'PayAPI multi-page website', 'Multi-page websites', 'https://www.frontendmentor.io/challenges/payapi-multipage-website-FDLR1Y11e'],
  ['photosnap-multipage-website', 'Photosnap multi-page website', 'Multi-page websites', 'https://www.frontendmentor.io/challenges/photosnap-multipage-website-nMDSrNmNW'],
  ['arch-studio-multipage-website', 'Arch Studio multi-page website', 'Multi-page websites', 'https://www.frontendmentor.io/challenges/arch-studio-multipage-website-wNIbOFYR6'],
  ['scoot-multipage-website', 'Scoot multi-page website', 'Multi-page websites', 'https://www.frontendmentor.io/challenges/scoot-multipage-website-N76alNPRJ'],
  ['dine-restaurant-website', 'Dine restaurant website', 'Multi-page websites', 'https://www.frontendmentor.io/challenges/dine-restaurant-website-yAt7Vvxt7'],
  ['minimalist-portfolio-website', 'Minimalist portfolio website', 'Multi-page websites', 'https://www.frontendmentor.io/challenges/minimalist-portfolio-website-LMy-ZRyiE'],
  ['myteam-multipage-website', 'myteam multi-page website', 'Multi-page websites', 'https://www.frontendmentor.io/challenges/myteam-multipage-website-mxlEauvW'],
];

const challengeBriefs: Record<string, string> = {
  'poll-creator-app': 'A group polling product brief covering poll creation, guest voting, suggested options and a shareable results reveal.',
  'restaurant-ranking-app': 'A personal restaurant map and comparison-based ranking experience for logging visits and exploring local taste.',
  'expense-splitter': 'A group expense tool brief with flexible split rules, currency conversion and settlement tracking.',
  'foreign-exchange-currency-converter': 'A currency converter brief with live rates, rate history, multi-currency comparison and saved pairs.',
  'tech-conference-site': 'A multi-page conference site brief with speaker discovery, schedule filters and saved talks.',
  'savings-tracker': 'A savings tool brief for managing goals, recording deposits and visualizing progress over time.',
  'skills-learning-tracker': 'A practice tracker brief focused on logging sessions, streaks, heatmaps and progress rings.',
  'personal-reading-list': 'A reading-list brief for finding books, organizing shelves, tracking reading and reviewing yearly activity.',
  'flashcard-app': 'A study interface brief using card flips, progress tracking, filters and study statistics.',
  'bookmark-manager-app': 'A bookmark organizer brief covering adding, editing, archiving, searching and filtering saved links.',
  'recipe-finder-website': 'A responsive recipe discovery brief with search, filters, structured recipe data and dynamic results.',
  'mood-tracking-app': 'A mood journal brief that explores recording entries and understanding them through charts and JSON data.',
  'personal-blog': 'A multi-page blog brief using structured content data, with room to practice dynamic rendering or a CMS.',
  'character-counter': 'A writing utility brief with character counts, letter-density visualization and a theme control.',
  'tech-book-club-landing-page': 'A promotional landing page for a technology book club, emphasizing clear content structure and responsive layout.',
  'note-taking-web-app': 'A note-taking app brief with organization, editing and interface customization including color and font themes.',
  'personal-finance-app': 'A personal finance dashboard brief covering overview, transactions, budgets, savings pots and recurring bills.',
  'hangman-game': 'A word-guessing game brief combining accessible controls, responsive styling and game-state logic.',
  'frontend-quiz-app': 'A quiz experience brief using structured question data and a complete answer-and-results flow.',
  'linksharing-app': 'A developer link-sharing product brief involving profile links, repeatable fields, image handling and reordering.',
  'body-mass-index-calculator': 'A BMI calculator brief focused on form input, clear results and responsive layout changes.',
  'workit-landing-page': 'A responsive promotional landing page built around a strong hierarchy and curved section transitions.',
  'dictionary-web-app': 'A dictionary experience brief integrating a word lookup API with font and color-theme controls.',
  'singlepage-developer-portfolio': 'A personal developer portfolio layout with responsive content and validated contact-form interaction.',
  'connect-four-game': 'A two-player Connect Four game brief focused on turn handling and detecting win conditions.',
  'password-generator-app': 'A password generator brief with custom controls and JavaScript-based password generation.',
  'singlepage-design-portfolio': 'A responsive design portfolio featuring a visual skills grid and carefully composed page layout.',
  'kanban-task-management-web-app': 'A task-management workspace brief using board and task data with theme switching.',
  'skilled-elearning-landing-page': 'A responsive landing page introducing an online learning offer through structured cards and calls to action.',
  'inbrowser-markdown-editor': 'A browser-based Markdown editor brief with an editing and preview workflow and theme control.',
  'entertainment-web-app': 'An entertainment discovery experience using structured content, routing, state and search.',
  'suite-landing-page': 'A compact responsive landing-page exercise focused on a distinctive content layout.',
  'tic-tac-toe-game': 'A Tic Tac Toe game brief combining semantic structure, a board layout and turn-based game logic.',
  'art-gallery-website': 'A two-page gallery website brief centered on image-led presentation and deliberate layout composition.',
  'equalizer-landing-page': 'A responsive promotional page for an audio product, built as an HTML and CSS layout exercise.',
  'memory-game': 'A matching-pairs game brief with game-state logic and visual feedback for successful matches.',
  'github-user-search-app': 'A profile search interface brief that uses the GitHub users API to retrieve and present account data.',
  'galleria-slideshow-site': 'An art-gallery experience combining a masonry-style collection, slideshow navigation and a lightbox view.',
  'product-feedback-app': 'A product feedback workflow using structured data, state management and a multi-view application interface.',
  'planets-fact-site': 'An eight-page fact site that organizes planetary information into a connected browsing experience.',
  'audiophile-ecommerce-website': 'A substantial e-commerce experience for browsing audio products through a complete store interface.',
  'meet-landing-page': 'A responsive landing page for a meeting product, with layout shifts across screen sizes.',
  'typemaster-prelaunch-landing-page': 'A pre-launch product landing page focused on responsive CSS Grid composition.',
  'invoice-app': 'An invoicing workspace brief with structured invoice data, application state and multi-step record handling.',
  'coffeeroasters-subscription-site': 'A three-page subscription site with an interactive plan builder and order summary.',
  'maker-prelaunch-landing-page': 'A pre-launch landing page with responsive composition and custom email validation.',
  'pomodoro-app': 'A focus timer brief combining customizable sessions, timer state and progress presentation.',
  'creative-agency-singlepage-site': 'A creative agency page exercising layered layouts and overlapping visual elements.',
  'pod-request-access-landing-page': 'An early-access landing page with custom validation for an email request form.',
  'clock-app': 'A clock interface brief using location-aware API data and time-of-day-dependent content.',
  'officelite-coming-soon-site': 'A two-page coming-soon experience with a sign-up flow and supporting promotional content.',
  'designo-multipage-website': 'A multi-template, seven-page agency website brief sharing navigation and a consistent visual system.',
  'devjobs-web-app': 'A job-board brief that reads structured job data and supports discovery and filtering.',
  'payapi-multipage-website': 'A four-page marketing site for a payments product with repeated form-validation patterns.',
  'photosnap-multipage-website': 'A photo-sharing service marketing site that uses image-led layouts and CSS Grid.',
  'arch-studio-multipage-website': 'A four-page architecture studio site, with an optional mapping-API extension in the source brief.',
  'scoot-multipage-website': 'A four-page transport-service website with responsive designs for mobile, tablet and desktop.',
  'dine-restaurant-website': 'A two-page restaurant site combining detailed layout work with form validation.',
  'minimalist-portfolio-website': 'A multi-page portfolio site exploring connected project, profile and contact content.',
  'myteam-multipage-website': 'A three-page team-focused website brief with a complete connected front-end experience.',
};

const challengeDifficulties: Record<string, ChallengeDifficulty> = {
  'poll-creator-app': 'intermediate', 'restaurant-ranking-app': 'intermediate', 'expense-splitter': 'guru', 'foreign-exchange-currency-converter': 'intermediate', 'tech-conference-site': 'intermediate', 'savings-tracker': 'intermediate', 'skills-learning-tracker': 'intermediate', 'personal-reading-list': 'advanced', 'flashcard-app': 'intermediate', 'bookmark-manager-app': 'advanced', 'recipe-finder-website': 'intermediate', 'mood-tracking-app': 'advanced', 'personal-blog': 'intermediate', 'character-counter': 'junior', 'tech-book-club-landing-page': 'junior', 'note-taking-web-app': 'advanced', 'personal-finance-app': 'guru', 'hangman-game': 'advanced', 'frontend-quiz-app': 'intermediate', 'linksharing-app': 'guru', 'body-mass-index-calculator': 'junior', 'workit-landing-page': 'newbie', 'dictionary-web-app': 'intermediate', 'singlepage-developer-portfolio': 'junior', 'connect-four-game': 'advanced', 'password-generator-app': 'intermediate', 'singlepage-design-portfolio': 'junior', 'kanban-task-management-web-app': 'guru', 'skilled-elearning-landing-page': 'newbie', 'inbrowser-markdown-editor': 'intermediate', 'entertainment-web-app': 'advanced', 'suite-landing-page': 'junior', 'tic-tac-toe-game': 'intermediate', 'art-gallery-website': 'junior', 'equalizer-landing-page': 'newbie', 'memory-game': 'advanced', 'github-user-search-app': 'junior', 'galleria-slideshow-site': 'intermediate', 'product-feedback-app': 'guru', 'planets-fact-site': 'intermediate', 'audiophile-ecommerce-website': 'guru', 'meet-landing-page': 'newbie', 'typemaster-prelaunch-landing-page': 'junior', 'invoice-app': 'guru', 'coffeeroasters-subscription-site': 'intermediate', 'maker-prelaunch-landing-page': 'junior', 'pomodoro-app': 'advanced', 'creative-agency-singlepage-site': 'intermediate', 'pod-request-access-landing-page': 'newbie', 'clock-app': 'intermediate', 'officelite-coming-soon-site': 'junior', 'designo-multipage-website': 'guru', 'devjobs-web-app': 'advanced', 'payapi-multipage-website': 'advanced', 'photosnap-multipage-website': 'advanced', 'arch-studio-multipage-website': 'advanced', 'scoot-multipage-website': 'intermediate', 'dine-restaurant-website': 'intermediate', 'minimalist-portfolio-website': 'intermediate', 'myteam-multipage-website': 'advanced',
};

const productChallengeSlugs = new Set(['poll-creator-app', 'restaurant-ranking-app', 'skills-learning-tracker']);

export const challengeManifest: ChallengeRecord[] = seeds.map(([slug, title, category, originalChallengeUrl], index) => ({
  id: `fm-${String(index + 1).padStart(2, '0')}`,
  slug,
  title,
  originalChallengeUrl,
  challengeType: productChallengeSlugs.has(slug) ? 'product' : 'design',
  accessTier: 'premium',
  ...(challengeDifficulties[slug] ? { difficulty: challengeDifficulties[slug] } : {}),
  category,
  categories: [category],
  description: challengeBriefs[slug] ?? 'Challenge summary not transcribed yet.',
  implementationSummary: `A local-first interactive prototype is available at /apps/${slug}. It demonstrates browser-side interactions but does not yet satisfy every prompt requirement or verify against official starter assets. Add project-specific tests, genuine screenshots, backend services, and deployment details when completed.`,
  technologies: [],
  features: [],
  thumbnail: { kind: 'representative-illustration', label: `Representative illustration for ${title}; not a screenshot of the implementation.` },
  screenshots: [],
  completed: false,
  engineeringHighlights: [],
  lessonsLearned: [],
  featured: [0, 10, 16, 26, 36, 40].includes(index),
  displayOrder: index + 1,
}));

/** Fail early in tests and during development if the supplied catalogue drifts. */
export function validateChallengeManifest(records: ChallengeRecord[] = challengeManifest): string[] {
  const issues: string[] = [];
  if (records.length !== 60) issues.push(`Expected 60 challenge records; found ${records.length}.`);
  const slugs = new Set<string>();
  const ids = new Set<string>();
  const urls = new Set<string>();
  for (const record of records) {
    if (!record.title.trim()) issues.push(`${record.id}: missing title.`);
    if (!record.description.trim()) issues.push(`${record.id}: missing challenge brief summary.`);
    if (!record.difficulty) issues.push(`${record.id}: missing verified difficulty.`);
    if (ids.has(record.id)) issues.push(`${record.id}: duplicate id.`);
    if (slugs.has(record.slug)) issues.push(`${record.id}: duplicate slug "${record.slug}".`);
    if (urls.has(record.originalChallengeUrl)) issues.push(`${record.id}: duplicate original challenge URL.`);
    ids.add(record.id);
    slugs.add(record.slug);
    urls.add(record.originalChallengeUrl);
    try {
      if (new URL(record.originalChallengeUrl).hostname !== 'www.frontendmentor.io') issues.push(`${record.id}: unexpected challenge host.`);
    } catch {
      issues.push(`${record.id}: malformed challenge URL.`);
    }
    for (const [field, value] of [['liveDemoUrl', record.liveDemoUrl], ['repositoryUrl', record.repositoryUrl]] as const) {
      if (!value) continue;
      try {
        const destination = new URL(value);
        if (destination.protocol !== 'https:') issues.push(`${record.id}: ${field} must use HTTPS.`);
      } catch {
        issues.push(`${record.id}: malformed ${field}.`);
      }
    }
  }
  return issues;
}
