import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { buildL4Input, buildL4Prompt } from '../src/agent/l4-prompt.js';
import { parseJsonFromAgentMessage } from '../src/agent/claude-cli.js';
import { buildL4FallbackClassification } from '../src/agent/l4-fallback-result.js';
import { runL4Classification } from '../src/agent/l4-agent-runner.js';

const stage3Result = {
  packageName: 'vuetify',
  mode: 'UPGRADE_IMPACT',
  currentVersion: '3.6.10',
  targetVersion: '4.1.5',
  range: { currentContextIncluded: true },
  sortPolicy: { versionOrder: ['CURRENT', 'TARGET', 'INTERMEDIATE_DESC'] },
  items: [
    item('v3.6.10:bug:1', '3.6.10', 'CURRENT', 'BUG_FIX', 'VSelect', 'fix select behavior'),
    item('v4.1.5:feature:1', '4.1.5', 'TARGET', 'FEATURE', 'VTable', 'add caption slot'),
    item('v4.0.0:breaking:1', '4.0.0', 'INTERMEDIATE', 'BREAKING', 'VApp', 'remove deprecated behavior'),
    item('v3.8.0:other:1', '3.8.0', 'INTERMEDIATE', 'OTHER', null, 'unclear release note raw body'),
    item('v3.9.0:bug:1', '3.9.0', 'INTERMEDIATE', 'BUG_FIX', 'VOverlay', 'fix SSR hydration regression'),
    item('v3.7.0:perf:1', '3.7.0', 'INTERMEDIATE', 'PERFORMANCE', 'VImg', 'improve image load speed'),
  ],
};

