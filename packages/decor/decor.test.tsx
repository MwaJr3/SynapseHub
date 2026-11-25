import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlurFade, DotPattern, GlowCard, Marquee, NumberTicker, OfflineBanner, RequestStatus, ShimmerText } from './index';

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

describe('RequestStatus', () => {
  afterEach(() => vi.useRealTimers());

  it('reports a slow request, clears it when the request ends, and restores fetch on unmount', async () => {
    vi.useFakeTimers();
    let release: (r: Response) => void = () => {};
    const original = vi.fn(() => new Promise<Response>((resolve) => { release = resolve; }));
    window.fetch = original as unknown as typeof fetch;
    const { unmount } = render(<RequestStatus slowAfterMs={1000} />);
    const wrapped = window.fetch;
    expect(wrapped).not.toBe(original);
    const call = wrapped('/slow');
    expect(screen.getByRole('status').textContent).toBe('');
    await act(async () => { vi.advanceTimersByTime(1200); });
    expect(screen.getByRole('status').textContent).toMatch(/taking longer/i);
    await act(async () => { release(new Response('ok')); await call; });
    expect(screen.getByRole('status').textContent).toBe('');
    unmount();
    expect(window.fetch).toBe(original);
  });

  it('asks the person to sign in again after a 401 and keeps the message', async () => {
    window.fetch = vi.fn(async () => new Response('no', { status: 401 })) as unknown as typeof fetch;
    render(<RequestStatus signInHref="/login" />);
    await act(async () => { await window.fetch('/api/x'); });
    expect(screen.getByRole('status').textContent).toMatch(/session has ended/i);
    expect(screen.getByRole('link', { name: /sign in again/i }).getAttribute('href')).toBe('/login');
  });
});
