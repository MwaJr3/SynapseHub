import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Board } from './Board';
import { EvalBar } from './EvalBar';
import { START_FEN } from './gameModel';

describe('Board markup', () => {
  const html = renderToStaticMarkup(<Board fen={START_FEN} marker={{ square: 'e4', cls: 'blunder' }} />);
  it('is a labelled grid with 64 named cells and one tab stop', () => {
    expect(html).toContain('role="grid"');
    expect((html.match(/role="gridcell"/g) ?? []).length).toBe(64);
    expect((html.match(/tabindex="0"/g) ?? []).length).toBe(1);
    expect(html).toContain('aria-label="e1, white king"');
  });
  it('markers have a text symbol and accessible name', () => {
    expect(html).toContain('??');
    expect(html).toContain('blunder marker');
  });
});

describe('EvalBar', () => {
  it('shows an explicit message without a score', () => {
    expect(renderToStaticMarkup(<EvalBar score={null} source={null} />)).toContain('No evaluation');
  });
  it('labels source', () => {
    const h = renderToStaticMarkup(<EvalBar score={{ cp: 120, mate: null }} source="test engine" />);
    expect(h).toContain('Source: test engine');
    expect(h).toContain('White is better');
  });
});
