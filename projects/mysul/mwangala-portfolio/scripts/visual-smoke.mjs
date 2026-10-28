/*
 * Visual / layout smoke test (headless Chromium via Playwright).
 *
 * This is an OPTIONAL developer tool, not part of `npm test`: it needs a real
 * browser, which the unit suite deliberately avoids.
 *
 * Setup (one-off):
 *   npm i --no-save playwright-core
 *   npx playwright install chromium          # downloads the browser
 *   # on Debian/Ubuntu you may also need the system libraries:
 *   #   sudo apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
 *   #     libcups2 libxdamage1 libxkbcommon0 libasound2 libatspi2.0-0
 *
 * Run with the dev server up:
 *   npm run dev &
 *   node scripts/visual-smoke.mjs
 *
 * Environment:
 *   BASE  origin to test        (default http://127.0.0.1:5401)
 *   OUT   screenshot directory  (default ./qa-shots)
 *   EXEC  explicit browser binary (default: newest chromium headless shell
 *         under ~/.cache/ms-playwright)
 *
 * It asserts, for every route at four viewports: no horizontal overflow, no
 * element rendered outside the viewport (ignoring intentionally off-canvas
 * visually-hidden content), no console/page errors, a branded <title> and an
 * <h1>. It then exercises the theme switcher end-to-end (apply + persist +
 * reload) and writes screenshots.
 */
import { chromium } from 'playwright-core';
import { mkdirSync, readdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5401';
const OUT = process.env.OUT ?? './qa-shots';

function findBrowser() {
  if (process.env.EXEC) return process.env.EXEC;
  const root = join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(root)) {
    throw new Error('No Playwright browser found. Run: npx playwright install chromium');
  }
  const shells = readdirSync(root)
    .filter((name) => name.startsWith('chromium_headless_shell'))
    .sort()
    .reverse();
  for (const shell of shells) {
    const candidate = join(root, shell, 'chrome-linux', 'headless_shell');
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`No chromium headless shell under ${root}`);
}

const EXEC = findBrowser();
mkdirSync(OUT, { recursive: true });

const slugs = ['phishlens', 'netscope', 'threatintel-desk', 'incidentflow', 'hashsight', 'assetwatch', 'securecode-workbench', 'cyberaware-lab', 'transcriptwise'];
const routes = ['/', '/about', '/projects', ...slugs.map((s) => `/projects/${s}`), '/skills', '/approach', '/engineering', '/contact', '/this-route-does-not-exist'];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'small', width: 360, height: 740 },
];

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
const problems = [];

for (const vp of viewports) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

  for (const route of routes) {
    errors.length = 0;
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 15000 });
    // let reveal animations settle
    await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const vw = window.innerWidth;
      const overflowers = [];
      for (const el of doc.querySelectorAll('body *')) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        if (rect.right > vw + 1 || rect.left < -1) {
          const self = getComputedStyle(el);
          // Skip intentionally off-canvas visually-hidden content (honeypot,
          // sr-only): it is clipped by an ancestor and cannot cause scrolling.
          if (self.position === 'absolute' && (parseFloat(self.width) <= 1 || rect.left < -500)) continue;
          // ignore elements inside a horizontally scrollable ancestor (tables etc.)
          let node = el.parentElement;
          let scrollable = false;
          while (node && node !== doc.body) {
            const style = getComputedStyle(node);
            if (/auto|scroll|hidden|clip/.test(style.overflowX)) { scrollable = true; break; }
            node = node.parentElement;
          }
          if (scrollable) continue;
          overflowers.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.getAttribute('class') ?? '').slice(0, 90),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            text: (el.textContent ?? '').trim().slice(0, 40),
          });
        }
      }
      return {
        title: document.title,
        scrollWidth: doc.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        vw,
        h1: document.querySelector('h1')?.textContent?.trim().slice(0, 70) ?? '',
        themeMode: doc.getAttribute('data-theme-mode'),
        theme: doc.getAttribute('data-theme'),
        overflowers: overflowers.slice(0, 6),
        overflowCount: overflowers.length,
      };
    });

    const bad = [];
    if (metrics.scrollWidth > metrics.vw + 1) bad.push(`documentElement scrollWidth ${metrics.scrollWidth} > viewport ${metrics.vw}`);
    if (metrics.overflowCount > 0) bad.push(`${metrics.overflowCount} element(s) outside the viewport: ${JSON.stringify(metrics.overflowers.slice(0, 2))}`);
    if (errors.length) bad.push(`console: ${errors.slice(0, 3).join(' | ')}`);
    if (!metrics.title.includes('Mwangala')) bad.push(`title missing brand: ${metrics.title}`);
    if (!metrics.h1) bad.push('no h1 rendered');

    if (bad.length) {
      problems.push(`[${vp.name} ${vp.width}px] ${route} :: ${bad.join(' ; ')}`);
      console.log('      ^ ' + bad.join(' ; ').slice(0, 400));
    }
    console.log(`${bad.length ? 'FAIL' : 'ok  '} ${vp.name.padEnd(7)} ${route.padEnd(34)} sw=${metrics.scrollWidth}/${metrics.vw} h1="${metrics.h1}"`);
  }
  await context.close();
}

