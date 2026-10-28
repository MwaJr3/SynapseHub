/**
 * Structure tests.
 *
 * A plugin is a set of files that a harness loads by convention. A typo in a
 * frontmatter key or a missing directory does not throw — it silently removes a
 * skill from the model's reach. These tests make the convention explicit.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const repoRoot = path.resolve(root, '../..');

const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

/** Parse the YAML-ish frontmatter used by commands, skills and agents. */
function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split('\n')) {
    const entry = /^([a-zA-Z-]+):\s*(.*)$/.exec(line);
    if (entry) fields[entry[1]] = entry[2].trim();
  }
  return fields;
}

test('the plugin manifest is valid JSON with the fields the loader needs', () => {
  const manifest = JSON.parse(read('.claude-plugin', 'plugin.json'));
  assert.equal(typeof manifest.name, 'string');
  assert.match(manifest.name, /^[a-z0-9-]+$/, 'plugin names are kebab-case');
  assert.ok(manifest.description.length > 40, 'the description is what users read in the marketplace');
  assert.equal(typeof manifest.author?.name, 'string');
  assert.ok(!('version' in manifest), 'the marketplace tracks the version; the manifest does not need one');
});

test('the marketplace entry points at a directory that exists', () => {
  const marketplace = JSON.parse(
    fs.readFileSync(path.join(repoRoot, '.claude-plugin', 'marketplace.json'), 'utf8'),
  );
  assert.ok(Array.isArray(marketplace.plugins) && marketplace.plugins.length >= 1);
  for (const plugin of marketplace.plugins) {
    const source = path.resolve(repoRoot, plugin.source);
    assert.ok(fs.existsSync(path.join(source, '.claude-plugin', 'plugin.json')), `${plugin.source} has a manifest`);
    const manifest = JSON.parse(fs.readFileSync(path.join(source, '.claude-plugin', 'plugin.json'), 'utf8'));
    assert.equal(manifest.name, plugin.name, 'the marketplace name and the manifest name agree');
  }
});

test('there are exactly four commands, each with a description and a body', () => {
  const commands = fs.readdirSync(path.join(root, 'commands')).filter((file) => file.endsWith('.md'));
  assert.deepEqual(commands.sort(), ['restyle.md', 'ux-audit.md', 'ux-design.md', 'ux-review.md']);
  for (const file of commands) {
    const text = read('commands', file);
    const meta = frontmatter(text);
    assert.ok(meta, `${file} has frontmatter`);
    assert.ok(meta.description.length > 30, `${file} describes itself`);
    const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
    assert.ok(body.trim().length > 400, `${file} has instructions, not just a title`);
  }
});

test('there are exactly nine skills, named after their directories, with activation-ready descriptions', () => {
  const directories = fs
    .readdirSync(path.join(root, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(directories, [
    'design-system',
    'feedback-and-affordance',
    'form-ux',
    'information-hierarchy',
    'intent-discovery',
    'responsive-design',
    'state-completeness',
    'ux-auditor',
    'visual-character',
  ]);
  for (const directory of directories) {
    const text = read('skills', directory, 'SKILL.md');
    const meta = frontmatter(text);
    assert.ok(meta, `${directory} has frontmatter`);
    assert.equal(meta.name, directory, `${directory}/SKILL.md declares the matching name`);
    assert.ok(meta.description.length >= 120, `${directory} has a description long enough to trigger on the right task`);
    assert.match(
      meta.description,
      /^Use (when|this agent)/,
      `${directory} says when it applies, in the first words — that is what the model matches on`,
    );
  }
});

test('agents declare a model and a description that names when to delegate', () => {
  const agents = fs.readdirSync(path.join(root, 'agents')).filter((file) => file.endsWith('.md'));
  assert.ok(agents.length >= 2, 'specialists exist only where delegation helps, but more than one does');
  for (const file of agents) {
    const meta = frontmatter(read('agents', file));
    assert.ok(meta, `${file} has frontmatter`);
    assert.equal(meta.name, file.replace(/\.md$/, ''));
    assert.match(meta.description, /Use this agent to/);
    assert.match(meta.model, /^(sonnet|opus|haiku|inherit)$/);
  }
});

test('the hook manifest points at a file that exists and is executable by node', () => {
  const hooks = JSON.parse(read('hooks', 'hooks.json'));
  const entries = hooks.hooks.PreToolUse;
  assert.ok(Array.isArray(entries) && entries.length >= 1);
  const command = entries[0].hooks[0].command;
  const target = /\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)/.exec(command);
  assert.ok(target, 'the hook uses ${CLAUDE_PLUGIN_ROOT}, so it works from any install location');
  assert.ok(fs.existsSync(path.join(root, target[1])), `${target[1]} exists`);
  assert.equal(entries[0].matcher, 'Bash', 'the guard only needs to see shell commands');
});

test('the plugin ships no dependencies and no lockfile', () => {
  const packageJson = JSON.parse(read('package.json'));
  assert.equal(packageJson.name, 'northstar-ux-engine');
  assert.ok(!packageJson.dependencies || Object.keys(packageJson.dependencies).length === 0);
  assert.ok(!fs.existsSync(path.join(root, 'node_modules')));
  assert.ok(!fs.existsSync(path.join(root, 'package-lock.json')));
});

test('the documentation set is complete', () => {
  for (const file of ['README.md', 'PATTERNS.md', 'CHANGELOG.md', 'LICENSE', 'templates/DESIGN.md']) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} exists`);
  }
  const changelog = read('CHANGELOG.md');
  assert.match(changelog, /^# Changelog/m);
  assert.match(changelog, /## \[1\.0\.0\]/);
});
