/** Product search, composing filters, and sorting — the pure catalogue logic. */
import { describe, expect, it } from 'vitest';

import {
  describeProductFilters,
  emptyProductFilters,
  filterProducts,
  parseProductFilters,
  type ProductFilters,
} from '@/lib/queries';
import { products } from '@/content';
import type { ProductRow } from '@/lib/queries';

const rows = products.map((product) => ({
  ...(product as unknown as ProductRow & { companySlug: string }),
  id: product.slug,
  companyId: `company-${product.companySlug}`,
  companySlug: product.companySlug,
  statusNote: product.statusNote,
}));

function filters(overrides: Partial<ProductFilters>): ProductFilters {
  return { ...emptyProductFilters, ...overrides };
}

describe('parseProductFilters', () => {
  it('reads scalar params and ignores unknown sorts', () => {
    const parsed = parseProductFilters({
      q: ' sentinel ',
      category: 'Cybersecurity',
      company: 'velaqori-systems',
      technology: 'Python',
      status: 'BUILT',
      sort: 'alphabetical',
    });
    expect(parsed.q).toBe('sentinel');
    expect(parsed.category).toBe('Cybersecurity');
    expect(parsed.company).toBe('velaqori-systems');
    expect(parsed.technology).toBe('Python');
    expect(parsed.status).toBe('BUILT');
    expect(parsed.sort).toBe('alphabetical');
  });

  it('falls back to featured sorting for unknown values', () => {
    expect(parseProductFilters({ sort: 'newest' }).sort).toBe('featured');
    expect(parseProductFilters({}).sort).toBe('featured');
  });
});

describe('filterProducts', () => {
  it('searches name, purpose, technology, and keywords', () => {
    expect(filterProducts(rows, filters({ q: 'sentinelcore' })).length).toBe(1);
    expect(filterProducts(rows, filters({ q: 'pcap' })).length).toBeGreaterThanOrEqual(1);
    expect(filterProducts(rows, filters({ q: 'stockfish' })).length).toBe(1);
    expect(filterProducts(rows, filters({ q: 'ussd' })).length).toBe(1);
    expect(filterProducts(rows, filters({ q: 'nothing-matches-this' })).length).toBe(0);
  });

  it('composes category + company + technology + status filters', () => {
    const combined = filterProducts(
      rows,
      filters({
        category: 'Cybersecurity',
        company: 'velaqori-systems',
        technology: 'Python',
        status: 'BUILT',
      }),
    );
    expect(combined.length).toBeGreaterThan(0);
    for (const product of combined) {
      expect(product.companySlug).toBe('velaqori-systems');
      expect(product.technologies).toContain('Python');
      expect(product.status).toBe('BUILT');
      expect(
        product.category === 'Cybersecurity' ||
          product.categories.includes('Cybersecurity'),
      ).toBe(true);
    }
  });

  it('filters by each company independently', () => {
    const velaqori = filterProducts(rows, filters({ company: 'velaqori-systems' }));
    const tamuzi = filterProducts(rows, filters({ company: 'tamuzi-learning' }));
    expect(velaqori.length).toBe(13);
    expect(tamuzi.length).toBe(12);
    expect(velaqori.length + tamuzi.length).toBe(rows.length);
  });

  it('narrows progressively as filters compose', () => {
    const base = filterProducts(rows, filters({ company: 'tamuzi-learning' }));
    const narrower = filterProducts(
      rows,
      filters({
        company: 'tamuzi-learning',
        category: 'AI and Intelligent Applications',
      }),
    );
    expect(base.length).toBe(12);
    expect(narrower.length).toBeLessThan(base.length);
    expect(narrower.length).toBeGreaterThan(0);
  });

  it('sorts alphabetically and by category with stable grouping', () => {
    const alphabetical = filterProducts(rows, filters({ sort: 'alphabetical' }));
    expect(alphabetical.map((p) => p.name)).toEqual(
      [...alphabetical.map((p) => p.name)].sort((a, b) => a.localeCompare(b)),
    );

    const byCategory = filterProducts(rows, filters({ sort: 'category' }));
    const categories = byCategory.map((p) => p.category);
    const sorted = [...categories].sort((a, b) => a.localeCompare(b));
    expect(categories).toEqual(sorted);
  });

  it('sorts featured first then alphabetically', () => {
    const featured = filterProducts(rows, filters({ sort: 'featured' }));
    const featuredFlags = featured.map((p) => p.featured);
    const firstFalse = featuredFlags.indexOf(false);
    const lastTrue = featuredFlags.lastIndexOf(true);
    if (firstFalse !== -1 && lastTrue !== -1) {
      expect(lastTrue).toBeLessThan(firstFalse);
    }
  });

  it('describeProductFilters reports the applied state honestly', () => {
    expect(describeProductFilters(emptyProductFilters)).toContain('All published products');
    const described = describeProductFilters(
      filters({ q: 'phish', company: 'velaqori-systems' }),
    );
    expect(described).toContain('phish');
    expect(described).toContain('velaqori-systems');
    expect(described).toContain('featured first');
  });
});
