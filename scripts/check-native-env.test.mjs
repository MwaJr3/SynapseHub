import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
function check(overrides = {}, mobile = false) {
  const prefix = mobile ? 'EXPO_PUBLIC_' : 'VITE_';
  const settings = {
    SUPABASE_URL: 'https://project.example.org',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture',
    API_ORIGIN: 'https://workspace.example.org',
    ...overrides,
  };
  const env = { ...process.env };
  for (const [key, value] of Object.entries(settings))
    env[prefix + key] = value;
  return spawnSync(
    process.execPath,
    ['scripts/check-native-env.mjs', ...(mobile ? ['--mobile'] : [])],
    { env, encoding: 'utf8' },
  );
}
test('accepts explicit public HTTPS configuration for web and mobile', () => {
  assert.equal(check().status, 0);
  assert.equal(check({}, true).status, 0);
});
test('rejects absent, loopback, credential-bearing and non-origin endpoints', () => {
  for (const origin of [
    '',
    'http://workspace.example.org',
    'https://localhost',
    'https://127.0.0.2',
    'https://[::1]',
    'https://0.0.0.0',
    'https://api.localhost',
    'https://user:secret@workspace.example.org',
    'https://workspace.example.org/path',
    'https://workspace.example.org?token=secret',
    'https://workspace.example.org#secret',
  ]) {
    const result = check({ API_ORIGIN: origin });
    assert.notEqual(result.status, 0, origin);
    assert.equal(result.stderr.includes('user:secret@'), false);
  }
});
test('rejects privileged or missing keys without echoing their value', () => {
  for (const key of ['', 'sb_secret_must_never_be_exposed']) {
    const result = check({ SUPABASE_PUBLISHABLE_KEY: key });
    assert.notEqual(result.status, 0);
    assert.equal(
      result.stderr.includes('sb_secret_must_never_be_exposed'),
      false,
    );
  }
});
