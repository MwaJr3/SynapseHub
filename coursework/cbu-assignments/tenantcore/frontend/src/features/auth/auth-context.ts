import { createContext, useContext } from 'react';
import type { AuthPayload, Membership, User } from '../../types';

export interface AuthContextValue {
  user: User | null;
  memberships: Membership[];
  selectedTenantId: string | null;
  currentMembership: Membership | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthPayload>;
  logout: () => Promise<void>;
  switchTenant: (id: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
