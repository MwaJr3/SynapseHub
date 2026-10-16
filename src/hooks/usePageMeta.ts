import { useEffect } from 'react';
import { siteConfig } from '@/config/site';

export interface PageMeta {
  title: string;
  description: string;
  /** Site-relative path used for the canonical URL and og:url. */
  path: string;
  /** Optional structured-data payload rendered as JSON-LD. */
  structuredData?: Record<string, unknown>;
  noIndex?: boolean;
}

function upsertMeta(
  selector: string,
  attributes: Record<string, string>,
): void {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
}

function upsertLink(rel: string, href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>(
    `link[rel="${rel}"]`,
  );
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

/**
 * Applies per-page document metadata.
 *
 * Canonical, og:url and og:image URLs are only emitted when a production origin
 * is configured — an invented canonical domain would be worse than none.
 */
export function usePageMeta({
  title,
  description,
  path,
  structuredData,
  noIndex,
}: PageMeta): void {
  useEffect(() => {
    const fullTitle = title.includes(siteConfig.shortTitle)
      ? title
      : `${title} — ${siteConfig.shortTitle}`;
    document.title = fullTitle;

    upsertMeta('meta[name="description"]', {
      name: 'description',
      content: description,
    });
    upsertMeta('meta[property="og:title"]', {
      property: 'og:title',
      content: fullTitle,
    });
    upsertMeta('meta[property="og:description"]', {
      property: 'og:description',
      content: description,
    });
    upsertMeta('meta[property="og:type"]', {
      property: 'og:type',
      content: 'website',
    });
    upsertMeta('meta[name="twitter:card"]', {
      name: 'twitter:card',
      content: 'summary_large_image',
    });
    upsertMeta('meta[name="twitter:title"]', {
      name: 'twitter:title',
      content: fullTitle,
    });
    upsertMeta('meta[name="twitter:description"]', {
      name: 'twitter:description',
      content: description,
    });

    if (noIndex) {
      upsertMeta('meta[name="robots"]', { name: 'robots', content: 'noindex' });
    } else {
      const robots = document.head.querySelector('meta[name="robots"]');
      if (robots) robots.remove();
    }

    if (siteConfig.url) {
      const canonical = new URL(path, `${siteConfig.url}/`).toString();
      upsertLink('canonical', canonical);
      upsertMeta('meta[property="og:url"]', {
        property: 'og:url',
        content: canonical,
      });
      upsertMeta('meta[property="og:image"]', {
        property: 'og:image',
        content: new URL(
          siteConfig.ogImagePath,
          `${siteConfig.url}/`,
        ).toString(),
      });
      upsertMeta('meta[name="twitter:image"]', {
        name: 'twitter:image',
        content: new URL(
          siteConfig.ogImagePath,
          `${siteConfig.url}/`,
        ).toString(),
      });
    }
  }, [title, description, path, noIndex]);

  useEffect(() => {
    const scriptId = 'portfolio-structured-data';
    document.getElementById(scriptId)?.remove();
    if (!structuredData) return undefined;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = scriptId;
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [structuredData]);
}
