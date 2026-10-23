import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { absoluteUrl, site } from '@/config/site';

export interface PageMeta {
  title: string;
  description: string;
  /** Absolute path used for canonical / og:url when a domain is configured. */
  path?: string | undefined;
  type?: 'website' | 'article' | undefined;
  image?: string | undefined;
}

function upsertMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string | null) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (href === null) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

/**
 * Per-route document metadata. Titles, descriptions, Open Graph tags and the
 * canonical link are all derived from real data — the canonical URL is only
 * emitted once a production domain is configured, so nothing points at a
 * fabricated deployment.
 */
export function usePageMeta({ title, description, path, type = 'website', image }: PageMeta) {
  useEffect(() => {
    document.title = title;
    upsertMeta('meta[name="description"]', 'name', 'description', description);

    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', type);
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);

    const canonical = path ? absoluteUrl(path) : null;
    upsertLink('canonical', canonical);
    if (canonical) {
      upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    } else {
      document.head.querySelector('meta[property="og:url"]')?.remove();
    }

    const resolvedImage = image ? (absoluteUrl(image) ?? image) : null;
    if (resolvedImage) {
      upsertMeta('meta[property="og:image"]', 'property', 'og:image', resolvedImage);
      upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', resolvedImage);
    }
  }, [title, description, path, type, image]);
}

/** Restores scroll position on navigation, respecting in-page hashes. */
export function useScrollRestoration() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, hash]);
}

export const defaultDescription = site.description;
