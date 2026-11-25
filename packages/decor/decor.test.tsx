import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlurFade, DotPattern, GlowCard, Marquee, NumberTicker, OfflineBanner, ShimmerText } from './index';

const reduceMotion = () =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }));

describe('decor', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('BlurFade shows its content at once under reduced motion', () => {
    reduceMotion();
    render(<BlurFade>hello</BlurFade>);
    expect(screen.getByText('hello').getAttribute('data-visible')).toBe('true');
  });

  it('NumberTicker reads the final value to assistive technology and shows it under reduced motion', () => {
    reduceMotion();
    const { container } = render(<NumberTicker value={4200} />);
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe('4,200');
    expect(screen.getAllByText('4,200').length).toBeGreaterThan(0);
  });

  it('Marquee exposes each item once: the repeated track is aria-hidden', () => {
    render(<Marquee label="Customers"><span>Acme</span></Marquee>);
    expect(screen.getAllByText('Acme')).toHaveLength(2);
    expect(screen.getByRole('group', { name: 'Customers' }).querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
  });

  it('decorative layers carry no meaning', () => {
    const { container } = render(<><DotPattern /><ShimmerText>x</ShimmerText><GlowCard>y</GlowCard></>);
    expect(container.querySelector('.dx-dots')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.dx-glow')?.textContent).toBe('y');
  });
});

describe('OfflineBanner', () => {
  it('is an empty live region online and shows the message when the browser goes offline', () => {
    render(<OfflineBanner />);
    expect(screen.getByRole('status').textContent).toBe('');
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status').textContent).toMatch(/offline/i);
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByRole('status').textContent).toBe('');
  });
});
