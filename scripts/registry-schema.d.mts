/** Type declarations for registry-schema.mjs (consumed by src/registry.test.ts under strict TS). */

export type SourceState = 'local' | 'external' | 'extracting' | 'archived';

export interface ValidatableEntry {
  slug: string;
  name?: string;
  path?: string;
  source?: string;
  repository?: string;
  defaultBranch?: string;
  kind?: string;
  deployment?: string;
  block?: string;
  interface?: string[];
  devPort?: number;
  deploys?: unknown[];
  pausedDeployment?: unknown;
}

export declare const SOURCE_STATES: readonly SourceState[];

export declare function sourceOf(entry: { source?: string }): SourceState;

export declare function hasPath<T extends { path?: string }>(entry: T): entry is T & { path: string };

export declare function validateEntry(
  entry: ValidatableEntry,
  blocks: Record<string, [number, number]>,
  pathExists: (path: string) => boolean,
): string[];

export declare function validateRegistry(
  doc: { projects: ValidatableEntry[] },
  blocks: Record<string, [number, number]>,
  pathExists: (path: string) => boolean,
): string[];
