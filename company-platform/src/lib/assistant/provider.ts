/**
 * Model configuration for the assistants.
 *
 * Read at request time, never at module load, so a deployment can change the
 * provider without a rebuild and tests can set the environment per case.
 *
 * The provider is any OpenAI-compatible endpoint. Hugging Face's Inference
 * Providers router is the intended default: one token reaches many open-weight
 * models, and the same weights can later be served locally behind the same
 * interface. Nothing here is specific to one vendor.
 *
 * The key is never returned to a caller, logged, or placed in a client payload.
 */

export interface AssistantProviderConfig {
  configured: boolean;
  baseUrl: string;
  model: string;
  /** Which environment variable supplied the token — never the token itself. */
  keySource: string | null;
  missing: string[];
  reason: string;
}

const KEY_ENV_VARS = ['ASSISTANT_API_KEY', 'HUGGINGFACE_API_KEY', 'HF_TOKEN'] as const;

/** Endpoints that run on the same machine need no token. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

function read(name: string): string {
  return (process.env[name] ?? '').trim();
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function assistantConfig(): AssistantProviderConfig {
  const baseUrl = read('ASSISTANT_BASE_URL').replace(/\/$/, '');
  const host = hostOf(baseUrl);
  const isLocal = LOCAL_HOSTS.has(host);
  const keySource = KEY_ENV_VARS.find((name) => read(name).length > 0) ?? null;
  const model = read('ASSISTANT_MODEL');

  const missing: string[] = [];
  if (baseUrl.length === 0) missing.push('ASSISTANT_BASE_URL');
  if (model.length === 0) missing.push('ASSISTANT_MODEL');
  if (keySource === null && !isLocal) missing.push('ASSISTANT_API_KEY');

  if (missing.length > 0) {
    return {
      configured: false,
      baseUrl,
      model,
      keySource,
      missing,
      reason:
        'No model is configured on this deployment, so the assistant is switched off. ' +
        'Set ASSISTANT_BASE_URL, ASSISTANT_MODEL and ASSISTANT_API_KEY.',
    };
  }

  return {
    configured: true,
    baseUrl,
    model,
    keySource,
    missing: [],
    reason: `Configured for ${host} using ${model}.`,
  };
}

export function providerToken(config: AssistantProviderConfig): string {
  // Local servers ignore the value; the client still requires one.
  if (config.keySource === null) return 'not-needed';
  return read(config.keySource);
}
