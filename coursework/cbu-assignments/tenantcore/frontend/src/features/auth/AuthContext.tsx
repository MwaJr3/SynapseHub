import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, getSelectedTenant, storeSelectedTenant, tokenStore } from '../../services/api';
import type { AuthPayload, MePayload, Membership, User } from '../../types';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyIdentity = useCallback((identity: MePayload | AuthPayload) => {
    setUser(identity.user);
    setMemberships(identity.memberships);
    const active = identity.memberships.filter(item => item.tenant_status === 'active');
    const stored = getSelectedTenant();
    const selected = active.find(item => item.tenant_id === stored) || active[0];
    const id = selected?.tenant_id || null;
    setSelectedTenantId(id);
    storeSelectedTenant(id);
  }, []);

  const clear = useCallback(() => {
    tokenStore.clear(); setUser(null); setMemberships([]); setSelectedTenantId(null); storeSelectedTenant(null);
  }, []);

  useEffect(() => {
    if (!tokenStore.access) { setLoading(false); return; }
    api<MePayload>('/auth/me', { skipTenant: true }).then(applyIdentity).catch(clear).finally(() => setLoading(false));
  }, [applyIdentity, clear]);

  useEffect(() => {
    const unauthorized = () => clear();
    const refreshed = (event: Event) => applyIdentity((event as CustomEvent<AuthPayload>).detail);
    window.addEventListener('tenantcore:unauthorized', unauthorized);
    window.addEventListener('tenantcore:refreshed', refreshed);
    return () => { window.removeEventListener('tenantcore:unauthorized', unauthorized); window.removeEventListener('tenantcore:refreshed', refreshed); };
  }, [applyIdentity, clear]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<AuthPayload>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }), skipAuth: true, skipTenant: true,
    });
    tokenStore.set(result.access_token, result.refresh_token);
    applyIdentity(result);
    return result;
  }, [applyIdentity]);

  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST', skipTenant: true }); } finally { clear(); }
  }, [clear]);

  const switchTenant = useCallback(async (id: string) => {
    if (!memberships.some(item => item.tenant_id === id && item.tenant_status === 'active')) {
      throw new Error('You do not have an active membership in this organization');
    }
    await api('/organization', { tenantOverride: id });
    storeSelectedTenant(id);
    setSelectedTenantId(id);
  }, [memberships]);

  const refreshUser = useCallback(async () => {
    const identity = await api<MePayload>('/auth/me', { skipTenant: true });
    applyIdentity(identity);
  }, [applyIdentity]);

  const currentMembership = memberships.find(item => item.tenant_id === selectedTenantId) || null;
  const value = useMemo(() => ({ user, memberships, selectedTenantId, currentMembership, loading, login, logout, switchTenant, refreshUser }), [user, memberships, selectedTenantId, currentMembership, loading, login, logout, switchTenant, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
