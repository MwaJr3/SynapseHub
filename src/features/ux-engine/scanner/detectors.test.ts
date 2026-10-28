// Detectors are pure string analysis; the default jsdom environment keeps the
// shared test setup working while Node's fs remains available to the walker.
import { describe, expect, it } from 'vitest';
import { DETECTORS } from './detectors';
import { resetScanIds } from './builder';
import type { DetectorContext, ScanFinding } from './types';

function scan(
  source: string,
  filePath = 'src/sample/Sample.tsx',
): ScanFinding[] {
  resetScanIds();
  const context: DetectorContext = {
    filePath,
    source,
    lines: source.split('\n'),
  };
  return DETECTORS.flatMap((detector) => detector(context));
}

function ruleIds(findings: ScanFinding[]): string[] {
  return findings.map((finding) => finding.ruleId);
}

describe('static UX scanner', () => {
  it('flags outline removal without a focus replacement', () => {
    const bad = scan(`.field input {\n  outline: none;\n}`);
    expect(ruleIds(bad)).toContain('A11Y-FOCUS-01');

    const good = scan(
      `.field input {\n  @apply outline-none focus:ring-2 focus:ring-accent;\n}`,
    );
    expect(ruleIds(good)).not.toContain('A11Y-FOCUS-01');
  });

  it('measures interactive touch targets against 44px', () => {
    const small = scan(`<button className="h-8 w-8 btn-ghost" onClick={go} />`);
    expect(ruleIds(small)).toContain('A11Y-TARGET-01');

    const fine = scan(
      `<button className="size-11 btn-primary" onClick={go}>Go</button>`,
    );
    expect(ruleIds(fine)).not.toContain('A11Y-TARGET-01');

    const css = scan(
      `.btn {\n  min-height: 32px;\n  padding: 6px 12px;\n}`,
      'src/sample/styles.css',
    );
    expect(ruleIds(css)).toContain('A11Y-TARGET-01');
  });

  it('exempts native accent-colour radios/checkboxes whose label is the target', () => {
    const nativeRadio = scan(
      [
        '.radio-card { min-height: 44px; }',
        '.radio-card input { width: 19px; height: 19px; accent-color: var(--cyan); }',
      ].join('\n'),
      'src/sample/styles.css',
    );
    expect(ruleIds(nativeRadio)).not.toContain('A11Y-TARGET-01');
  });

  it('requires labelled inputs while accepting wrapping labels and htmlFor', () => {
    const bare = scan(`<input className="input" type="email" value={email} />`);
    expect(ruleIds(bare)).toContain('FORM-LABEL-01');

    const wrapped = scan(
      [
        `<label className="block">`,
        `  <span>Email</span>`,
        `  <input type="email" />`,
        `</label>`,
      ].join('\n'),
    );
    expect(ruleIds(wrapped)).not.toContain('FORM-LABEL-01');

    const associated = scan(
      [
        `<label htmlFor="email">Email</label>`,
        `<input id="email" type="email" />`,
      ].join('\n'),
    );
    expect(ruleIds(associated)).not.toContain('FORM-LABEL-01');

    const aria = scan(`<input aria-label="Search query" type="search" />`);
    expect(ruleIds(aria)).not.toContain('FORM-LABEL-01');
  });

  it('reads attributes on multiline tags and tracks wrapping labels across spans', () => {
    const multilineAria = scan(
      [
        '<input',
        '  type="text"',
        '  value={value}',
        '  onChange={(event) => onChange(event.target.value)}',
        '  aria-label={`${label} hex value`}',
        '/>',
      ].join('\n'),
    );
    expect(ruleIds(multilineAria)).not.toContain('FORM-LABEL-01');

    const multilineLabel = scan(
      [
        '<label htmlFor="pattern-search">Search</label>',
        '<input',
        '  id="pattern-search"',
        '  type="search"',
        '  onChange={(event) => setQuery(event.target.value)}',
        '/>',
      ].join('\n'),
    );
    expect(ruleIds(multilineLabel)).not.toContain('FORM-LABEL-01');

    const hiddenFileInput = scan(
      `<input ref={inputRef} type="file" className="sr-only" onChange={importSystem} />`,
    );
    expect(ruleIds(hiddenFileInput)).not.toContain('FORM-LABEL-01');
  });

  it('recognises htmlFor/id associations built from template literals', () => {
    const dynamic = scan(
      [
        '{FILTER_DEFS.map((filter) => (',
        '  <div key={filter.key}>',
        '    <label htmlFor={`filter-${filter.key}`}>{filter.label}</label>',
        '    <select id={`filter-${filter.key}`} value={value} onChange={handle}>',
        '      <option value="">Any</option>',
        '    </select>',
        '  </div>',
        '))}',
      ].join('\n'),
    );
    expect(ruleIds(dynamic)).not.toContain('FORM-LABEL-01');

    const mismatched = scan(
      [
        '<label htmlFor={`note-${id}`}>Note</label>',
        '<textarea id={`other-${id}`} />',
      ].join('\n'),
    );
    expect(ruleIds(mismatched)).toContain('FORM-LABEL-01');

    const variableIds = scan(
      [
        'const inputId = useId();',
        '<label htmlFor={inputId} className="sr-only">Feed URL</label>',
        '<input id={inputId} type="url" value={url} onChange={handle} />',
      ].join('\n'),
    );
    expect(ruleIds(variableIds)).not.toContain('FORM-LABEL-01');
  });

  it('flags nameless icon-only buttons but passes labelled ones', () => {
    const iconOnly = scan(
      `<button type="button" onClick={close}>\n  <XIcon />\n</button>`,
    );
    expect(ruleIds(iconOnly)).toContain('A11Y-NAME-01');

    const labelled = scan(
      `<button type="button" aria-label="Close dialog" onClick={close}><XIcon /></button>`,
    );
    expect(ruleIds(labelled)).not.toContain('A11Y-NAME-01');

    const expressionLabel = scan(
      [
        '<button',
        '  type="button"',
        '  onClick={() => setOpen((value) => !value)}',
        '  className="chip"',
        '>',
        '  <Icon />',
        '  {label}',
        '</button>',
      ].join('\n'),
    );
    expect(ruleIds(expressionLabel)).not.toContain('A11Y-NAME-01');

    const ternaryLabel = scan(
      `<button onClick={onCopy}>{status === 'copied' ? 'Copied' : 'Copy'}</button>`,
    );
    expect(ruleIds(ternaryLabel)).not.toContain('A11Y-NAME-01');
  });

  it('rejects z-index escalation past the named layers', () => {
    const escalated = scan(`<div className="z-[9999] fixed inset-0" />`);
    expect(ruleIds(escalated)).toContain('TOKEN-ELEVATION-01');

    const named = scan(`<div className="z-40 fixed inset-0" />`);
    expect(ruleIds(named)).not.toContain('TOKEN-ELEVATION-01');
  });

  it('enforces the 4px spacing scale on literal values', () => {
    const offScale = scan(`<div className="p-[13px] m-[7px]" />`);
    expect(ruleIds(offScale)).toContain('TOKEN-SPACING-01');

    const onScale = scan(`<div className="p-4 gap-3" />`);
    expect(ruleIds(onScale)).not.toContain('TOKEN-SPACING-01');
  });

  it('keeps motion inside the 100–500ms vocabulary', () => {
    const tooSlow = scan(`<div className="duration-[700ms]" />`);
    expect(ruleIds(tooSlow)).toContain('MOTION-DURATION-01');

    const fine = scan(`<div className="duration-200" />`);
    expect(ruleIds(fine)).not.toContain('MOTION-DURATION-01');
  });

  it('requires a reduced-motion fallback in animated stylesheets', () => {
    const animated = scan(
      `.card { transition: transform 200ms ease-out; }\n@keyframes fade { to { opacity: 1; } }`,
      'src/sample/styles.css',
    );
    expect(ruleIds(animated)).toContain('MOTION-REDUCED-01');

    const safe = scan(
      [
        '.card { transition: transform 200ms ease-out; }',
        '@media (prefers-reduced-motion: reduce) { .card { transition: none; } }',
      ].join('\n'),
      'src/sample/styles.css',
    );
    expect(ruleIds(safe)).not.toContain('MOTION-REDUCED-01');
  });

  it('measures hardcoded color pairs with the WCAG engine', () => {
    const failing = scan(
      `<span style={{ color: '#9fb0d8', backgroundColor: '#f4f7ff' }}>faint</span>`,
    );
    expect(ruleIds(failing)).toContain('A11Y-CONTRAST-01');

    const passing = scan(
      `<span style={{ color: '#ffffff', backgroundColor: '#2547d6' }}>clear</span>`,
    );
    expect(ruleIds(passing)).not.toContain('A11Y-CONTRAST-01');
  });

  it('pairs colors only within the same CSS rule, never across minified rules', () => {
    const css = scan(
      [
        '.hero{background:#101a21;color:#f5f3ed}',
        '.muted{background:#eef0e7;color:#23342b}',
        ':root{--ink:#101a21;--paper:#f5f3ed}',
      ].join('\n'),
      'src/sample/styles.css',
    );
    // Both rendered pairs pass; :root tokens must never be treated as a pair.
    expect(ruleIds(css)).not.toContain('A11Y-CONTRAST-01');

    const badCss = scan(
      '.faint{color:#9fb0d8;background:#f4f7ff}',
      'src/sample/styles.css',
    );
    expect(ruleIds(badCss)).toContain('A11Y-CONTRAST-01');
  });

  it('never mistakes border hairlines or sub-4px optical values for spacing tokens', () => {
    const hairline = scan(
      '.card { border-top: 1px solid var(--line); }',
      'src/sample/styles.css',
    );
    expect(ruleIds(hairline)).not.toContain('TOKEN-SPACING-01');

    const optical = scan(
      '.sr-only { width: 1px; height: 1px; margin: -1px; } .nav { gap: 2px; padding: 2px; }',
      'src/sample/styles.css',
    );
    expect(ruleIds(optical)).not.toContain('TOKEN-SPACING-01');

    const offScalePadding = scan(
      '.card { padding: 13px 16px; }',
      'src/sample/styles.css',
    );
    const spacing = offScalePadding.find(
      (finding) => finding.ruleId === 'TOKEN-SPACING-01',
    );
    expect(spacing?.evidence).toContain('13px');
    expect(spacing?.evidence).not.toContain('16px');
  });

  it('treats a global :focus-visible rule as coverage for outline resets', () => {
    const covered = scan(
      [
        ':focus-visible { outline: 2px solid var(--accent); }',
        '.palette input { outline: 0; }',
      ].join('\n'),
      'src/sample/styles.css',
    );
    expect(ruleIds(covered)).not.toContain('A11Y-FOCUS-01');

    const uncovered = scan(
      '.palette input { outline: 0; }',
      'src/sample/styles.css',
    );
    expect(ruleIds(uncovered)).toContain('A11Y-FOCUS-01');
  });

  it('requires alt on images while accepting the decorative alt="" form', () => {
    const missing = scan(`<img src="/chart.png" />`);
    expect(ruleIds(missing)).toContain('A11Y-NAME-01');

    const decorative = scan(`<img src="/divider.png" alt="" />`);
    const described = scan(
      `<img src="/team.png" alt="The founding team in 2019" />`,
    );
    expect(ruleIds(decorative)).not.toContain('A11Y-NAME-01');
    expect(ruleIds(described)).not.toContain('A11Y-NAME-01');
  });

  it('flags autoFocus as focus-stealing on mount', () => {
    const stolen = scan(
      `<input autoFocus aria-label="Search" type="search" />`,
    );
    expect(ruleIds(stolen)).toContain('A11Y-KEYBOARD-01');

    const deliberate = scan(
      `<input ref={fieldRef} aria-label="Search" type="search" />`,
    );
    expect(ruleIds(deliberate)).not.toContain('A11Y-KEYBOARD-01');
  });

  it('never parses JSX mentioned in comments as real tags', () => {
    const commented = scan(
      [
        '/** Attaches the fallback without an <img> tag in JSX. */',
        '// <img src="/legacy.png" />',
        'function Image() { return <img src="/real.png" alt="Real" />; }',
        '{/* <button>commented control</button> */}',
      ].join('\n'),
    );
    expect(ruleIds(commented)).not.toContain('A11Y-NAME-01');
    expect(commented).toEqual([]);
  });

  it('keeps line numbers stable when comments sit before real tags', () => {
    const source = [
      '/* line one',
      '   line two <img src="/x.png" /> */',
      '',
      '<img src="/y.png" />',
    ].join('\n');
    const findings = scan(source);
    const missingAlt = findings.find(
      (finding) => finding.ruleId === 'A11Y-NAME-01',
    );
    expect(missingAlt?.line).toBe(4);
  });

  it('treats hover-only handlers as low-confidence findings', () => {
    const hoverOnly = scan(`<div onMouseEnter={reveal}>Menu</div>`);
    const finding = hoverOnly.find((item) => item.ruleId === 'RESP-HOVER-01');
    expect(finding?.confidence).toBe('low');

    const withClick = scan(
      `<div role="button" onClick={open} onMouseEnter={reveal}>Menu</div>`,
    );
    expect(ruleIds(withClick)).not.toContain('RESP-HOVER-01');
  });

  it('stays quiet on a fully compliant component', () => {
    const clean = scan(
      [
        '<label className="block">',
        '  Email',
        '  <input',
        '    id="email"',
        '    type="email"',
        '    className="size-11 outline-none focus:ring-2 focus:ring-accent duration-200 p-4"',
        '  />',
        '</label>',
        '<button type="button" aria-label="Submit form" className="size-12 duration-150">',
        '  <img src="/go.svg" alt="Submit" />',
        '</button>',
      ].join('\n'),
    );
    expect(clean).toEqual([]);
  });

  it('every scanned finding keeps the full traceability chain', () => {
    const findings = scan(`<button className="h-6 w-6" />`);
    for (const finding of findings) {
      expect(finding.patternIds.length).toBeGreaterThan(0);
      expect(finding.remediation.length).toBeGreaterThan(10);
      expect(finding.filePath).toContain('sample');
      expect(finding.line).toBeGreaterThan(0);
      expect(finding.snippet.length).toBeGreaterThan(0);
    }
  });

  it('resolves hex custom properties when measuring contrast', () => {
    const failing = scan(
      [
        ':root { --accent: #f0a566; --on-accent: #ffffff; }',
        '.btn { background: var(--accent); color: var(--on-accent); }',
      ].join('\n'),
      'src/sample/styles.css',
    );
    const contrast = failing.find(
      (finding) => finding.ruleId === 'A11Y-CONTRAST-01',
    );
    expect(contrast?.evidence).toContain('2.04:1');

    const passing = scan(
      [
        ':root { --accent: #3b6fd4; --on-accent: #ffffff; }',
        '.btn { background-color: var(--accent); color: var(--on-accent); }',
      ].join('\n'),
      'src/sample/styles.css',
    );
    expect(ruleIds(passing)).not.toContain('A11Y-CONTRAST-01');
  });

  it('resolves channel-triplet variables through rgb(var(--token))', () => {
    const failing = scan(
      [
        ':root { --muted: 200 200 200; --surface: 255 255 255; }',
        '.note { color: rgb(var(--muted)); background: rgb(var(--surface)); }',
      ].join('\n'),
      'src/sample/styles.css',
    );
    expect(ruleIds(failing)).toContain('A11Y-CONTRAST-01');

    const passing = scan(
      [
        ':root { --text: 14 21 35; --surface: 255 255 255; }',
        '.note { color: rgb(var(--text)); background: rgb(var(--surface)); }',
      ].join('\n'),
      'src/sample/styles.css',
    );
    expect(ruleIds(passing)).not.toContain('A11Y-CONTRAST-01');
  });

  it('inherits custom properties through nested theme scopes', () => {
    // The nested block only overrides the surface; --text must come from the
    // ancestor `.dark` scope, not fall back to the dark root value, mirroring
    // how custom properties actually inherit in the browser.
    const nested = scan(
      [
        ':root { --text: 14 21 35; --surface: 247 249 252; }',
        '.dark { --text: 233 238 247; --surface: 8 11 18; }',
        '.dark [data-tone="contrast"] { --surface: 5 7 12; }',
        '[data-tone="contrast"] { background-color: rgb(var(--surface)); color: rgb(var(--text)); }',
      ].join('\n'),
      'src/sample/styles.css',
    );
    expect(ruleIds(nested)).not.toContain('A11Y-CONTRAST-01');
  });

  it('never pairs colours across different theme blocks', () => {
    const crossTheme = scan(
      [
        ':root { --bg: #ffffff; --ink: #0b0f16; }',
        'html.dark { --bg: #0d1119; --ink: #e8edf5; }',
        '.panel { background: var(--bg); color: var(--ink); }',
      ].join('\n'),
      'src/sample/styles.css',
    );
    expect(ruleIds(crossTheme)).not.toContain('A11Y-CONTRAST-01');

    // Only the theme that actually fails is reported, labelled with its block.
    const themedFailure = scan(
      [
        ':root { --accent: #3b6fd4; --contrast: #ffffff; }',
        'html.dark { --accent: #f0a566; --contrast: #ffffff; }',
        '.btn { background: var(--accent); color: var(--contrast); }',
      ].join('\n'),
      'src/sample/styles.css',
    );
    const contrast = themedFailure.find(
      (finding) => finding.ruleId === 'A11Y-CONTRAST-01',
    );
    expect(contrast?.evidence).toContain('html.dark');
  });

  it('honours var() fallbacks and refuses to guess alpha colours', () => {
    const fallback = scan(
      [':root { --surface: #ffffff; }', '.x { background: var(--surface); color: var(--missing, #cccccc); }'].join(
        '\n',
      ),
      'src/sample/styles.css',
    );
    expect(ruleIds(fallback)).toContain('A11Y-CONTRAST-01');

    const alpha = scan(
      [
        ':root { --tint: 14 21 35; --surface: 255 255 255; }',
        '.x { color: rgb(var(--tint) / 0.5); background: rgb(var(--surface)); }',
      ].join('\n'),
      'src/sample/styles.css',
    );
    expect(ruleIds(alpha)).not.toContain('A11Y-CONTRAST-01');
  });

  it('flags skipped heading levels but allows component-relative starts', () => {
    const skip = scan(`<><h1>Title</h1><h3>Subsection</h3></>`);
    const heading = skip.find((finding) => finding.ruleId === 'A11Y-HEADING-01');
    expect(heading?.line).toBe(1);

    const ordered = scan(`<><h1>Title</h1><h2>Section</h2><h3>Detail</h3></>`);
    expect(ruleIds(ordered)).not.toContain('A11Y-HEADING-01');

    // A card component starting at h3 is valid; only downward skips count.
    const componentStart = scan(`<section><h3>Card title</h3><p>Body</p></section>`);
    expect(ruleIds(componentStart)).not.toContain('A11Y-HEADING-01');
  });

  it('requires a lang attribute on html entry documents', () => {
    const missing = scan('<html>\n  <body></body>\n</html>', 'index.html');
    const lang = missing.find((finding) => finding.ruleId === 'A11Y-LANG-01');
    expect(lang?.confidence).toBe('high');
    expect(lang?.severity).toBe('major');

    const labelled = scan(
      '<html lang="en">\n  <body></body>\n</html>',
      'index.html',
    );
    expect(ruleIds(labelled)).not.toContain('A11Y-LANG-01');
  });

  it('rejects key handlers on generic containers unless a widget role is present', () => {
    const generic = scan(`<div onKeyDown={handleKey}>Menu</div>`);
    expect(ruleIds(generic)).toContain('A11Y-KEYBOARD-02');

    const native = scan(`<button onKeyDown={handleKey}>Go</button>`);
    const widgetRole = scan(
      `<div role="button" tabIndex={0} onKeyDown={handleKey}>Go</div>`,
    );
    const presentation = scan(
      `<div className="backdrop" role="presentation" onKeyDown={onKey} />`,
    );
    const escapeOnly = scan(
      `<div onKeyDown={(e) => { if (e.key === 'Escape') close(); }} />`,
    );
    for (const clean of [native, widgetRole, presentation, escapeOnly]) {
      expect(ruleIds(clean)).not.toContain('A11Y-KEYBOARD-02');
    }
  });

  it('surfaces scrollable regions as low-confidence review cues', () => {
    const scrollable = scan(
      '.reader { max-height: 20rem; overflow-y: auto; }',
      'src/sample/styles.css',
    );
    const cue = scrollable.find(
      (finding) => finding.ruleId === 'A11Y-SCROLL-01',
    );
    expect(cue?.confidence).toBe('low');
    expect(cue?.severity).toBe('minor');

    const clipped = scan('.frame { overflow: hidden; }', 'src/sample/styles.css');
    const native = scan(
      'textarea { overflow: auto; }',
      'src/sample/styles.css',
    );
    expect(ruleIds(clipped)).not.toContain('A11Y-SCROLL-01');
    expect(ruleIds(native)).not.toContain('A11Y-SCROLL-01');
  });
});
