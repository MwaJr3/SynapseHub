export type Layout = 'compact' | 'comfortable' | 'cards' | 'magazine';
export type ThemePref = 'system' | 'light' | 'dark';
export type DigestWindow = 'since_visit' | '24h' | '7d';
export type FeedStatus = 'active' | 'stale' | 'error';

export interface ReaderPrefs {
  font_size: number;
  line_height: number;
  serif: boolean;
  width: 'narrow' | 'medium' | 'wide';
}

export interface Prefs {
  layout: Layout;
  category_layouts: Record<string, Layout>;
  split_reader: boolean;
  refresh_minutes: 0 | 15 | 30 | 60;
  theme: ThemePref;
  reader: ReaderPrefs;
  digest_window: DigestWindow;
}

export interface User {
  id: number;
  email: string | null;
  display_name: string;
  is_guest: boolean;
  onboarded: boolean;
  expires_at: string | null;
  previous_visit_at: string | null;
}

export interface Category {
  id: number;
  name: string;
  position: number;
  unread: number;
  feed_count: number;
}

export interface Feed {
  id: number;
  url: string;
  site_url: string | null;
  title: string;
  original_title: string | null;
  custom_title: string | null;
  description: string | null;
  icon_url: string | null;
  format: string | null;
  category_id: number | null;
  status: FeedStatus;
  error: string | null;
  error_kind: 'permanent' | 'temporary' | null;
  failure_count: number;
  next_retry_at: string | null;
  last_fetched_at: string | null;
  last_success_at: string | null;
  latest_item_at: string | null;
  unread: number;
  total: number;
}

export interface Library {
  categories: Category[];
  uncategorized: { unread: number; feed_count: number };
  feeds: Feed[];
  totals: { unread: number; items: number; saved: number; feeds: number };
  health: { active: number; stale: number; error: number };
  last_updated: string | null;
}

export interface Item {
  id: number;
  feed_id: number;
  feed_title: string;
  feed_icon: string | null;
  category_id: number | null;
  title: string;
  url: string | null;
  author: string | null;
  summary: string | null;
  image_url: string | null;
  published_at: string | null;
  date_missing: boolean;
  has_full_content: boolean;
  is_read: boolean;
  is_bookmarked: boolean;
  bookmarked_at: string | null;
  content_html?: string | null;
}

export interface ItemPage {
  items: Item[];
  next_cursor: string | null;
  total: number;
}

export interface DigestItem extends Item {
  reason: string;
  score: number;
}

export interface Digest {
  window: { mode: DigestWindow; start: string; end: string };
  total_new: number;
  shown: number;
  remaining: number;
  sources: number;
  groups: { category: string; items: DigestItem[] }[];
}

export interface FeedPreview {
  url: string;
  title: string;
  description: string | null;
  site_url: string | null;
  icon_url: string | null;
  format: string | null;
  item_count: number;
  warnings: string[];
  duplicate: { id: number; title: string } | null;
  sample: { title: string; published_at: string | null }[];
}

export interface PackFeed {
  title: string;
  url: string;
  site_url: string | null;
  description: string;
  followed: boolean;
}

export interface Pack {
  id: string;
  name: string;
  description: string;
  feeds: PackFeed[];
  followed_count: number;
}

export interface LookupResult {
  title: string;
  url: string;
  description: string | null;
  site_url: string | null;
  source: 'catalog' | 'discovered';
  pack?: string;
  duplicate?: boolean;
}

export interface OpmlRow {
  title: string | null;
  url: string | null;
  category: string | null;
  status: 'new' | 'duplicate' | 'invalid';
  reason: string | null;
}

export interface OpmlPreview {
  entries: OpmlRow[];
  summary: { new: number; duplicate: number; invalid: number };
  categories: string[];
}

export interface OpmlResult {
  added: { id: number; title: string; category: string | null }[];
  duplicates: OpmlRow[];
  failed: { title: string | null; url: string | null; reason: string }[];
  invalid: OpmlRow[];
  summary: { added: number; duplicates: number; failed: number; invalid: number };
}

export interface RefreshSummary {
  checked: number;
  new_items: number;
  errors: number;
  skipped: number;
  at: string;
}

export type Scope =
  | { kind: 'all' }
  | { kind: 'unread' }
  | { kind: 'saved' }
  | { kind: 'category'; id: number }
  | { kind: 'uncategorized' }
  | { kind: 'feed'; id: number }
  | { kind: 'search' };
