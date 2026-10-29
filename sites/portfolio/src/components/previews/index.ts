import type { ComponentType } from 'react';
import { projects } from '@/data/projects';
import type { Project } from '@/types/project';
import { PhishLensPreview, NetScopePreview, SecureCodePreview } from './analysisPreviews';
import {
  ThreatIntelPreview,
  IncidentFlowPreview,
  HashSightPreview,
  AssetWatchPreview,
} from './opsPreviews';
import { CyberAwarePreview, TranscriptWisePreview } from './learningPreviews';

/**
 * Preview artwork registry. Each project's `preview.visual` key resolves here.
 * Every entry is drawn specifically for that project — no shared generic
 * dashboard mock, and no artwork presented as a screenshot.
 *
 * The accessible description is NOT stored here: it comes from
 * `project.preview.alt`, so the description always matches the project record
 * and cannot drift from it.
 */
const previewComponents: Record<string, ComponentType<{ title: string }>> = {
  phishlens: PhishLensPreview,
  netscope: NetScopePreview,
  'threatintel-desk': ThreatIntelPreview,
  incidentflow: IncidentFlowPreview,
  hashsight: HashSightPreview,
  assetwatch: AssetWatchPreview,
  'securecode-workbench': SecureCodePreview,
  'cyberaware-lab': CyberAwarePreview,
  transcriptwise: TranscriptWisePreview,
};

export interface PreviewEntry {
  Component: ComponentType<{ title: string }>;
  /** Accessible description, sourced from the project registry. */
  alt: string;
}

export function getPreview(project: Project): PreviewEntry | undefined {
  const Component = previewComponents[project.preview.visual];
  if (!Component) return undefined;
  return { Component, alt: project.preview.alt };
}

export function getPreviewComponent(visual: string): ComponentType<{ title: string }> | undefined {
  return previewComponents[visual];
}

/* Fail loudly if a project points at artwork that does not exist, or if an
   artwork component is orphaned. */
const missing = projects
  .filter((project) => !previewComponents[project.preview.visual])
  .map((project) => `${project.slug} -> ${project.preview.visual}`);
if (missing.length > 0) {
  throw new Error(`[previews] no artwork registered for: ${missing.join(', ')}`);
}

const referenced = new Set(projects.map((project) => project.preview.visual));
const orphaned = Object.keys(previewComponents).filter((key) => !referenced.has(key));
if (orphaned.length > 0) {
  throw new Error(`[previews] registered artwork not used by any project: ${orphaned.join(', ')}`);
}
