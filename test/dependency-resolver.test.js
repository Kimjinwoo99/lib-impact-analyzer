import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import { analyzeDependencies } from '../src/resolver/dependency-resolver.js';
import { getPackageNameFromSelector, parseYarnV1Lock, splitSelectorHeader } from '../src/resolver/yarn-lock.js';

const fixturePath = resolve('test/fixtures/sample-app-minimal');
const nestedFixturePath = resolve('test/fixtures/nested-workspace');

describe('dependency resolver', () => {
  it('reads direct dependencies and resolves yarn.lock versions', () => {
    const result = analyzeDependencies(fixturePath);

    assert.equal(result.packageName, 'sample-app-fixture');
    assert.equal(result.packageManager, 'yarn-v1');
    assert.equal(result.packageDiscovery.packageJsonCount, 1);
    assert.deepEqual(result.summary, {
      directTotal: 6,
      dependencies: 4,
      devDependencies: 2,
      resolvedDirect: 6,
      unresolvedDirect: 0,
      urlDependencies: 1,
      packagesWithMultipleVersions: 1,
    });

    const byName = new Map(result.directDependencies.map((dependency) => [dependency.name, dependency]));
    assert.equal(byName.get('axios').resolvedVersion, '1.8.4');
    assert.equal(byName.get('pinia').dependencyType, 'devDependencies');
    assert.equal(byName.get('vuetify').resolvedVersion, '3.6.10');
    assert.equal(byName.get('xlsx').isUrlDependency, true);
    assert.equal(byName.get('realgrid').resolvedVersion, '2.9.7');
    assert.deepEqual(byName.get('realgrid').installedVersions, ['2.8.9', '2.9.7']);
  });

  it('discovers nested package.json files and ignores generated folders', () => {
    const result = analyzeDependencies(nestedFixturePath);

    assert.equal(result.packageDiscovery.packageJsonCount, 2);
    assert.deepEqual(result.packages.map((pkg) => pkg.relativePath.replace(/\\/g, '/')), ['apps/web', 'packages/shared']);
    assert.equal(result.summary.directTotal, 4);
    assert.equal(result.summary.resolvedDirect, 4);
    assert.equal(result.packages.every((pkg) => pkg.packageManager === 'npm'), true);

    const web = result.packages.find((pkg) => pkg.packageName === 'nested-web');
    const webDeps = new Map(web.directDependencies.map((dependency) => [dependency.name, dependency]));
    assert.equal(webDeps.get('vue').resolvedVersion, '3.5.30');
    assert.equal(webDeps.get('vite').resolvedVersion, '5.3.2');
  });

  it('parses quoted multi-selector yarn headers', () => {
    assert.deepEqual(splitSelectorHeader('"a@^1.0.0", "a@^1.1.0"'), ['a@^1.0.0', 'a@^1.1.0']);
  });

  it('extracts package names from scoped and unscoped selectors', () => {
    assert.equal(getPackageNameFromSelector('axios@^1.0.0'), 'axios');
    assert.equal(getPackageNameFromSelector('@vitejs/plugin-vue@^5.0.0'), '@vitejs/plugin-vue');
  });

  it('parses yarn v1 lock content without filesystem access', () => {
    const parsed = parseYarnV1Lock('left-pad@^1.3.0:\n  version "1.3.0"\n  resolved "https://example.test/left-pad.tgz"\n');
    assert.equal(parsed.entriesBySelector.get('left-pad@^1.3.0').version, '1.3.0');
    assert.deepEqual(Array.from(parsed.versionsByPackageName.get('left-pad')), ['1.3.0']);
  });
});
