import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { auditReversePeers, satisfiesRange } from '../src/collect/peer-audit.js';

describe('semver range evaluation (the subset peer declarations use)', () => {
  const cases = [
    // [version, range, expected]
    ['8.2.1', '^4 || ^5', false],
    ['5.2.11', '^4 || ^5', true],
    ['8.2.1', '^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0', true],
    ['8.2.1', '>=5.0.0', true],
    ['4.9.9', '>=5.0.0', false],
    ['8.2.1', '*', true],
    ['8.2.1', '', true],
    ['5.4.0', '~5.4.0', true],
    ['5.5.0', '~5.4.0', false],
    ['5.9.0', '~5', true],
    ['6.0.0', '~5', false],
    ['4.5.0', '4.x', true],
    ['5.0.0', '4.x', false],
    ['4.5.0', '4', true],
    ['1.5.0', '1.2.3 - 2.3.4', true],
    ['2.4.0', '1.2.3 - 2.3.4', false],
    ['0.2.5', '^0.2.3', true],
    ['0.3.0', '^0.2.3', false],
    ['20.19.5', '^20.19.0 || >=22.12.0', true],
    ['21.0.0', '^20.19.0 || >=22.12.0', false],
    ['22.12.0', '^20.19.0 || >=22.12.0', true],
    ['8.2.1', '>=5 <9', true],
    ['9.0.0', '>=5 <9', false],
    // Numeric part decides when a range carries a prerelease tag.
    ['5.1.0', '^5.0.0-beta.1', true],
    /*
     * 연산자와 버전 사이의 공백 — npm 문법이 허용하는 형태다. 여기서 파싱이
     * 깨지면 범위 전체가 false가 되어 호환 peer가 DEAD_END로 뒤집힌다
     * (@vue/eslint-config-prettier의 `eslint: ">= 8.21.0"`, 대장 §L 결함 1).
     */
    ['9.39.4', '>= 8.21.0', true],
    ['8.20.9', '>= 8.21.0', false],
    ['3.9.6', '>= 3.0.0', true],
    ['2.9.9', '>= 3.0.0', false],
    ['4.0.1', '> 4.0.0', true],
    ['4.0.0', '> 4.0.0', false],
    ['4.0.0', '<= 4.0.0', true],
    ['4.0.1', '<= 4.0.0', false],
    ['4.4.6', '= 4.4.6', true],
    ['1.5.0', '>= 1.0.0 < 2.0.0', true],
    ['2.0.0', '>= 1.0.0 < 2.0.0', false],
  ];
  for (const [version, range, expected] of cases) {
    it(`${version} vs "${range}" → ${expected}`, () => {
      assert.equal(satisfiesRange(version, range), expected);
    });
  }
});

describe('reverse peer audit', () => {
  // Registry shapes reduced to what the audit reads.
  const REGISTRY = {
    // Dead end: every published version caps at ^5 (the layouts case).
    'vite-plugin-vue-layouts': {
      versions: {
        '0.10.0': { peerDependencies: { vite: '^4 || ^5' } },
        '0.11.0': { peerDependencies: { vite: '^4 || ^5' } },
      },
    },
    // Upgrade path exists: 5.x caps at ^5, 6.x spans ^5–^8 (the plugin-vue case).
    '@vitejs/plugin-vue': {
      versions: {
        '5.0.5': { peerDependencies: { vite: '^5.0.0' } },
        '6.0.0': { peerDependencies: { vite: '^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0' } },
        '6.0.8': { peerDependencies: { vite: '^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0' } },
        '7.0.0-beta.1': { peerDependencies: { vite: '^8.0.0' } },
      },
    },
    // Already compatible.
    'vite-plugin-happy': {
      versions: { '1.0.0': { peerDependencies: { vite: '>=5.0.0' } } },
    },
    // Never declares a vite peer — unrelated, must not appear at all.
    axios: { versions: { '1.19.0': { peerDependencies: {} } } },
    /*
     * Declares a vite peer only from 5.1.0 on — the shape vue-router really
     * has. The installed 4.4.0 constrains nothing, so it must not appear.
     */
    'vue-router': {
      versions: {
        '4.4.0': { peerDependencies: { vue: '^3.2.0' } },
        '5.1.0': { peerDependencies: { vue: '^3.5.34', vite: '^7.0.0 || ^8.0.0' } },
      },
    },
  };
  const loadMetadata = async (name) => {
    if (!REGISTRY[name]) throw new Error('404');
    return REGISTRY[name];
  };

  it('classifies dead ends, upgrade paths and compatible installs', async () => {
    const audit = await auditReversePeers({
      packageName: 'vite',
      targetVersion: '8.2.1',
      dependencies: [
        { name: 'vite-plugin-vue-layouts', version: '0.11.0' },
        { name: '@vitejs/plugin-vue', version: '5.0.5' },
        { name: 'vite-plugin-happy', version: '1.0.0' },
        { name: 'axios', version: '1.19.0' },
        { name: 'vue-router', version: '4.4.0' },
        { name: 'not-on-registry', version: '0.0.1' },
        { name: 'vite', version: '5.2.11' },
      ],
      loadMetadata,
    });

    assert.deepEqual(audit.rows.map((row) => [row.name, row.verdict]), [
      ['vite-plugin-vue-layouts', 'DEAD_END'],
      ['@vitejs/plugin-vue', 'UPGRADE_REQUIRED'],
      ['vite-plugin-happy', 'OK'],
    ]);

    const pluginVue = audit.rows[1];
    // "한 번 올리면 끝까지": the compatible span starts at 6.0.0, and the
    // prerelease never becomes the recommendation.
    assert.equal(pluginVue.firstCompatible, '6.0.0');
    assert.equal(pluginVue.latestCompatible, '6.0.8');
    assert.equal(pluginVue.installedPeerRange, '^5.0.0');

    const layouts = audit.rows[0];
    assert.equal(layouts.firstCompatible, null);
    assert.equal(layouts.installedPeerRange, '^4 || ^5');
  });

  /*
   * The bug this pins: the verdict was read off the newest versions, so a
   * dependency that ADDED a peer later was reported as rejecting the target
   * and turned into a companion upgrade the project never needed.
   */
  it('skips a dependency whose installed version declares no peer, even when later versions do', async () => {
    const audit = await auditReversePeers({
      packageName: 'vite',
      targetVersion: '8.2.1',
      dependencies: [{ name: 'vue-router', version: '4.4.0' }],
      loadMetadata,
    });
    assert.deepEqual(audit.rows, []);
  });

  it('still audits that dependency once the installed version is one that declares a peer', async () => {
    const audit = await auditReversePeers({
      packageName: 'vite',
      targetVersion: '6.0.0',
      dependencies: [{ name: 'vue-router', version: '5.1.0' }],
      loadMetadata,
    });
    assert.deepEqual(audit.rows.map((row) => [row.name, row.verdict]), [['vue-router', 'DEAD_END']]);
  });

  it('reports OK rows too — the plan needs "이건 건드릴 필요 없음" as much as the blockers', async () => {
    const audit = await auditReversePeers({
      packageName: 'vite',
      targetVersion: '5.4.0',
      dependencies: [{ name: 'vite-plugin-vue-layouts', version: '0.11.0' }],
      loadMetadata,
    });
    assert.equal(audit.rows[0].verdict, 'OK');
  });
});
