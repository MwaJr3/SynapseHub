/* global document, window, getComputedStyle -- the evaluate() callbacks run inside the page, not in Node */
/**
 * Runtime probe — what a real browser can tell you that source cannot.
 *
 * `northstar page <url|file>` opens the page in headless Chromium at a few viewport
 * widths and MEASURES it: horizontal overflow, target sizes, accessible names, image
 * alt text, heading structure, document basics and whether keyboard focus is visibly
 * indicated. Every finding carries the numbers that produced it and is labelled
 * `measured`, so it can be told apart from the source-level findings.
 *
 * What it will not do, by construction:
 *   - It never clicks, types into, or submits anything. It presses Tab and reads.
 *   - It never claims a check it did not run: `limits` in the result lists what a
 *     measurement pass cannot establish (screen-reader output, contrast, real
 *     devices, hover/gesture behaviour, anything behind a login).
 *   - It never installs anything. Playwright is optional; when it is missing the
 *     probe says so and returns no evidence rather than pretending.
 *   - It only opens http(s) URLs and local files. The page's own scripts do run —
 *     that is what loading a page means — so only point it at pages you would open.
 *
 * `interpretProbe` is a pure function over the raw measurements, so the judgement
 * logic is tested without a browser; `probePage` is the thin browser layer.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export const DEFAULT_VIEWPORTS = [320, 768, 1280];
const MAX_TABS = 30;

export const LIMITS = [
  'Screen-reader output was not heard; accessible names are approximated from the DOM.',
  'Colour contrast was not sampled from rendered pixels.',
  'Nothing was clicked, hovered, typed into or submitted, so interactive states, validation and error paths are unseen.',
  'Only the loaded state was measured: loading, empty and error states need their own pass.',
  'A desktop Chromium at the stated widths is not a real phone; touch behaviour and virtual keyboards are unmeasured.',
  'Pages behind a login were not reached.',
];

/** Playwright is optional; return null rather than throw when it is absent. */
export function loadPlaywright() {
  try {
    return createRequire(import.meta.url)('playwright');
  } catch {
    return null;
  }
}

/** Turn what the user typed into a URL the browser may open, or throw. */
export function resolveTarget(target) {
  if (/^https?:\/\//i.test(target)) return target;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) && !/^file:/i.test(target) && !/^[a-z]:[\\/]/i.test(target)) {
    throw new Error(`Refusing to open "${target.split(':')[0]}:" — only http(s) URLs and local files can be probed.`);
  }
  const absolute = target.startsWith('file:') ? target : path.resolve(target);
  if (!target.startsWith('file:') && !fs.existsSync(absolute)) throw new Error(`No such file: ${target}`);
  return target.startsWith('file:') ? target : pathToFileURL(absolute).href;
}

/**
 * Runs inside the page. Must be self-contained: it is serialised and evaluated in
 * the browser, so it cannot close over anything from this module.
 */
