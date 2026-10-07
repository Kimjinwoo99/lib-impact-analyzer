import assert from 'node:assert/strict';
import test, { describe, it } from 'node:test';
import { buildL6Input, buildL6Prompt, validateL6Result } from '../src/agent/l6-prompt.js';

const payload = {
  packageName: 'vuetify',
  currentVersion: '3.6.10',
  targetVersion: '4.1.7',
  reviewGroups: [
    {
      scope: 'VSelect',
      count: 11,
      usageVerdict: 'USED',
      fileCount: 9,
      items: Array.from({ length: 11 }, (_, index) => ({
        version: `4.0.${index}`,
        summary: `select change ${index}`,
      })),
    },
  ],
  classifiedItems: [
    { itemId: 'a', reviewRequired: true, version: '4.0.0', scope: 'VBtn', agentCategory: 'BREAKING', preliminaryRisk: 'HIGH', summary: 'btn default changed', inspectionPlan: { componentTags: ['VBtn'], configKeys: [] } },
    { itemId: 'b', reviewRequired: false, version: '4.0.1', scope: 'VChip', summary: 'skip me' },
  ],
  migrationSections: [
    { heading: 'VBtn text-transform', excerpt: 'buttons no longer uppercase', usedComponents: ['VBtn'], files: ['src/a.vue'], fileCount: 3, hasDiff: true },
  ],
  requirements: { comparedTo: '4.1.7', peerDependencies: { added: [], removed: [], changed: [{ name: 'vue', from: '^3.4', to: '^3.5' }] } },
};

