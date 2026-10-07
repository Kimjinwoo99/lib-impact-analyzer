import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { auditCompanions, selectToolConfigFiles } from '../src/collect/companion-audit.js';

/*
 * Shapes measured on the real registry (2026-08 실측), not invented:
 * a 21-majors-behind unplugin, a plugin dormant since 2023, a peer-declared
 * plugin, and unrelated deps that must stay invisible.
 */
const NOW = Date.parse('2026-08-10T00:00:00Z');

const REGISTRY = {
  // Peer-silent, alive, far behind — the row this audit exists for.
  'unplugin-auto-import': {
    'dist-tags': { latest: '21.1.0' },
    time: { '21.1.0': '2026-08-03T00:00:00Z' },
    versions: {
      '0.17.6': { peerDependencies: {} },
      '21.1.0': { peerDependencies: {} },
    },
  },
  // Peer-silent and dormant: latest IS the installed version, 2023-12.
  'vite-plugin-remove-console': {
    'dist-tags': { latest: '2.2.0' },
    time: { '2.2.0': '2023-12-04T00:00:00Z' },
    versions: { '2.2.0': { peerDependencies: {} } },
  },
  // Peer-declared — discovered, but flagged so the L6 side can skip it
  // (it already travels as peerAudit.blocked).
  'vite-plugin-vue-layouts': {
    'dist-tags': { latest: '0.11.0' },
    time: { '0.11.0': '2024-01-01T00:00:00Z' },
    versions: { '0.11.0': { peerDependencies: { vite: '^4 || ^5' } } },
  },
  // Companion of vuetify by peer history AND name.
  'vite-plugin-vuetify': {
    'dist-tags': { latest: '2.1.3' },
    time: { '2.1.3': '2026-01-19T00:00:00Z' },
    versions: { '2.0.3': { peerDependencies: { vuetify: '^3.0.0', vite: '>=5' } } },
  },
  // Companion of vue by peer history. For vite it is the false-companion
  // shape: the installed 4.4.0 declares nothing, 5.1.0 grew a vite peer.
  'vue-router': {
    'dist-tags': { latest: '5.2.0' },
    time: { '5.2.0': '2026-06-01T00:00:00Z' },
    versions: {
      '4.4.0': { peerDependencies: { vue: '^3.2.0' } },
      '5.1.0': { peerDependencies: { vue: '^3.5.34', vite: '^7.0.0 || ^8.0.0' } },
    },
  },
  // Unrelated to everything — must never appear.
  axios: {
    'dist-tags': { latest: '1.19.0' },
    time: { '1.19.0': '2026-07-01T00:00:00Z' },
    versions: { '1.19.0': { peerDependencies: {} } },
  },
};

const loadMetadata = async (name) => {
  if (!REGISTRY[name]) throw new Error('404');
  return REGISTRY[name];
};

const VITE_CONFIG = `
import AutoImport from 'unplugin-auto-import/vite';
import removeConsole from 'vite-plugin-remove-console';
import Layouts from 'vite-plugin-vue-layouts';
export default { plugins: [AutoImport(), removeConsole(), Layouts()] };
`;

