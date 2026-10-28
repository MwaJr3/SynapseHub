import type { ChallengeRecord } from '../manifest';

export type AppMode =
  | 'collection' | 'calculator' | 'game' | 'api' | 'editor' | 'kanban'
  | 'timer' | 'clock' | 'store' | 'gallery' | 'editorial' | 'form';

export interface AppDefinition {
  mode: AppMode;
  lead: string;
  itemLabel: string;
  itemPlaceholder: string;
  detailLabel: string;
  detailPlaceholder: string;
}

const definitions: Record<string, AppDefinition> = {
  'poll-creator-app': { mode: 'collection', lead: 'Create a question, collect responses in this browser, and review the local tally.', itemLabel: 'Poll question', itemPlaceholder: 'What should we decide?', detailLabel: 'Answer option', detailPlaceholder: 'Add an option or short context' },
  'restaurant-ranking-app': { mode: 'collection', lead: 'Keep a personal shortlist and compare two places at a time. Rankings stay on this device.', itemLabel: 'Restaurant', itemPlaceholder: 'Restaurant name', detailLabel: 'Cuisine or location', detailPlaceholder: 'Cuisine, neighbourhood, or note' },
  'expense-splitter': { mode: 'collection', lead: 'Record shared expenses and calculate an equal split. No payment or currency conversion is performed.', itemLabel: 'Expense description', itemPlaceholder: 'Dinner, travel, supplies…', detailLabel: 'Amount', detailPlaceholder: '0.00' },
  'foreign-exchange-currency-converter': { mode: 'api', lead: 'Request a current public exchange rate and show its source timestamp. Rates are informational only.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'tech-conference-site': { mode: 'editorial', lead: 'Explore a conference programme. Add real event data before publishing; the schedule starts empty.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'savings-tracker': { mode: 'collection', lead: 'Create savings goals and record progress locally. Amounts are not connected to a bank.', itemLabel: 'Savings goal', itemPlaceholder: 'Emergency fund, trip…', detailLabel: 'Target amount', detailPlaceholder: '0.00' },
  'skills-learning-tracker': { mode: 'collection', lead: 'Log a skill and a practice session; entries persist in this browser only.', itemLabel: 'Skill or practice session', itemPlaceholder: 'What did you practise?', detailLabel: 'Minutes or reflection', detailPlaceholder: 'Duration or short note' },
  'personal-reading-list': { mode: 'collection', lead: 'Search public book records, add results to personal shelves, and keep your reading list in this browser.', itemLabel: 'Book title', itemPlaceholder: 'Title', detailLabel: 'Author or shelf', detailPlaceholder: 'Author, Want to read, Reading…' },
  'flashcard-app': { mode: 'collection', lead: 'Create cards, then study with a flip-and-rate loop.', itemLabel: 'Question', itemPlaceholder: 'Front of card', detailLabel: 'Answer', detailPlaceholder: 'Back of card' },
  'bookmark-manager-app': { mode: 'collection', lead: 'Save links and notes. Opening a link is explicit; visits are not tracked across sites.', itemLabel: 'Bookmark title', itemPlaceholder: 'Title', detailLabel: 'URL or tags', detailPlaceholder: 'https://example.com · work, read-later' },
  'recipe-finder-website': { mode: 'api', lead: 'Search TheMealDB public recipe catalogue. Availability and data are controlled by that service.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'mood-tracking-app': { mode: 'collection', lead: 'Record a private mood reflection on this device. Entries are not sent anywhere.', itemLabel: 'Today’s mood', itemPlaceholder: 'Choose or describe a mood', detailLabel: 'Reflection or sleep note', detailPlaceholder: 'Optional private note' },
  'personal-blog': { mode: 'collection', lead: 'Draft, search, archive, and revise article ideas locally. No author biography or publishing service is invented.', itemLabel: 'Article draft', itemPlaceholder: 'Add a working title', detailLabel: 'Summary or draft notes', detailPlaceholder: 'Write a summary or a first draft' },
  'character-counter': { mode: 'editor', lead: 'Count characters, words, and sentences as you type, with an optional character limit.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'tech-book-club-landing-page': { mode: 'editorial', lead: 'A responsive book-club landing experience with working section navigation.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'note-taking-web-app': { mode: 'collection', lead: 'Create, search, edit, archive, and delete notes stored only in this browser.', itemLabel: 'Note title', itemPlaceholder: 'A thought to keep…', detailLabel: 'Note content or tags', detailPlaceholder: 'Write a note or add tags' },
  'personal-finance-app': { mode: 'collection', lead: 'Track transactions and budgets locally. This is not a bank connection or financial advice.', itemLabel: 'Transaction', itemPlaceholder: 'Description', detailLabel: 'Amount · category', detailPlaceholder: '0.00 · groceries' },
  'hangman-game': { mode: 'game', lead: 'Play a complete word-guessing round with keyboard or on-screen controls.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'frontend-quiz-app': { mode: 'game', lead: 'Answer a short, clearly labelled demo quiz and see your score.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'linksharing-app': { mode: 'collection', lead: 'Create a profile preview and manage the links displayed on it. Nothing is published to a server.', itemLabel: 'Link label', itemPlaceholder: 'GitHub, Portfolio…', detailLabel: 'Destination URL', detailPlaceholder: 'https://…' },
  'body-mass-index-calculator': { mode: 'calculator', lead: 'Calculate an approximate BMI from metric or imperial measurements. This is not medical advice.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'workit-landing-page': { mode: 'editorial', lead: 'Explore the responsive product story and working calls to action.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'dictionary-web-app': { mode: 'api', lead: 'Look up a word using the Free Dictionary API. Results depend on the public service.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'singlepage-developer-portfolio': { mode: 'collection', lead: 'Add and curate your own portfolio project cards; no invented biography, metrics, or project links are prefilled.', itemLabel: 'Project card', itemPlaceholder: 'Project title', detailLabel: 'Summary or verified URL', detailPlaceholder: 'Describe your project or add its real URL' },
  'connect-four-game': { mode: 'game', lead: 'Play Connect Four locally with turn-taking, gravity, wins, and draws.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'password-generator-app': { mode: 'calculator', lead: 'Generate a random password with adjustable character sets using the browser crypto API.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'singlepage-design-portfolio': { mode: 'collection', lead: 'Curate design-project cards using your own work. No sample work or made-up credentials are prefilled.', itemLabel: 'Design project', itemPlaceholder: 'Project title', detailLabel: 'Project notes or verified link', detailPlaceholder: 'Describe the work or add a real URL' },
  'kanban-task-management-web-app': { mode: 'kanban', lead: 'Create tasks, move them between columns, and mark them complete on this device.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'skilled-elearning-landing-page': { mode: 'editorial', lead: 'A responsive course discovery landing experience with working navigation.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'inbrowser-markdown-editor': { mode: 'editor', lead: 'Write Markdown and see a sanitized live preview. Documents remain in this browser.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'entertainment-web-app': { mode: 'collection', lead: 'Organize your own watchlist. No third-party film database or fabricated catalogue is used.', itemLabel: 'Movie or series', itemPlaceholder: 'Title', detailLabel: 'Type or note', detailPlaceholder: 'Movie, TV series, or note' },
  'suite-landing-page': { mode: 'editorial', lead: 'Explore a responsive product landing page and its linked sections.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'tic-tac-toe-game': { mode: 'game', lead: 'Play tic-tac-toe with two local players, score tracking, and restart controls.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'art-gallery-website': { mode: 'gallery', lead: 'Build a personal gallery by adding your own artwork and details. No licensed art assets were supplied.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'equalizer-landing-page': { mode: 'editorial', lead: 'Explore a responsive audio product landing experience.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'memory-game': { mode: 'game', lead: 'Play a timed matching game with move and match tracking.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'github-user-search-app': { mode: 'api', lead: 'Search real public GitHub profiles. Results are fetched from GitHub and may be rate-limited.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'galleria-slideshow-site': { mode: 'gallery', lead: 'Create a slideshow from artwork you add. No challenge artwork is redistributed here.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'product-feedback-app': { mode: 'collection', lead: 'Submit, sort, and locally upvote feedback. Votes are only meaningful in this browser.', itemLabel: 'Feedback suggestion', itemPlaceholder: 'Describe an idea or issue', detailLabel: 'Category or status', detailPlaceholder: 'Feature, UI, bug…' },
  'planets-fact-site': { mode: 'editorial', lead: 'Explore a concise solar-system fact set and switch planetary sections.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'audiophile-ecommerce-website': { mode: 'store', lead: 'Add your own products and test a local shopping cart. No payments or orders are transmitted.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'meet-landing-page': { mode: 'editorial', lead: 'Explore a responsive community landing page with its section navigation.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'typemaster-prelaunch-landing-page': { mode: 'editorial', lead: 'Explore a responsive product announcement and its call to action.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'invoice-app': { mode: 'collection', lead: 'Draft invoices and calculate line totals locally. This prototype does not send invoices or handle tax advice.', itemLabel: 'Invoice or client', itemPlaceholder: 'Client or invoice title', detailLabel: 'Amount or due date', detailPlaceholder: '0.00 or YYYY-MM-DD' },
  'coffeeroasters-subscription-site': { mode: 'store', lead: 'Configure a sample coffee plan and see an estimated total; no subscription is created.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'maker-prelaunch-landing-page': { mode: 'form', lead: 'Try a local-only waitlist form. No email is sent or stored on a server.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'pomodoro-app': { mode: 'timer', lead: 'Run focus and break sessions with start, pause, reset, and mode controls.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'creative-agency-singlepage-site': { mode: 'editorial', lead: 'Explore an editorial agency layout with responsive sections and working navigation.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'pod-request-access-landing-page': { mode: 'form', lead: 'Validate an access-request email locally. This demo does not submit or send email.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'clock-app': { mode: 'clock', lead: 'See the current time and date in your chosen time zone, updated every second.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'officelite-coming-soon-site': { mode: 'form', lead: 'Explore a coming-soon page with a local-only sign-up preview.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'designo-multipage-website': { mode: 'editorial', lead: 'Navigate a responsive multi-page agency experience. This is a single-route prototype.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'devjobs-web-app': { mode: 'collection', lead: 'Search and manage job links you add yourself. No supplied jobs dataset or job feed was provided.', itemLabel: 'Job title or company', itemPlaceholder: 'Role or company', detailLabel: 'Location or URL', detailPlaceholder: 'Location · https://…' },
  'payapi-multipage-website': { mode: 'editorial', lead: 'Explore the product story and pricing sections; no service signup is transmitted.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'photosnap-multipage-website': { mode: 'gallery', lead: 'Create a visual story from your own images. No unlicensed stock photos or fictional photography are included.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'arch-studio-multipage-website': { mode: 'collection', lead: 'Add architecture project records and browse them locally. No project imagery, client list, or awards are invented.', itemLabel: 'Architecture project', itemPlaceholder: 'Project or building name', detailLabel: 'Location or project notes', detailPlaceholder: 'Add confirmed details only' },
  'scoot-multipage-website': { mode: 'editorial', lead: 'Explore a responsive mobility product story with location and careers sections.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'dine-restaurant-website': { mode: 'form', lead: 'Validate a reservation request locally. No booking is submitted to a restaurant.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
  'minimalist-portfolio-website': { mode: 'collection', lead: 'Build a minimal local portfolio list from verified project details you supply.', itemLabel: 'Project title', itemPlaceholder: 'Title', detailLabel: 'Summary or verified link', detailPlaceholder: 'Add project context or a real URL' },
  'myteam-multipage-website': { mode: 'editorial', lead: 'Explore a responsive team-company story with its page sections.', itemLabel: '', itemPlaceholder: '', detailLabel: '', detailPlaceholder: '' },
};

export function getAppDefinition(project: ChallengeRecord): AppDefinition {
  return definitions[project.slug] ?? {
    mode: 'collection',
    lead: 'Create and manage entries in a private, browser-local workspace.',
    itemLabel: 'Entry',
    itemPlaceholder: 'Add a title',
    detailLabel: 'Details',
    detailPlaceholder: 'Optional note',
  };
}

export const appSlugs = Object.keys(definitions);
export const appRouteCount = appSlugs.length;
