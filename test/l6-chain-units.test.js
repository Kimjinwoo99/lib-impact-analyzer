import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { buildChainUnits, buildL6Input, validateL6Result } from '../src/agent/l6-prompt.js';
import { buildL6FallbackResult } from '../src/agent/l6-fallback-result.js';

/*
 * chain:* determinization (2026-08-14, l6-deterministic-evidence-design.md
 * §8.2 follow-up): the prompt used to tell the model to CREATE chain units
 * from requirements/peerAudit/companions, and across Rounds 8/10/11 it
 * dropped 0, 1, then ALL 3 of the requirements-driven ones. The units are
 * now built by code; these tests pin (1) the Round 8 golden's chain-unit set
 * as the builder's parity fixture, (2) the merge/priority rules, and (3) the
 * completeness check that turns a silent omission into a loud failure.
 */

// The vite 5.2.11 → 8.2.1 golden's chain inputs, condensed — including the
// optional peers vite declares that this project never installed, which is
// what the E2c filter exists for.
const vitePayload = {
  packageName: 'vite',
  currentVersion: '5.2.11',
  targetVersion: '8.2.1',
  classifiedItems: [],
  requirements: {
    comparedTo: '8.2.1',
    engines: { installed: '^18.0.0 || >=20.0.0', compared: '^20.19.0 || >=22.12.0', changed: true },
    peerDependencies: {
      added: [],
      removed: [],
      changed: [
        { name: 'sass', from: '*', to: '^1.70.0', optional: true },
        { name: '@types/node', from: '^18.0.0 || >=20.0.0', to: '^20.19.0 || >=22.12.0', optional: true },
        // The optional peers vite declares but this project never installed —
        // the ten that buried the real findings before the E2c filter.
        { name: 'stylus', from: '*', to: '^0.62.0', optional: true },
        { name: 'sugarss', from: '*', to: '^4.0.1', optional: true },
      ],
    },
  },
  // E2c: the project's own direct dependencies. sass is declared, @types/node
  // and the rest are not.
  installedPackages: { sass: '1.77.6', vue: '3.4.27', typescript: '5.8.3' },
  peerAudit: {
    targetVersion: '8.2.1',
    rows: [
      { name: '@vitejs/plugin-vue', installedVersion: '5.0.5', installedPeerRange: '^5.0.0', verdict: 'UPGRADE_REQUIRED', firstCompatible: '6.0.3', latestCompatible: '6.0.8', references: [{ file: 'vite.config.js', line: 2, kind: 'import', excerpt: "import vue from '@vitejs/plugin-vue';" }] },
      { name: 'vite-plugin-vue-layouts', installedVersion: '0.11.0', installedPeerRange: '^4.0.0 || ^5.0.0', verdict: 'DEAD_END', firstCompatible: null, latestCompatible: null, references: [{ file: 'vite.config.js', line: 8, kind: 'import', excerpt: "import layouts from 'vite-plugin-vue-layouts';" }] },
      { name: 'happy-plugin', installedVersion: '1.0.0', installedPeerRange: '>=3', verdict: 'OK', firstCompatible: '1.0.0', latestCompatible: '1.0.0' },
    ],
    companions: [
      { name: 'unplugin-vue-components', installedVersion: '0.27.2', peerVerdict: null, discoveredBy: ['CONFIG_REFERENCE'], latestVersion: '32.1.0', latestPublishedAt: '2026-05-20T00:00:00Z', majorsBehind: 32, dormant: false },
      { name: 'unplugin-auto-import', installedVersion: '0.17.6', peerVerdict: null, discoveredBy: ['CONFIG_REFERENCE'], latestVersion: '21.1.0', latestPublishedAt: '2026-08-03T00:00:00Z', majorsBehind: 21, dormant: false },
      { name: 'unplugin-vue-router', installedVersion: '0.8.8', peerVerdict: null, discoveredBy: ['CONFIG_REFERENCE'], latestVersion: '0.19.2', latestPublishedAt: '2025-12-29T00:00:00Z', majorsBehind: 0, dormant: false },
      { name: 'vite-plugin-remove-console', installedVersion: '2.2.0', peerVerdict: null, discoveredBy: ['CONFIG_REFERENCE', 'NAME_MENTION'], latestVersion: '2.2.0', latestPublishedAt: '2023-12-04T00:00:00Z', majorsBehind: 0, dormant: true },
    ],
  },
};

/*
 * Round 8 judged nine chain units; eight survive the E2c filter. `@types/node`
 * does not, and that is a correction rather than a regression: it is neither a
 * direct dependency nor present in node_modules of the analyzed project
 * (verified 2026-08-14), so vite tightening its OPTIONAL peer range forces
 * nothing. Round 8's ACTION_REQUIRED for it came from the model not knowing
 * whether it was installed — the gap its own reason admitted.
 */