describe('companion discovery', () => {
  it('finds peer-silent plugins through the tool config, reporting latest and lag', async () => {
    const audit = await auditCompanions({
      packageName: 'vite',
      targetVersion: '8.2.1',
      dependencies: [
        { name: 'unplugin-auto-import', version: '0.17.6' },
        { name: 'axios', version: '1.19.0' },
      ],
      configTexts: [VITE_CONFIG],
      loadMetadata,
      now: NOW,
    });

    assert.deepEqual(audit.rows.map((row) => row.name), ['unplugin-auto-import']);
    const row = audit.rows[0];
    assert.deepEqual(row.discoveredBy, ['CONFIG_REFERENCE']);
    assert.equal(row.latestVersion, '21.1.0');
    assert.equal(row.majorsBehind, 21);
    assert.equal(row.peerVerdict, null);
    assert.equal(row.dormant, false);
  });

  it('marks a package with no release in two years as dormant — replacement territory', async () => {
    const audit = await auditCompanions({
      packageName: 'vite',
      targetVersion: '8.2.1',
      dependencies: [{ name: 'vite-plugin-remove-console', version: '2.2.0' }],
      configTexts: [VITE_CONFIG],
      loadMetadata,
      now: NOW,
    });
    const row = audit.rows[0];
    assert.equal(row.dormant, true);
    assert.ok(row.dormantMonths >= 24);
    // Name rule also fires (`vite-plugin-…` starts with vite).
    assert.ok(row.discoveredBy.includes('NAME_MENTION'));
  });

  it('carries the peer verdict on declared rows so consumers can dedupe against the peer audit', async () => {
    const audit = await auditCompanions({
      packageName: 'vite',
      targetVersion: '8.2.1',
      dependencies: [{ name: 'vite-plugin-vue-layouts', version: '0.11.0' }],
      configTexts: [VITE_CONFIG],
      loadMetadata,
      now: NOW,
    });
    assert.equal(audit.rows[0].peerVerdict, 'DEAD_END');
    assert.ok(audit.rows[0].discoveredBy.includes('PEER_HISTORY'));
  });

  /*
   * 골든 문서의 하드코딩 금지 조항: the same code must work for vuetify and
   * vue. Discovery is peer history + name segments, no vite anywhere.
   */
  it('works unchanged for vuetify as the analyzed package', async () => {
    const audit = await auditCompanions({
      packageName: 'vuetify',
      targetVersion: '4.0.0',
      dependencies: [
        { name: 'vite-plugin-vuetify', version: '2.0.3' },
        { name: 'axios', version: '1.19.0' },
      ],
      configTexts: [],
      loadMetadata,
      now: NOW,
    });
    assert.deepEqual(audit.rows.map((row) => row.name), ['vite-plugin-vuetify']);
    assert.ok(audit.rows[0].discoveredBy.includes('PEER_HISTORY'));
    assert.ok(audit.rows[0].discoveredBy.includes('NAME_MENTION'));
  });

  it('works unchanged for vue, without substring accidents', async () => {
    const audit = await auditCompanions({
      packageName: 'vue',
      targetVersion: '4.0.0',
      dependencies: [
        { name: 'vue-router', version: '4.4.0' },
        { name: 'axios', version: '1.19.0' },
      ],
      configTexts: [],
      loadMetadata,
      now: NOW,
    });
    assert.deepEqual(audit.rows.map((row) => row.name), ['vue-router']);
  });

  /*
   * The two over-collections measured on the real fixture: `vuetify` matched
   * inside the specifier `vite-plugin-vuetify`, and auto-import's preset
   * list `imports: ['vue', 'pinia', 'vue-router']` — libraries to generate
   * imports FOR, not modules the build loads — flagged three runtime
   * libraries as vite companions.
   */
  it('config discovery reads module loads, not every string the file contains', async () => {
    const registryWithRuntimeLibs = {
      ...REGISTRY,
      pinia: { 'dist-tags': { latest: '4.0.2' }, time: { '4.0.2': '2026-07-15T00:00:00Z' }, versions: { '2.1.7': {} } },
      vuetify: { 'dist-tags': { latest: '4.1.8' }, time: { '4.1.8': '2026-08-07T00:00:00Z' }, versions: { '3.6.10': {} } },
    };
    const audit = await auditCompanions({
      packageName: 'vite',
      targetVersion: '8.2.1',
      dependencies: [
        { name: 'pinia', version: '2.1.7' },
        { name: 'vuetify', version: '3.6.10' },
        { name: 'vue-router', version: '4.4.0' },
        { name: 'unplugin-auto-import', version: '0.17.6' },
      ],
      configTexts: [
        [
          "import AutoImport from 'unplugin-auto-import/vite';",
          "import vuetify from 'vite-plugin-vuetify';",
          "export default { plugins: [AutoImport({ imports: ['vue', 'pinia', 'vue-router'] }), vuetify()] };",
        ].join('\n'),
      ],
      loadMetadata: async (name) => {
        if (!registryWithRuntimeLibs[name]) throw new Error('404');
        return registryWithRuntimeLibs[name];
      },
      now: NOW,
    });

    const byName = Object.fromEntries(audit.rows.map((row) => [row.name, row]));
    // The loaded plugin is a config reference; the preset strings are not.
    assert.deepEqual(byName['unplugin-auto-import'].discoveredBy, ['CONFIG_REFERENCE']);
    assert.equal(byName.pinia, undefined);
    assert.equal(byName.vuetify, undefined);
    // vue-router survives only through peer history (5.x declared vite) —
    // the L6 payload filter drops that shape, tested in l6-judgment.
    assert.deepEqual(byName['vue-router']?.discoveredBy ?? [], ['PEER_HISTORY']);
  });

  it('an rc file with no imports registers plugins by quoted string', async () => {
    const audit = await auditCompanions({
      packageName: 'vite',
      targetVersion: '8.2.1',
      dependencies: [{ name: 'unplugin-auto-import', version: '0.17.6' }],
      configTexts: ['{ "plugins": ["unplugin-auto-import"] }'],
      loadMetadata,
      now: NOW,
    });
    assert.deepEqual(audit.rows.map((row) => row.name), ['unplugin-auto-import']);
    assert.deepEqual(audit.rows[0].discoveredBy, ['CONFIG_REFERENCE']);
  });

  it('is silently empty for a package with no companion ecosystem', async () => {
    const audit = await auditCompanions({
      packageName: 'axios',
      targetVersion: '2.0.0',
      dependencies: [
        { name: 'vue-router', version: '4.4.0' },
        { name: 'unplugin-auto-import', version: '0.17.6' },
      ],
      configTexts: [],
      loadMetadata,
      now: NOW,
    });
    assert.deepEqual(audit.rows, []);
  });

  it('sorts decisions first: dormant, then furthest behind', async () => {
    const audit = await auditCompanions({
      packageName: 'vite',
      targetVersion: '8.2.1',
      dependencies: [
        { name: 'unplugin-auto-import', version: '0.17.6' },
        { name: 'vite-plugin-remove-console', version: '2.2.0' },
      ],
      configTexts: [VITE_CONFIG],
      loadMetadata,
      now: NOW,
    });
    assert.deepEqual(audit.rows.map((row) => row.name), [
      'vite-plugin-remove-console',
      'unplugin-auto-import',
    ]);
  });
});

