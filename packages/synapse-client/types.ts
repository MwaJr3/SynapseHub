/** Shared web/native workspace contracts. Dates are local calendar dates, not UTC instants. */
export type ItemKind = 'task' | 'note' | 'source';
interface BaseItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}
export interface Task extends BaseItem {
  kind: 'task';
  completed: boolean;
  priority: 'normal' | 'high';
  due: string;
}
export interface Note extends BaseItem {
  kind: 'note';
}
export interface Source extends BaseItem {
  kind: 'source';
  url: string;
}
export type Item = Task | Note | Source;
export interface Relation {
  from: string;
  to: string;
  type: 'derived-from';
}
export interface Workspace {
  version: 1;
  revision: number;
  items: Item[];
  relations: Relation[];
}
