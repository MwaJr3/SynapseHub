const ACCESS_KEY = 'tenantcore.access';
const REFRESH_KEY = 'tenantcore.refresh';
const TENANT_KEY = 'tenantcore.tenant';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public requestId?: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
  skipTenant?: boolean;
  tenantOverride?: string;
  root?: boolean;
}

export const tokenStore = {
  get access() { return sessionStorage.getItem(ACCESS_KEY); },
  get refresh() { return sessionStorage.getItem(REFRESH_KEY); },
  set(access: string, refresh: string) {
    sessionStorage.setItem(ACCESS_KEY, access);
    sessionStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() { sessionStorage.removeItem(ACCESS_KEY); sessionStorage.removeItem(REFRESH_KEY); },
};

export function getSelectedTenant() { return localStorage.getItem(TENANT_KEY); }
export function storeSelectedTenant(id: string | null) {
  if (id) localStorage.setItem(TENANT_KEY, id); else localStorage.removeItem(TENANT_KEY);
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!tokenStore.refresh) return false;
  if (!refreshPromise) {
    refreshPromise = fetch('/api/v1/auth/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokenStore.refresh }),
    }).then(async response => {
      if (!response.ok) { tokenStore.clear(); return false; }
      const body = await response.json();
      tokenStore.set(body.access_token, body.refresh_token);
      window.dispatchEvent(new CustomEvent('tenantcore:refreshed', { detail: body }));
      return true;
    }).catch(() => { tokenStore.clear(); return false; }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function api<T>(path: string, options: ApiOptions = {}, retried = false): Promise<T> {
  const { skipAuth, skipTenant, tenantOverride, root, ...init } = options;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!skipAuth && tokenStore.access) headers.set('Authorization', `Bearer ${tokenStore.access}`);
  const tenant = tenantOverride || getSelectedTenant();
  if (!skipTenant && tenant) headers.set('X-Tenant-ID', tenant);
  const response = await fetch(`${root ? '' : '/api/v1'}${path}`, { ...init, headers });
  if (response.status === 401 && !skipAuth && !retried && await refreshSession()) {
    return api<T>(path, options, true);
  }
  if (!response.ok) {
    let body: any = {};
    try { body = await response.json(); } catch { /* non-JSON service failure */ }
    if (response.status === 401) window.dispatchEvent(new Event('tenantcore:unauthorized'));
    throw new ApiError(response.status, body.error?.code || 'SERVICE_ERROR', body.error?.message || `Request failed (${response.status})`, body.request_id, body.error?.details);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function jsonBody(value: unknown): RequestInit { return { body: JSON.stringify(value) }; }
export function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
export function formatNumber(value = 0) { return new Intl.NumberFormat('en', { notation: value > 9999 ? 'compact' : 'standard' }).format(value); }
