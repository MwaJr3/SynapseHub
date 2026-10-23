#!/usr/bin/env node
/** Draw the portfolio's original editorial social card (not a project screenshot). */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M56 0H0V56" fill="none" stroke="#50645a" stroke-opacity=".25"/></pattern><radialGradient id="soft"><stop stop-color="#405a46" stop-opacity=".72"/><stop offset="1" stop-color="#15221c" stop-opacity="0"/></radialGradient></defs>
<rect width="1200" height="630" fill="#15221c"/><rect width="1200" height="630" fill="url(#grid)"/><ellipse cx="950" cy="100" rx="430" ry="360" fill="url(#soft)"/>
<rect x="76" y="68" width="54" height="54" rx="13" fill="#223129" stroke="#657569"/><text x="103" y="104" fill="#c7dcaf" text-anchor="middle" font-family="monospace" font-size="27">M</text>
<text x="150" y="104" fill="#f2f1e9" font-family="Inter, sans-serif" font-size="25" font-weight="600">Mwangala</text>
<text x="76" y="186" fill="#bdc9c0" font-family="monospace" font-size="14" letter-spacing="2">FRONTEND DEVELOPER · UI ENGINEERING</text>
<text x="76" y="285" fill="#f5f3ed" font-family="Inter, sans-serif" font-size="56" font-weight="600" letter-spacing="-2">Designing Interfaces.</text>
<text x="76" y="355" fill="#bfd5a3" font-family="Inter, sans-serif" font-size="56" font-weight="600" letter-spacing="-2">Building Experiences.</text>
<text x="76" y="425" fill="#f5f3ed" font-family="Inter, sans-serif" font-size="56" font-weight="600" letter-spacing="-2">Shipping the Details.</text>
<rect x="76" y="486" width="1" height="72" fill="#657569"/><text x="100" y="514" fill="#c2cbc2" font-family="Inter, sans-serif" font-size="20">60 independent challenge implementations</text><text x="100" y="544" fill="#aab8af" font-family="Inter, sans-serif" font-size="15">Responsive interfaces · interactive applications · thoughtful details</text>
<text x="1125" y="573" fill="#aab8af" text-anchor="end" font-family="monospace" font-size="11" letter-spacing="1">INDEPENDENT WORK · FRONTEND MENTOR INSPIRED</text></svg>`;
const fontFiles = [
  resolve(root, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
  resolve(root, 'node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2'),
].filter((file) => { try { readFileSync(file); return true; } catch { return false; } });
try {
  const renderer = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { fontFiles, loadSystemFonts: true, defaultFontFamily: 'Inter' }, background: '#15221c' });
  writeFileSync(resolve(root, 'public/og-image.png'), renderer.render().asPng());
  console.log('[og] Wrote public/og-image.png (1200 × 630)');
} catch (error) {
  console.error('[og] Could not render the social image:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
