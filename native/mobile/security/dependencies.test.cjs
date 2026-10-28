const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const merge = require('deepmerge');
const { z } = require('zod');

test('deepmerge cannot poison the returned prototype via either target or source', () => {
  const poison = JSON.parse(
    '{"__proto__":{"injected":true},"constructor":{"prototype":{"injected":true}},"prototype":{"injected":true},"valid":{"x":1}}',
  );
  for (const value of [
    merge({}, poison),
    merge(poison, {}),
    merge(Object.create(null), poison),
  ]) {
    assert.equal(Object.getPrototypeOf(value), Object.prototype);
    assert.equal(value.injected, undefined);
    assert.equal(Object.hasOwn(value, '__proto__'), false);
    assert.equal(Object.hasOwn(value, 'constructor'), false);
    assert.equal(Object.hasOwn(value, 'prototype'), false);
    assert.deepEqual(value.valid, { x: 1 });
  }
  assert.equal({}.injected, undefined);
});

test('patched merge preserves Expo configuration semantics', () => {
  const symbol = Symbol('metadata');
  const first = {
    plugins: ['secure-store'],
    ios: { supportsTablet: true },
    [symbol]: 1,
  };
  const result = merge(first, {
    plugins: ['picker'],
    ios: { bundleIdentifier: 'com.example' },
  });
  assert.deepEqual(result.plugins, ['secure-store', 'picker']);
  assert.deepEqual(result.ios, {
    supportsTablet: true,
    bundleIdentifier: 'com.example',
  });
  assert.equal(result[symbol], 1);
  assert.deepEqual(first.plugins, ['secure-store']);
});

test('patched Zod rejects oversized constrained arrays before inspecting their elements', () => {
  let reads = 0;
  const value = new Array(1000).fill('text');
  Object.defineProperty(value, 1, {
    get() {
      reads++;
      return 'text';
    },
  });
  assert.equal(z.array(z.string()).max(1).safeParse(value).success, false);
  assert.equal(reads, 0);
});

test('Expo dev-tool schemas still accept valid plugins and reject invalid ones with Zod 4', () => {
  const cli = path.dirname(
    require.resolve('expo/node_modules/@expo/cli/package.json'),
  );
  const { PluginSchema, DevToolsPluginOutputSchema } = require(
    path.join(cli, 'build/src/start/server/DevToolsPlugin.schema.js'),
  );
  const { createMCPDevToolsExtensionSchema } = require(
    path.join(
      cli,
      'build/src/start/server/createMCPDevToolsExtensionSchema.js',
    ),
  );
  const plugin = {
    packageName: 'sample',
    packageRoot: '/tmp/sample',
    cliExtensions: {
      description: 'Sample',
      entryPoint: 'index.js',
      commands: [
        {
          name: 'open',
          title: 'Open',
          environments: ['cli'],
          parameters: [{ name: 'path', type: 'text' }],
        },
      ],
    },
  };
  assert.equal(PluginSchema.safeParse(plugin).success, true);
  assert.equal(
    PluginSchema.safeParse({ ...plugin, packageName: '' }).success,
    false,
  );
  assert.equal(
    DevToolsPluginOutputSchema.safeParse([
      { type: 'text', text: 'ok', level: 'info' },
    ]).success,
    true,
  );
  const schema = createMCPDevToolsExtensionSchema(plugin);
  assert.equal(
    schema.safeParse({ command: 'open', path: 'note' }).success,
    true,
  );
  assert.equal(schema.safeParse({ command: 'invalid' }).success, false);
});
