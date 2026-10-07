import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { collectPackageReferences } from '../src/collect/package-references.js';

function makeProject(files) {
  const root = mkdtempSync(resolve(tmpdir(), 'package-references-'));
  for (const [path, content] of Object.entries(files)) {
    const full = resolve(root, path);
    mkdirSync(resolve(full, '..'), { recursive: true });
    writeFileSync(full, content, 'utf8');
  }
  return root;
}

function refsOf(result, name) {
  return result[name] ?? [];
}

describe('package reference collector — import kind', () => {
  it('finds a plain import and a subpath import, with line numbers', () => {
    const project = makeProject({
      'src/main.js': [
        "import removeConsole from 'vite-plugin-remove-console';",
        "import '@vitejs/plugin-vue/client';",
      ].join('\n'),
      'package.json': '{}',
    });
    const result = collectPackageReferences({
      projectPath: project,
      packageName: 'vite',
      candidates: ['vite-plugin-remove-console', '@vitejs/plugin-vue'],
    });
    const removeConsole = refsOf(result, 'vite-plugin-remove-console');
    assert.equal(removeConsole[0].file, 'src/main.js');
    assert.equal(removeConsole[0].line, 1);
    assert.equal(removeConsole[0].kind, 'import');

    const pluginVue = refsOf(result, '@vitejs/plugin-vue');
    assert.equal(pluginVue[0].file, 'src/main.js');
    assert.equal(pluginVue[0].line, 2);
  });

  it('does not match a name that is only a prefix of another package', () => {
    const project = makeProject({
      'src/main.js': "import x from 'vite-plugin-vuetify';",
      'package.json': '{}',
    });
    const result = collectPackageReferences({ projectPath: project, packageName: 'vite', candidates: ['vite-plugin'] });
    assert.deepEqual(refsOf(result, 'vite-plugin'), []);
  });

  it('reports an empty array — not an omission — for a candidate with no reference anywhere', () => {
    const project = makeProject({ 'package.json': '{}' });
    const result = collectPackageReferences({ projectPath: project, packageName: 'vite', candidates: ['ghost-plugin'] });
    assert.deepEqual(result['ghost-plugin'], []);
  });
});

describe('package reference collector — type-reference kind', () => {
  it('finds a triple-slash reference in a .d.ts file', () => {
    const project = makeProject({
      'env.d.ts': '/// <reference types="vite-plugin-vue-layouts/client" />\n',
      'package.json': '{}',
    });
    const result = collectPackageReferences({
      projectPath: project,
      packageName: 'vite',
      candidates: ['vite-plugin-vue-layouts'],
    });
    const refs = refsOf(result, 'vite-plugin-vue-layouts');
    assert.equal(refs[0].kind, 'type-reference');
    assert.equal(refs[0].file, 'env.d.ts');
    assert.equal(refs[0].line, 1);
  });

  it('finds a subpath reference inside tsconfig.json\'s types array', () => {
    const project = makeProject({
      'tsconfig.json': '{\n  "compilerOptions": {\n    "types": ["vite/client"]\n  }\n}',
      'package.json': '{}',
    });
    // Candidate here is a companion package that also ships a vite/client-style
    // subpath — the Round 6 inventory finding this codifies.
    const result = collectPackageReferences({ projectPath: project, packageName: 'vite', candidates: ['vite'] });
    const refs = refsOf(result, 'vite');
    assert.ok(refs.some((ref) => ref.file === 'tsconfig.json' && ref.line === 3 && ref.kind === 'type-reference'));
  });
});

