import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useScrollSpy } from './useScrollSpy';

/**
 * jsdom has no IntersectionObserver, so the spy is exercised against a stub that
 * records its callback. The contract under test is the one that decides what a nav
 * claims: the *most* visible section wins, and nothing is announced when the
 * section list is empty (the company 404 page has no sections at all).
 */

type Entry = { target: Element; isIntersecting: boolean; intersectionRatio: number };

let fire: ((entries: Entry[]) => void) | null = null;
let observed: Element[] = [];

class StubObserver {
  constructor(callback: (entries: Entry[]) => void) {
    // The spy never calls back synchronously; the test drives it through `fire`,
    // which is what a real scroll would do.
    fire = callback;
  }
  observe(element: Element) {
    observed.push(element);
  }
  disconnect() {
    observed = [];
  }
}

function addSection(id: string) {
  const element = document.createElement('section');
  element.id = id;
  document.body.appendChild(element);
  return element;
}

beforeEach(() => {
  fire = null;
  observed = [];
  vi.stubGlobal('IntersectionObserver', StubObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('useScrollSpy', () => {
  it('reports the most visible section, not the first one to intersect', async () => {
    const a = addSection('overview');
    const b = addSection('architecture');
    const { result } = renderHook(() => useScrollSpy(['overview', 'architecture']));

    await waitFor(() => expect(observed).toHaveLength(2));
    fire?.([
      { target: a, isIntersecting: true, intersectionRatio: 0.2 },
      { target: b, isIntersecting: true, intersectionRatio: 0.8 },
    ]);

    await waitFor(() => expect(result.current).toBe('architecture'));
  });

  it('drops a section as soon as it leaves the viewport', async () => {
    const a = addSection('overview');
    const b = addSection('architecture');
    const { result } = renderHook(() => useScrollSpy(['overview', 'architecture']));
    await waitFor(() => expect(observed).toHaveLength(2));

    fire?.([
      { target: a, isIntersecting: true, intersectionRatio: 0.2 },
      { target: b, isIntersecting: true, intersectionRatio: 0.8 },
    ]);
    await waitFor(() => expect(result.current).toBe('architecture'));

    fire?.([
      { target: a, isIntersecting: true, intersectionRatio: 0.9 },
      { target: b, isIntersecting: false, intersectionRatio: 0 },
    ]);
    await waitFor(() => expect(result.current).toBe('overview'));
  });

  it('announces nothing when none of the ids are on the page', async () => {
    const { result } = renderHook(() => useScrollSpy(['capabilities', 'principles']));
    expect(result.current).toBe('');
    expect(observed).toHaveLength(0);
  });
});