const EXPECTED_CHAIN_UNITS = [
  'chain:@vitejs/plugin-vue',
  'chain:vite-plugin-vue-layouts',
  'chain:node',
  'chain:sass',
  'chain:unplugin-vue-components',
  'chain:unplugin-auto-import',
  'chain:unplugin-vue-router',
  'chain:vite-plugin-remove-console',
];

describe('buildChainUnits — vite golden parity', () => {
  test('the vite golden evidence yields exactly the expected chain units', () => {
    const input = buildL6Input(vitePayload);
    const chainKeys = input.units.filter((unit) => unit.unit.startsWith('chain:')).map((unit) => unit.unit);
    assert.deepEqual([...chainKeys].sort(), [...EXPECTED_CHAIN_UNITS].sort());
  });

  test('optional peers the project never installed build no unit', () => {
    const input = buildL6Input(vitePayload);
    const chainKeys = input.units.map((unit) => unit.unit);
    for (const absent of ['chain:@types/node', 'chain:stylus', 'chain:sugarss']) {
      assert.ok(!chainKeys.includes(absent), `${absent} must not be a unit — optional peer, not installed`);
    }
  });

  test('field groups carry the evidence the Round 8 judgments actually cited', () => {
    const input = buildL6Input(vitePayload);
    const byKey = new Map(input.units.map((unit) => [unit.unit, unit]));

    const node = byKey.get('chain:node');
    assert.deepEqual(node.sources, ['engines']);
    assert.equal(node.engines.compared, '^20.19.0 || >=22.12.0');

    const sass = byKey.get('chain:sass');
    assert.deepEqual(sass.sources, ['peer-diff']);
    // installedVersion is what turns Round 8's SMOKE_TEST + evidence gap
    // ("설치된 sass 버전이 입력에 없어") into a decidable comparison.
    assert.deepEqual(sass.peer, { from: '*', to: '^1.70.0', optional: true, installedVersion: '1.77.6' });

    const layouts = byKey.get('chain:vite-plugin-vue-layouts');
    assert.equal(layouts.blocked.verdict, 'DEAD_END');
    assert.equal(layouts.references[0].file, 'vite.config.js');

    const removeConsole = byKey.get('chain:vite-plugin-remove-console');
    assert.equal(removeConsole.companion.dormant, true);
    // companionsForThisTarget already trimmed the timestamp to a date.
    assert.equal(removeConsole.companion.latestPublishedAt, '2023-12-04');
  });

  /*
   * The FP this pins: vuetify 4.1.11 ships NO engines field while 3.6.10 had
   * one, so `changed` is true with `compared: null` — a constraint that
   * DISAPPEARED. That is a relaxation, the same rule that keeps a removed
   * peer from building a unit, yet it produced a chain:node ACTION telling
   * the user to audit their Node version for no reason (real-project measured run,
   * 2026-08-24 — same family as the ledger's §J/§L "Node engines" FPs).
   */
  test('engines dropped by the target builds no unit — a vanished constraint is a relaxation', () => {
    const units = buildChainUnits({
      requirements: {
        comparedTo: '4.1.11',
        engines: { installed: '^12.20 || >=14.13', compared: null, changed: true },
        peerDependencies: { added: [], removed: [], changed: [] },
      },
    });
    assert.deepEqual(units.map((unit) => unit.unit), []);
  });

  test('a peer newly added by the target builds a unit; a removed peer builds none', () => {
    const units = buildChainUnits({
      requirements: {
        comparedTo: '8.2.1',
        peerDependencies: {
          added: [{ name: 'lightningcss', range: '^1.21.0', optional: false }],
          removed: [{ name: 'stylus', range: '*', optional: true }],
          changed: [],
        },
      },
      installedPackages: { lightningcss: '1.22.0' },
    });
    assert.deepEqual(units.map((unit) => unit.unit), ['chain:lightningcss']);
    assert.deepEqual(units[0].peer, { from: null, to: '^1.21.0', optional: false, installedVersion: '1.22.0' });
  });

  test('a REQUIRED peer the project lacks still builds a unit — absence is the finding', () => {
    // The failure mode the optional flag exists to prevent: filtering on
    // "not installed" alone would drop exactly the case where the project
    // must ADD a dependency to reach the target.
    const units = buildChainUnits({
      requirements: {
        comparedTo: '8.2.1',
        peerDependencies: {
          added: [{ name: 'must-have', range: '^2.0.0', optional: false }],
          removed: [],
          changed: [],
        },
      },
      installedPackages: { vue: '3.4.27' },
    });
    assert.deepEqual(units.map((unit) => unit.unit), ['chain:must-have']);
    assert.equal(units[0].peer.installedVersion, null);
  });

  test('unknown optionality keeps the unit — npm treats an unflagged peer as required', () => {
    const units = buildChainUnits({
      requirements: {
        comparedTo: '8.2.1',
        peerDependencies: { added: [], removed: [], changed: [{ name: 'legacy-shape', from: '^1', to: '^2' }] },
      },
      installedPackages: { vue: '3.4.27' },
    });
    assert.deepEqual(units.map((unit) => unit.unit), ['chain:legacy-shape']);
  });

  test('an unreadable project (installedPackages null) filters nothing', () => {
    const units = buildChainUnits({
      requirements: {
        comparedTo: '8.2.1',
        peerDependencies: { added: [], removed: [], changed: [{ name: 'stylus', from: '*', to: '^0.62.0', optional: true }] },
      },
      installedPackages: null,
    });
    assert.deepEqual(units.map((unit) => unit.unit), ['chain:stylus']);
    assert.equal(units[0].peer.installedVersion, null);
  });

  test('one package hit by several sources merges into one unit, blocked first', () => {
    const units = buildChainUnits({
      requirements: {
        comparedTo: '8.2.1',
        peerDependencies: { added: [], removed: [], changed: [{ name: 'shared-pkg', from: '^1', to: '^2' }] },
      },
      peerAudit: {
        blocked: [{ name: 'shared-pkg', installedVersion: '1.0.0', installedPeerRange: '^1', verdict: 'UPGRADE_REQUIRED', firstCompatible: '2.0.0', latestCompatible: '2.3.0', references: [{ file: 'vite.config.js', line: 4, kind: 'import', excerpt: 'x' }] }],
        okCount: 0,
      },
    });
    assert.equal(units.length, 1);
    assert.deepEqual(units[0].sources, ['peer-blocked', 'peer-diff']);
    assert.equal(units[0].blocked.firstCompatible, '2.0.0');
    assert.deepEqual(units[0].peer, { from: '^1', to: '^2', optional: null, installedVersion: null });
    assert.equal(units[0].references.length, 1);
  });

  test('the target gates are inherited: stale diff or no target → zero chain units', () => {
    // Same stale-card shape requirementsForThisTarget already rejects.
    const stale = buildL6Input({ ...vitePayload, targetVersion: '5.2.12' });
    assert.equal(stale.units.filter((unit) => unit.unit.startsWith('chain:')).length, 0);

    // Health check: no target at all.
    const healthCheck = buildL6Input({ ...vitePayload, targetVersion: null });
    assert.equal(healthCheck.units.filter((unit) => unit.unit.startsWith('chain:')).length, 0);
  });
});

