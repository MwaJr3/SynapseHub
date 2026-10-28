import { useState } from 'react';
import type { ChallengeRecord } from '../manifest';

interface Task { id: string; title: string; column: string; done: boolean }
const columns = ['Todo', 'Doing', 'Done'];
function load(slug: string): Task[] { try { const value = JSON.parse(localStorage.getItem(`mwangala.local-app.${slug}.v1`) || '[]'); return Array.isArray(value) ? value.filter((task) => task && typeof task.id === 'string' && typeof task.title === 'string') : []; } catch { return []; } }

export function KanbanApp({ project }: { project: ChallengeRecord }) {
  const [tasks, setTasks] = useState<Task[]>(() => load(project.slug));
  const [title, setTitle] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const save = (next: Task[]) => { setTasks(next); try { localStorage.setItem(`mwangala.local-app.${project.slug}.v1`, JSON.stringify(next)); setMessage('Board saved on this device.'); } catch { setMessage('Could not save this board in browser storage.'); } };
  const add = (event: React.FormEvent) => { event.preventDefault(); if (!title.trim()) return; save([{ id: crypto.randomUUID(), title: title.trim(), column: 'Todo', done: false }, ...tasks]); setTitle(''); };
  const move = (id: string, column: string) => save(tasks.map((task) => task.id === id ? { ...task, column, done: column === 'Done' } : task));
  return <div className="app-workspace"><form className="app-entry-form app-entry-form--inline" onSubmit={add}><label>New task<input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Write a task title" maxLength={120} /></label><button className="app-button">Add task</button></form>{message && <p className="app-feedback" role="status">{message}</p>}<div className="kanban-board">{columns.map((column) => <section key={column} className="kanban-column" onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragId) move(dragId, column); setDragId(null); }}><div className="kanban-column-heading"><h3>{column}</h3><span>{tasks.filter((task) => task.column === column).length}</span></div>{tasks.filter((task) => task.column === column).map((task) => <article key={task.id} className="kanban-task" draggable onDragStart={() => setDragId(task.id)} onDragEnd={() => setDragId(null)}><div className="kanban-task-top"><label><input type="checkbox" checked={task.done} onChange={() => move(task.id, task.done ? 'Todo' : 'Done')} />{task.title}</label><button className="app-icon-button" aria-label={`Delete ${task.title}`} onClick={() => save(tasks.filter((item) => item.id !== task.id))}>×</button></div><label className="kanban-move">Move to<select value={task.column} onChange={(e) => move(task.id, e.target.value)}>{columns.map((item) => <option key={item}>{item}</option>)}</select></label></article>)}{tasks.every((task) => task.column !== column) && <p className="app-small-note">No tasks here yet.</p>}</section>)}</div><p className="app-privacy-note">Drag tasks between columns or use the keyboard-accessible Move to control. This board is private to this browser.</p></div>;
}