describe('L4 agent runner helpers', () => {
  it('builds a priority-selected L4 input payload instead of a naive first-N slice', () => {
    const input = buildL4Input(stage3Result, { maxItems: 5 });
    assert.equal(input.sourceItemCount, 6);
    assert.equal(input.includedItemCount, 5);
    assert.equal(input.deferredItemCount, 1);
    assert.equal(input.truncated, true);
    assert.deepEqual(input.items.map((row) => row.itemId), [
      'v3.6.10:bug:1',
      'v4.1.5:feature:1',
      'v4.0.0:breaking:1',
      'v3.8.0:other:1',
      'v3.9.0:bug:1',
    ]);
    assert.ok(input.items[0].selectionReasons.includes('current-version-context'));
    assert.ok(input.items[1].selectionReasons.includes('target-version-destination'));
    assert.ok(input.items[2].selectionReasons.includes('mandatory-category:BREAKING'));
    assert.ok(input.items[2].selectionReasons.includes('target-major-entry-release'));
    // Signal-less OTHER is a strong budget candidate, not a mandate — the
    // git-commit path mass-produces OTHER (vite 2-major: 140/651) and the
    // old unconditional rule turned a 20-item budget into 196 items.
    assert.ok(input.items[3].selectionReasons.includes('parser-uncertain-candidate'));
    assert.ok(!input.items[3].selectionReasons.some((reason) => reason.startsWith('mandatory-category')));
    assert.ok(input.items[4].selectionReasons.includes('high-signal-text'));
    assert.equal(input.selectionPolicy.deferredSummary.byCategory.PERFORMANCE, 1);
  });

  it('mandates OTHER only when it carries a risk signal', () => {
    const withSignals = {
      ...stage3Result,
      items: [
        item('quiet-other', '3.7.1', 'INTERMEDIATE', 'OTHER', null, 'unstructured note body'),
        item('risky-other', '3.7.2', 'INTERMEDIATE', 'OTHER', null, 'note mentions breaking change in defaults'),
        ...Array.from({ length: 6 }, (unused, i) => item(`filler-${i}`, `3.8.${i}`, 'INTERMEDIATE', 'BUG_FIX', 'VChip', `fix chip ${i}`)),
      ],
    };
    // Budget of 1: only mandatory items survive selection pressure.
    const input = buildL4Input(withSignals, { maxItems: 1 });
    const ids = input.items.map((row) => row.itemId);
    assert.ok(ids.includes('risky-other'), 'signal-bearing OTHER stays mandatory');
    const risky = input.items.find((row) => row.itemId === 'risky-other');
    assert.ok(risky.selectionReasons.includes('mandatory-category:OTHER'));
  });

  it('can still build a first-N slice for debugging', () => {
    const input = buildL4Input(stage3Result, { maxItems: 2, selectionMode: 'first' });
    assert.deepEqual(input.items.map((row) => row.itemId), ['v3.6.10:bug:1', 'v4.1.5:feature:1']);
  });

  it('keeps all items when requested', () => {
    const input = buildL4Input(stage3Result, { all: true });
    assert.equal(input.includedItemCount, 6);
    assert.equal(input.deferredItemCount, 0);
    assert.equal(input.truncated, false);
  });

  it('builds a prompt with selection and OTHER handling instructions', () => {
    const prompt = buildL4Prompt(stage3Result, { maxItems: 1 });
    assert.match(prompt, /OTHER means parser uncertainty/);
    assert.match(prompt, /not a naive first-N slice/);
    assert.match(prompt, /Deferred does not mean safe/);
    assert.match(prompt, /Stage 3 parse data follows as JSON/);
  });

  it('builds deterministic fallback mock classification results', () => {
    const execution = buildL4FallbackClassification(stage3Result, { maxItems: 3, reason: 'test fallback' });
    assert.equal(execution.meta.runner, 'fallback-mock');
    assert.equal(execution.meta.fallback, true);
    assert.equal(execution.result.packageName, 'vuetify');
    assert.equal(execution.result.itemCount, execution.meta.includedItemCount);
    assert.equal(execution.result.items.length, execution.meta.includedItemCount);
    assert.ok(execution.result.summary.reviewRequired >= 1);
    assert.ok(execution.result.globalInspectionPlan.searchTerms.includes('vuetify'));
    assert.match(execution.result.warnings.join(' '), /Mock fallback/);
  });

  it('uses fallback provider without invoking the Claude CLI', async () => {
    const execution = await runL4Classification(stage3Result, { provider: 'fallback', maxItems: 2 });
    assert.equal(execution.meta.runner, 'fallback-mock');
    assert.equal(execution.result.itemCount, execution.meta.includedItemCount);
  });


  it('supports seeded correlated randomness for fallback mock output', () => {
    const first = buildL4FallbackClassification(stage3Result, { maxItems: 5, fallbackRandomness: 0.8, fallbackSeed: 'seed-a' });
    const second = buildL4FallbackClassification(stage3Result, { maxItems: 5, fallbackRandomness: 0.8, fallbackSeed: 'seed-a' });
    const third = buildL4FallbackClassification(stage3Result, { maxItems: 5, fallbackRandomness: 0.8, fallbackSeed: 'seed-b' });

    assert.equal(first.meta.deterministic, false);
    assert.equal(first.meta.fallbackSeed, 'seed-a');
    assert.deepEqual(first.result.items.map((item) => [item.agentCategory, item.preliminaryRisk, item.reviewRequired, item.reasoning]), second.result.items.map((item) => [item.agentCategory, item.preliminaryRisk, item.reviewRequired, item.reasoning]));
    assert.notDeepEqual(first.result.items.map((item) => [item.agentCategory, item.preliminaryRisk, item.reviewRequired, item.reasoning]), third.result.items.map((item) => [item.agentCategory, item.preliminaryRisk, item.reviewRequired, item.reasoning]));
    assert.ok(first.result.items.every((item) => item.preliminaryRisk === 'HIGH' ? item.reviewRequired : true));
  });

  it('falls back when the Claude CLI cannot be spawned', async () => {
    const logs = [];
    const execution = await runL4Classification(stage3Result, {
      command: 'claude-command-that-does-not-exist-for-test',
      maxItems: 2,
      onLog: (entry) => logs.push(entry),
    });
    assert.equal(execution.meta.runner, 'fallback-mock');
    assert.equal(execution.meta.fallback, true);
    assert.match(execution.meta.fallbackReason, /Claude CLI failed/);
    assert.ok(logs.some((entry) => String(entry.message).includes('falling back to mock')));
  });
  it('parses raw or fenced agent JSON messages', () => {
    assert.deepEqual(parseJsonFromAgentMessage('{"ok":true}'), { ok: true });
    assert.deepEqual(parseJsonFromAgentMessage('```json\n{"ok":true}\n```'), { ok: true });
  });

  it('keeps the L4 JSON schema parseable', () => {
    const schema = JSON.parse(readFileSync('schemas/l4-classification.schema.json', 'utf8'));
    assert.equal(schema.title, 'L4ClassificationResult');
    assert.ok(schema.$defs.classifiedItem.required.includes('inputSelectionReasons'));
  });
});

