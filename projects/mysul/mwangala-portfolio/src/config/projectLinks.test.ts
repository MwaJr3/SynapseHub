import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadWithOwner(owner: string | undefined) {
  vi.resetModules();
  if (owner === undefined) vi.stubEnv('VITE_REPO_OWNER', '');
  else vi.stubEnv('VITE_REPO_OWNER', owner);
  return import('./projectLinks');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('projectLinks', () => {
  it('hides repo links when not configured', async () => {
    const { projectLinks } = await loadWithOwner(undefined);
    expect(projectLinks('hashsight').repo).toBe('');
    expect(projectLinks('hashsight').live).toBe('');
  });

  it('builds monorepo tree URLs, never per-project repositories', async () => {
    const { projectLinks } = await loadWithOwner('MwaJr3');
    expect(projectLinks('hashsight').repo).toBe(
      'https://github.com/MwaJr3/SynapseHub/tree/main/projects/hashsight',
    );
    expect(projectLinks('phishlens').repo).toBe(
      'https://github.com/MwaJr3/SynapseHub/tree/main/apps/phishlens-cli',
    );
  });

  it('maps every registered slug to a verified tree path', async () => {
    const { projectLinks } = await loadWithOwner('MwaJr3');
    for (const slug of [
      'phishlens', 'netscope', 'threatintel-desk', 'incidentflow', 'hashsight',
      'assetwatch', 'securecode-workbench', 'cyberaware-lab', 'transcriptwise',
    ]) {
      expect(projectLinks(slug).repo, slug).toContain('/SynapseHub/tree/main/');
    }
  });

  it('returns empty for unknown slugs instead of guessing', async () => {
    const { projectLinks } = await loadWithOwner('MwaJr3');
    expect(projectLinks('does-not-exist').repo).toBe('');
  });

  it('trims slashes from the configured owner', async () => {
    const { projectLinks } = await loadWithOwner('/MwaJr3/');
    expect(projectLinks('netscope').repo).toBe(
      'https://github.com/MwaJr3/SynapseHub/tree/main/apps/netscope-cli',
    );
  });
});
