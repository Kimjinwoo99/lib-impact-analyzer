import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { describe } from 'node:test';
import { buildL4Input, buildL4Prompt } from '../src/agent/l4-prompt.js';
import { prescanScopeUsage, searchableScopeTokens } from '../src/source-match/component-usage.js';

/*
 * The three verdicts and their boundary. USED/UNUSED require a searchable
 * scope; UNDETERMINED is "no usage evidence possible", which must never be
 * read as "not analyzable" — classification proceeds on the changelog text
 * alone.
 */

function makeProject() {
  const root = mkdtempSync(join(tmpdir(), 'usage-prescan-'));
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(
    join(root, 'src', 'Page.vue'),
    '<template><v-select :items="items" /></template>\n<script>import { createRouter } from "vue-router";</script>\n',
  );
  writeFileSync(join(root, 'package.json'), '{"name":"fixture"}');
  return root;
}

describe('searchableScopeTokens', () => {
  test('inner-capital symbols are searchable, bare lowercase words are not', () => {
    assert.deepEqual(searchableScopeTokens('VSelect'), ['VSelect']);
    assert.deepEqual(searchableScopeTokens('createRouter'), ['createRouter']);
    // Multi-component scope: each member searched.
    assert.deepEqual(searchableScopeTokens('VSelect/VCombobox'), ['VSelect', 'VCombobox']);
    // `validation`, `layout` match ordinary prose everywhere — a hit proves
    // nothing, so they are not searchable.
    assert.deepEqual(searchableScopeTokens('validation'), []);
    assert.deepEqual(searchableScopeTokens('layout'), []);
    assert.deepEqual(searchableScopeTokens(null), []);
  });
});

describe('prescanScopeUsage', () => {
  test('verdicts: used via template tag, used via symbol, unused, undetermined', () => {
    const root = makeProject();
    const items = [
      { itemId: 'a', scope: 'VSelect' }, // <v-select> in template
      { itemId: 'b', scope: 'createRouter' }, // symbol in script
      { itemId: 'c', scope: 'VDataIterator' }, // nowhere in the project
      { itemId: 'd', scope: 'validation' }, // not searchable
      { itemId: 'e', scope: null }, // no scope at all
    ];
    const result = prescanScopeUsage(root, items);

    assert.equal(result.byItemId.a.verdict, 'USED');
    assert.ok(result.byItemId.a.fileCount >= 1);
    assert.equal(result.byItemId.b.verdict, 'USED');
    assert.equal(result.byItemId.c.verdict, 'UNUSED');
    assert.equal(result.byItemId.d.verdict, 'UNDETERMINED');
    assert.equal(result.byItemId.d.reason, 'GENERIC_SCOPE');
    assert.equal(result.byItemId.e.verdict, 'UNDETERMINED');
    assert.equal(result.byItemId.e.reason, 'NO_SCOPE');
    assert.deepEqual(result.summary, { USED: 2, UNUSED: 1, UNDETERMINED: 2 });
  });
});

describe('scope signatures — provable absence for generic scopes', () => {
  /*
   * `wasm`·`worker` 같은 scope는 일반어라 심볼 검색이 불가능하지만, 그 기능을
   * 쓸 때 반드시 나타나는 구문은 특이하다. 0히트면 UNUSED 확정 — vite 골든
   * 실행에서 group:wasm/worker/lib 3건이 "판정 불가"로 사람에게 넘어갔지만
   * grep 한 번으로 소거 가능했던 문제의 수정.
   */
  function makeSignatureProject({ worker = false, wasm = false, libInConfig = false, libElsewhere = false } = {}) {
    const root = mkdtempSync(join(tmpdir(), 'usage-signature-'));
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'package.json'), '{"name":"fixture"}');
    writeFileSync(
      join(root, 'src', 'main.js'),
      [
        worker ? "const w = new Worker(new URL('./heavy.js', import.meta.url));" : '',
        wasm ? "import init from './engine.wasm?init';" : '',
        // `lib:` 표기가 설정 파일 밖에 있는 경우 — lib 시그니처에 잡히면 안 된다.
        libElsewhere ? 'const meta = { lib: { name: "x" } };' : '',
        'export const ok = 1;',
      ].filter(Boolean).join('\n'),
    );
    writeFileSync(
      join(root, 'vite.config.js'),
      libInConfig
        ? "export default { build: { lib: { entry: 'src/main.js' } } };"
        : 'export default {};',
    );
    return root;
  }

  const ITEMS = [
    { itemId: 'w', scope: 'worker' },
    { itemId: 'a', scope: 'wasm' },
    { itemId: 'l', scope: 'lib' },
    { itemId: 'g', scope: 'validation' }, // 사전에 없는 일반어는 그대로 UNDETERMINED
  ];

  test('zero hits turn a signature scope into a confirmed UNUSED, not UNDETERMINED', () => {
    const root = makeSignatureProject();
    const result = prescanScopeUsage(root, ITEMS);
    assert.equal(result.byItemId.w.verdict, 'UNUSED');
    assert.equal(result.byItemId.w.reason, 'SIGNATURE');
    assert.equal(result.byItemId.a.verdict, 'UNUSED');
    assert.equal(result.byItemId.l.verdict, 'UNUSED');
    // 사전 밖 일반어는 여전히 판정하지 않는다 — 증거력 없는 히트로 확정 금지.
    assert.equal(result.byItemId.g.verdict, 'UNDETERMINED');
  });

  test('a real usage syntax flips the verdict to USED with file evidence', () => {
    const root = makeSignatureProject({ worker: true, wasm: true });
    const result = prescanScopeUsage(root, ITEMS);
    assert.equal(result.byItemId.w.verdict, 'USED');
    assert.equal(result.byItemId.w.reason, 'SIGNATURE');
    assert.ok(result.byItemId.w.fileCount >= 1);
    assert.ok(result.byItemId.w.files[0].includes('main.js'));
    assert.equal(result.byItemId.a.verdict, 'USED');
  });

  test('the lib signature only reads build-config files — a lib: object elsewhere is not library mode', () => {
    const withConfig = prescanScopeUsage(makeSignatureProject({ libInConfig: true }), ITEMS);
    assert.equal(withConfig.byItemId.l.verdict, 'USED');
    assert.ok(withConfig.byItemId.l.files[0].includes('vite.config.js'));

    const elsewhereOnly = prescanScopeUsage(makeSignatureProject({ libElsewhere: true }), ITEMS);
    assert.equal(elsewhereOnly.byItemId.l.verdict, 'UNUSED');
  });

  test('a searchable symbol in the scope wins over the signature path', () => {
    // scope가 'SharedWorker'처럼 심볼이면 기존 토큰 경로가 판정한다 —
    // 시그니처는 토큰이 전혀 없을 때의 폴백이다.
    const root = makeSignatureProject({ worker: true });
    const result = prescanScopeUsage(root, [{ itemId: 's', scope: 'SharedWorker' }]);
    assert.equal(result.byItemId.s.reason, null);
    assert.deepEqual(result.byItemId.s.searchedTokens, ['SharedWorker']);
  });
});

