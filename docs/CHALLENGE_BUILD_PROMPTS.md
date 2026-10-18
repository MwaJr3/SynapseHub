# Mwangala — 60 Frontend Mentor Project Build Prompts

**Purpose:** A copy-ready prompt collection for implementing the 60 projects in the supplied Frontend Mentor challenge list. Each project prompt can be copied into an AI coding tool independently.

## Source and fidelity note

The official challenge pages were opened and checked for their challenge title/type. Some challenge briefs render as a dynamic page and do not expose their full requirements to text extraction. Therefore, each prompt tells the coding agent to inspect the original page, starter README, downloaded assets, data files, and design references before coding. Project-specific requirements below are based on the available challenge title/category and publicly available brief details; do not treat inferred extras as official acceptance criteria. Premium status can change, so verify access and licensing on the official page. Frontend Mentor distinguishes design challenges (match supplied design assets) from product challenges (build from a product specification). See the official [Product Challenges guide](https://www.frontendmentor.io/articles/product-challenges) and [challenge catalogue](https://www.frontendmentor.io/challenges?type=premium).

## How to use this collection

1. Copy one numbered prompt at a time into your coding tool. 2. Provide the challenge starter zip, README, and licensed design assets if you have access. 3. Finish and test that project before moving to the next. 4. Add its screenshots, source URL, deployed URL, and case study to the Mwangala portfolio manifest.

## Index

1. [Poll Creator App](#1-poll-creator-app)
2. [Restaurant Ranking App](#2-restaurant-ranking-app)
3. [Expense Splitter](#3-expense-splitter)
4. [Foreign Exchange Currency Converter](#4-foreign-exchange-currency-converter)
5. [Tech Conference Site](#5-tech-conference-site)
6. [Savings Tracker](#6-savings-tracker)
7. [Skills Learning Tracker](#7-skills-learning-tracker)
8. [Personal Reading List](#8-personal-reading-list)
9. [Flashcard App](#9-flashcard-app)
10. [Bookmark Manager App](#10-bookmark-manager-app)
11. [Recipe Finder Website](#11-recipe-finder-website)
12. [Mood Tracking App](#12-mood-tracking-app)
13. [Personal Blog](#13-personal-blog)
14. [Character Counter](#14-character-counter)
15. [Tech Book Club Landing Page](#15-tech-book-club-landing-page)
16. [Note-Taking Web App](#16-note-taking-web-app)
17. [Personal Finance App](#17-personal-finance-app)
18. [Hangman Game](#18-hangman-game)
19. [Frontend Quiz App](#19-frontend-quiz-app)
20. [Link-Sharing App](#20-link-sharing-app)
21. [BMI Calculator](#21-bmi-calculator)
22. [Workit Landing Page](#22-workit-landing-page)
23. [Dictionary Web App](#23-dictionary-web-app)
24. [Single-Page Developer Portfolio](#24-single-page-developer-portfolio)
25. [Connect Four Game](#25-connect-four-game)
26. [Password Generator App](#26-password-generator-app)
27. [Single-Page Design Portfolio](#27-single-page-design-portfolio)
28. [Kanban Task Management Web App](#28-kanban-task-management-web-app)
29. [Skilled E-Learning Landing Page](#29-skilled-e-learning-landing-page)
30. [In-Browser Markdown Editor](#30-in-browser-markdown-editor)
31. [Entertainment Web App](#31-entertainment-web-app)
32. [Suite Landing Page](#32-suite-landing-page)
33. [Tic-Tac-Toe Game](#33-tic-tac-toe-game)
34. [Art Gallery Website](#34-art-gallery-website)
35. [Equalizer Landing Page](#35-equalizer-landing-page)
36. [Memory Game](#36-memory-game)
37. [GitHub User Search App](#37-github-user-search-app)
38. [Galleria Slideshow Site](#38-galleria-slideshow-site)
39. [Product Feedback App](#39-product-feedback-app)
40. [Planets Fact Site](#40-planets-fact-site)
41. [Audiophile E-Commerce Website](#41-audiophile-e-commerce-website)
42. [Meet Landing Page](#42-meet-landing-page)
43. [Typemaster Prelaunch Landing Page](#43-typemaster-prelaunch-landing-page)
44. [Invoice App](#44-invoice-app)
45. [CoffeeRoasters Subscription Site](#45-coffeeroasters-subscription-site)
46. [Maker Prelaunch Landing Page](#46-maker-prelaunch-landing-page)
47. [Pomodoro App](#47-pomodoro-app)
48. [Creative Agency Single-Page Site](#48-creative-agency-single-page-site)
49. [Pod Request Access Landing Page](#49-pod-request-access-landing-page)
50. [Clock App](#50-clock-app)
51. [OfficeLite Coming Soon Site](#51-officelite-coming-soon-site)
52. [Designo Multi-Page Website](#52-designo-multi-page-website)
53. [DevJobs Web App](#53-devjobs-web-app)
54. [PayAPI Multi-Page Website](#54-payapi-multi-page-website)
55. [Photosnap Multi-Page Website](#55-photosnap-multi-page-website)
56. [Arch Studio Multi-Page Website](#56-arch-studio-multi-page-website)
57. [Scoot Multi-Page Website](#57-scoot-multi-page-website)
58. [Dine Restaurant Website](#58-dine-restaurant-website)
59. [Minimalist Portfolio Website](#59-minimalist-portfolio-website)
60. [myteam Multi-Page Website](#60-myteam-multi-page-website)

---

## 1. Poll Creator App

**Official challenge:** https://www.frontendmentor.io/challenges/poll-creator-app  

**Target users:** friends, classrooms, event organizers, and small teams collecting opinions.

**Project type:** full-stack product challenge.

### Build prompt

Build a complete, polished, responsive application/site called **Poll Creator App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Create a poll with a question, description, two or more options, closing time, and single- or multiple-choice rules.
- Generate a shareable poll URL and a public voting view that works on mobile.
- Validate votes and enforce the poll creator’s rules; make duplicate-vote policy explicit rather than pretending browser identity is reliable.
- Display live or refreshed results with counts, percentages, response totals, and clear empty states.
- Provide poll-management views to close, reopen when allowed, edit eligible details, duplicate, and delete polls.
- Add privacy-conscious participation settings, poll status, timestamps, and CSV export of aggregate results.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS, FastAPI, Pydantic, SQLAlchemy, and PostgreSQL; use server-sent events or polling only if live result updates are implemented.

### Architecture and engineering approach

Model polls, options, votes, share tokens, and creator ownership separately. Enforce voting rules and transaction-safe tallying on the backend; test expired polls, duplicate submissions, deleted polls, concurrent votes, and permission boundaries.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Poll Creator App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `poll-creator-app` unless an existing portfolio convention requires another stable unique slug.


---

## 2. Restaurant Ranking App

**Official challenge:** https://www.frontendmentor.io/challenges/restaurant-ranking-app  

**Target users:** people comparing restaurants, food enthusiasts, and groups deciding where to eat.

**Project type:** full-stack product challenge.

### Build prompt

Build a complete, polished, responsive application/site called **Restaurant Ranking App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Create a personal or shared restaurant list with name, cuisine, location, price range, tags, and notes.
- Show restaurant locations on an interactive map using a documented map provider or OpenStreetMap-based library.
- Collect honest head-to-head comparisons and use a transparent ranking method such as Elo or Bradley–Terry; explain the method in the UI.
- Filter and search by cuisine, location, price, rating/rank, and tags.
- Show ranked lists, comparison history, confidence or comparison counts, and reasons a ranking may be uncertain.
- Allow restaurant records to be edited, archived, imported, and exported; seed sample restaurants clearly as demo data.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS, FastAPI, SQLAlchemy, PostgreSQL, and a maintained map library such as Leaflet with OpenStreetMap tiles. Keep geocoding optional and provider-configurable.

### Architecture and engineering approach

Separate restaurant data, map display, comparisons, and ranking calculations. Validate coordinates and prevent duplicate comparisons from silently distorting results. Do not scrape restaurant sites or imply rankings are objective quality measurements; include provenance and user-control features.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Restaurant Ranking App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `restaurant-ranking-app` unless an existing portfolio convention requires another stable unique slug.


---

## 3. Expense Splitter

**Official challenge:** https://www.frontendmentor.io/challenges/expense-splitter  

**Target users:** friends travelling together, roommates, families, and small groups sharing costs.

**Project type:** full-stack financial utility.

### Build prompt

Build a complete, polished, responsive application/site called **Expense Splitter**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Create groups, add members, and record expenses with payer, date, description, currency, and receipt note.
- Support equal, fixed-amount, percentage, and itemized splits while verifying that allocations sum to the total.
- Support multiple currencies through dated exchange-rate data and show the rate/source used; never silently convert at an unknown rate.
- Calculate balances and a simplified settlement plan showing who should pay whom.
- Track reimbursements, settled/unsettled balances, edits, deletions, and an auditable expense history.
- Filter by group, person, date, and currency, and export statements in CSV or printable format.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS, FastAPI, Pydantic, SQLAlchemy, PostgreSQL, and Decimal-based money calculations. Use an exchange-rate API only for currency conversion; isolate it behind an adapter.

### Architecture and engineering approach

Never use binary floating-point as the canonical money representation. Define currency precision, rounding rules, conversion timestamps, and a settlement algorithm; test negative adjustments, partial payments, rounding residuals, and multi-currency edge cases. State clearly that this is a bookkeeping tool, not a payment processor.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Expense Splitter** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `expense-splitter` unless an existing portfolio convention requires another stable unique slug.


---

## 4. Foreign Exchange Currency Converter

**Official challenge:** https://www.frontendmentor.io/challenges/foreign-exchange-currency-converter  

**Target users:** travellers, students, shoppers, and people comparing foreign-exchange rates.

**Project type:** API-powered financial utility.

### Build prompt

Build a complete, polished, responsive application/site called **Foreign Exchange Currency Converter**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Convert an amount between searchable source and destination currencies using live exchange rates.
- Swap currency pairs instantly and display the effective rate and last-updated timestamp.
- Show a market ticker, historical rate chart with selectable time ranges, and multi-currency comparison.
- Pin favorite currency pairs and load them into the converter.
- Keep a conversion log with individual deletion and clear-history actions.
- Cache the last successful response and clearly identify stale values when the API is unavailable.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS, TanStack Query, a chart library such as Recharts, and the Frankfurter API or another documented exchange-rate API that supports time series.

### Architecture and engineering approach

Separate formatting, conversion math, API access, and chart transformations. Handle rate limits, missing dates, unsupported currencies, decimals, and network failures. Store favorites/history locally unless cross-device accounts are a deliberate extension; never present stale rates as live.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Foreign Exchange Currency Converter** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `foreign-exchange-currency-converter` unless an existing portfolio convention requires another stable unique slug.


---

## 5. Tech Conference Site

**Official challenge:** https://www.frontendmentor.io/challenges/tech-conference-site  

**Target users:** conference attendees exploring talks, speakers, tracks, and event logistics.

**Project type:** multi-page interactive frontend application.

### Build prompt

Build a complete, polished, responsive application/site called **Tech Conference Site**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Create a home page with keynote, tracks, featured speakers, schedule highlights, and clear navigation.
- Build a schedule page filterable by event day and track; expand a talk to view its description and location.
- Build a speaker directory with profile modals or detail pages, biographies, and their scheduled talks.
- Let visitors bookmark talks into a personal “My Schedule” and remove saved talks.
- Provide search across speakers, titles, and talk descriptions as an enhancement.
- Persist saved talks locally and optionally export a calendar file when the event data supports it.

### Recommended technology stack

React, TypeScript, Vite, React Router, CSS Modules or Tailwind CSS, and structured JSON data. A CMS integration is optional; do not add a backend unless multi-device persistence is required.

### Architecture and engineering approach

Model speakers, sessions, tracks, venues, and days as related typed data. Ensure filters can be combined, modal interactions are keyboard-accessible, bookmarks survive refresh, and event times are displayed consistently.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Tech Conference Site** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `tech-conference-site` unless an existing portfolio convention requires another stable unique slug.


---

## 6. Savings Tracker

**Official challenge:** https://www.frontendmentor.io/challenges/savings-tracker  

**Target users:** people setting short- and long-term savings goals.

**Project type:** personal finance tracker.

### Build prompt

Build a complete, polished, responsive application/site called **Savings Tracker**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Create savings goals with title, target amount, currency, target date, category, and optional icon.
- Record deposits and withdrawals with dates, notes, and account or source labels.
- Show progress rings or bars, saved totals, remaining amounts, pace-to-goal, and milestone indicators.
- Filter and sort goals by status, deadline, progress, or category.
- View contribution history and month-by-month savings charts.
- Support goal editing, archiving, delete confirmation, and optional accounts/sync as a separately documented extension.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS, Recharts or lightweight CSS charts, and localStorage/IndexedDB for a frontend-first build. Add FastAPI/PostgreSQL only if persistent user accounts and sync are required.

### Architecture and engineering approach

Represent amounts safely with integer minor units or decimal arithmetic. Recompute progress from transactions rather than trusting a manually edited progress percentage. Test target changes, withdrawals, zero targets, past due dates, rounding, and data migration.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Savings Tracker** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `savings-tracker` unless an existing portfolio convention requires another stable unique slug.


---

## 7. Skills Learning Tracker

**Official challenge:** https://www.frontendmentor.io/challenges/skills-learning-tracker  

**Target users:** self-directed learners tracking deliberate practice across skills.

**Project type:** product challenge / practice journal.

### Build prompt

Build a complete, polished, responsive application/site called **Skills Learning Tracker**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Create and organize skills with category, target cadence, units, notes, and optional target hours.
- Log practice sessions with duration, date/time, activity, reflection, and perceived difficulty.
- Calculate streaks consistently, including missed days and time-zone boundaries.
- Visualize daily consistency through heatmaps, progress rings, weekly summaries, and monthly trends.
- Show per-skill totals, recent sessions, active streaks, and progress against goals.
- Provide filters, editing, deletion, demo guest data, and export/import for personal records.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS, date-fns, and a small chart/heatmap implementation. Use local persistence for the core version; optional FastAPI/PostgreSQL authentication may enable synced accounts.

### Architecture and engineering approach

Define streak and date-boundary rules before coding. Keep sample sessions clearly labelled and create deterministic tests for streaks, daylight-saving/time-zone changes, empty months, deleted sessions, and goal updates.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Skills Learning Tracker** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `skills-learning-tracker` unless an existing portfolio convention requires another stable unique slug.


---

## 8. Personal Reading List

**Official challenge:** https://www.frontendmentor.io/challenges/personal-reading-list  

**Target users:** readers who want to discover books and track a personal reading journey.

**Project type:** API-powered reading tracker.

### Build prompt

Build a complete, polished, responsive application/site called **Personal Reading List**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Search books through a documented book API and handle incomplete metadata, duplicate editions, missing covers, and multiple ISBN formats.
- Organize books into shelves such as Want to Read, Reading, Finished, and custom shelves.
- Track page progress, start/finish dates, ratings, notes, and reading goals.
- Display genre, author, rating, and time-period filters and a personal book detail view.
- Create a designed year-in-review with books per month, genres, pages read, and pace where sufficient data exists.
- Offer guest mode with representative sample books, import/export, and optional account-backed sync.

### Recommended technology stack

Next.js, TypeScript, Tailwind CSS, a server-side API route or small FastAPI proxy for book search, PostgreSQL/Supabase for optional accounts, and a documented book metadata API.

### Architecture and engineering approach

Normalize external book records and keep provider-specific code isolated. Respect API terms, rate limits, and cover attribution. Never invent ratings or reading statistics; label demo records and calculate the year-in-review from actual tracked data.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Personal Reading List** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `personal-reading-list` unless an existing portfolio convention requires another stable unique slug.


---

## 9. Flashcard App

**Official challenge:** https://www.frontendmentor.io/challenges/flashcard-app  

**Target users:** students, educators, and independent learners.

**Project type:** interactive study application.

### Build prompt

Build a complete, polished, responsive application/site called **Flashcard App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Create, edit, and delete flashcards with question, answer, category, and optional tags.
- Show all cards in a responsive grid with counts and mastery state.
- Provide Study Mode with flip animation, previous/next navigation, shuffle, and current-card position.
- Track mastery on a defined 0–5 scale, allow reset, and hide mastered cards.
- Filter by one or more categories and show card counts for each category.
- Display totals for mastered, in progress, and not started; include import/export and keyboard shortcuts as enhancements.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS or CSS Modules, and localStorage/IndexedDB. Add a backend only if cross-device synchronization is needed.

### Architecture and engineering approach

Make the card flip accessible to keyboard and screen-reader users. Handle edits/deletions during a study session, empty decks, changing filters, randomization, and stable ordering. Follow the challenge’s stated mastery behavior and test it.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Flashcard App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `flashcard-app` unless an existing portfolio convention requires another stable unique slug.


---

## 10. Bookmark Manager App

**Official challenge:** https://www.frontendmentor.io/challenges/bookmark-manager-app  

**Target users:** developers, researchers, students, and anyone organizing useful web links.

**Project type:** personal productivity app.

### Build prompt

Build a complete, polished, responsive application/site called **Bookmark Manager App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Add bookmarks with title, description, URL, tags, and optional manually supplied thumbnail.
- Search by keyword, filter by one or more tags, and sort by recently added, recently visited, or most visited.
- Pin/unpin and archive/restore bookmarks.
- Edit and delete bookmarks, copy URLs, and open destinations with safe external-link behavior.
- Provide light/dark themes, visit counts, last-visited timestamps, and tag management.
- Optionally extract page metadata through a controlled backend; provide import/export and duplicate-URL detection.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS, localStorage/IndexedDB for frontend-first use. If accounts or metadata extraction are added, use FastAPI, PostgreSQL, and a strict server-side URL-fetching allowlist/safety layer.

### Architecture and engineering approach

Validate URL schemes and reject javascript:, data:, file:, and other unsafe schemes. Do not fetch arbitrary URLs from the browser or backend without SSRF controls. Test multi-tag filters, duplicate URLs, archive behavior, safe links, sorting, and theme persistence.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Bookmark Manager App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `bookmark-manager-app` unless an existing portfolio convention requires another stable unique slug.


---

## 11. Recipe Finder Website

**Official challenge:** https://www.frontendmentor.io/challenges/recipe-finder-website--Ui-TZTPxN  

**Target users:** home cooks searching for recipes based on preferences and available ingredients.

**Project type:** multi-page content and search website.

### Build prompt

Build a complete, polished, responsive application/site called **Recipe Finder Website**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Implement distinct Home, About, Recipe Index, and Recipe Detail pages following the challenge brief.
- Search recipes by title or ingredients and filter by available category/diet/time fields if present in the supplied data.
- Display recipe images, preparation time, servings, ingredient lists, instructions, and relevant metadata.
- Provide a recipe detail route with useful related-recipe navigation.
- Handle no-results, unavailable-image, empty-query, and loading states clearly.
- Use the supplied JSON/content as the source of truth; optional API integration should be documented and configurable.

### Recommended technology stack

Astro for content-led pages or React, TypeScript, Vite, React Router, and CSS Modules/Tailwind. Prefer local structured data for challenge fidelity; use an API only if the brief requires it.

### Architecture and engineering approach

Normalize recipe data and keep filters composable. Optimize images, support direct detail-page navigation, add metadata and semantic headings, and test search/filters on mobile without hiding essential recipe information.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Recipe Finder Website** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `recipe-finder-website` unless an existing portfolio convention requires another stable unique slug.


---

## 12. Mood Tracking App

**Official challenge:** https://www.frontendmentor.io/challenges/mood-tracking-app-E2XeKhDF0B  

**Target users:** people reflecting on daily mood, feelings, sleep, and personal patterns.

**Project type:** private wellbeing tracker.

### Build prompt

Build a complete, polished, responsive application/site called **Mood Tracking App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Record a daily mood, selected feelings, a written reflection, and sleep duration/quality.
- Show today’s entry and a mood-relevant quote from approved local data.
- Chart the most recent eleven entries and let users inspect each date’s mood and sleep details.
- Compare averages from the latest five entries with the previous five.
- Provide profile settings including display name and avatar where implemented.
- Support editing/deleting entries, local persistence or secure account-backed persistence, and export/delete controls.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS, Recharts, and localStorage/IndexedDB. For synced accounts, use FastAPI/PostgreSQL or Supabase with strict per-user data access.

### Architecture and engineering approach

Treat entries as sensitive personal data. Avoid diagnosing conditions or presenting trends as medical conclusions. Test date boundaries, missing data, averages, deleted records, privacy controls, keyboard access, and chart alternatives for screen readers.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Mood Tracking App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `mood-tracking-app` unless an existing portfolio convention requires another stable unique slug.


---

## 13. Personal Blog

**Official challenge:** https://www.frontendmentor.io/challenges/personal-blog-lJpVCnmozL  

**Target users:** readers exploring a personal publication and subscribers following new articles.

**Project type:** multi-page publishing website.

### Build prompt

Build a complete, polished, responsive application/site called **Personal Blog**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Build a home/article listing page, individual article pages, and any additional pages specified by the official brief.
- Render articles from structured JSON or Markdown with title, author, date, summary, body, and tags.
- Provide article navigation, related posts, tag/category filtering, and theme selection if required by the supplied design.
- Implement newsletter email validation and an honest success/error state; use a real form provider only when configured.
- Support direct article URLs, meaningful reading typography, and responsive article imagery.
- Keep content management simple through Markdown/MDX or a structured content folder.

### Recommended technology stack

Astro with Markdown/MDX for a fast content-focused blog, or React + TypeScript + Vite if interactive routing is central. Use CSS Modules or Tailwind and an actual form endpoint only when configured.

### Architecture and engineering approach

Add accessible typography, page titles, Open Graph metadata, RSS or sitemap where appropriate, and syntax highlighting only if needed. Never fake newsletter subscriptions. Test article routing, theme persistence, missing content, and form errors.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Personal Blog** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `personal-blog` unless an existing portfolio convention requires another stable unique slug.


---

## 14. Character Counter

**Official challenge:** https://www.frontendmentor.io/challenges/character-counter-znSgeWs_i6  

**Target users:** writers, students, editors, and social-media creators working within text limits.

**Project type:** client-side text utility.

### Build prompt

Build a complete, polished, responsive application/site called **Character Counter**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Count characters, words, and sentences as the user types.
- Allow characters to be counted with or without spaces.
- Allow a configurable character limit and warn when it is exceeded.
- Visualize letter frequency/density and explain whether counts are normalized or case-sensitive.
- Display a compact reading-time estimate only as an optional enhancement with the assumption documented.
- Include light/dark theme switching and a clear/reset action.

### Recommended technology stack

Semantic HTML, CSS, and TypeScript/JavaScript; optionally React + TypeScript + Vite. No backend is needed because text can remain entirely in the browser.

### Architecture and engineering approach

Define word/sentence segmentation rules and use Unicode-aware logic where feasible. Do not transmit user text. Test empty strings, emoji, punctuation, line breaks, spaces-only text, long input, and character-limit boundaries.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Character Counter** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `character-counter` unless an existing portfolio convention requires another stable unique slug.


---

## 15. Tech Book Club Landing Page

**Official challenge:** https://www.frontendmentor.io/challenges/tech-book-club-landing-page-fZQidjHU73  

**Target users:** readers interested in joining a community around technology books.

**Project type:** responsive marketing landing page.

### Build prompt

Build a complete, polished, responsive application/site called **Tech Book Club Landing Page**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Build the full landing page sections in the supplied design: brand/hero, club benefits, membership or process explanation, testimonials/social proof only if supplied, and CTA/footer.
- Use provided images, icons, typography, and layout assets according to the challenge files.
- Create working anchor navigation and a clear membership CTA.
- If a signup form appears in the brief, implement real validation and an explicit demo/production submission path.
- Create responsive visual compositions, decorative shapes, and image crops without breaking reading order.

### Recommended technology stack

Semantic HTML5, modern CSS with Grid/Flexbox and custom properties, and minimal JavaScript. Use Astro only if the site needs reusable components or static routing.

### Architecture and engineering approach

Prioritize close visual matching, mobile-first breakpoints, semantic landmarks, focus states, reduced motion, and optimized imagery. Do not invent testimonials or claim that signups are recorded unless a real endpoint is configured.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Tech Book Club Landing Page** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `tech-book-club-landing-page` unless an existing portfolio convention requires another stable unique slug.


---

## 16. Note-Taking Web App

**Official challenge:** https://www.frontendmentor.io/challenges/note-taking-web-app-773r7bUfOG  

**Target users:** students, professionals, and writers managing notes by tags and archive status.

**Project type:** personal productivity application.

### Build prompt

Build a complete, polished, responsive application/site called **Note-Taking Web App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Create, view, update, delete, and archive notes.
- Browse active notes, archived notes, and notes associated with selected tags.
- Search by title, tag, and note body.
- Provide color and font themes if supported by the official brief and starter assets.
- Include note detail/editing states, confirmation for destructive actions, and useful empty states.
- Persist notes across refresh; optional account-backed sync and authentication must be fully implemented if included.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS or CSS Modules, and IndexedDB/localStorage for local-first use. For multi-user sync, use FastAPI/PostgreSQL or Supabase with per-user authorization.

### Architecture and engineering approach

Keep editing state separate from saved state, debounce search where useful, and protect unsaved changes. Test CRUD, tags, archive/restore, filtering, theme/font preferences, persistence, and long-note content.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Note-Taking Web App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `note-taking-web-app` unless an existing portfolio convention requires another stable unique slug.


---

## 17. Personal Finance App

**Official challenge:** https://www.frontendmentor.io/challenges/personal-finance-app-JfjtZgyMt1  

**Target users:** individuals wanting an overview of transactions, budgets, savings pots, and bills.

**Project type:** multi-page personal finance application.

### Build prompt

Build a complete, polished, responsive application/site called **Personal Finance App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Implement Overview, Transactions, Budgets, Pots, and Recurring Bills pages consistent with the challenge brief.
- Create, edit, delete, search, sort, and filter transactions.
- Manage category budgets with spent/remaining amounts and visual progress.
- Manage savings pots with deposits, withdrawals, targets, and balances.
- Track recurring bills, due dates, payment statuses, and upcoming obligations.
- Provide charts and totals calculated from the underlying transactions and clearly labeled sample data.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS, FastAPI, SQLAlchemy, PostgreSQL for the full-stack version; use Decimal or integer minor units for all amounts. A local JSON mode may support a frontend-only demo.

### Architecture and engineering approach

Keep calculation logic out of components, validate all monetary operations, and enforce per-user data access if auth is included. No real bank connection or financial advice is implied. Test aggregation, category totals, budget edge cases, recurring bills, and currency formatting.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Personal Finance App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `personal-finance-app` unless an existing portfolio convention requires another stable unique slug.


---

## 18. Hangman Game

**Official challenge:** https://www.frontendmentor.io/challenges/hangman-game-rsQiSVLGWn  

**Target users:** casual players and learners who enjoy word-guessing games.

**Project type:** interactive game.

### Build prompt

Build a complete, polished, responsive application/site called **Hangman Game**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Provide a category or topic selection and a word-guessing round.
- Support keyboard input and on-screen letter buttons with already-guessed states.
- Track incorrect guesses and update a clear visual hangman/progress state.
- Handle win, loss, remaining guesses, round restart, and next-word behavior.
- Prevent duplicate guesses from consuming additional turns and ignore invalid input.
- Include settings or difficulty modes only when clearly implemented; keep word data in a maintainable file.

### Recommended technology stack

React, TypeScript, Vite, CSS Modules, and local word data. No backend is required for a single-player game.

### Architecture and engineering approach

Use an explicit game-state model rather than scattered booleans. Support keyboard-only use and visible status announcements. Test repeated guesses, incorrect letters, complete words, empty categories, restart, random selection, and win/loss conditions.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Hangman Game** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `hangman-game` unless an existing portfolio convention requires another stable unique slug.


---

## 19. Frontend Quiz App

**Official challenge:** https://www.frontendmentor.io/challenges/frontend-quiz-app-BE7xkzXQnU  

**Target users:** learners testing knowledge of frontend technologies and concepts.

**Project type:** interactive quiz application.

### Build prompt

Build a complete, polished, responsive application/site called **Frontend Quiz App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Provide topic selection and a structured question sequence.
- Support answer selection, submission/confirmation, and clear correctness feedback.
- Track score and progress through the quiz.
- Show a results screen with score, summary, retry, and return-to-topic actions.
- Load questions from validated local JSON and support multiple topics.
- Implement keyboard-accessible answer selection and responsive question layouts.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS or CSS Modules, and Zod or equivalent runtime validation for question data.

### Architecture and engineering approach

Separate question content from quiz logic. Handle missing/invalid question sets, unanswered submissions, rapid repeated clicks, and reset states. Test scoring, navigation, answer validation, quiz completion, and retry behavior.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Frontend Quiz App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `frontend-quiz-app` unless an existing portfolio convention requires another stable unique slug.


---

## 20. Link-Sharing App

**Official challenge:** https://www.frontendmentor.io/challenges/linksharing-app-Fbt7yweGsT  

**Target users:** creators and professionals building a shareable collection of profile links.

**Project type:** profile/link management application.

### Build prompt

Build a complete, polished, responsive application/site called **Link-Sharing App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Create a profile with display name, avatar, and concise profile information.
- Add, reorder, edit, and remove links for supported platforms or custom URLs.
- Show a live preview of how the public profile will appear.
- Validate URLs and platform-specific fields; provide clear errors and link-type icons.
- Provide a public shareable profile route and copy/share action.
- Persist profile changes locally or through a real authenticated backend; include guest/demo mode if supported.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS, React Hook Form, Zod, and localStorage for the frontend-first version. Use FastAPI/PostgreSQL or Supabase for public profiles and accounts.

### Architecture and engineering approach

Keep editor state and published profile state predictable. Sanitize link schemes, validate uploads, ensure the preview uses the same components as the public view, and test ordering, URL validation, empty profiles, and direct links.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Link-Sharing App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `link-sharing-app` unless an existing portfolio convention requires another stable unique slug.


---

## 21. BMI Calculator

**Official challenge:** https://www.frontendmentor.io/challenges/body-mass-index-calculator-brrBkfSz1T  

**Target users:** people learning how BMI is calculated from height and weight.

**Project type:** responsive calculator and form project.

### Build prompt

Build a complete, polished, responsive application/site called **BMI Calculator**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Support metric and imperial measurement inputs according to the supplied design.
- Calculate BMI using the correct formula and consistent unit conversion.
- Validate positive, plausible input ranges and show useful inline feedback.
- Display the result with a clearly explained category and healthy-range estimate only as the challenge specifies.
- Update the result as inputs change or after submission, matching the intended behavior.
- Explain that BMI is a screening measure and not a diagnosis; do not present medical conclusions.

### Recommended technology stack

Semantic HTML, CSS, TypeScript/JavaScript, or React + TypeScript + Vite. No backend is necessary.

### Architecture and engineering approach

Keep unit conversion and BMI calculation in pure tested functions. Test boundary values, missing data, decimal inputs, switching units without stale values, and invalid dimensions. Make labels, keyboard operation, and result announcements accessible.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **BMI Calculator** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `bmi-calculator` unless an existing portfolio convention requires another stable unique slug.


---

## 22. Workit Landing Page

**Official challenge:** https://www.frontendmentor.io/challenges/workit-landing-page-2fYnyle5lu  

**Target users:** prospective users evaluating a digital productivity or work-focused service.

**Project type:** responsive marketing landing page.

### Build prompt

Build a complete, polished, responsive application/site called **Workit Landing Page**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Recreate the hero, product benefits, feature sections, and CTA areas shown in the supplied design.
- Implement the supplied illustration and layered decorative shapes with responsive cropping.
- Provide working CTA navigation and any explicit links present in the original brief.
- Preserve clear reading order and contrast across desktop, tablet, and mobile.
- Use reusable content components if the page contains repeated feature cards.

### Recommended technology stack

Semantic HTML, CSS Grid/Flexbox, custom properties, and lightweight JavaScript. React is optional; do not add a backend to a static marketing page.

### Architecture and engineering approach

Match the provided design assets rather than inventing new branding. Optimize images, avoid layout shifts, test breakpoints and focus states, and document any interactive CTA as a demo if no backend exists.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Workit Landing Page** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `workit-landing-page` unless an existing portfolio convention requires another stable unique slug.


---

## 23. Dictionary Web App

**Official challenge:** https://www.frontendmentor.io/challenges/dictionary-web-app-h5wwnyuKFL  

**Target users:** students, writers, language learners, and readers looking up word definitions.

**Project type:** API integration application.

### Build prompt

Build a complete, polished, responsive application/site called **Dictionary Web App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Search words through the Free Dictionary API or a compatible documented dictionary provider.
- Display phonetic spelling, parts of speech, definitions, examples, synonyms, and source data when returned.
- Play pronunciation audio when an audio URL exists and show an accessible fallback when it does not.
- Validate blank searches and handle not-found, rate-limit, malformed-response, and network errors.
- Allow serif, sans-serif, and monospace font selection plus light/dark theme switching.
- Keep a recent-search list as an optional enhancement.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS or CSS Modules, and fetch with a small typed API client. No backend is needed for the public API unless a provider key or caching requirement demands it.

### Architecture and engineering approach

Validate and normalize API responses, handle missing fields defensively, and make audio controls accessible. Test blank search, no result, absent phonetics, API failure, theme/font persistence, and URL-safe word requests.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Dictionary Web App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `dictionary-web-app` unless an existing portfolio convention requires another stable unique slug.


---

## 24. Single-Page Developer Portfolio

**Official challenge:** https://www.frontendmentor.io/challenges/singlepage-developer-portfolio-bBVj2ZPi-x  

**Target users:** recruiters, collaborators, and prospective clients exploring a developer’s work.

**Project type:** personal portfolio website.

### Build prompt

Build a complete, polished, responsive application/site called **Single-Page Developer Portfolio**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Implement hero, biography, skills, project gallery, contact, and footer sections based on supplied challenge content/design.
- Present projects with clear summaries, technologies, and genuine live/repository links when supplied.
- Use responsive layouts and image crops for project cards.
- Implement working navigation and any included contact form validation.
- Create a consistent typographic scale and reusable components for repeated project details.

### Recommended technology stack

Semantic HTML, modern CSS, TypeScript/JavaScript for interactions, or React + TypeScript + Vite if component architecture benefits the build.

### Architecture and engineering approach

Treat the page as a real portfolio: no invented credentials, testimonials, metrics, or external URLs. Use semantic headings, accessible forms, metadata, optimized imagery, and test all links and responsive layouts.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Single-Page Developer Portfolio** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `single-page-developer-portfolio` unless an existing portfolio convention requires another stable unique slug.


---

## 25. Connect Four Game

**Official challenge:** https://www.frontendmentor.io/challenges/connect-four-game-6G8QVH923s  

**Target users:** two-player game fans and casual strategy players.

**Project type:** turn-based browser game.

### Build prompt

Build a complete, polished, responsive application/site called **Connect Four Game**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Implement the Connect Four grid, alternating players, and gravity-based token placement.
- Detect four connected tokens horizontally, vertically, and diagonally.
- Prevent moves in full columns and stop moves after a win or draw.
- Display whose turn it is, remaining/elapsed timer if included, and round results.
- Provide new game, rematch, reset, and any supplied player-selection options.
- Support mouse, touch, and keyboard navigation with clearly visible focus and turn states.

### Recommended technology stack

React, TypeScript, Vite, and CSS Modules. Keep all game rules in a pure TypeScript engine; no backend required.

### Architecture and engineering approach

Separate board state, win detection, and rendering. Test all four win directions, simultaneous edge cases, full columns, draw states, reset, and repeated actions. Ensure screen readers can identify the cell, owner, and game status.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Connect Four Game** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `connect-four-game` unless an existing portfolio convention requires another stable unique slug.


---

## 26. Password Generator App

**Official challenge:** https://www.frontendmentor.io/challenges/password-generator-app-Mr8CLycqjh  

**Target users:** people who need unique passwords generated locally.

**Project type:** client-side security utility.

### Build prompt

Build a complete, polished, responsive application/site called **Password Generator App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Allow password length selection and toggles for uppercase, lowercase, numbers, and symbols.
- Generate passwords using a cryptographically secure browser random source.
- Prevent generation when no character set is selected and validate minimum/maximum lengths.
- Display a clear strength estimate based on entropy-related properties, explaining that it is an estimate.
- Copy generated passwords to the clipboard and show success/failure feedback.
- Keep generated values local and avoid analytics or logging of secrets.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS or CSS Modules, and Web Crypto (`crypto.getRandomValues`). No backend or persistence of generated passwords.

### Architecture and engineering approach

Use unbiased selection rather than `Math.random()` for security-sensitive generation. Test option combinations, length bounds, symbol pools, clipboard failure, and accessible strength indicators. Never transmit, save, or log generated passwords.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Password Generator App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `password-generator-app` unless an existing portfolio convention requires another stable unique slug.


---

## 27. Single-Page Design Portfolio

**Official challenge:** https://www.frontendmentor.io/challenges/singlepage-design-portfolio-2MMhyhfKVo  

**Target users:** design clients and creative collaborators viewing a designer’s portfolio.

**Project type:** design-led portfolio landing page.

### Build prompt

Build a complete, polished, responsive application/site called **Single-Page Design Portfolio**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Build a responsive skills/services grid with clear visual hierarchy and the supplied content.
- Create project or artwork cards with distinct visual treatment for different categories.
- Include profile/about content, a prominent contact CTA, and footer/navigation.
- Use CSS Grid to create the intended asymmetrical or bento-like layout where appropriate.
- Implement any carousel or interactions in the brief with working controls and keyboard support.

### Recommended technology stack

Semantic HTML, CSS Grid/Flexbox, CSS custom properties, and lightweight JavaScript; optional Astro for modular static content.

### Architecture and engineering approach

Focus on responsive grid behavior, image aspect ratios, reduced motion, and accessible links. Test at narrow widths so dense card layouts reflow without clipping or changing reading order.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Single-Page Design Portfolio** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `single-page-design-portfolio` unless an existing portfolio convention requires another stable unique slug.


---

## 28. Kanban Task Management Web App

**Official challenge:** https://www.frontendmentor.io/challenges/kanban-task-management-web-app-wgQLt-HlbB  

**Target users:** individuals and teams organizing work through boards, columns, and subtasks.

**Project type:** full-stack task management application.

### Build prompt

Build a complete, polished, responsive application/site called **Kanban Task Management Web App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Create, read, update, and delete boards, columns, tasks, and subtasks.
- Move tasks between columns, mark subtasks complete, and support drag-and-drop reordering.
- Provide task detail/edit modals, form validation, delete confirmation, and empty-board states.
- Allow sidebar collapse and light/dark theme switching.
- Persist changes across refresh; optionally add accounts and multi-device sync.
- Keep board and task counts synchronized and show clear save/error status.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS, dnd-kit, Zustand or Redux Toolkit, and localStorage for local mode. For multi-user sync, use FastAPI/SQLAlchemy/PostgreSQL with authenticated APIs.

### Architecture and engineering approach

Model task positions and board-column relationships explicitly. Use optimistic updates only with rollback, validate all mutations, and test drag/drop, reordering, deletion of referenced columns, persistence, subtasks, theme, and empty states.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Kanban Task Management Web App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `kanban-task-management-web-app` unless an existing portfolio convention requires another stable unique slug.


---

## 29. Skilled E-Learning Landing Page

**Official challenge:** https://www.frontendmentor.io/challenges/skilled-elearning-landing-page-S1ObDrZ8q  

**Target users:** prospective students considering online courses.

**Project type:** responsive education landing page.

### Build prompt

Build a complete, polished, responsive application/site called **Skilled E-Learning Landing Page**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Implement the hero, course/benefit cards, prominent enrollment CTAs, and footer from the provided design.
- Recreate the intended decorative hero imagery and responsive card layout.
- Use consistent components for course benefits and repeated content.
- Ensure all CTA links have meaningful destinations, using clear demo links if no actual enrollment system exists.
- Maintain strong text contrast, hierarchy, and readable content on mobile.

### Recommended technology stack

Semantic HTML, CSS Grid/Flexbox, CSS custom properties, and minimal JavaScript. React or Astro is optional if reusable content components are useful.

### Architecture and engineering approach

Match the challenge’s style guide and responsive screenshots. Optimize images, provide focus/hover states, validate links, and do not claim that enrollment is active unless an actual workflow exists.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Skilled E-Learning Landing Page** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `skilled-e-learning-landing-page` unless an existing portfolio convention requires another stable unique slug.


---

## 30. In-Browser Markdown Editor

**Official challenge:** https://www.frontendmentor.io/challenges/inbrowser-markdown-editor-r16TrrQX9  

**Target users:** writers, developers, students, and documentation authors.

**Project type:** browser-based editor application.

### Build prompt

Build a complete, polished, responsive application/site called **In-Browser Markdown Editor**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Create, rename, save, and delete Markdown documents.
- Provide an editable Markdown pane and live rendered preview with synchronized content.
- Support document selection, creation, deletion confirmation, and a responsive sidebar.
- Render headings, lists, links, blockquotes, code, and tables as supported by the chosen parser.
- Allow preview-only and split-view modes if supported by the design.
- Persist documents locally and provide import/export of `.md` files.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS, and a maintained Markdown parser such as `remark`/`marked`; sanitize rendered HTML with DOMPurify or an equivalent safe renderer.

### Architecture and engineering approach

Treat Markdown as untrusted input and prevent XSS. Handle unsaved changes, empty documents, long text, download names, keyboard navigation, and preview consistency. Test sanitization and Markdown edge cases.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **In-Browser Markdown Editor** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `in-browser-markdown-editor` unless an existing portfolio convention requires another stable unique slug.


---

## 31. Entertainment Web App

**Official challenge:** https://www.frontendmentor.io/challenges/entertainment-web-app-J-UhgAW1X  

**Target users:** film and television fans browsing, searching, and bookmarking entertainment titles.

**Project type:** media discovery application.

### Build prompt

Build a complete, polished, responsive application/site called **Entertainment Web App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Display trending/recommended content and categorized movie/TV title grids from the supplied data.
- Search titles by name and filter between content types when supported by the source.
- Bookmark/unbookmark titles and provide a saved-items view.
- Show title artwork, metadata, category, year, and rating as available.
- Support responsive browsing, useful empty search states, and direct title-detail views if in scope.
- Persist bookmarks locally and label sample data correctly; avoid unauthorized scraping of streaming services.

### Recommended technology stack

React, TypeScript, Vite, React Router, and CSS Modules/Tailwind. Use challenge-provided JSON or a documented licensed API, not arbitrary scraping.

### Architecture and engineering approach

Build reusable media cards and normalize missing image/metadata cases. Make bookmark actions keyboard-accessible and test searching, filters, favorites, missing assets, and empty results.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Entertainment Web App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `entertainment-web-app` unless an existing portfolio convention requires another stable unique slug.


---

## 32. Suite Landing Page

**Official challenge:** https://www.frontendmentor.io/challenges/suite-landing-page-tj_eaU-Ra  

**Target users:** prospective customers considering a software or business service.

**Project type:** single-page marketing site.

### Build prompt

Build a complete, polished, responsive application/site called **Suite Landing Page**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Recreate the hero, value proposition, feature sections, proof/metrics only if supplied, and CTA areas from the challenge assets.
- Create a distinctive large headline and responsive composition of text and imagery.
- Include clear navigation and working CTA anchors.
- Preserve the designed visual rhythm and image overlap while adapting to mobile.

### Recommended technology stack

Semantic HTML, CSS Grid/Flexbox, CSS custom properties, and minimal JavaScript. No backend required unless the challenge explicitly includes a form.

### Architecture and engineering approach

Use supplied assets and real content; do not invent unsupported success statistics. Test responsive breakpoints, image overflow, keyboard focus, layout stability, and link destinations.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Suite Landing Page** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `suite-landing-page` unless an existing portfolio convention requires another stable unique slug.


---

## 33. Tic-Tac-Toe Game

**Official challenge:** https://www.frontendmentor.io/challenges/tic-tac-toe-game-Re7ZF_E2v  

**Target users:** casual players who want a quick two-player or computer-opponent game.

**Project type:** browser game.

### Build prompt

Build a complete, polished, responsive application/site called **Tic-Tac-Toe Game**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Implement a 3×3 board with selectable player marks and legal move validation.
- Detect wins across rows, columns, and diagonals, plus draws.
- Provide new round, restart, score tracking, and the player-selection options defined by the challenge.
- If AI opponent mode is included, implement a real strategy such as minimax or a documented difficulty heuristic.
- Display active turn, winning line, and clear game-over states.

### Recommended technology stack

React, TypeScript, Vite, and CSS Modules. Keep game rules in pure functions; no backend required.

### Architecture and engineering approach

Test all eight win combinations, draw detection, illegal moves, restart consistency, score reset, and AI behavior if included. Ensure touch and keyboard interactions are accessible.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Tic-Tac-Toe Game** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `tic-tac-toe-game` unless an existing portfolio convention requires another stable unique slug.


---

## 34. Art Gallery Website

**Official challenge:** https://www.frontendmentor.io/challenges/art-gallery-website-yVdrZlxyA  

**Target users:** visitors discovering a gallery, exhibition, or cultural venue.

**Project type:** two-page editorial website.

### Build prompt

Build a complete, polished, responsive application/site called **Art Gallery Website**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Implement the gallery landing page and location/detail page specified by the challenge.
- Create a bold editorial layout with responsive artwork, location information, and visitor details.
- Use a location/map visual as designed; external map links must point to a real configured destination.
- Provide consistent navigation between the pages and a clear return path.
- Use carefully cropped imagery and accessible captions/alternative text.

### Recommended technology stack

Semantic HTML, CSS Grid/Flexbox, CSS custom properties, and a lightweight router or Astro for two static routes.

### Architecture and engineering approach

Respect image licensing, make the two pages independently accessible by direct URL, test mobile composition, and ensure text remains legible over imagery. No map or booking controls should be fake.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Art Gallery Website** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `art-gallery-website` unless an existing portfolio convention requires another stable unique slug.


---

## 35. Equalizer Landing Page

**Official challenge:** https://www.frontendmentor.io/challenges/equalizer-landing-page-7VJ4gp3DE  

**Target users:** potential customers considering a digital audio or music-related product.

**Project type:** responsive product landing page.

### Build prompt

Build a complete, polished, responsive application/site called **Equalizer Landing Page**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Build the hero, product illustration, highlighted plan or pricing card, value proposition, and footer as specified.
- Create the overlapping product/device composition while maintaining responsive layout.
- If pricing CTA controls are shown, link to genuine configured destinations or provide an honest demo message.
- Ensure key product details and pricing remain accessible at mobile widths.

### Recommended technology stack

Semantic HTML, CSS Grid/Flexbox, custom properties, and minimal JavaScript. Use supplied assets and fonts where licensed.

### Architecture and engineering approach

Test image overlaps and z-index at responsive breakpoints, semantic heading order, contrast, loading performance, and CTA behavior. Do not imply checkout or purchase functionality without a real service.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Equalizer Landing Page** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `equalizer-landing-page` unless an existing portfolio convention requires another stable unique slug.


---

## 36. Memory Game

**Official challenge:** https://www.frontendmentor.io/challenges/memory-game-vse4WFPvM  

**Target users:** casual players practicing visual memory and concentration.

**Project type:** interactive game.

### Build prompt

Build a complete, polished, responsive application/site called **Memory Game**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Create a shuffled matching-pair board using supported icon/image or number themes.
- Support the player options and board sizes listed in the official brief.
- Track flips, moves, elapsed time, matched pairs, and completion.
- Prevent rapid input from breaking the two-card reveal sequence.
- Provide win summary, restart, new game, and any included multiplayer/competitive options.
- Use clear animations and accessible status announcements.

### Recommended technology stack

React, TypeScript, Vite, CSS Modules, and a deterministic game-state reducer.

### Architecture and engineering approach

Separate pair matching, shuffle, timer, and scoring logic. Test matched and unmatched pairs, repeated click prevention, board completion, restart cleanup, timer stop, and keyboard access.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Memory Game** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `memory-game` unless an existing portfolio convention requires another stable unique slug.


---

## 37. GitHub User Search App

**Official challenge:** https://www.frontendmentor.io/challenges/github-user-search-app-Q09YOgaH6  

**Target users:** developers and recruiters looking up public GitHub profiles.

**Project type:** API integration app.

### Build prompt

Build a complete, polished, responsive application/site called **GitHub User Search App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Search GitHub users by username and display their public profile data.
- Show avatar, name, biography, location, company, blog, joined date, repository count, followers, and following where returned by the API.
- Handle missing profile fields with a consistent “Not available” treatment.
- Display loading, empty-query, user-not-found, rate-limit, and network-error states.
- Support keyboard submission and clear re-search behavior.
- Use a small client cache to avoid needless repeated requests and show accessible profile links.

### Recommended technology stack

React, TypeScript, Vite, CSS Modules/Tailwind, and GitHub’s public REST API via a typed fetch client. Use a backend proxy only if a token is required, and never expose secrets.

### Architecture and engineering approach

Handle HTTP status codes, rate limits, optional properties, and API schema changes. Test unknown users, empty results, missing fields, keyboard submit, and request loading/error states.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **GitHub User Search App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `github-user-search-app` unless an existing portfolio convention requires another stable unique slug.


---

## 38. Galleria Slideshow Site

**Official challenge:** https://www.frontendmentor.io/challenges/galleria-slideshow-site-tEA4pwsa6  

**Target users:** art enthusiasts exploring a curated slideshow of famous artworks.

**Project type:** editorial gallery and slideshow.

### Build prompt

Build a complete, polished, responsive application/site called **Galleria Slideshow Site**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Display a gallery of artworks with title, artist, thumbnail, and relevant metadata from supplied data.
- Open an artwork detail view with large imagery, artist image, story, and source links as supplied.
- Provide next/previous slideshow controls and a global play/pause or start/pause experience if included.
- Show slideshow progress and handle first/last item transitions deliberately.
- Support responsive gallery layout and direct navigation between artworks.

### Recommended technology stack

React, TypeScript, Vite, React Router, and CSS Grid/Flexbox. Use local data and supplied image assets.

### Architecture and engineering approach

Preload only the next relevant image, respect reduced motion, make controls keyboard-accessible, and test progression, pause/resume, route consistency, missing assets, and image loading failure.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Galleria Slideshow Site** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `galleria-slideshow-site` unless an existing portfolio convention requires another stable unique slug.


---

## 39. Product Feedback App

**Official challenge:** https://www.frontendmentor.io/challenges/product-feedback-app-wbvUYqjR6  

**Target users:** product users submitting suggestions and teams triaging feature requests.

**Project type:** product feedback management app.

### Build prompt

Build a complete, polished, responsive application/site called **Product Feedback App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Display a list of feedback items with category, status, vote count, and comments.
- Allow users to create, edit, and delete feedback with validation.
- Support upvoting with clear rules preventing accidental repeated votes.
- Filter by category and roadmap status; sort by most votes or other modes specified in the brief.
- Provide feedback detail pages with threaded comments or replies where supported.
- Build a roadmap board grouping items by planned, in-progress, and live states.

### Recommended technology stack

React, TypeScript, Vite, Tailwind CSS, and local JSON/localStorage for the core challenge; use FastAPI/PostgreSQL or Supabase if accounts, shared data, and server persistence are included.

### Architecture and engineering approach

Model feedback, votes, categories, statuses, and comments separately. Test sorting, status transitions, CRUD, comment ordering, vote rules, persistence, and validation. Seed demo items transparently.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Product Feedback App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `product-feedback-app` unless an existing portfolio convention requires another stable unique slug.


---

## 40. Planets Fact Site

**Official challenge:** https://www.frontendmentor.io/challenges/planets-fact-site-gazqN8w_f  

**Target users:** learners exploring basic facts about the planets in the Solar System.

**Project type:** multi-page-feeling data-driven information site.

### Build prompt

Build a complete, polished, responsive application/site called **Planets Fact Site**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Display planet facts using the provided structured data.
- Let users select a planet and switch among overview, internal structure, and surface/geology content where provided.
- Update planet imagery, description, and fact panels consistently with the selected planet/section.
- Provide responsive navigation, clear selected states, and keyboard-accessible controls.
- Include fact values such as diameter, orbital period, rotation, and temperature only when available in the source dataset.

### Recommended technology stack

React, TypeScript, Vite, React Router or state-driven views, and CSS Modules with design tokens.

### Architecture and engineering approach

Keep planet data separate from components and validate the dataset. Test every planet/section combination, navigation state, responsive menus, and factual consistency. Attribute or verify non-provided astronomical data rather than inventing it.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Planets Fact Site** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `planets-fact-site` unless an existing portfolio convention requires another stable unique slug.


---

## 41. Audiophile E-Commerce Website

**Official challenge:** https://www.frontendmentor.io/challenges/audiophile-ecommerce-website-C8cuSd_wx  

**Target users:** customers exploring and comparing audio equipment online.

**Project type:** multi-page commerce frontend.

### Build prompt

Build a complete, polished, responsive application/site called **Audiophile E-Commerce Website**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Build homepage, category listings, product detail pages, cart, and checkout pages represented in the supplied challenge.
- Display product variants, images, descriptions, quantity controls, and related products.
- Implement cart add/remove/update, totals, shipping/VAT calculations when specified, and persisted cart state.
- Validate checkout forms and provide an order summary and clear demo confirmation.
- Support responsive navigation, category links, and product image galleries.
- Mark checkout as a demonstration unless a real payment provider is configured; never collect real card data in a demo.

### Recommended technology stack

Next.js, TypeScript, Tailwind CSS, and local seed product data; use server actions/API routes and PostgreSQL only if order persistence is intentionally included. Avoid a real payment processor unless correctly configured.

### Architecture and engineering approach

Keep cart math and order totals in tested pure functions. Validate quantities, handle empty carts, preserve checkout state, and never store payment card details. Test navigation, cart consistency, form errors, and responsive product pages.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Audiophile E-Commerce Website** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `audiophile-e-commerce-website` unless an existing portfolio convention requires another stable unique slug.


---

## 42. Meet Landing Page

**Official challenge:** https://www.frontendmentor.io/challenges/meet-landing-page-rbTDS6OUR  

**Target users:** visitors learning about a collaboration or meeting product.

**Project type:** responsive promotional landing page.

### Build prompt

Build a complete, polished, responsive application/site called **Meet Landing Page**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Recreate the supplied hero, imagery, product benefits, numbered sections, and final CTA.
- Use responsive composition for the edge-to-edge image collage and overlapping content.
- Build reusable components for repeated feature blocks and numbered markers.
- Ensure navigation and CTA controls have meaningful destinations.

### Recommended technology stack

Semantic HTML, CSS Grid/Flexbox, modern CSS, and minimal JavaScript. No backend needed for the static landing page.

### Architecture and engineering approach

Focus on fidelity to provided images, responsive cropping, spacing, typography, and semantic order. Test narrow screens, contrast, focus styles, and overflow.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Meet Landing Page** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `meet-landing-page` unless an existing portfolio convention requires another stable unique slug.


---

## 43. Typemaster Prelaunch Landing Page

**Official challenge:** https://www.frontendmentor.io/challenges/typemaster-prelaunch-landing-page-J6-Yj5J-X  

**Target users:** customers interested in a newly announced keyboard or hardware product.

**Project type:** prelaunch product marketing page.

### Build prompt

Build a complete, polished, responsive application/site called **Typemaster Prelaunch Landing Page**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Build the prelaunch hero with product imagery, release messaging, and a clear pre-order CTA.
- Show product benefits and feature cards with responsive imagery.
- Implement a consistent announcement or CTA flow.
- If an email sign-up is included, validate the address and use a genuine configured endpoint or clearly labeled demo behavior.

### Recommended technology stack

Semantic HTML, CSS Grid/Flexbox, CSS custom properties, and lightweight JavaScript. React is optional.

### Architecture and engineering approach

Avoid fabricated scarcity or fake stock counts. Match the supplied design, optimize imagery, test breakpoint behavior, and make all form states accessible.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Typemaster Prelaunch Landing Page** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `typemaster-prelaunch-landing-page` unless an existing portfolio convention requires another stable unique slug.


---

## 44. Invoice App

**Official challenge:** https://www.frontendmentor.io/challenges/invoice-app-i7KaLTQjl  

**Target users:** freelancers and small businesses creating and tracking invoices.

**Project type:** invoice management application.

### Build prompt

Build a complete, polished, responsive application/site called **Invoice App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Create, edit, view, and delete invoices with client details, dates, payment terms, line items, tax/discount fields if specified, and status.
- Support Draft, Pending, and Paid states where supported by the challenge.
- Calculate line totals, subtotal, taxes, and invoice total reliably.
- Filter invoices by status and search by invoice/client identifier.
- Provide details view, payment-status transitions, delete confirmation, and form validation.
- Persist data locally or in a database and provide print-friendly invoice output.

### Recommended technology stack

React, TypeScript, Vite, React Hook Form, Zod, and local persistence for frontend-only scope; FastAPI/SQLAlchemy/PostgreSQL if full-stack accounts and durable invoices are implemented.

### Architecture and engineering approach

Use decimal-safe money math, stable invoice identifiers, date validation, and immutable status transitions. Test line-item changes, draft/pending behavior, filters, persistence, and print layout. Clearly label sample invoices.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Invoice App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `invoice-app` unless an existing portfolio convention requires another stable unique slug.


---

## 45. CoffeeRoasters Subscription Site

**Official challenge:** https://www.frontendmentor.io/challenges/coffeeroasters-subscription-site-5Fc26HVY6  

**Target users:** coffee drinkers exploring and configuring a recurring coffee subscription.

**Project type:** multi-page marketing and configurator website.

### Build prompt

Build a complete, polished, responsive application/site called **CoffeeRoasters Subscription Site**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Build the main brand, product/process, and subscription-plan pages specified in the challenge.
- Implement the subscription preference flow for coffee type, grind, quantity, delivery frequency, and total price where present in the design.
- Update a live order summary as preferences change.
- Validate selections and clearly show unavailable/inapplicable options.
- Provide responsive navigation, progress indicators, and a summary/confirmation view if included.

### Recommended technology stack

React, TypeScript, Vite, React Router, Tailwind CSS or CSS Modules. Use local product/price configuration unless an actual commerce backend is deliberately added.

### Architecture and engineering approach

Keep product rules and price calculations separate from UI. Test conditional fields, summary synchronization, incomplete selections, mobile menu behavior, and route navigation. Do not imply that a subscription has been purchased unless a real checkout exists.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **CoffeeRoasters Subscription Site** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `coffeeroasters-subscription-site` unless an existing portfolio convention requires another stable unique slug.


---

## 46. Maker Prelaunch Landing Page

**Official challenge:** https://www.frontendmentor.io/challenges/maker-prelaunch-landing-page-WVZIJtKLd  

**Target users:** prospective users evaluating an upcoming digital product or service.

**Project type:** prelaunch marketing page.

### Build prompt

Build a complete, polished, responsive application/site called **Maker Prelaunch Landing Page**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Recreate the brand header, hero, value proposition, features, and footer with responsive composition.
- Implement the requested email request-access or waitlist form if present.
- Validate required fields, present inline errors, and show success only after a real submission or explicit demo simulation.
- Use provided product illustrations and background assets without distorting the layout.

### Recommended technology stack

Semantic HTML, CSS, and TypeScript/JavaScript; optional React + TypeScript + Vite. A backend/form service is only required for actual signup storage.

### Architecture and engineering approach

Do not pretend a waitlist submission was stored without a real endpoint. Test email validation, success/error states, input labels, responsive layouts, and visual fidelity.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Maker Prelaunch Landing Page** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `maker-prelaunch-landing-page` unless an existing portfolio convention requires another stable unique slug.


---

## 47. Pomodoro App

**Official challenge:** https://www.frontendmentor.io/challenges/pomodoro-app-KBFnycJ6G  

**Target users:** students, developers, and professionals using timed focus sessions.

**Project type:** timer and productivity application.

### Build prompt

Build a complete, polished, responsive application/site called **Pomodoro App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Implement focus, short-break, and long-break modes with configurable durations.
- Provide start, pause, reset, and automatic transition between sessions.
- Show a reliable countdown and visual progress representation.
- Allow font/color settings or theme controls as defined by the challenge.
- Persist user preferences and session counts across refreshes if appropriate.
- Provide notification/audio behavior only with permission and graceful fallbacks.

### Recommended technology stack

React, TypeScript, Vite, CSS Modules/Tailwind, and browser timers. No backend required.

### Architecture and engineering approach

Use monotonic timestamps or deadline-based timing rather than decrementing a counter once per interval, so background-tab throttling does not corrupt time. Test pause/resume, visibility changes, mode transitions, reset, and settings.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Pomodoro App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `pomodoro-app` unless an existing portfolio convention requires another stable unique slug.


---

## 48. Creative Agency Single-Page Site

**Official challenge:** https://www.frontendmentor.io/challenges/creative-agency-singlepage-site-Pq6V3I2RM  

**Target users:** prospective clients evaluating a creative agency’s services and work.

**Project type:** design-forward agency website.

### Build prompt

Build a complete, polished, responsive application/site called **Creative Agency Single-Page Site**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Build a bold hero, service/offer section, featured work or case studies, agency story, and contact CTA as specified.
- Use overlapping compositions, typography, and image relationships matching the supplied design.
- Add interactive elements only where the original brief calls for them.
- Provide working navigation and responsive sections.

### Recommended technology stack

Semantic HTML, CSS Grid/Flexbox, CSS custom properties, and minimal JavaScript; optional Astro for componentized static pages.

### Architecture and engineering approach

Prioritize layout precision, consistent spacing, image optimization, keyboard focus, and reduced motion. Do not invent client logos, campaign results, or testimonials; use only provided/clearly fictional demo content.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Creative Agency Single-Page Site** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `creative-agency-single-page-site` unless an existing portfolio convention requires another stable unique slug.


---

## 49. Pod Request Access Landing Page

**Official challenge:** https://www.frontendmentor.io/challenges/pod-request-access-landing-page-eyTmdkLSG  

**Target users:** listeners interested in a podcast/audio service with early access.

**Project type:** email request-access landing page.

### Build prompt

Build a complete, polished, responsive application/site called **Pod Request Access Landing Page**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Recreate the hero, brand mark, product messaging, provider badges, and background imagery.
- Implement the email access-request form with correct empty and malformed-email errors.
- Show the submitted email in a success state only if the brief calls for it.
- Ensure the form is usable on mobile and the CTA remains visible and operable.

### Recommended technology stack

Semantic HTML, CSS, and JavaScript or React + TypeScript + Vite. Use a real form endpoint only if actual subscriptions are meant to be collected.

### Architecture and engineering approach

Implement accessible validation with inline errors and focus management. Do not claim access is granted or emails are stored when no backend exists. Test form edge cases, keyboard navigation, and responsive background behavior.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Pod Request Access Landing Page** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `pod-request-access-landing-page` unless an existing portfolio convention requires another stable unique slug.


---

## 50. Clock App

**Official challenge:** https://www.frontendmentor.io/challenges/clock-app-LMFaxFwrM  

**Target users:** people viewing local time, date, time zone, and contextual information.

**Project type:** time-zone API application.

### Build prompt

Build a complete, polished, responsive application/site called **Clock App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Display the current time, day, and date with a correct 12/24-hour option if supplied.
- Use a documented time-zone/location API where required to provide city, region, and offset information.
- Provide an expandable or alternative detail view showing time zone and contextual data.
- Support a surprise/random location feature only if present in the supplied design/brief.
- Handle geolocation permission denial, unavailable API, and rate limits with useful fallbacks.

### Recommended technology stack

React, TypeScript, Vite, CSS Modules/Tailwind, browser `Intl`/Date APIs, and a documented API for extra location metadata. Store keys server-side if required.

### Architecture and engineering approach

Use IANA time-zone identifiers and reliable formatting, not hand-coded fixed offsets. Test date rollovers, time zones crossing midnight, daylight-saving transitions, API errors, and permission-denied states.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Clock App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `clock-app` unless an existing portfolio convention requires another stable unique slug.


---

## 51. OfficeLite Coming Soon Site

**Official challenge:** https://www.frontendmentor.io/challenges/officelite-coming-soon-site-M4DIPNz8g  

**Target users:** visitors learning about a forthcoming productivity service or plan.

**Project type:** two-page marketing and signup site.

### Build prompt

Build a complete, polished, responsive application/site called **OfficeLite Coming Soon Site**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Build the landing and sign-up/pricing page or pages specified by the design assets.
- Present the product proposition, features, plan cards, and CTA hierarchy.
- Implement sign-up fields with validation where included.
- Use real routing between pages and provide responsive pricing/layout behavior.
- If countdowns or launch dates appear, use a configurable real date rather than a fabricated timer.

### Recommended technology stack

Astro or React + TypeScript + Vite for multi-page routing, with CSS Modules/Tailwind. A backend is optional and only needed for real signups.

### Architecture and engineering approach

Test form errors, route navigation, selected plan behavior, screen-reader labels, and countdown boundaries if applicable. No fake registration confirmations or invented customer metrics.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **OfficeLite Coming Soon Site** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `officelite-coming-soon-site` unless an existing portfolio convention requires another stable unique slug.


---

## 52. Designo Multi-Page Website

**Official challenge:** https://www.frontendmentor.io/challenges/designo-multipage-website-G48K6rfUT  

**Target users:** businesses evaluating a design agency’s web, app, and graphic design services.

**Project type:** multi-page agency website.

### Build prompt

Build a complete, polished, responsive application/site called **Designo Multi-Page Website**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Implement the home page and the service/category pages specified by the brief, with shared header/footer.
- Build individual project/portfolio listing pages for the supported service categories.
- Create a contact page with the supplied form fields and validation.
- Provide cross-links between related service categories and clear contact CTAs.
- Recreate responsive layouts, decorative shapes, and image treatments from the supplied assets.

### Recommended technology stack

Astro for content-led static routes or React, TypeScript, Vite, and React Router. Use CSS Modules/Tailwind and structured content data.

### Architecture and engineering approach

Use route data instead of duplicating page templates, validate contact-form inputs, and test every route directly. Keep all portfolio examples demonstrative unless actual client work is documented.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Designo Multi-Page Website** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `designo-multi-page-website` unless an existing portfolio convention requires another stable unique slug.


---

## 53. DevJobs Web App

**Official challenge:** https://www.frontendmentor.io/challenges/devjobs-web-app-HuvC_LP4l  

**Target users:** job seekers searching developer and technology job listings.

**Project type:** job-board frontend application.

### Build prompt

Build a complete, polished, responsive application/site called **DevJobs Web App**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Render job listings from the supplied JSON data.
- Search by title/company/keyword and filter by location and full-time/contract arrangement where supported.
- Provide a detail view for each job with company, position, description, requirements, and application CTA.
- Support light/dark theme switching and responsive search controls.
- Handle no-results, missing company logos, and empty optional fields.
- Add query-string state or saved searches as optional improvements.

### Recommended technology stack

React, TypeScript, Vite, React Router, and CSS Modules/Tailwind. Use local JSON unless an actual job API is configured.

### Architecture and engineering approach

Normalize job records, synchronize filters with the URL if implemented, and make the mobile search modal accessible. Test combined filters, zero results, direct detail routes, theme persistence, and invalid slugs.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **DevJobs Web App** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `devjobs-web-app` unless an existing portfolio convention requires another stable unique slug.


---

## 54. PayAPI Multi-Page Website

**Official challenge:** https://www.frontendmentor.io/challenges/payapi-multipage-website-FDLR1Y11e  

**Target users:** businesses evaluating a payment API product.

**Project type:** multi-page SaaS marketing site.

### Build prompt

Build a complete, polished, responsive application/site called **PayAPI Multi-Page Website**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Implement product, pricing, about, and contact/demo pages as defined by the challenge.
- Build reusable navigation, footer, partner-logo, feature, and pricing components.
- Implement the contact/demo request form with correct validation states.
- Present developer-oriented code snippets or product illustrations using readable responsive code blocks.
- Create functioning navigation between pages and responsive menus.

### Recommended technology stack

Astro or Next.js with TypeScript and CSS Modules/Tailwind. Use static data for marketing content and a form provider only when real lead capture is configured.

### Architecture and engineering approach

Preserve page-specific active navigation, test form errors and direct routes, add SEO metadata, and avoid pretending a demo request was sent if there is no endpoint.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **PayAPI Multi-Page Website** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `payapi-multi-page-website` unless an existing portfolio convention requires another stable unique slug.


---

## 55. Photosnap Multi-Page Website

**Official challenge:** https://www.frontendmentor.io/challenges/photosnap-multipage-website-nMDSrNmNW  

**Target users:** photography enthusiasts and customers exploring a visual storytelling platform.

**Project type:** multi-page editorial/marketing website.

### Build prompt

Build a complete, polished, responsive application/site called **Photosnap Multi-Page Website**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Build the home, stories, features, and pricing pages required by the design.
- Create responsive photographic story cards and full-width feature sections.
- Provide story metadata and ordering from structured content data.
- Implement pricing-plan comparison and CTA navigation where included.
- Use appropriate responsive image crops and overlay text treatments.

### Recommended technology stack

Astro or React + TypeScript + Vite with React Router, CSS Grid/Flexbox, and CSS Modules/Tailwind.

### Architecture and engineering approach

Optimize large images and avoid text-on-image contrast failures. Test page transitions, menu operation, responsive image selection, pricing layout, and all internal links.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Photosnap Multi-Page Website** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `photosnap-multi-page-website` unless an existing portfolio convention requires another stable unique slug.


---

## 56. Arch Studio Multi-Page Website

**Official challenge:** https://www.frontendmentor.io/challenges/arch-studio-multipage-website-wNIbOFYR6  

**Target users:** clients exploring an architecture studio’s work and contacting the firm.

**Project type:** multi-page architecture portfolio site.

### Build prompt

Build a complete, polished, responsive application/site called **Arch Studio Multi-Page Website**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Implement home, portfolio/project pages, about, and contact pages required by the source design.
- Build a featured-project carousel or hero switching mechanism where included.
- Present project cards and details with consistent image treatment and metadata.
- Create contact form validation and a location/map section using the supplied information.
- Provide direct navigation and clear active page states.

### Recommended technology stack

Astro or React + TypeScript + Vite, React Router, and CSS Modules/Tailwind. No backend unless actual contact handling is configured.

### Architecture and engineering approach

Use shared page layouts and structured project content, implement accessible carousel controls, optimize architectural imagery, and test direct links, form errors, and responsive navigation.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Arch Studio Multi-Page Website** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `arch-studio-multi-page-website` unless an existing portfolio convention requires another stable unique slug.


---

## 57. Scoot Multi-Page Website

**Official challenge:** https://www.frontendmentor.io/challenges/scoot-multipage-website-N76alNPRJ  

**Target users:** prospective riders learning about an urban mobility or scooter service.

**Project type:** multi-page mobility service marketing site.

### Build prompt

Build a complete, polished, responsive application/site called **Scoot Multi-Page Website**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Build the home page plus About, Locations, and Careers or other routes defined by the challenge.
- Create reusable hero and feature components with responsive illustrations.
- Implement location information and recruitment/application CTAs.
- Use structured content for values, team/careers, and service information.
- Ensure internal routes and CTA links work across desktop and mobile.

### Recommended technology stack

Astro or React + TypeScript + Vite with React Router; CSS Modules or Tailwind CSS. Keep content static unless a real submission workflow is required.

### Architecture and engineering approach

Use route-aware navigation, accessible illustrations and forms, optimized assets, and responsive patterns. Do not invent actual job openings or operational transport locations if the brief provides fictional sample content.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Scoot Multi-Page Website** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `scoot-multi-page-website` unless an existing portfolio convention requires another stable unique slug.


---

## 58. Dine Restaurant Website

**Official challenge:** https://www.frontendmentor.io/challenges/dine-restaurant-website-yAt7Vvxt7  

**Target users:** diners considering a restaurant and guests who want to make a reservation.

**Project type:** restaurant marketing and reservation form site.

### Build prompt

Build a complete, polished, responsive application/site called **Dine Restaurant Website**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Implement the restaurant landing page and booking/reservation page or flow from the challenge.
- Present menu/food imagery, restaurant values, location, hours, and contact details supplied by the challenge.
- Validate reservation date, time, guest count, and guest contact fields where included.
- Provide a clear summary and success state; distinguish demo reservations from real bookings.
- Make form controls keyboard-accessible and handle invalid or missing fields.

### Recommended technology stack

React, TypeScript, Vite, React Router, React Hook Form, Zod, and CSS Modules/Tailwind. Use a backend only for actual reservation storage.

### Architecture and engineering approach

Validate dates and guest counts, prevent past-date selection if applicable, and avoid claiming that a table is genuinely reserved without a connected booking service. Test validation, success/error states, and responsive form layout.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Dine Restaurant Website** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `dine-restaurant-website` unless an existing portfolio convention requires another stable unique slug.


---

## 59. Minimalist Portfolio Website

**Official challenge:** https://www.frontendmentor.io/challenges/minimalist-portfolio-website-LMy-ZRyiE  

**Target users:** design-focused visitors, recruiters, and clients reviewing a creative portfolio.

**Project type:** multi-page editorial portfolio.

### Build prompt

Build a complete, polished, responsive application/site called **Minimalist Portfolio Website**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Build the home page and project detail pages in the supplied minimalist design.
- Use oversized typography, strong whitespace, purposeful imagery, and editorial navigation.
- Present project context, contribution, process, and outcome only when supported by real content.
- Provide previous/next project navigation and clear contact paths.
- Ensure pages remain readable and structurally consistent on small screens.

### Recommended technology stack

Astro or Next.js with TypeScript and CSS Modules for static, SEO-friendly routes. Use structured project content and optimized image assets.

### Architecture and engineering approach

Do not fabricate client results or testimonials. Add per-page titles/descriptions, accessible images, direct route loading, responsive typography, and meaningful keyboard navigation.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **Minimalist Portfolio Website** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `minimalist-portfolio-website` unless an existing portfolio convention requires another stable unique slug.


---

## 60. myteam Multi-Page Website

**Official challenge:** https://www.frontendmentor.io/challenges/myteam-multipage-website-mxlEauvW  

**Target users:** organizations and prospective clients learning about a distributed or collaborative team.

**Project type:** multi-page company/agency website.

### Build prompt

Build a complete, polished, responsive application/site called **myteam Multi-Page Website**, based on the linked Frontend Mentor challenge. This is intended to be a finished portfolio project, not just a landing screen or screenshot reproduction. Follow the official brief and supplied design assets first; use the scope below to ensure the key workflow is functional.

### Core functionality

- Implement Home, About, and contact/signup pages as specified by the supplied challenge.
- Build team-member cards with bios, roles, and social links from supplied content.
- Provide testimonial or differentiator sections only when present in the source materials.
- Implement the contact form with validation and meaningful status feedback.
- Use shared navigation/footer, route-aware active states, and responsive layouts.

### Recommended technology stack

Astro or React + TypeScript + Vite with React Router; CSS Modules/Tailwind and a real form service only when configured.

### Architecture and engineering approach

Keep team content in a typed data source, validate links, support keyboard navigation, test direct page routes and form errors, and avoid fabricated employee credentials or customer testimonials.


### Required engineering, QA, and portfolio handoff

- First inspect the linked official challenge page, starter-project README, supplied JSON/data, design files, style guide, and mobile/tablet/desktop references. Treat the supplied brief as authoritative; implement its required features before optional enhancements. If a detail is inaccessible, do not invent it—record the assumption and keep it configurable.
- Build a working, deployable application rather than a static mockup. All visible controls must work; no `href="#"`, fake success states, decorative forms, or fabricated live data. Label seeded content as demo data.
- Use semantic HTML, responsive layouts, accessible labels, keyboard-operable controls, visible focus states, reduced-motion support, and clear loading/empty/error/success states.
- Use typed domain models and keep business logic separate from presentation components. Validate user input at the correct boundary; handle malformed data, network failures, and unavailable optional services gracefully.
- Add automated tests for core domain logic and important user flows. Run linting, type-checking, tests, and a production build; report only checks that were actually executed.
- Include a README with product purpose, architecture, features, stack, local setup, scripts, environment variables, testing, deployment, data/API sources, and known limitations. Include `.env.example` without real credentials. Never place private API keys in browser code.
- Include portfolio-ready metadata: project title, concise description, categories/tags, technology list, official challenge URL, screenshot/thumbnail paths, feature list, key engineering decisions, lessons learned, live-demo URL placeholder, and repository URL placeholder. Create real screenshots of the completed app at desktop and mobile sizes; never use the challenge preview as though it were Mwangala’s implementation.
- Keep each project independently runnable and easy to link from the main portfolio using a unique slug. Add a concise case study explaining the problem, solution, architecture, responsive strategy, accessibility, testing, and limitations. Do not claim Frontend Mentor endorsement or fabricate scores, users, reviews, performance metrics, or completion evidence.

### Project-specific acceptance criteria

The project is complete when the primary user journey for **myteam Multi-Page Website** works end to end, the implementation follows the linked challenge brief and supplied assets, all stated controls behave correctly, responsive layouts have been inspected, core tests pass, and the project can be run and deployed from its README. Use the portfolio slug `myteam-multi-page-website` unless an existing portfolio convention requires another stable unique slug.


---

# Final cross-project portfolio integration checklist

When each project is complete, create/update one portfolio data record with: `id`, `slug`, `title`, `challengeUrl`, `shortDescription`, `categories`, `technologies`, `keyFeatures`, `thumbnail`, `screenshots`, `liveDemoUrl`, `repositoryUrl`, `status`, `difficulty` (only when verified), `caseStudy`, `engineeringHighlights`, `accessibilityNotes`, and `lessonsLearned`. Keep external URLs configurable and verified. The main portfolio should use these records to generate project cards and detail pages automatically.

Use consistent deployment documentation and visual screenshots, but let each project's design follow its own challenge identity. Do not restyle all 60 apps into one identical dashboard. Use the main portfolio's hybrid light/dark brand for the portfolio shell and case-study pages; preserve each challenge implementation’s intended visual identity inside its own demo.
