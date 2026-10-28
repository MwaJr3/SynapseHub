import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Blocks, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../features/auth/auth-context';
import { api, formatDate } from '../services/api';
import type { Page, Team } from '../types';
import { Alert, Button, ConfirmDialog, EmptyState, ErrorState, LoadingRows, Modal, PageHeader } from '../components/ui';

export default function TeamsPage() {
  const { selectedTenantId, currentMembership } = useAuth();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Team | null>(null);
  const [notice, setNotice] = useState('');
  const canManage = ['tenant_admin', 'manager'].includes(currentMembership?.role || '');
  const query = useQuery({ queryKey: ['teams', selectedTenantId], queryFn: () => api<Page<Team>>('/teams?page_size=100'), enabled: Boolean(selectedTenantId) });
  const { register, handleSubmit, reset } = useForm<{ name: string; description: string }>();
  const create = useMutation({ mutationFn: (values: { name: string; description: string }) => api<Team>('/teams', { method: 'POST', body: JSON.stringify(values) }), onSuccess: () => { client.invalidateQueries({ queryKey: ['teams', selectedTenantId] }); setOpen(false); reset(); setNotice('Team created.'); } });
  const remove = useMutation({ mutationFn: (id: string) => api<void>(`/teams/${id}`, { method: 'DELETE' }), onSuccess: () => { client.invalidateQueries({ queryKey: ['teams', selectedTenantId] }); setDeleting(null); setNotice('Team deleted.'); } });
  return <div><PageHeader eyebrow="Delivery / teams" title="Teams" description="Organize project ownership inside the current tenant. Teams cannot reference members or projects across tenant boundaries." action={canManage && <Button onClick={() => setOpen(true)}><Plus size={17} />New team</Button>} />
    {notice && <Alert>{notice}</Alert>}{create.error && <Alert tone="error">{create.error.message}</Alert>}{remove.error && <Alert tone="error">{remove.error.message}</Alert>}
    {query.isLoading ? <LoadingRows /> : query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : query.data?.items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data.items.map(team => <div key={team.id} className="card group p-5"><div className="flex items-start justify-between"><div className="rounded-xl bg-violet-50 p-2.5 text-violet-600"><Blocks size={20} /></div>{canManage && <button aria-label={`Delete ${team.name}`} onClick={() => setDeleting(team)} className="rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button>}</div><h2 className="mt-5 font-bold text-ink-950">{team.name}</h2><p className="mt-2 min-h-10 text-sm leading-6 text-slate-500">{team.description || 'No team description.'}</p><p className="mt-4 border-t border-slate-100 pt-3 text-[11px] text-slate-400">Created {formatDate(team.created_at)}</p></div>)}</div> : <EmptyState title="No teams yet" description="Create a team to assign ownership when creating projects." action={canManage && <Button onClick={() => setOpen(true)}>Create team</Button>} />}
    {open && <Modal title="Create a team" description="Team membership and project relationships remain tenant-bound." onClose={() => setOpen(false)}><form className="space-y-4" onSubmit={handleSubmit(values => create.mutate(values))}><div><label className="label">Team name</label><input autoFocus required minLength={2} className="input" {...register('name', { required: true })} /></div><div><label className="label">Description</label><textarea className="input min-h-28" {...register('description')} /></div><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create team</Button></div></form></Modal>}
    {deleting && <ConfirmDialog title={`Delete “${deleting.name}”?`} description="Teams with assigned projects cannot be deleted. Move those projects first, then retry." confirmLabel="Delete team" loading={remove.isPending} onClose={() => setDeleting(null)} onConfirm={() => remove.mutate(deleting.id)} />}
  </div>;
}
