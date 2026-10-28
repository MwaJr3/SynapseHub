/**
 * Where Tessera sits in the wider Tamuzi estate.
 *
 * Tessera is one of several learning systems, and the company site is the
 * umbrella that explains and reaches them. That link is configuration, not a
 * constant: a self-hosted or internal deployment should not send learners to a
 * marketing site that may not exist. When nothing is configured the header says
 * "a Tamuzi Learning product" and links nowhere — it does not render a `#` and it
 * does not invent a domain.
 */

const FALLBACK_LABEL = 'A Tamuzi Learning product';

export function safeHttpUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export function companySiteUrl(env: Record<string, string | undefined> = import.meta.env): string | null {
  return safeHttpUrl(env.VITE_COMPANY_SITE_URL);
}

/**
 * The label shown when there is no umbrella link. It states the relationship that
 * always holds — the product belongs to Tamuzi Learning — without implying the
 * two companies are one, or that a parent site is reachable from here.
 */
export function parentLabel(): string {
  return FALLBACK_LABEL;
}

/** Link text for the umbrella, or null when there is nowhere to go. */
export function parentLink(
  env: Record<string, string | undefined> = import.meta.env,
): { href: string; label: string } | null {
  const href = companySiteUrl(env);
  return href ? { href, label: 'Part of Tamuzi Learning' } : null;
}