describe('L6 prompt', () => {
  test('units carry guide sections, review groups and classified items', () => {
    const input = buildL6Input(payload);
    const units = input.units.map((unit) => unit.unit);
    assert.ok(units.includes('guide:VBtn text-transform'));
    assert.ok(units.includes('group:VSelect'));
    assert.ok(units.includes('item:a'));
    // Small range (≤20 classified): full coverage — the reviewRequired bit
    // flips between runs on borderline items, and a run where it lands false
    // must not leave L6 with nothing to judge.
    assert.ok(units.includes('item:b'));
    assert.equal(input.gate.rule, 'small-range-full-coverage');
    // Group samples are capped — the LLM gets representatives, not the pile.
    const group = input.units.find((unit) => unit.unit === 'group:VSelect');
    assert.equal(group.samples.length, 3);
    assert.equal(group.itemCount, 11);
  });

  test('classified-item gate: floor for small/starved runs, ceiling unchanged', () => {
    const item = (id, reviewRequired, preliminaryRisk = 'MEDIUM') => ({
      itemId: id, reviewRequired, preliminaryRisk, version: '4.0.0', scope: 'VChip', summary: `item ${id}`,
    });
    const itemUnits = (input) => input.units.filter((unit) => unit.unit.startsWith('item:'));

    // Large range with review items: today's behavior, nothing widens.
    const large = { ...payload, classifiedItems: [
      ...Array.from({ length: 25 }, (unused, i) => item(`r${i}`, i < 5)),
    ] };
    const largeInput = buildL6Input(large);
    assert.equal(largeInput.gate.rule, 'review-filter');
    assert.equal(itemUnits(largeInput).length, 5);

    // Large range where the flip landed all-false: bounded backfill by risk,
    // not zero and not the whole pile.
    const starved = { ...payload, classifiedItems: [
      ...Array.from({ length: 15 }, (unused, i) => item(`low${i}`, false, 'LOW')),
      ...Array.from({ length: 10 }, (unused, i) => item(`med${i}`, false, 'MEDIUM')),
    ] };
    const starvedInput = buildL6Input(starved);
    assert.equal(starvedInput.gate.rule, 'starvation-backfill');
    const judged = itemUnits(starvedInput);
    assert.equal(judged.length, 10);
    // MEDIUM outranks LOW in the backfill.
    assert.ok(judged.every((unit) => unit.preliminaryRisk === 'MEDIUM'));
  });

  test('peer audit rows ride along only when scanned against this target', () => {
    const audit = {
      targetVersion: '4.1.7',
      rows: [
        { name: 'vite-plugin-vue-layouts', installedVersion: '0.11.0', installedPeerRange: '^4 || ^5', verdict: 'DEAD_END', firstCompatible: null, latestCompatible: null },
        { name: 'vite-plugin-happy', installedVersion: '1.0.0', installedPeerRange: '>=3', verdict: 'OK', firstCompatible: '1.0.0', latestCompatible: '1.0.0' },
      ],
    };
    const input = buildL6Input({ ...payload, peerAudit: audit });
    assert.equal(input.peerAudit.blocked.length, 1);
    assert.equal(input.peerAudit.blocked[0].verdict, 'DEAD_END');
    // OK rows fold to a count — "나머지는 확인됨" as a statement.
    assert.equal(input.peerAudit.okCount, 1);

    // Same stale-evidence rule as requirements: a scan against another target
    // is not evidence for this run.
    const stale = buildL6Input({ ...payload, peerAudit: { ...audit, targetVersion: '4.0.0' } });
    assert.equal(stale.peerAudit, null);
    const prompt = buildL6Prompt({ ...payload, peerAudit: audit });
    assert.match(prompt, /peerAudit\.blocked/);
  });

  test('peer-silent companions ride along; peer-declared ones stay with the peer audit', () => {
    const audit = {
      targetVersion: '4.1.7',
      rows: [],
      companions: [
        // The row this channel exists for: registry cannot rule, but knows
        // the latest version and that the package stopped moving.
        { name: 'vite-plugin-remove-console', installedVersion: '2.2.0', peerVerdict: null, discoveredBy: ['CONFIG_REFERENCE', 'NAME_MENTION'], latestVersion: '2.2.0', latestPublishedAt: '2023-12-04T00:00:00Z', majorsBehind: 0, dormant: true },
        { name: 'unplugin-auto-import', installedVersion: '0.17.6', peerVerdict: null, discoveredBy: ['CONFIG_REFERENCE'], latestVersion: '21.1.0', latestPublishedAt: '2026-08-03T00:00:00Z', majorsBehind: 21, dormant: false },
        // Declared row — already travels as peerAudit.blocked; repeating it
        // here would invite double chain units.
        { name: 'vite-plugin-vue-layouts', installedVersion: '0.11.0', peerVerdict: 'DEAD_END', discoveredBy: ['PEER_HISTORY', 'CONFIG_REFERENCE'], latestVersion: '0.11.0', latestPublishedAt: '2024-01-01T00:00:00Z', majorsBehind: 0, dormant: true },
        // Peer-history-only + peer-silent — the vue-router shape (newer
        // versions grew a relationship the project does not have). Must not
        // become prescribed work.
        { name: 'vue-router', installedVersion: '4.4.0', peerVerdict: null, discoveredBy: ['PEER_HISTORY'], latestVersion: '5.2.0', latestPublishedAt: '2026-07-15T00:00:00Z', majorsBehind: 1, dormant: false },
      ],
    };
    const input = buildL6Input({ ...payload, peerAudit: audit });
    assert.deepEqual(input.companions.map((row) => row.name), [
      'vite-plugin-remove-console',
      'unplugin-auto-import',
    ]);
    assert.equal(input.companions[0].dormant, true);
    assert.equal(input.companions[0].latestPublishedAt, '2023-12-04');

    // Stale-evidence rule applies here too.
    const stale = buildL6Input({ ...payload, peerAudit: { ...audit, targetVersion: '4.0.0' } });
    assert.equal(stale.companions, null);

    const prompt = buildL6Prompt({ ...payload, peerAudit: audit });
    assert.match(prompt, /· companion: 분석 대상과의 관계/);
    assert.match(prompt, /대체\/제거 검토/);
  });

  test('usageEvidence (E3) rides along on item and group units when assembleJudgmentEvidence attached it', () => {
    const withEvidence = {
      ...payload,
      classifiedItems: [
        {
          ...payload.classifiedItems[0],
          usageEvidence: {
            files: [{ path: 'runtime/skin/main.scss', lines: [4, 5], excerpt: "@import './parts/palette';", confidence: 'MEDIUM' }],
            unmatchedTerms: [{ term: 'legacy-js-api', type: 'INSPECTION_TERM', source: 'inspectionPlan.searchTerms' }],
          },
        },
        payload.classifiedItems[1],
      ],
      reviewGroups: [{ ...payload.reviewGroups[0], usageEvidence: { files: [], unmatchedTerms: [{ term: 'VSelect', type: 'COMPONENT_SYMBOL', source: 'componentTags' }] } }],
    };
    const input = buildL6Input(withEvidence);
    const itemA = input.units.find((unit) => unit.unit === 'item:a');
    assert.equal(itemA.usageEvidence.files[0].path, 'runtime/skin/main.scss');
    assert.deepEqual(itemA.usageEvidence.files[0].lines, [4, 5]);
    assert.equal(itemA.usageEvidence.unmatchedTerms[0].term, 'legacy-js-api');

    const group = input.units.find((unit) => unit.unit === 'group:VSelect');
    assert.deepEqual(group.usageEvidence.files, []);
    assert.equal(group.usageEvidence.unmatchedTerms[0].term, 'VSelect');
  });

  test('usageEvidence degrades to an empty-but-present shape when assembly never ran', () => {
    // A hand-built payload (test, or a caller that skipped assembleJudgmentEvidence)
    // must not crash the prompt build — it just carries no evidence, which the
    // prompt rules already treat as "confirm from the project" territory.
    const input = buildL6Input(payload);
    const itemA = input.units.find((unit) => unit.unit === 'item:a');
    assert.deepEqual(itemA.usageEvidence, { files: [], unmatchedTerms: [] });
    const group = input.units.find((unit) => unit.unit === 'group:VSelect');
    assert.deepEqual(group.usageEvidence, { files: [], unmatchedTerms: [] });
  });

  test('references (E1) ride along on peerAudit.blocked and companion rows', () => {
    const audit = {
      targetVersion: '4.1.7',
      rows: [
        {
          name: 'vite-plugin-vue-layouts',
          installedVersion: '0.11.0',
          installedPeerRange: '^4 || ^5',
          verdict: 'DEAD_END',
          firstCompatible: null,
          latestCompatible: null,
          references: [
            { file: 'vite.config.js', line: 8, kind: 'import', excerpt: "import layouts from 'vite-plugin-vue-layouts';" },
            { file: 'runtime/env.d.ts', line: 6, kind: 'type-reference', excerpt: '/// <reference types="vite-plugin-vue-layouts/client" />' },
          ],
        },
      ],
      companions: [
        {
          name: 'unplugin-auto-import',
          installedVersion: '0.17.6',
          peerVerdict: null,
          discoveredBy: ['CONFIG_REFERENCE'],
          latestVersion: '21.1.0',
          latestPublishedAt: '2026-08-03T00:00:00Z',
          majorsBehind: 21,
          dormant: false,
          references: [{ file: 'vite.config.js', line: 3, kind: 'import', excerpt: "import autoImport from 'unplugin-auto-import/vite';" }],
        },
      ],
    };
    const input = buildL6Input({ ...payload, peerAudit: audit });
    assert.equal(input.peerAudit.blocked[0].references.length, 2);
    assert.equal(input.peerAudit.blocked[0].references[0].file, 'vite.config.js');
    assert.equal(input.companions[0].references[0].kind, 'import');
  });

  test('references default to an empty array — never omitted — when assembly found nothing', () => {
    const audit = {
      targetVersion: '4.1.7',
      rows: [{ name: 'ghost-plugin', installedVersion: '1.0.0', installedPeerRange: '^1', verdict: 'DEAD_END', firstCompatible: null, latestCompatible: null }],
    };
    const input = buildL6Input({ ...payload, peerAudit: audit });
    assert.deepEqual(input.peerAudit.blocked[0].references, []);
  });

  test('the prompt grants no tools and forbids guessed file paths (tool-free contract)', () => {
    // l6-deterministic-evidence-design.md §7: the old "재검증 금지" paragraph
    // (and the Round O→T rewrites it went through) existed only to manage the
    // side effects of L6 having Grep/Read at all. With zero tools granted
    // (l6-claude-runner.js), the whole category of "when may it re-verify"
    // instruction is moot — there is nothing left to re-verify with.
    const prompt = buildL6Prompt(payload);
    assert.ok(!/Grep|Read\/Grep/.test(prompt), 'the prompt must not reference tools it no longer has');
    assert.match(prompt, /소스를 직접 읽거나\n검색할 방법이 없다/);
    assert.match(prompt, /입력에 없는 파일 경로를 짐작으로 채우지 않는다/);
    assert.match(prompt, /unmatchedTerms/);
    assert.match(prompt, /NOT_AFFECTED의 유효한 근거다/);
    assert.match(prompt, /evidenceGaps/);
  });

  test('the gate description never reaches the prompt', () => {
    const prompt = buildL6Prompt(payload);
    assert.ok(!prompt.includes('"gate"'));
    assert.ok(!prompt.includes('small-range-full-coverage'));
  });

  test('prompt is Korean instructions plus the JSON input, JSON-only contract', () => {
    const prompt = buildL6Prompt(payload);
    assert.match(prompt, /ACTION_REQUIRED \| SMOKE_TEST \| NOT_AFFECTED/);
    assert.match(prompt, /근거 없는 NOT_AFFECTED 금지/);
    assert.ok(prompt.includes('"packageName": "vuetify"'));
  });

  test('keeps a requirements diff only when it was compared against this run\'s target', () => {
    // Matching baseline: evidence, kept.
    assert.ok(buildL6Input(payload).requirements);

    // The library-screen card compares against LATEST because no target exists
    // at collection time. Reused on a different target it would make the model
    // manufacture chain: ACTION_REQUIRED units the chosen upgrade never forces
    // (observed on a 3.6.10 → 3.6.11 run judged against a 4.1.8 diff).
    const staleCard = { ...payload, targetVersion: '3.6.11' };
    assert.equal(buildL6Input(staleCard).requirements, null);

    // Health check: no target, so "companion upgrade" has no meaning.
    const healthCheck = { ...payload, targetVersion: null };
    assert.equal(buildL6Input(healthCheck).requirements, null);

    // A diff whose baseline is unknown is not evidence either.
    const unknownBaseline = { ...payload, requirements: { peerDependencies: { added: [], removed: [], changed: [] } } };
    assert.equal(buildL6Input(unknownBaseline).requirements, null);
  });
});

