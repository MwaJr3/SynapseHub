import { useState } from 'react';
import { usePageParam } from '../hooks/usePageParam';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { FolderPlus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../features/auth/auth-context';
import { api, formatDate } from '../services/api';
import type { Page, Project, Team } from '../types';
import { Alert, Button, ConfirmDialog, EmptyState, ErrorState, LoadingRows, Modal, PageHeader, Pagination, StatusBadge } from '../components/ui';

interface FormValues { name: string; description: string; team_id: string; status: string }

export default function ProjectsPage() {
  const { selectedTenantId, currentMembership } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = usePageParam();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('created_at');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [notice, setNotice] = useState('');
  const canWrite = currentMembership?.role !== 'read_only';
  const canDelete = ['tenant_admin', 'manager'].includes(currentMembership?.role || '');
  const query = useQuery({ queryKey: ['projects', selectedTenantId, page, search, status, sort], queryFn: () => api<Page<Project>>(`/projects?page=${page}&page_size=12&search=${encodeURIComponent(search)}&status=${status}&sort=${sort}&order=desc`), enabled: Boolean(selectedTenantId) });
  const teams = useQuery({ queryKey: ['teams', selectedTenantId, 'options'], queryFn: () => api<Page<Team>>('/teams?page_size=100'), enabled: Boolean(selectedTenantId && createOpen) });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({ defaultValues: { name: '', description: '', team_id: '', status: 'active' } });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['projects', selectedTenantId] });
  const create = useMutation({ mutationFn: (values: FormValues) => api<Project>('/projects', { method: 'POST', body: JSON.stringify({ ...values, team_id: values.team_id || null }) }), onSuccess: () => { invalidate(); setCreateOpen(false); reset(); setNotice('Project created and recorded in the audit trail.'); } });
  const update = useMutation({ mutationFn: ({ project, nextStatus }: { project: Project; nextStatus: string }) => api<Project>(`/projects/${project.id}`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) }), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => api<void>(`/projects/${id}`, { method: 'DELETE' }), onSuccess: () => { invalidate(); setDeleting(null); setNotice('Project deleted. The change was committed with its audit event.'); } });

  return <div>
    <PageHeader eyebrow="Delivery / projects" title="Projects" description="Search, filter, and manage tenant-owned delivery work. Cross-tenant IDs are treated as missing resources." action={canWrite && <Button onClick={() => setCreateOpen(true)}><FolderPlus size={17} />New project</Button>} />
    {notice && <Alert>{notice}</Alert>}{create.error && <Alert tone="error">{create.error.message}</Alert>}{update.error && <Alert tone="error">{update.error.message}</Alert>}
    <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px_180px]"><div className="relative"><Search size={17} className="absolute left-3.5 top-3 text-slate-500" /><input aria-label="Search projects" className="input pl-10" placeholder="Search projects…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></div><select aria-label="Filter project status" className="input" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{['active', 'on_hold', 'completed', 'archived'].map(item => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select><select aria-label="Sort projects" className="input" value={sort} onChange={event => setSort(event.target.value)}><option value="created_at">Newest first</option><option value="name">Sort by name</option><option value="status">Sort by status</option></select></div>
    {query.isLoading ? <LoadingRows /> : query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : query.data && <>
      <div className="table-wrap">{query.data.items.length ? <table className="table"><thead><tr><th>Project</th><th>Status</th><th>Created</th><th>Tenant binding</th><th className="text-right">Actions</th></tr></thead><tbody>{query.data.items.map(project => <tr key={project.id}><td><p className="font-semibold text-ink-900">{project.name}</p><p className="mt-1 max-w-md truncate text-xs text-slate-500">{project.description || 'No description'}</p></td><td>{canWrite ? <select aria-label={`Status for ${project.name}`} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs capitalize" value={project.status} onChange={event => update.mutate({ project, nextStatus: event.target.value })}>{['active', 'on_hold', 'completed', 'archived'].map(item => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select> : <StatusBadge status={project.status} />}</td><td className="text-xs">{formatDate(project.created_at)}</td><td><code className="rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-600">{project.tenant_id.slice(0, 8)}…</code></td><td><div className="flex justify-end">{canDelete && <button onClick={() => setDeleting(project)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${project.name}`}><Trash2 size={17} /></button>}</div></td></tr>)}</tbody></table> : <EmptyState title="No projects found" description={search || status ? 'Try clearing the filters to see more tenant-owned projects.' : 'Create the first project for this organization.'} action={canWrite && !search && !status && <Button onClick={() => setCreateOpen(true)}>Create project</Button>} />}</div>
      <Pagination page={page} pages={query.data.meta.pages} onPage={setPage} />
    </>}
    {createOpen && <Modal title="Create a project" description={`The server will bind this project to ${currentMembership?.tenant_name}; no client tenant ID is accepted.`} onClose={() => setCreateOpen(false)}><form className="space-y-4" onSubmit={handleSubmit(values => create.mutate(values))}><div><label className="label" htmlFor="project-name">Project name</label><input id="project-name" autoFocus className="input" {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Use at least 2 characters' } })} placeholder="Customer onboarding" />{errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}</div><div><label className="label" htmlFor="project-description">Description</label><textarea id="project-description" className="input min-h-24" {...register('description')} placeholder="What will this team deliver?" /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Team</label><select className="input" {...register('team_id')}><option value="">Unassigned</option>{teams.data?.items.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div><div><label className="label">Initial status</label><select className="input" {...register('status')}><option value="active">Active</option><option value="on_hold">On hold</option></select></div></div><div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create project</Button></div></form></Modal>}
    {deleting && <ConfirmDialog title={`Delete “${deleting.name}”?`} description="This permanently deletes the project and its dependent tasks, comments, and documents in one transaction. This cannot be undone." confirmLabel="Delete project" loading={remove.isPending} onClose={() => setDeleting(null)} onConfirm={() => remove.mutate(deleting.id)} />}
  </div>;
}