function item(itemId, version, versionRole, category, scope, summary) {
  return {
    itemId,
    version,
    versionRole,
    publishedAt: '2024-01-01T00:00:00Z',
    category,
    categoryPriority: null,
    sectionTitle: category === 'OTHER' ? 'Unknown' : category.replace('_', ' '),
    scope,
    summary,
    rawText: scope ? `**${scope}:** ${summary}` : summary,
    prNumbers: [],
    issueNumbers: [],
    commitHashes: [],
    sourceUrl: `https://example.test/${version}`,
  };
}
describe('L4 slim contract + synthesis', () => {
  it('keeps the prompt free of rawText, selection scores and the policy body', () => {
    const prompt = buildL4Prompt(stage3Result, { maxItems: 3 });
    assert.ok(!prompt.includes('"rawText"'));
    assert.ok(!prompt.includes('"selectionScore"'));
    assert.ok(!prompt.includes('"selectionPolicy"'));
    assert.ok(!prompt.includes('"commitHashes"'));
    assert.match(prompt, /Stage 3 parse data follows as JSON/);
  });

  it('synthesizes the full schema shape from judgment-only responses', async () => {
    const { synthesizeL4Result } = await import('../src/agent/l4-result-synthesis.js');
    const input = buildL4Input(stage3Result, { maxItems: 2, selectionMode: 'priority' });
    const judged = {
      items: input.items.map((item, index) => ({
        itemId: item.itemId,
        agentCategory: 'BUG_FIX',
        preliminaryRisk: index === 0 ? 'HIGH' : 'LOW',
        // HIGH must be forced to reviewRequired even if the model says false.
        reviewRequired: false,
        reasoning: '판단 근거',
        searchTerms: index === 0 ? ['focusTrap'] : [],
        relatedComponents: index === 0 ? ['VCombobox'] : [],
      })),
    };
    const result = synthesizeL4Result(input, judged);

    assert.equal(result.itemCount, input.items.length);
    const first = result.items[0];
    assert.equal(first.reviewRequired, true);
    // Code-synthesized mechanics: scope-backed tags and import specifiers.
    assert.ok(first.inspectionPlan.componentTags.includes(first.scope));
    assert.ok(first.inspectionPlan.componentTags.includes('VCombobox'));
    assert.ok(first.inspectionPlan.importSpecifiers.includes('vuetify'));
    assert.deepEqual(first.inspectionPlan.searchTerms, ['focusTrap']);
    assert.ok(Array.isArray(first.suspectedImpactDomains) && first.suspectedImpactDomains.length);
    assert.ok(result.summary.byPreliminaryRisk.HIGH >= 1);
  });

  it('passes the model\'s fileGlobs through to inspectionPlan (§5.5 — no longer hardcoded empty)', async () => {
    const { synthesizeL4Result } = await import('../src/agent/l4-result-synthesis.js');
    const input = buildL4Input(stage3Result, { maxItems: 2, selectionMode: 'priority' });
    const judged = {
      items: input.items.map((item) => ({
        itemId: item.itemId,
        agentCategory: 'BREAKING',
        preliminaryRisk: 'MEDIUM',
        reviewRequired: true,
        reasoning: 'sass 컴파일러 API 강제 — legacy @import 체인이 있으면 영향',
        searchTerms: ['@import'],
        fileGlobs: ['*.scss'],
      })),
    };
    const result = synthesizeL4Result(input, judged);
    assert.deepEqual(result.items[0].inspectionPlan.fileGlobs, ['*.scss']);
    assert.ok(result.globalInspectionPlan.fileGlobs.includes('*.scss'));
  });

  it('defaults fileGlobs to an empty array when the model omits it', async () => {
    const { synthesizeL4Result } = await import('../src/agent/l4-result-synthesis.js');
    const input = buildL4Input(stage3Result, { maxItems: 1, selectionMode: 'priority' });
    const judged = { items: input.items.map((item) => ({ itemId: item.itemId, agentCategory: 'OTHER', preliminaryRisk: 'LOW', reviewRequired: false, reasoning: 'x' })) };
    const result = synthesizeL4Result(input, judged);
    assert.deepEqual(result.items[0].inspectionPlan.fileGlobs, []);
  });

  it('rejects a response that drops items instead of silently degrading', async () => {
    const { synthesizeL4Result } = await import('../src/agent/l4-result-synthesis.js');
    const input = buildL4Input(stage3Result, { maxItems: 2, selectionMode: 'priority' });
    assert.throws(
      () => synthesizeL4Result(input, { items: [] }),
      /missing \d+ item/,
    );
  });
});