export function measureInPage() {
  const visible = (el) => {
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const describe = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const name = el.getAttribute('name') ? `[name=${el.getAttribute('name')}]` : '';
    const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/)[0]}` : '';
    return `${el.tagName.toLowerCase()}${id}${name}${cls}`;
  };
  const textOf = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const accessibleName = (el) => {
    const label = el.getAttribute('aria-label');
    if (label && label.trim()) return label.trim();
    const by = el.getAttribute('aria-labelledby');
    if (by) {
      const joined = by
        .split(/\s+/)
        .map((id) => (document.getElementById(id)?.textContent || '').trim())
        .join(' ')
        .trim();
      if (joined) return joined;
    }
    if (el.labels && el.labels.length) {
      const joined = [...el.labels].map((l) => textOf(l)).join(' ').trim();
      if (joined) return joined;
    }
    const own = textOf(el);
    if (own) return own;
    const img = el.querySelector('img[alt]');
    if (img && img.getAttribute('alt').trim()) return img.getAttribute('alt').trim();
    const title = el.getAttribute('title');
    return title && title.trim() ? title.trim() : '';
  };

  const doc = document.documentElement;
  const viewportWidth = window.innerWidth;
  const offenders = [];
  for (const el of document.body ? document.body.querySelectorAll('*') : []) {
    if (!visible(el)) continue;
    if (getComputedStyle(el).position === 'fixed') continue;
    const box = el.getBoundingClientRect();
    if (box.right > viewportWidth + 1) offenders.push({ el: describe(el), right: Math.round(box.right) });
  }

  const targets = [];
  for (const el of document.querySelectorAll(
    'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link], [tabindex]:not([tabindex="-1"])',
  )) {
    if (!visible(el)) continue;
    // WCAG 2.5.8 exempts a link inside a sentence; judge standalone controls only.
    if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') continue;
    const box = el.getBoundingClientRect();
    if (box.width < 24 || box.height < 24) {
      targets.push({ el: describe(el), width: Math.round(box.width), height: Math.round(box.height) });
    }
  }

  const unnamed = [];
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]), select, textarea, button, a[href], [role=button]')) {
    if (!visible(el)) continue;
    if (!accessibleName(el)) unnamed.push({ el: describe(el) });
  }

  const noAlt = [];
  for (const img of document.querySelectorAll('img')) {
    if (!visible(img)) continue;
    if (!img.hasAttribute('alt')) noAlt.push({ el: describe(img), src: (img.getAttribute('src') || '').slice(0, 80) });
  }

  const levels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map((h) => Number(h.tagName[1]));
  const skips = [];
  for (let i = 1; i < levels.length; i += 1) if (levels[i] - levels[i - 1] > 1) skips.push(`h${levels[i - 1]}→h${levels[i]}`);

  return {
    viewportWidth,
    scrollWidth: doc.scrollWidth,
    overflowing: doc.scrollWidth > viewportWidth + 1,
    offenders: offenders.slice(0, 5),
    smallTargets: targets.slice(0, 10),
    smallTargetCount: targets.length,
    unnamed: unnamed.slice(0, 10),
    unnamedCount: unnamed.length,
    imagesWithoutAlt: noAlt.slice(0, 10),
    imagesWithoutAltCount: noAlt.length,
    h1Count: levels.filter((level) => level === 1).length,
    headingSkips: skips,
    lang: (doc.getAttribute('lang') || '').trim(),
    title: (document.title || '').trim(),
    hasViewportMeta: Boolean(document.querySelector('meta[name="viewport"]')),
    positiveTabindex: [...document.querySelectorAll('[tabindex]')].filter((el) => Number(el.getAttribute('tabindex')) > 0).length,
  };
}

/**
 * Runs inside the page. Snapshots the look of every focusable element, so that after
 * a Tab press the focused element can be compared with how it looked unfocused.
 */
export function snapshotFocusables() {
  const looks = (el) => {
    const s = getComputedStyle(el);
    return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderColor, s.backgroundColor, s.color, s.textDecorationLine].join('|');
  };
  window.__nsLooks = new Map();
  const list = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"]), [role=button]')];
  list.forEach((el, index) => {
    el.setAttribute('data-ns-index', String(index));
    window.__nsLooks.set(index, looks(el));
  });
  return list.length;
}

/** Runs inside the page after a Tab press. */
export function inspectFocused() {
  const el = document.activeElement;
  if (!el || el === document.body || !el.hasAttribute('data-ns-index')) return null;
  const s = getComputedStyle(el);
  const now = [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderColor, s.backgroundColor, s.color, s.textDecorationLine].join('|');
  const before = window.__nsLooks.get(Number(el.getAttribute('data-ns-index')));
  const ringDrawn = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
  const tag = el.tagName.toLowerCase();
  const name = el.id ? `${tag}#${el.id}` : el.getAttribute('name') ? `${tag}[name=${el.getAttribute('name')}]` : tag;
  return { index: Number(el.getAttribute('data-ns-index')), el: name, indicated: ringDrawn || now !== before };
}

const finding = (id, severity, pattern, title, evidence, extra = {}) => ({
  id, severity, confidence: extra.confidence ?? 'high', pattern, title, evidence, source: 'measured', ...extra,
});

/** Pure: raw measurements in, findings out. */
export function interpretProbe(raw, focus = { checked: 0, unindicated: [] }) {
  const out = [];
  if (raw.overflowing) {
    out.push(finding('runtime-horizontal-overflow', 'P2', 'X09', `Page scrolls sideways at ${raw.viewportWidth}px`, [
      `document is ${raw.scrollWidth}px wide in a ${raw.viewportWidth}px viewport`,
      ...raw.offenders.map((o) => `${o.el} extends to x=${o.right}px`),
    ]));
  }
  if (raw.smallTargetCount > 0) {
    out.push(finding('runtime-small-target', 'P3', 'X03', `${raw.smallTargetCount} control(s) smaller than 24×24 CSS px`, raw.smallTargets.map((t) => `${t.el} measures ${t.width}×${t.height}px`), { confidence: 'medium' }));
  }
  if (raw.unnamedCount > 0) {
    out.push(finding('runtime-unnamed-control', 'P1', 'X05', `${raw.unnamedCount} control(s) with no accessible name`, raw.unnamed.map((u) => `${u.el} has no label, aria-label, text or title`)));
  }
  if (raw.imagesWithoutAltCount > 0) {
    out.push(finding('runtime-image-without-alt', 'P1', 'X01', `${raw.imagesWithoutAltCount} image(s) with no alt attribute`, raw.imagesWithoutAlt.map((i) => `${i.el} src=${i.src}`)));
  }
  if (focus.unindicated.length > 0) {
    out.push(finding('runtime-no-focus-indicator', 'P1', 'P46', `${focus.unindicated.length} focusable element(s) show no visible change when focused`, [
      `${focus.checked} elements reached with Tab`,
      ...focus.unindicated.slice(0, 5).map((el) => `${el} has the same outline, shadow, border, background, colour and underline focused and unfocused`),
    ], { confidence: 'medium' }));
  }
  if (raw.positiveTabindex > 0) {
    out.push(finding('runtime-positive-tabindex', 'P2', 'P46', `${raw.positiveTabindex} element(s) with a positive tabindex`, [`${raw.positiveTabindex} elements have tabindex above 0`]));
  }
  const heading = [];
  if (raw.h1Count === 0) heading.push('no visible h1');
  if (raw.h1Count > 1) heading.push(`${raw.h1Count} visible h1 elements`);
  if (raw.headingSkips.length) heading.push(`skipped levels: ${raw.headingSkips.join(', ')}`);
  if (heading.length) out.push(finding('runtime-heading-structure', 'P3', 'X12', 'Heading structure has gaps', heading));
  const basics = [];
  if (!raw.lang) basics.push('<html> has no lang attribute');
  if (!raw.title) basics.push('document has no <title>');
  if (basics.length) out.push(finding('runtime-document-basics', 'P2', 'X12', 'Document is missing language or title', basics));
  if (!raw.hasViewportMeta) {
    out.push(finding('runtime-no-viewport-meta', 'P2', 'X09', 'No viewport meta tag', ['phones will lay the page out at desktop width and scale it down']));
  }
  return out;
}