/* ------------------------------------------------------- theme + screenshots */
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForSelector('h1');

const shot = async (name, opts = {}) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, ...opts });
  console.log(`shot ${name}.png`);
};

await shot('01-home-hybrid', { fullPage: true });

// switch to dark through the real UI control
const themeButton = page.locator('button[aria-haspopup="menu"]').first();
await themeButton.click();
await page.getByRole('menuitemradio', { name: /^Dark/i }).click();
await page.waitForTimeout(300);
const darkAttrs = await page.evaluate(() => ({
  mode: document.documentElement.getAttribute('data-theme-mode'),
  theme: document.documentElement.getAttribute('data-theme'),
  stored: localStorage.getItem('mw-theme'),
}));
console.log('after selecting Dark:', JSON.stringify(darkAttrs));
if (darkAttrs.theme !== 'dark' || darkAttrs.stored !== 'dark') problems.push(`theme switch to dark failed: ${JSON.stringify(darkAttrs)}`);
await shot('02-home-dark', { fullPage: true });
await page.goto(`${BASE}/projects/netscope`, { waitUntil: 'networkidle' });
await page.waitForSelector('h1');
await shot('03-case-study-dark', { fullPage: true });

// back to light
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForSelector('h1');
await page.locator('button[aria-haspopup="menu"]').first().click();
await page.getByRole('menuitemradio', { name: /^Light/i }).click();
await page.waitForTimeout(300);
const lightAttrs = await page.evaluate(() => ({
  theme: document.documentElement.getAttribute('data-theme'),
  stored: localStorage.getItem('mw-theme'),
}));
console.log('after selecting Light:', JSON.stringify(lightAttrs));
if (lightAttrs.theme !== 'light' || lightAttrs.stored !== 'light') problems.push(`theme switch to light failed: ${JSON.stringify(lightAttrs)}`);
await shot('04-home-light', { fullPage: true });

// persistence across a reload
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('h1');
const persisted = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
console.log('after reload, data-theme =', persisted);
if (persisted !== 'light') problems.push(`theme did not persist across reload: ${persisted}`);

// restore hybrid for the remaining shots
await page.evaluate(() => localStorage.setItem('mw-theme', 'hybrid'));
await page.goto(`${BASE}/projects`, { waitUntil: 'networkidle' });
await page.waitForSelector('h1');
await shot('05-projects-directory', { fullPage: true });

await page.goto(`${BASE}/projects?filter=network-analysis&q=pcap`, { waitUntil: 'networkidle' });
await page.waitForSelector('h1');
await page.waitForTimeout(300);
await shot('06-projects-filtered', { fullPage: false });

await page.goto(`${BASE}/projects/zzz-nothing`, { waitUntil: 'networkidle' });
await page.waitForSelector('h1');
await shot('07-404', { fullPage: true });

for (const [name, route] of [['08-skills', '/skills'], ['09-about', '/about'], ['10-approach', '/approach'], ['11-contact', '/contact'], ['12-case-study-phishlens', '/projects/phishlens'], ['13-case-study-transcriptwise', '/projects/transcriptwise']]) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('h1');
  await page.waitForTimeout(350);
  await shot(name, { fullPage: true });
}

/* ------------------------------------------------------------- mobile shots */
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const mpage = await mctx.newPage();
await mpage.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await mpage.waitForSelector('h1');
await mpage.waitForTimeout(300);
await mpage.screenshot({ path: `${OUT}/14-mobile-home.png`, fullPage: true });
console.log('shot 14-mobile-home.png');

const navToggle = mpage.getByRole('button', { name: /menu|navigation/i }).first();
if (await navToggle.count()) {
  await navToggle.click();
  await mpage.waitForTimeout(300);
  await mpage.screenshot({ path: `${OUT}/15-mobile-nav.png` });
  console.log('shot 15-mobile-nav.png');
  await mpage.keyboard.press('Escape');
  await mpage.waitForTimeout(200);
  const openAfterEscape = await mpage.evaluate(() => document.body.style.overflow);
  console.log('body overflow after Escape:', JSON.stringify(openAfterEscape));
}

await mpage.goto(`${BASE}/projects/transcriptwise`, { waitUntil: 'networkidle' });
await mpage.waitForSelector('h1');
await mpage.waitForTimeout(300);
await mpage.screenshot({ path: `${OUT}/16-mobile-case-study.png`, fullPage: true });
console.log('shot 16-mobile-case-study.png');

await browser.close();

console.log('\n================ RESULT ================');
if (problems.length === 0) {
  console.log('No layout, console or theme problems detected.');
} else {
  console.log(`${problems.length} problem(s):`);
  for (const p of problems) console.log(' - ' + p);
}