describe('usage-aware L4 selection', () => {
  const stage3Result = {
    packageName: 'demo',
    mode: 'UPGRADE_IMPACT',
    currentVersion: '1.0.0',
    targetVersion: '1.3.0',
    items: [
      // Two equal-weight budget candidates: only usage distinguishes them.
      item('feat-used', '1.1.0', 'FEATURE', 'VSelect'),
      item('feat-unused', '1.1.0', 'FEATURE', 'VDataIterator'),
      // Mandatory despite being UNUSED — BREAKING never competes for budget.
      { ...item('breaking-unused', '1.2.0', 'BREAKING', 'VBanner'), sectionTitle: 'Bad Changes' },
      // Undetermined candidate must not be penalized below the unused one.
      item('feat-undetermined', '1.1.0', 'FEATURE', 'defaults'),
    ],
  };

  function item(itemId, version, category, scope) {
    return {
      itemId,
      version,
      versionRole: 'INTERMEDIATE',
      // Plain words only: the critical/high signal regexes fire on terms like
      // "behavior" or "type" and would mask the usage adjustment under test.
      sectionTitle: 'Stuff',
      category,
      scope,
      summary: 'change entry',
      rawText: 'change entry',
    };
  }

  const usage = {
    byItemId: {
      'feat-used': { verdict: 'USED', fileCount: 3, files: ['src/a.vue'] },
      'feat-unused': { verdict: 'UNUSED', fileCount: 0, files: [] },
      'breaking-unused': { verdict: 'UNUSED', fileCount: 0, files: [] },
      'feat-undetermined': { verdict: 'UNDETERMINED', fileCount: 0, files: [] },
    },
  };

  test('within budget, USED beats UNDETERMINED beats UNUSED; mandatory unaffected', () => {
    const input = buildL4Input(stage3Result, { maxItems: 3, selectionMode: 'priority', usage });
    const ids = input.items.map((entry) => entry.itemId);
    // breaking is mandatory; two budget slots remain → used + undetermined.
    assert.ok(ids.includes('breaking-unused'));
    assert.ok(ids.includes('feat-used'));
    assert.ok(ids.includes('feat-undetermined'));
    assert.ok(!ids.includes('feat-unused'));
  });

  test('without usage, the same call keeps source order — the signal is additive', () => {
    const input = buildL4Input(stage3Result, { maxItems: 3, selectionMode: 'priority' });
    assert.equal(input.items.length, 3);
  });

  test('usage evidence never reaches the Agent prompt', () => {
    const input = buildL4Input(stage3Result, { maxItems: 3, selectionMode: 'priority', usage });
    const serialized = JSON.stringify(input);
    assert.ok(!serialized.includes('USED'));
    assert.ok(!serialized.includes('usage'));
    assert.ok(!serialized.includes('fileCount'));
  });
});