/**
 * Open the target at each width and measure it.
 * @returns {Promise<{ target:string, available:boolean, viewports:object[], limits:string[], reason?:string }>}
 */
export async function probePage(target, options = {}) {
  const url = resolveTarget(target);
  const playwright = options.playwright ?? loadPlaywright();
  if (!playwright) {
    return {
      target, url, available: false, viewports: [], limits: LIMITS,
      reason:
        'Playwright is not installed, so the page was not opened and nothing was measured. Install it in your project (`npm i -D playwright && npx playwright install chromium`) or use the browser tools in your Claude session; the source-level audit still works without it.',
    };
  }
  const widths = options.viewports ?? DEFAULT_VIEWPORTS;
  let browser;
  try {
    browser = await playwright.chromium.launch();
  } catch (error) {
    // Playwright can be installed without its browser binary. That is "cannot measure",
    // not a crash, and not a reason to guess.
    return {
      target, url, available: false, viewports: [], limits: LIMITS,
      reason: `Playwright is installed but Chromium could not start (${String(error.message).split('\n')[0]}). Run \`npx playwright install chromium\`, then run this again.`,
    };
  }
  const viewports = [];
  try {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 800 } });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      const raw = await page.evaluate(measureInPage);
      // Keyboard pass: Tab through the page and read, never press Enter or Space.
      const total = await page.evaluate(snapshotFocusables);
      const seen = new Set();
      const unindicated = [];
      for (let press = 0; press < Math.min(MAX_TABS, total + 1); press += 1) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(inspectFocused);
        if (!focused || seen.has(focused.index)) break;
        seen.add(focused.index);
        if (!focused.indicated) unindicated.push(focused.el);
      }
      let screenshot = null;
      if (options.outDir) {
        fs.mkdirSync(options.outDir, { recursive: true });
        screenshot = path.join(options.outDir, `page-${width}.png`);
        await page.screenshot({ path: screenshot, fullPage: false });
      }
      viewports.push({ width, raw, focusChecked: seen.size, findings: interpretProbe(raw, { checked: seen.size, unindicated }), screenshot });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return { target, url, available: true, viewports, limits: LIMITS };
}

/** Markdown report. Findings repeated at several widths are merged and list the widths. */
export function renderProbeReport(result) {
  const lines = [`# Runtime probe — ${result.target}`, ''];
  if (!result.available) {
    lines.push(`**Not measured.** ${result.reason}`, '');
  } else {
    const merged = new Map();
    for (const viewport of result.viewports) {
      for (const f of viewport.findings) {
        const entry = merged.get(f.id) ?? { ...f, widths: [] };
        entry.widths.push(viewport.width);
        merged.set(f.id, entry);
      }
    }
    const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const all = [...merged.values()].sort((a, b) => order[a.severity] - order[b.severity]);
    lines.push(
      `Measured in headless Chromium at ${result.viewports.map((v) => `${v.width}px`).join(', ')}. ${all.length} defect(s), each with the numbers that produced it.`,
      '',
    );
    if (all.length === 0) lines.push('No defects were measured. That says nothing about what a measurement cannot see — see "Not measured".', '');
    for (const f of all) {
      lines.push(`### ${f.severity} · ${f.title}`, `\`${f.id}\` · pattern ${f.pattern} · confidence ${f.confidence} · measured at ${f.widths.map((w) => `${w}px`).join(', ')}`, '');
      for (const line of f.evidence) lines.push(`- ${line}`);
      lines.push('');
    }
    const shots = result.viewports.filter((v) => v.screenshot);
    if (shots.length) lines.push('## Screenshots', '', ...shots.map((v) => `- ${v.width}px: \`${v.screenshot}\``), '');
  }
  lines.push('## Not measured', '', ...result.limits.map((l) => `- ${l}`), '');
  return lines.join('\n');
}
