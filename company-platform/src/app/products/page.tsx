import type { Metadata } from 'next';
import Link from 'next/link';

import { IllustrativeLabel, StatusBadge, CompanyBadge, Badge, EmptyState } from '@/components/ui';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  describeProductFilters,
  filterProducts,
  listPublishedProducts,
  parseProductFilters,
} from '@/lib/queries';
import { getDb } from '@/lib/db';
import { isConfiguredUrl } from '@/lib/validation';
import { externalAnchorProps } from '@/lib/links';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Products',
  description:
    'All 25 products from Velaqori Systems and Tamuzi Learning — one catalogue with search, filters, and case studies.',
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseProductFilters(params);
  const products = await listPublishedProducts(getDb());
  const filtered = filterProducts(products, filters);

  const technologies = [...new Set(products.flatMap((p) => p.technologies))].sort();
  const companies = [...new Map(products.map((p) => [p.companySlug, p.companyName])).entries()];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="mt-2 max-w-prose text-muted">
          The complete catalogue for both independent companies. Search and
          filters compose; demo and source actions appear only where URLs are
          configured.
        </p>
      </header>

      <form
        method="get"
        action="/products"
        className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Product filters"
      >
        <div className="sm:col-span-2 lg:col-span-3">
          <label htmlFor="q" className="text-sm font-medium">Search</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Name, description, technology, keyword…"
            className="field mt-1"
          />
        </div>
        <div>
          <label htmlFor="category" className="text-sm font-medium">Category</label>
          <select id="category" name="category" defaultValue={filters.category} className="field mt-1">
            <option value="">All categories</option>
            {PRODUCT_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="company" className="text-sm font-medium">Company</label>
          <select id="company" name="company" defaultValue={filters.company} className="field mt-1">
            <option value="">Both companies</option>
            {companies.map(([slug, name]) => (
              <option key={slug} value={slug}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="technology" className="text-sm font-medium">Technology</label>
          <select id="technology" name="technology" defaultValue={filters.technology} className="field mt-1">
            <option value="">Any technology</option>
            {technologies.map((tech) => (
              <option key={tech} value={tech}>{tech}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="text-sm font-medium">Status</label>
          <select id="status" name="status" defaultValue={filters.status} className="field mt-1">
            <option value="">Any status</option>
            {PRODUCT_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="text-sm font-medium">Sort</label>
          <select id="sort" name="sort" defaultValue={filters.sort} className="field mt-1">
            <option value="featured">Featured</option>
            <option value="alphabetical">Alphabetical</option>
            <option value="category">Category</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn btn-primary">Apply</button>
          <Link href="/products" className="btn btn-secondary">Reset</Link>
        </div>
      </form>

      <p role="status" className="text-sm text-muted">
        {describeProductFilters(filters)} Showing {filtered.length} of {products.length} published products.
      </p>

      {filtered.length === 0 ? (
        <EmptyState>No published products match these filters.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product) => (
            <article key={product.slug} className="card flex flex-col">
              <IllustrativeLabel label={product.visualLabel} />
              <h2 className="mt-3 text-base font-semibold">
                <Link href={`/products/${product.slug}`} className="hover:underline">
                  {product.name}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-muted">{product.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <CompanyBadge name={product.companyName} />
                <Badge>{product.category}</Badge>
                <StatusBadge status={product.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {product.technologies.slice(0, 5).map((tech) => (
                  <Badge key={tech}>{tech}</Badge>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={`/products/${product.slug}`} className="btn btn-primary">
                  View Product
                </Link>
                <Link href={`/case-studies/${product.slug}-case-study`} className="btn btn-secondary">
                  View Case Study
                </Link>
                {isConfiguredUrl(product.liveDemoUrl) ? (
                  <a href={product.liveDemoUrl} className="btn btn-secondary" {...externalAnchorProps}>
                    Live Demo
                  </a>
                ) : null}
                {isConfiguredUrl(product.repositoryUrl) ? (
                  <a href={product.repositoryUrl} className="btn btn-secondary" {...externalAnchorProps}>
                    Source Code
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