describe('L6 result validation', () => {
  test('accepts a well-formed result and defaults optional fields', () => {
    const validated = validateL6Result({
      judgments: [{ unit: 'group:VSelect', verdict: 'SMOKE_TEST', reason: 'ok' }],
    });
    assert.equal(validated.judgments.length, 1);
    assert.deepEqual(validated.smokePoints, []);
    assert.equal(validated.summary, null);
  });

  test('rejects a missing judgments array and unknown verdicts', () => {
    assert.throws(() => validateL6Result({}), /judgments array/);
    assert.throws(
      () => validateL6Result({ judgments: [{ unit: 'x', verdict: 'MAYBE' }] }),
      /invalid unit\/verdict/,
    );
  });

  test('normalizes a structured summary (current contract)', () => {
    const validated = validateL6Result({
      judgments: [{ unit: 'group:VSelect', verdict: 'SMOKE_TEST', reason: 'ok' }],
      summary: { keyActions: ['플러그인 교체'], commonRisks: ['번들러 전환'] },
    });
    assert.deepEqual(validated.summary, { keyActions: ['플러그인 교체'], commonRisks: ['번들러 전환'] });
  });

  test('defaults missing keyActions/commonRisks to empty arrays', () => {
    const validated = validateL6Result({
      judgments: [{ unit: 'group:VSelect', verdict: 'SMOKE_TEST', reason: 'ok' }],
      summary: {},
    });
    assert.deepEqual(validated.summary, { keyActions: [], commonRisks: [] });
  });

  test('keeps a legacy string summary for pre-schema recordings', () => {
    const validated = validateL6Result({
      judgments: [{ unit: 'group:VSelect', verdict: 'SMOKE_TEST', reason: 'ok' }],
      summary: '기록된 재생 데이터의 옛 문단 형식',
    });
    assert.equal(validated.summary, '기록된 재생 데이터의 옛 문단 형식');
  });
});

