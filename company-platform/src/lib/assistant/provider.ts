/**
 * Model configuration for the assistants.
 *
 * Read at request time, never at module load, so a deployment can change the
 * provider without a rebuild and tests can set the environment per case.
 *
 * The wire protocol is OpenAI's chat-completions API, and that is the whole
 * contract. Anything speaking it can back the assistants: a hosted router, a
 * local Ollama, or OpenJarvis (`jarvis serve`, which exposes
 * `POST /v1/chat/completions` on port 8000). Nothing below is specific to a
 * vendor, and no provider's behaviour is assumed beyond the published shape.
 *
 * Two ways to configure it, in this order of precedence:
 *
 * 1. `ASSISTANT_BASE_URL` / `ASSISTANT_MODEL` — explicit, always wins.
 * 2. `ASSISTANT_PROVIDER=<preset>` — fills in the endpoint and default model.
 *
 * The key is never returned to a caller, logged, or placed in a client payload.
 */

export interface AssistantProviderConfig {
  configured: boolean;
  /** The preset that was applied, or null when the endpoint was set by hand. */
  provider: string | null;
  baseUrl: string;
  model: string;
  /** Which environment variable supplied the token — never the token itself. */
  keySource: string | null;
  missing: string[];
  reason: string;
}

export interface ProviderPreset {
  id: string;
  label: string;
  /** OpenAI-compatible root, including the version segment. */
  baseUrl: string;
  /**
   * Default model id, where the provider publishes a stable one. `null` means
   * the model has to be named: picking a default would be guessing at what is
   * installed on the machine.
   */
  model: string | null;
  /** False for an endpoint on this machine, which authenticates nobody. */
  requiresKey: boolean;
  /** Where the endpoint and model ids come from. Used in error text and docs. */
  source: string;
}

/**
 * The presets. A preset is a *starting point* for an operator, not a ranking:
 * the open-weight models named here are examples of what the endpoint accepts,
 * and this repository makes no claim about how well any of them perform a task.
 */
export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {
    id: 'openjarvis',
    label: 'OpenJarvis (local)',
    baseUrl: 'http://127.0.0.1:8000/v1',
    // `jarvis model` is the authority on what is installed; there is no default
    // worth guessing, so the model must be named.
    model: null,
    requiresKey: false,
    source: 'openjarvis.stanford.edu — `jarvis serve` starts the server on :8000',
  },
  {
    id: 'ollama-local',
    label: 'Ollama (local)',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'qwen2.5:3b',
    requiresKey: false,
    source: 'Ollama’s OpenAI-compatible endpoint',
  },
  {
    id: 'ollama-cloud',
    label: 'Ollama Cloud',
    baseUrl: 'https://ollama.com/v1',
    model: 'nemotron-3-nano:30b',
    requiresKey: true,
    // Named as unverified in .env.example because it came from a provider
    // example, not from this repository's own testing.
    source: 'the provider’s example configuration (not verified from this repository)',
  },
  {
    id: 'huggingface',
    label: 'Hugging Face Inference Providers',
    baseUrl: 'https://router.huggingface.co/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct',
    requiresKey: true,
    source: 'the Hugging Face router’s OpenAI-compatible endpoint',
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'openai/gpt-oss-20b',
    requiresKey: true,
    source: 'Groq’s OpenAI-compatible endpoint',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    // Hundreds of models behind one key; this is the free tier's default, and the
    // operator is expected to name their own.
    model: 'deepseek/deepseek-chat-v3:free',
    requiresKey: true,
    source: 'OpenRouter’s OpenAI-compatible endpoint',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-flash-latest',
    requiresKey: true,
    source: 'Gemini’s OpenAI-compatibility endpoint',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    requiresKey: true,
    // Named plainly: there is no free tier here, unlike the presets above.
    source: 'OpenAI’s API (paid; no free tier)',
  },
] as const;

const KEY_ENV_VARS = ['ASSISTANT_API_KEY', 'HUGGINGFACE_API_KEY', 'HF_TOKEN'] as const;

/** Endpoints that run on the same machine need no token. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

/** A plain environment record: `process.env` in a deployment, a literal in a test. */
export type ProviderEnv = Record<string, string | undefined>;

function readFrom(env: ProviderEnv, name: string): string {
  return (env[name] ?? '').trim();
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function isLocalHost(url: string): boolean {
  return LOCAL_HOSTS.has(hostOf(url));
}

/** The preset with this id, if one exists. */
export function presetFor(id: string): ProviderPreset | null {
  const wanted = id.trim().toLowerCase();
  if (wanted.length === 0) return null;
  return PROVIDER_PRESETS.find((preset) => preset.id === wanted) ?? null;
}

export function presetIds(): string[] {
  return PROVIDER_PRESETS.map((preset) => preset.id);
}

export function assistantConfig(env: ProviderEnv = process.env): AssistantProviderConfig {
  const explicitBaseUrl = readFrom(env, 'ASSISTANT_BASE_URL').replace(/\/$/, '');
  const explicitModel = readFrom(env, 'ASSISTANT_MODEL');
  const providerId = readFrom(env, 'ASSISTANT_PROVIDER').toLowerCase();
  const keySource = KEY_ENV_VARS.find((name) => readFrom(env, name).length > 0) ?? null;

  // An unknown preset is a configuration mistake worth naming rather than
  // silently ignoring — otherwise the operator sets a value and sees only
  // "switched off" with no hint about why.
  const preset = providerId.length > 0 ? presetFor(providerId) : null;
  if (providerId.length > 0 && preset === null) {
    return {
      configured: false,
      provider: providerId,
      baseUrl: explicitBaseUrl,
      model: explicitModel,
      keySource,
      missing: ['ASSISTANT_PROVIDER'],
      reason:
        `ASSISTANT_PROVIDER is “${providerId}”, which is not a known provider. ` +
        `Use one of: ${presetIds().join(', ')}.`,
    };
  }

  // Explicit values win over the preset, field by field, so a preset can be
  // kept for its endpoint while a different installed model is named.
  const baseUrl = explicitBaseUrl.length > 0 ? explicitBaseUrl : (preset?.baseUrl ?? '');
  const model = explicitModel.length > 0 ? explicitModel : (preset?.model ?? '');
  const local = baseUrl.length > 0 && isLocalHost(baseUrl);
  const needsKey = baseUrl.length > 0 ? !local : (preset?.requiresKey ?? true);

  const missing: string[] = [];
  if (baseUrl.length === 0) missing.push('ASSISTANT_BASE_URL');
  if (model.length === 0) missing.push('ASSISTANT_MODEL');
  if (needsKey && keySource === null) missing.push('ASSISTANT_API_KEY');

  if (missing.length > 0) {
    const hint =
      preset === null
        ? 'Either set ASSISTANT_PROVIDER to a preset, or set ASSISTANT_BASE_URL and ASSISTANT_MODEL directly.'
        : `${preset.label} needs ${missing.join(' and ')}.`;
    return {
      configured: false,
      provider: preset?.id ?? null,
      baseUrl,
      model,
      keySource,
      missing,
      reason: `No model is configured on this deployment, so the assistant is switched off. ${hint}`,
    };
  }

  return {
    configured: true,
    provider: preset?.id ?? null,
    baseUrl,
    model,
    keySource,
    missing: [],
    reason: `Configured for ${hostOf(baseUrl)} using ${model}.`,
  };
}

export function providerToken(
  config: AssistantProviderConfig,
  env: ProviderEnv = process.env,
): string {
  // Local servers ignore the value; the client still requires one.
  if (config.keySource === null) return 'not-needed';
  return readFrom(env, config.keySource);
}