describe('validateL6Result — completeness against the input units', () => {
  const judgment = (unit) => ({ unit, verdict: 'SMOKE_TEST', reason: 'ok' });

  test('a judgment set covering every expected unit passes', () => {
    const validated = validateL6Result(
      { judgments: [judgment('chain:node'), judgment('item:a')] },
      { expectedUnits: ['chain:node', 'item:a'] },
    );
    assert.equal(validated.judgments.length, 2);
  });

  test('a missing unit fails loudly and names it — the Round 11 silent omission', () => {
    assert.throws(
      () => validateL6Result(
        { judgments: [judgment('item:a')] },
        { expectedUnits: ['item:a', 'chain:node', 'chain:sass'] },
      ),
      /missing judgments for 2 unit\(s\): chain:node, chain:sass/,
    );
  });

  test('surplus units the model invented do not kill the run', () => {
    const validated = validateL6Result(
      { judgments: [judgment('item:a'), judgment('chain:extra')] },
      { expectedUnits: ['item:a'] },
    );
    assert.equal(validated.judgments.length, 2);
  });

  test('callers without an expected list keep the old shape-only behavior', () => {
    const validated = validateL6Result({ judgments: [judgment('item:a')] });
    assert.equal(validated.judgments.length, 1);
  });
});

describe('L6 fallback (Mock 실행) — chain units', () => {
  test('every chain unit gets a judgment, mapped by what the registry already ruled', () => {
    const { result } = buildL6FallbackResult(vitePayload);
    const byKey = new Map(result.judgments.map((judgment) => [judgment.unit, judgment]));
    for (const key of EXPECTED_CHAIN_UNITS) {
      assert.ok(byKey.has(key), `${key} missing from mock judgments`);
    }
    // blocked/engines are registry facts — ACTION_REQUIRED stays honest
    // without reading the project.
    assert.equal(byKey.get('chain:node').verdict, 'ACTION_REQUIRED');
    assert.equal(byKey.get('chain:vite-plugin-vue-layouts').verdict, 'ACTION_REQUIRED');
    assert.match(byKey.get('chain:node').reason, /engines 변화/);
    // peer-diff/companion still need project context.
    assert.equal(byKey.get('chain:sass').verdict, 'SMOKE_TEST');
    assert.equal(byKey.get('chain:unplugin-auto-import').verdict, 'SMOKE_TEST');
  });
});