describe('tool config selection', () => {
  it('keeps only the analyzed tool\'s own config files', () => {
    const files = [
      '/p/vite.config.js',
      '/p/vite.config.ts',
      '/p/.viterc.json',
      '/p/eslint.config.js',
      '/p/package.json',
      '/p/sub/vite.config.mjs',
    ];
    assert.deepEqual(selectToolConfigFiles(files, 'vite'), [
      '/p/vite.config.js',
      '/p/vite.config.ts',
      '/p/.viterc.json',
      '/p/sub/vite.config.mjs',
    ]);
    assert.deepEqual(selectToolConfigFiles(files, 'eslint'), ['/p/eslint.config.js']);
  });

  it('matches Windows backslash paths — the separator must not decide discovery', () => {
    /*
     * 2026-08-20 실측 회귀: discoverConfigFiles가 Windows 절대경로를 돌려주면
     * '/'만 자르던 basename이 경로 전체가 되어 vite.config.js가 탈락했고,
     * CONFIG_REFERENCE로만 발견되는 unplugin류 동반 유닛 3건이 조용히
     * 사라졌다. 발견 규칙이 OS 경로 구분자에 좌우되면 안 된다.
     */
    const files = ['C:\\p\\vite.config.js', 'C:\\p\\eslint.config.js', 'C:\\p\\package.json'];
    assert.deepEqual(selectToolConfigFiles(files, 'vite'), ['C:\\p\\vite.config.js']);
  });
});