/*
 * 타임아웃 기본값은 러너가 안다.
 *
 * 유닛 비례 스케일링(2026-08-10 도입)이 dev-server의 job 핸들러에만 있어서,
 * 러너를 직접 부르는 스크립트는 claude-cli.js의 최후 폴백 5분을 받았다.
 * 2026-08-13 실측이 그걸로 죽어 실비용을 날렸다 — 프로덕션 30분 vs 프로브 5분을
 * 호출부가 기억해야 하는 구조가 함정이었으므로 러너로 옮겼다.
 */
describe('L6 runner timeout default', () => {
  const scaled = (units) => Math.min(30 * 60 * 1000, Math.max(10 * 60 * 1000, units * 25 * 1000));

  it('floors small runs at 10 minutes, not the 5-minute library fallback', () => {
    assert.equal(scaled(0), 10 * 60 * 1000);
    assert.equal(scaled(4), 10 * 60 * 1000);
    // claude-cli.js의 폴백(5분)보다 반드시 커야 한다 — 그게 이 버그의 핵심이었다.
    assert.ok(scaled(0) > 5 * 60 * 1000);
  });

  it('scales at 25s per unit and caps at 30 minutes', () => {
    assert.equal(scaled(40), 40 * 25 * 1000);
    assert.equal(scaled(74), 30 * 60 * 1000);
    assert.equal(scaled(500), 30 * 60 * 1000);
  });
});
