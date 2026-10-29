import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { AuthContext } from '../features/auth/auth-context';
import type { AuthContextValue } from '../features/auth/auth-context';
import type { Membership } from '../types';
import { TenantSwitcher } from './TenantSwitcher';

const acme: Membership = { tenant_id: 'a', tenant_name: 'Acme Corporation', tenant_slug: 'acme', tenant_status: 'active', role: 'manager' };
const globex: Membership = { tenant_id: 'b', tenant_name: 'Globex Industries', tenant_slug: 'globex', tenant_status: 'active', role: 'read_only' };

function context(memberships: Membership[]): AuthContextValue {
  return {
    user: { id: 'u', email: 'demo@example.com', full_name: 'Demo User', is_platform_admin: false, last_login_at: null },
    memberships, selectedTenantId: 'a', currentMembership: acme, loading: false,
    login: vi.fn(), logout: vi.fn(), switchTenant: vi.fn().mockResolvedValue(undefined), refreshUser: vi.fn(),
  };
}

test('single-organization users do not see a tenant switching control', () => {
  render(<AuthContext.Provider value={context([acme])}><TenantSwitcher /></AuthContext.Provider>);
  expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: 'Current organization' })).not.toBeInTheDocument();
});

test('multi-organization switch calls the server-validated context action', async () => {
  const value = context([acme, globex]);
  render(<AuthContext.Provider value={value}><TenantSwitcher /></AuthContext.Provider>);
  const switcher = screen.getByRole('combobox', { name: 'Current organization' });
  expect(switcher).toHaveTextContent('Globex Industries · read only');
  await userEvent.selectOptions(switcher, 'b');
  expect(value.switchTenant).toHaveBeenCalledWith('b');
});
