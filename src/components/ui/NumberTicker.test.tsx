import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NumberTicker } from './NumberTicker';

describe('NumberTicker', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('gives assistive technology the final value, not the frames in between', () => {
    render(<NumberTicker value={1234} />);
    expect(screen.getByText('1,234', { selector: '.sr-only' })).toBeTruthy();
  });

  it('shows the final value at once when the person prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));
    const { container } = render(<NumberTicker value={60} />);
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('60');
  });
});
