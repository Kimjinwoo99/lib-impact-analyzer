import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { collectProjectRuntimeFacts } from '../src/collect/project-runtime.js';

function makeProject(files) {
  const root = mkdtempSync(resolve(tmpdir(), 'project-runtime-'));
  for (const [path, content] of Object.entries(files)) {
    const full = resolve(root, path);
    mkdirSync(resolve(full, '..'), { recursive: true });
    writeFileSync(full, content, 'utf8');
  }
  return root;
}

describe('project runtime facts', () => {
  it('reports absent enforcement when nothing is declared — the vite golden-run finding', () => {
    const project = makeProject({ 'package.json': '{ "name": "fixture" }' });
    const facts = collectProjectRuntimeFacts(project);
    assert.deepEqual(facts.engines, { present: false, declared: null });
    assert.deepEqual(facts.nodeVersionFile, { present: false, path: null });
    assert.deepEqual(facts.ciWorkflow, { present: false, files: [] });
  });

  it('reports the project\'s own engines field, not the upgraded package\'s', () => {
    const project = makeProject({
      'package.json': '{ "name": "fixture", "engines": { "node": "^20.19.0 || >=22.12.0" } }',
    });
    const facts = collectProjectRuntimeFacts(project);
    assert.equal(facts.engines.present, true);
    assert.deepEqual(facts.engines.declared, { node: '^20.19.0 || >=22.12.0' });
  });

  it('finds .nvmrc', () => {
    const project = makeProject({ 'package.json': '{}', '.nvmrc': '20.19.0\n' });
    assert.deepEqual(collectProjectRuntimeFacts(project).nodeVersionFile, { present: true, path: '.nvmrc' });
  });

  it('finds .node-version when .nvmrc is absent', () => {
    const project = makeProject({ 'package.json': '{}', '.node-version': '22.12.0\n' });
    assert.deepEqual(collectProjectRuntimeFacts(project).nodeVersionFile, { present: true, path: '.node-version' });
  });

  it('finds a CI workflow file', () => {
    const project = makeProject({
      'package.json': '{}',
      '.github/workflows/ci.yml': 'name: CI\non: [push]\n',
    });
    const facts = collectProjectRuntimeFacts(project);
    assert.equal(facts.ciWorkflow.present, true);
    assert.deepEqual(facts.ciWorkflow.files, ['ci.yml']);
  });

  it('ignores non-workflow files in .github/workflows', () => {
    const project = makeProject({
      'package.json': '{}',
      '.github/workflows/README.md': 'not a workflow',
    });
    assert.deepEqual(collectProjectRuntimeFacts(project).ciWorkflow, { present: false, files: [] });
  });

  it('does not throw on an unparsable package.json', () => {
    const project = makeProject({ 'package.json': '{ not json' });
    assert.deepEqual(collectProjectRuntimeFacts(project).engines, { present: false, declared: null });
  });

  it('does not throw when package.json is missing entirely', () => {
    const project = makeProject({ '.gitkeep': '' });
    assert.deepEqual(collectProjectRuntimeFacts(project).engines, { present: false, declared: null });
  });

});