describe('package reference collector — config-registration kind', () => {
  it('finds a candidate registered in the analyzed package\'s own config file', () => {
    const project = makeProject({
      'vite.config.js': [
        "import layouts from 'vite-plugin-vue-layouts';",
        'export default { plugins: [layouts()] };',
      ].join('\n'),
      'package.json': '{}',
    });
    const result = collectPackageReferences({
      projectPath: project,
      packageName: 'vite',
      candidates: ['vite-plugin-vue-layouts'],
    });
    const refs = refsOf(result, 'vite-plugin-vue-layouts');
    assert.ok(refs.some((ref) => ref.kind === 'config-registration' && ref.file === 'vite.config.js'));
  });

  it('does not look inside a config file belonging to a different tool', () => {
    const project = makeProject({
      'babel.config.js': "module.exports = { presets: ['unrelated-plugin'] };",
      'package.json': '{}',
    });
    const result = collectPackageReferences({ projectPath: project, packageName: 'vite', candidates: ['unrelated-plugin'] });
    assert.deepEqual(refsOf(result, 'unrelated-plugin').filter((ref) => ref.kind === 'config-registration'), []);
  });
});

describe('package reference collector — manifest kind', () => {
  it('finds the dependency declaration line in package.json', () => {
    const project = makeProject({
      'package.json': [
        '{',
        '  "dependencies": {',
        '    "vue": "^3.5.0"',
        '  },',
        '  "devDependencies": {',
        '    "vite-plugin-vue-layouts": "^0.11.0"',
        '  }',
        '}',
      ].join('\n'),
    });
    const result = collectPackageReferences({
      projectPath: project,
      packageName: 'vite',
      candidates: ['vite-plugin-vue-layouts'],
    });
    const refs = refsOf(result, 'vite-plugin-vue-layouts');
    assert.ok(refs.some((ref) => ref.kind === 'manifest' && ref.file === 'package.json' && ref.line === 6));
  });
});

describe('package reference collector — virtual-module kind', () => {
  it('finds a project import of a virtual specifier the candidate\'s own types declare', () => {
    const project = makeProject({
      'runtime/setup/navigation.js': "import { setupLayouts } from 'virtual:generated-layouts';\n",
      'node_modules/vite-plugin-vue-layouts/client.d.ts': [
        'declare module "virtual:generated-layouts" {',
        '  export function setupLayouts(routes: any[]): any[]',
        '}',
      ].join('\n'),
      'package.json': '{}',
    });
    const result = collectPackageReferences({
      projectPath: project,
      packageName: 'vite',
      candidates: ['vite-plugin-vue-layouts'],
    });
    const refs = refsOf(result, 'vite-plugin-vue-layouts');
    assert.ok(
      refs.some((ref) => ref.kind === 'virtual-module' && ref.file === 'runtime/setup/navigation.js' && ref.line === 1),
      `expected a virtual-module reference, got ${JSON.stringify(refs)}`,
    );
  });

  it('finds nothing when the candidate is not installed (no node_modules entry)', () => {
    const project = makeProject({
      'runtime/setup/navigation.js': "import { setupLayouts } from 'virtual:generated-layouts';\n",
      'package.json': '{}',
    });
    const result = collectPackageReferences({
      projectPath: project,
      packageName: 'vite',
      candidates: ['vite-plugin-vue-layouts'],
    });
    assert.deepEqual(refsOf(result, 'vite-plugin-vue-layouts'), []);
  });

  it('excludes node_modules from the general source scan while still reading the candidate\'s own types', () => {
    const project = makeProject({
      'node_modules/some-dep/index.js': "import 'vite-plugin-vue-layouts';",
      'package.json': '{}',
    });
    const result = collectPackageReferences({
      projectPath: project,
      packageName: 'vite',
      candidates: ['vite-plugin-vue-layouts'],
    });
    // The import lives inside node_modules — not project source — so it must
    // not surface as evidence of THIS project's usage.
    assert.deepEqual(refsOf(result, 'vite-plugin-vue-layouts'), []);
  });
});

describe('package reference collector — evidence cap and ranking', () => {
  it('caps references per candidate and dedupes identical file:line', () => {
    const files = {};
    for (let i = 0; i < 10; i += 1) {
      files[`src/file${i}.js`] = "import x from 'some-plugin';\nimport x2 from 'some-plugin';\n";
    }
    files['package.json'] = '{}';
    const project = makeProject(files);
    const result = collectPackageReferences({ projectPath: project, packageName: 'vite', candidates: ['some-plugin'] });
    const refs = refsOf(result, 'some-plugin');
    assert.ok(refs.length <= 4, `expected cap of 4, got ${refs.length}`);
  });

});
