/**
 * Provider presets.
 *
 * `ASSISTANT_PROVIDER` was documented in `.env.example` for a while and no code
 * read it: setting it did nothing, and the assistants stayed off with a message
 * that named three variables the operator had already replaced. These tests pin
 * the behaviour that fixes that, and the precedence rule that keeps an explicit
 * endpoint in charge.
 *
 * The OpenJarvis case is the one that matters most here: it is a local endpoint,
 * so it must work with no token, and it has no default model because the model
 * that exists is whatever `jarvis model` installed.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  PROVIDER_PRESETS,
  assistantConfig,
  presetFor,
  presetIds,
  providerToken,
} from '@/lib/assistant/provider';

const README = join(dirname(fileURLToPath(import.meta.url)), '..', 'README.md');

const MANAGED = [
  'ASSISTANT_BASE_URL',
  'ASSISTANT_MODEL',
  'ASSISTANT_PROVIDER',
  'ASSISTANT_API_KEY',
  'HUGGINGFACE_API_KEY',
  'HF_TOKEN',
] as const;

const original = { ...process.env };

beforeEach(() => {
  for (const name of MANAGED) delete process.env[name];
});

afterEach(() => {
  process.env = { ...original };
});

describe('provider presets', () => {
  it('includes openjarvis pointing at the server `jarvis serve` starts', () => {
    const preset = presetFor('openjarvis');
    expect(preset).not.toBeNull();
    expect(preset?.baseUrl).toBe('http://127.0.0.1:8000/v1');
    // No default model: only `jarvis model` knows what is installed.
    expect(preset?.model).toBeNull();
    expect(preset?.requiresKey).toBe(false);
  });

  it('is case- and whitespace-insensitive, and returns null for an unknown id', () => {
    expect(presetFor('  OpenJarvis ')?.id).toBe('openjarvis');
    expect(presetFor('nonesuch')).toBeNull();
    expect(presetFor('')).toBeNull();
  });

  it('exposes every preset id exactly once', () => {
    const ids = presetIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('openjarvis');
  });

  it('configures a local preset with no API key', () => {
    process.env.ASSISTANT_PROVIDER = 'openjarvis';
    process.env.ASSISTANT_MODEL = 'qwen2.5:3b';

    const config = assistantConfig();
    expect(config.configured).toBe(true);
    expect(config.provider).toBe('openjarvis');
    expect(config.baseUrl).toBe('http://127.0.0.1:8000/v1');
    expect(config.model).toBe('qwen2.5:3b');
    expect(config.missing).toEqual([]);
    // A local server authenticates nobody; the client still sends a placeholder.
    expect(providerToken(config)).toBe('not-needed');
  });

  it('asks for the model when the preset has no default', () => {
    process.env.ASSISTANT_PROVIDER = 'openjarvis';

    const config = assistantConfig();
    expect(config.configured).toBe(false);
    expect(config.missing).toEqual(['ASSISTANT_MODEL']);
    // The message has to tell the operator what that preset still needs.
    expect(config.reason).toMatch(/OpenJarvis/);
    expect(config.reason).toMatch(/ASSISTANT_MODEL/);
  });

  it('requires a token for a hosted preset', () => {
    process.env.ASSISTANT_PROVIDER = 'huggingface';

    const config = assistantConfig();
    expect(config.configured).toBe(false);
    expect(config.missing).toEqual(['ASSISTANT_API_KEY']);
    expect(config.model).toBe('meta-llama/Llama-3.3-70B-Instruct');
  });

  it('names the problem when the provider id is not a preset', () => {
    // 'openai' used to be the obvious typo-shaped guess; it is a preset now, so
    // this uses a name no provider has.
    process.env.ASSISTANT_PROVIDER = 'openaii';

    const config = assistantConfig();
    expect(config.configured).toBe(false);
    expect(config.missing).toEqual(['ASSISTANT_PROVIDER']);
    // The message lists the valid ids, so the fix does not need the source.
    expect(config.reason).toContain('openjarvis');
  });

  it('lets an explicit endpoint and model override the preset', () => {
    process.env.ASSISTANT_PROVIDER = 'openjarvis';
    process.env.ASSISTANT_BASE_URL = 'http://127.0.0.1:9000/v1';
    process.env.ASSISTANT_MODEL = 'llama3.2:3b';

    const config = assistantConfig();
    expect(config.configured).toBe(true);
    expect(config.baseUrl).toBe('http://127.0.0.1:9000/v1');
    expect(config.model).toBe('llama3.2:3b');
  });

  it('treats a local explicit endpoint as needing no token, without a preset', () => {
    process.env.ASSISTANT_BASE_URL = 'http://localhost:11434/v1';
    process.env.ASSISTANT_MODEL = 'qwen2.5:3b';

    const config = assistantConfig();
    expect(config.configured).toBe(true);
    expect(config.provider).toBeNull();
    expect(config.keySource).toBeNull();
  });

  it('still requires a token for a non-local endpoint with no preset', () => {
    process.env.ASSISTANT_BASE_URL = 'https://api.example.com/v1';
    process.env.ASSISTANT_MODEL = 'some-model';

    const config = assistantConfig();
    expect(config.configured).toBe(false);
    expect(config.missing).toEqual(['ASSISTANT_API_KEY']);
  });

  it('never puts the token in the configuration or its reason', () => {
    process.env.ASSISTANT_PROVIDER = 'huggingface';
    process.env.ASSISTANT_API_KEY = 'hf_supersecretvalue';

    const config = assistantConfig();
    expect(config.configured).toBe(true);
    expect(config.keySource).toBe('ASSISTANT_API_KEY');
    expect(JSON.stringify(config)).not.toContain('hf_supersecretvalue');
    expect(config.reason).not.toContain('hf_supersecretvalue');
  });
});

describe('the README provider table', () => {
  /**
   * The README listed presets that the code never read, for long enough that
   * somebody could have set `ASSISTANT_PROVIDER` and wondered why nothing
   * happened. This test fails the moment the table and the presets disagree in
   * either direction.
   */
  function tableRows(): Array<{ id: string; baseUrl: string }> {
    const text = readFileSync(README, 'utf8');
    const rows: Array<{ id: string; baseUrl: string }> = [];
    for (const line of text.split('\n')) {
      const match = line.match(/^\|\s*`([a-z0-9-]+)`\s*\|\s*`?(https?:\/\/[^`|\s]+)`?\s*\|/);
      // Both groups are non-optional in the pattern; the check is for the type.
      if (match?.[1] && match[2]) rows.push({ id: match[1], baseUrl: match[2] });
    }
    return rows;
  }

  it('lists every preset, with the same endpoint', () => {
    const rows = tableRows();
    expect(rows.length).toBeGreaterThan(0);

    for (const preset of PROVIDER_PRESETS) {
      const row = rows.find((candidate) => candidate.id === preset.id);
      expect(row, `${preset.id} is missing from the README table`).toBeDefined();
      expect(row?.baseUrl, preset.id).toBe(preset.baseUrl);
    }

    // The other direction: a documented preset the code does not have would send
    // an operator to a name that reports "not a known provider".
    for (const row of rows) {
      expect(presetIds(), `${row.id} is in the README but not in the code`).toContain(row.id);
    }
  });
});
