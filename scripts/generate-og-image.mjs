#!/usr/bin/env node
/**
 * Generates the Open Graph / social preview image.
 *
 * The card is drawn from the same design tokens as the website, so there is no
 * stock artwork and no image that could be mistaken for a screenshot of the
 * applications. Fonts are the self-hosted Inter and JetBrains Mono files
 * already used by the site.
 *
 *   npm run og:image      # writes public/og-image.png (1200×630)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const interPath = resolve(
  root,
  'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
);
const monoPath = resolve(
  root,
  'node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2',
);

const projectNames = [
  'LearnBridge',
  'ClassConnect',
  'TutorSpring',
  'PathWise',
  'TeachCraft',
  'OpenLearn Commons',
  'LearnPulse',
  'ReachLearn',
  'EduAccess',
];

const columns = [
  projectNames.slice(0, 3),
  projectNames.slice(3, 6),
  projectNames.slice(6, 9),
];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1020"/>
      <stop offset="60%" stop-color="#0a0e1a"/>
      <stop offset="100%" stop-color="#080b12"/>
    </linearGradient>
    <pattern id="grid" width="72" height="72" patternUnits="userSpaceOnUse">
      <path d="M72 0H0V72" fill="none" stroke="#1d2537" stroke-width="1"/>
    </pattern>
    <radialGradient id="glow" cx="18%" cy="8%" r="70%">
      <stop offset="0%" stop-color="#2448d6" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#2448d6" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#panel)"/>
  <rect width="1200" height="630" fill="url(#grid)" opacity="0.5"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <g transform="translate(72, 68)">
    <rect width="56" height="56" rx="14" fill="#131a2a" stroke="#2b3648"/>
    <text x="28" y="37" font-family="JetBrains Mono Variable, monospace" font-size="24" fill="#84a7ff" text-anchor="middle">M</text>
  </g>

  <text x="150" y="106" font-family="Inter Variable, sans-serif" font-size="26" font-weight="600" fill="#eef2fa">Mwangala</text>
  <text x="72" y="196" font-family="JetBrains Mono Variable, monospace" font-size="17" fill="#7f93b3" letter-spacing="2.6">
    PYTHON · SOFTWARE ENGINEERING · AI-POWERED LEARNING TOOLS
  </text>

  <text x="72" y="278" font-family="Inter Variable, sans-serif" font-size="52" font-weight="600" fill="#ffffff">
    Building better ways to learn.
  </text>
  <text x="72" y="344" font-family="Inter Variable, sans-serif" font-size="52" font-weight="600" fill="#7f9dff">
    Engineering tools that open access.
  </text>

  <text x="72" y="404" font-family="Inter Variable, sans-serif" font-size="20" fill="#a5b1c5">
    Nine education-technology projects: offline-first study, grounded AI tutoring,
  </text>
  <text x="72" y="434" font-family="Inter Variable, sans-serif" font-size="20" fill="#a5b1c5">
    assessment evidence, teacher workflows, open resources and low-connectivity delivery.
  </text>

  ${columns
    .map(
      (column, columnIndex) => `
  <g transform="translate(${72 + columnIndex * 356}, 512)">
    ${column
      .map(
        (name, index) =>
          `<text y="${index * 28}" font-family="JetBrains Mono Variable, monospace" font-size="16" fill="#8794aa">${name}</text>`,
      )
      .join('\n    ')}
  </g>`,
    )
    .join('')}

  <rect x="0" y="622" width="1200" height="8" fill="#2448d6"/>
</svg>
`;

const outPath = resolve(root, 'public/og-image.png');
mkdirSync(dirname(outPath), { recursive: true });

try {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: {
      fontFiles: [interPath, monoPath].filter((file) => {
        try {
          readFileSync(file);
          return true;
        } catch {
          return false;
        }
      }),
      loadSystemFonts: true,
      defaultFontFamily: 'Inter Variable',
    },
    background: '#080b12',
  });

  writeFileSync(outPath, resvg.render().asPng());
  console.log(`[og] Wrote ${outPath}`);
} catch (error) {
  console.error('[og] Could not render the social image:', error.message);
  process.exitCode = 1;
}