describe('deferred triage — the system decides, the person gets a list', () => {
  const stage3 = {
    packageName: 'demo',
    mode: 'UPGRADE_IMPACT',
    currentVersion: '1.0.0',
    targetVersion: '1.3.0',
    items: [
      { itemId: 'inc', version: '1.2.0', versionRole: 'INTERMEDIATE', sectionTitle: 'Stuff', category: 'BREAKING', scope: 'VCore', summary: 'must include', rawText: 'must include' },
      // risky text + used scope → the review list
      { itemId: 'd1', version: '1.1.0', versionRole: 'INTERMEDIATE', sectionTitle: 'Stuff', category: 'BUG_FIX', scope: 'VUsed', summary: 'overlay behavior corrected', rawText: 'overlay behavior corrected' },
      // no risk signal + used scope → a fix the upgrade delivers, not a task
      { itemId: 'd2', version: '1.1.0', versionRole: 'INTERMEDIATE', sectionTitle: 'Stuff', category: 'BUG_FIX', scope: 'VUsed', summary: 'align spinner pixels', rawText: 'align spinner pixels' },
      // risky text but the project does not use the scope → excluded
      { itemId: 'd3', version: '1.1.0', versionRole: 'INTERMEDIATE', sectionTitle: 'Stuff', category: 'FEATURE', scope: 'VGone', summary: 'remove legacy prop', rawText: 'remove legacy prop' },
      // risky text, usage cannot be determined → cannot be ruled out → review
      { itemId: 'd4', version: '1.1.0', versionRole: 'INTERMEDIATE', sectionTitle: 'Stuff', category: 'BUG_FIX', scope: 'layout', summary: 'margin now off by default', rawText: 'margin now off by default' },
      // quiet and undeterminable → excluded
      { itemId: 'd5', version: '1.1.0', versionRole: 'INTERMEDIATE', sectionTitle: 'Stuff', category: 'FEATURE', scope: 'layout', summary: 'add spacing helper', rawText: 'add spacing helper' },
    ],
  };
  const usage = {
    byItemId: {
      d1: { verdict: 'USED', fileCount: 4, files: [] },
      d2: { verdict: 'USED', fileCount: 4, files: [] },
      d3: { verdict: 'UNUSED', fileCount: 0, files: [] },
      d4: { verdict: 'UNDETERMINED', fileCount: 0, files: [] },
      d5: { verdict: 'UNDETERMINED', fileCount: 0, files: [] },
      inc: { verdict: 'UNUSED', fileCount: 0, files: [] },
    },
  };

  test('review keeps only risk-signal items usage could not rule out', async () => {
    const { buildDeferredTriage } = await import('../src/agent/l4-prompt.js');
    const input = buildL4Input(stage3, { maxItems: 1, selectionMode: 'priority', usage });
    // Only the BREAKING item is mandatory; budget 1 leaves everything else deferred.
    assert.deepEqual(input.items.map((item) => item.itemId), ['inc']);

    const triage = buildDeferredTriage(stage3, input, usage);
    assert.equal(triage.deferredCount, 5);
    assert.deepEqual(triage.review.map((item) => item.itemId), ['d1', 'd4']);
    // USED entries sort ahead of UNDETERMINED so the strongest evidence leads.
    assert.equal(triage.review[0].usageVerdict, 'USED');
    assert.deepEqual(triage.excluded, { unused: 1, received: 1, quiet: 1, reverted: 0 });
    assert.equal(triage.excludedCount, 3);
    // The same list folded by scope — d1 and d4 have different scopes.
    assert.deepEqual(triage.reviewGroups.map((group) => group.scope), ['VUsed', 'layout']);
  });

  test('an item reverted by a later release nets to zero and leaves review', async () => {
    const { buildDeferredTriage } = await import('../src/agent/l4-prompt.js');
    const withRevert = {
      ...stage3,
      items: [
        ...stage3.items,
        // 범위 안 짝: 원본 d1(1.1.0 도입)을 r1(1.2.0)이 되돌림 — 순변화 0.
        // 2026-08-22 계약 변경: 원본만이 아니라 revert 항목 자신도 상쇄된다
        // (예전에는 REVERT가 mandatory로 분석에 들어가 확인 행을 만들었다).
        { itemId: 'r1', version: '1.2.0', versionRole: 'INTERMEDIATE', sectionTitle: 'Reverts', category: 'REVERT', scope: 'VUsed', summary: 'revert "overlay behavior corrected" (#99)', rawText: 'revert "overlay behavior corrected" (#99)' },
      ],
    };
    const input = buildL4Input(withRevert, { maxItems: 1, selectionMode: 'priority', usage });
    // 짝의 양쪽 다 Agent 입력에 없어야 한다.
    assert.ok(!input.items.some((item) => item.itemId === 'r1'));
    const triage = buildDeferredTriage(withRevert, input, usage);
    assert.ok(!triage.review.some((item) => item.itemId === 'd1'));
    assert.ok(!triage.review.some((item) => item.itemId === 'r1'));
    assert.equal(triage.excluded.reverted, 2); // 원본 d1 + revert r1
    // d4 is untouched — its subject matches no revert.
    assert.ok(triage.review.some((item) => item.itemId === 'd4'));
  });
});
