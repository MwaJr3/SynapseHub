import type {
  Digest, DigestWindow, Feed, FeedPreview, Item, ItemPage, Library, LookupResult, OpmlPreview, OpmlResult,
  Pack, Prefs, RefreshSummary, User,
} from '../types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
export const onUnauthorized = (fn: Listener) => {
  unauthorizedListeners.add(fn);
  return () => void unauthorizedListeners.delete(fn);
};

async function request<T>(path: string, init: RequestInit & { json?: unknown; quiet401?: boolean } = {}): Promise<T> {
  const { json, quiet401, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...rest,
      headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new ApiError("Can't reach Frontpage right now. Check your connection and try again.", 0);
  }
  if (!res.ok) {
    let detail = `Something went wrong (${res.status}).`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === 'string') detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    if (res.status === 401 && !quiet401) unauthorizedListeners.forEach((fn) => fn());
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const qs = (params: Record<string, string | number | boolean | null | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === false || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
};

export interface ItemQuery {
  scope?: 'all' | 'saved' | 'unread';
  feed_id?: number | null;
  category_id?: number | null;
  uncategorized?: boolean;
  unread_only?: boolean;
  q?: string;
  since?: string;
  until?: string;
  sort?: 'newest' | 'oldest' | 'saved';
  cursor?: string | null;
  limit?: number;
}

export const api = {
  me: () => request<{ user: User; prefs: Prefs }>('/auth/me', { quiet401: true }),
  register: (body: { email: string; password: string; display_name?: string }) =>
    request<{ user: User }>('/auth/register', { method: 'POST', json: body, quiet401: true }),
  login: (body: { email: string; password: string }) =>
    request<{ user: User }>('/auth/login', { method: 'POST', json: body, quiet401: true }),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST', quiet401: true }),
  guest: () => request<{ user: User }>('/auth/guest', { method: 'POST', quiet401: true }),
  resetRequest: (email: string) =>
    request<{ ok: true; message: string; dev_token?: string }>('/auth/password-reset/request', { method: 'POST', json: { email }, quiet401: true }),
  resetConfirm: (token: string, password: string) =>
    request<{ ok: true }>('/auth/password-reset/confirm', { method: 'POST', json: { token, password }, quiet401: true }),

  library: () => request<Library>('/library'),
  items: (query: ItemQuery, signal?: AbortSignal) =>
    request<ItemPage>(`/items${qs({ ...query })}`, { signal }),
  item: (id: number) => request<Item>(`/items/${id}`),
  patchItem: (id: number, body: { is_read?: boolean; is_bookmarked?: boolean }) =>
    request<Item>(`/items/${id}`, { method: 'PATCH', json: body }),
  newCount: (since: string) => request<{ count: number }>(`/items/new-count${qs({ since })}`),
  markRead: (body: { scope: 'all' | 'feed' | 'category' | 'uncategorized'; feed_id?: number; category_id?: number; read?: boolean }) =>
    request<{ updated: number }>('/items/mark-read', { method: 'POST', json: body }),
  digest: (window: DigestWindow) => request<Digest>(`/digest${qs({ window })}`),

  previewFeed: (url: string) => request<FeedPreview>('/feeds/preview', { method: 'POST', json: { url } }),
  addFeed: (body: { url: string; category_id?: number | null; category_name?: string | null; custom_title?: string | null }) =>
    request<Feed>('/feeds', { method: 'POST', json: body }),
  patchFeed: (id: number, body: { custom_title?: string | null; category_id?: number | null; clear_category?: boolean }) =>
    request<Feed>(`/feeds/${id}`, { method: 'PATCH', json: body }),
  deleteFeed: (id: number) => request<{ ok: true; items_removed: number }>(`/feeds/${id}`, { method: 'DELETE' }),
  refreshFeed: (id: number) =>
    request<{ new_items: number; error: string | null; not_modified: boolean; feed: Feed }>(`/feeds/${id}/refresh`, { method: 'POST' }),
  refreshAll: (opts: { category_id?: number; force?: boolean } = {}) =>
    request<RefreshSummary>(`/feeds/refresh${qs(opts)}`, { method: 'POST' }),

  createCategory: (name: string) =>
    request<{ id: number; name: string; position: number }>('/categories', { method: 'POST', json: { name } }),
  renameCategory: (id: number, name: string) =>
    request<{ id: number; name: string }>(`/categories/${id}`, { method: 'PATCH', json: { name } }),
  deleteCategory: (id: number, moveTo?: number | null) =>
    request<{ ok: true; feeds_moved: number; moved_to: string }>(`/categories/${id}${qs({ move_to: moveTo })}`, { method: 'DELETE' }),
  reorderCategories: (ids: number[]) => request<{ ok: true }>('/categories/order', { method: 'PUT', json: { ids } }),

  opmlPreview: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return request<OpmlPreview>('/opml/preview', { method: 'POST', body });
  },
  opmlImport: (file: File) => {
    const body = new FormData();
    body.append('file', file);
    return request<OpmlResult>('/opml/import', { method: 'POST', body });
  },
  opmlExportUrl: '/api/opml/export',

  savePrefs: (body: Partial<Prefs>) => request<{ prefs: Prefs }>('/prefs', { method: 'PUT', json: body }),
  completeOnboarding: () => request<{ ok: true }>('/onboarding/complete', { method: 'POST' }),
  packs: () => request<{ packs: Pack[] }>('/discover/packs'),
  followPack: (id: string, urls?: string[]) =>
    request<{ added: { id: number; title: string }[]; failed: { title: string; url: string; reason: string }[]; already_following: number; category: string }>(
      `/discover/packs/${id}/follow`, { method: 'POST', json: { urls: urls ?? null } }),
  lookup: (query: string) => request<{ results: LookupResult[] }>('/discover/lookup', { method: 'POST', json: { query } }),
};
