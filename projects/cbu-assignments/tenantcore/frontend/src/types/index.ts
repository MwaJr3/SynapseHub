export type TenantStatus = 'provisioning' | 'active' | 'suspended' | 'archived';
export type Role = 'tenant_admin' | 'manager' | 'member' | 'read_only';

export interface User { id: string; email: string; full_name: string; is_platform_admin: boolean; last_login_at: string | null }
export interface Membership { tenant_id: string; tenant_name: string; tenant_slug: string; tenant_status: TenantStatus; role: Role }
export interface AuthPayload { access_token: string; refresh_token: string; expires_in: number; user: User; memberships: Membership[] }
export interface MePayload { user: User; memberships: Membership[]; session_id: string }
export interface Tenant { id: string; name: string; slug: string; status: TenantStatus; plan_id: string; configuration: Record<string, unknown>; created_at: string; updated_at: string; provisioned_at: string | null; suspended_at: string | null; archived_at: string | null }
export interface PageMeta { page: number; page_size: number; total: number; pages: number }
export interface Page<T> { items: T[]; meta: PageMeta }
export interface Project { id: string; tenant_id: string; team_id: string | null; name: string; description: string; status: string; created_by: string; created_at: string; updated_at: string }
export interface Team { id: string; tenant_id: string; name: string; description: string; created_by: string; created_at: string; updated_at: string }
export interface Task { id: string; tenant_id: string; project_id: string; assignee_id: string | null; created_by: string; title: string; description: string; status: string; priority: string; due_date: string | null; version: number; created_at: string; updated_at: string }
export interface Member { user_id: string; tenant_id: string; email: string; full_name: string; role: Role; status: string; joined_at: string | null; created_at: string }
export interface AuditEvent { id: string; action: string; resource_type: string; resource_id: string | null; actor_user_id: string | null; event_metadata: Record<string, unknown>; request_id: string | null; created_at: string }
export interface Dashboard { organization: Pick<Tenant, 'id' | 'name' | 'slug' | 'status' | 'configuration'>; role: Role; counts: Record<'projects' | 'active_projects' | 'teams' | 'open_tasks' | 'members', number>; task_statuses: Record<string, number>; recent_events: AuditEvent[] }
export interface Usage { period_start: string; period_end: string; totals: Record<string, number>; current: Record<string, number>; daily: Array<Record<string, string | number>> }
export interface PlatformDashboard { tenants: Record<'total' | 'active' | 'suspended' | 'provisioning' | 'archived', number>; total_users: number; tenant_growth: Array<{ month: string; tenants: number }>; recent_events: AuditEvent[]; usage: Record<string, number> }
export interface Plan { id: string; code: string; name: string; limits: Record<string, number>; price_cents_monthly: number }
export interface ApiKey { id: string; name: string; prefix: string; scopes: string[]; created_at: string; expires_at: string | null; last_used_at: string | null; revoked_at: string | null }
