import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runAllWithSingleRetry, runSettledWithConcurrency, splitIntoBatches } from '../src/agent/concurrent-batches.js';
import { aggregateBatchMeta } from '../src/agent/l4-claude-runner.js';
import { buildL4Input, buildL4PromptForInput } from '../src/agent/l4-prompt.js';
import { synthesizeL4Result } from '../src/agent/l4-result-synthesis.js';

const stage3Result = {
  packageName: 'vuetify',
  mode: 'UPGRADE_IMPACT',
  currentVersion: '3.6.10',
  targetVersion: '4.1.5',
  range: { currentContextIncluded: true },
  sortPolicy: { versionOrder: ['CURRENT', 'TARGET', 'INTERMEDIATE_DESC'] },
  items: Array.from({ length: 12 }, (unused, index) => ({
    itemId: `v3.${index}.0:bug:1`,
    version: `3.${index}.0`,
    versionRole: 'INTERMEDIATE',
    publishedAt: '2024-01-01T00:00:00Z',
    category: 'BUG_FIX',
    categoryPriority: null,
    sectionTitle: 'Bug Fixes',
    scope: `VComponent${index}`,
    summary: `fix behavior ${index}`,
    rawText: `**VComponent${index}:** fix behavior ${index}`,
    prNumbers: [],
    issueNumbers: [],
    commitHashes: [],
    sourceUrl: `https://example.test/3.${index}.0`,
  })),
};

describe('batch splitting', () => {
  it('splits items into fixed-size batches', () => {
    assert.deepEqual(splitIntoBatches([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });

  it('keeps a single call when one batch would hold everything', () => {
    // The unbatched prompt must stay reachable byte-for-byte, so small runs
    // are not changed by the fan-out existing.
    assert.deepEqual(splitIntoBatches([1, 2, 3], 5), [[1, 2, 3]]);
    assert.deepEqual(splitIntoBatches([1, 2, 3], 3), [[1, 2, 3]]);
  });

  it('treats a non-positive size as "do not fan out"', () => {
    assert.deepEqual(splitIntoBatches([1, 2, 3], 0), [[1, 2, 3]]);
    assert.deepEqual(splitIntoBatches([1, 2, 3], Number.NaN), [[1, 2, 3]]);
  });
});

describe('bounded concurrency', () => {
  it('never runs more than the limit at once, and keeps result order', async () => {
    let inFlight = 0;
    let peak = 0;
    const tasks = Array.from({ length: 9 }, (unused, index) => async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return index;
    });

    const settled = await runSettledWithConcurrency(tasks, 3);
    assert.equal(peak, 3);
    assert.deepEqual(settled.map((outcome) => outcome.value), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('reports failures instead of rejecting, so siblings are not stranded', async () => {
    let finished = 0;
    const tasks = [
      async () => { throw new Error('batch 1 died'); },
      async () => { await new Promise((resolve) => setTimeout(resolve, 10)); finished += 1; return 'ok'; },
    ];

    const settled = await runSettledWithConcurrency(tasks, 2);
    assert.equal(settled[0].status, 'rejected');
    assert.match(settled[0].reason.message, /batch 1 died/);
    assert.equal(settled[1].value, 'ok');
    // The slow sibling was awaited, not abandoned mid-flight.
    assert.equal(finished, 1);
  });
});

describe('single retry of failed batches', () => {
  it('retries only the failures and marks which ones were retried', async () => {
    const attempts = [0, 0, 0];
    const tasks = attempts.map((unused, index) => async () => {
      attempts[index] += 1;
      if (index === 1 && attempts[index] === 1) throw new Error('transient');
      return `value-${index}`;
    });

    const outcomes = await runAllWithSingleRetry(tasks, { limit: 2 });
    assert.deepEqual(outcomes.map((outcome) => outcome.value), ['value-0', 'value-1', 'value-2']);
    assert.deepEqual(outcomes.map((outcome) => outcome.retried), [false, true, false]);
    assert.deepEqual(attempts, [1, 2, 1]);
  });

  it('throws the failing task\'s own error after the retry, not a sibling\'s', async () => {
    const tasks = [
      async () => 'fine',
      async () => { throw new Error('batch 2/2 response is missing 3 item(s)'); },
    ];
    await assert.rejects(
      () => runAllWithSingleRetry(tasks, { limit: 2 }),
      /batch 2\/2 response is missing 3 item/,
    );
  });

  it('lets beforeRetry refuse the retry, so an aborted run stays aborted', async () => {
    let attempts = 0;
    const tasks = [async () => { attempts += 1; throw new Error('Claude CLI cancelled'); }];

    await assert.rejects(
      () => runAllWithSingleRetry(tasks, {
        limit: 1,
        beforeRetry: (reasons) => { throw reasons[0]; },
      }),
      /cancelled/,
    );
    assert.equal(attempts, 1);
  });
});

describe('batch prompts', () => {
  it('tells the batch which slice it owns while keeping the global counts', () => {
    const input = buildL4Input(stage3Result, { maxItems: 10 });
    const batches = splitIntoBatches(input.items, 4);
    const prompt = buildL4PromptForInput({ ...input, items: batches[1] }, { batch: { index: 2, count: 3 } });

    assert.match(prompt, /3개 배치로 나눈 것 중 2번째/);
    assert.match(prompt, /아래 items 4개만 분류하고/);
    // Global context stays global — the model still sees how much was included
    // overall and how much was withheld for budget.
    assert.match(prompt, /"includedItemCount": 10/);
    assert.match(prompt, /"batchItemCount": 4/);
    // And it only carries its own items.
    assert.ok(prompt.includes(batches[1][0].itemId));
    assert.ok(!prompt.includes(batches[0][0].itemId));
  });

  it('leaves the single-call prompt untouched', () => {
    const input = buildL4Input(stage3Result, { maxItems: 3 });
    const plain = buildL4PromptForInput(input, {});
    // A one-batch fan-out must not add batch wording.
    assert.equal(buildL4PromptForInput(input, { batch: { index: 1, count: 1 } }), plain);
    assert.ok(!plain.includes('배치로 나눈 것'));
    assert.ok(!plain.includes('"batch"'));
  });
});

describe('merging batch responses', () => {
  it('synthesizes one result from separately-judged batches', () => {
    const input = buildL4Input(stage3Result, { maxItems: 9 });
    const batches = splitIntoBatches(input.items, 4);
    assert.equal(batches.length, 3);

    const judged = { items: batches.flatMap((batch) => batch.map((item) => ({
      itemId: item.itemId,
      agentCategory: 'BUG_FIX',
      preliminaryRisk: 'LOW',
      reviewRequired: false,
      reasoning: '배치 판단',
    }))) };

    const result = synthesizeL4Result(input, judged);
    assert.equal(result.itemCount, 9);
    assert.deepEqual(result.items.map((item) => item.itemId), input.items.map((item) => item.itemId));
  });

  it('still rejects a merged response that lost a batch', () => {
    const input = buildL4Input(stage3Result, { maxItems: 9 });
    const batches = splitIntoBatches(input.items, 4);
    const judged = { items: batches[0].map((item) => ({
      itemId: item.itemId,
      agentCategory: 'BUG_FIX',
      preliminaryRisk: 'LOW',
      reviewRequired: false,
      reasoning: '배치 판단',
    })) };

    assert.throws(() => synthesizeL4Result(input, judged), /missing 5 item/);
  });
});

describe('batch meta aggregation', () => {
  const executions = [
    { durationMs: 40_000, costUsd: 0.2, usage: { input_tokens: 100, output_tokens: 50 }, sessionId: 'sess1', model: 'claude-sonnet-5', retried: false },
    { durationMs: 62_000, costUsd: 0.3, usage: { input_tokens: 120, output_tokens: 70, cache_read_input_tokens: 10 }, sessionId: 'sess2', model: 'claude-sonnet-5', retried: true },
  ];

  it('sums spend but reports wall clock as the duration', () => {
    const meta = aggregateBatchMeta(executions, {
      batches: 2, batchSize: 5, maxConcurrency: 4, wallClockMs: 65_000, requestedModel: undefined,
    });

    assert.equal(meta.durationMs, 65_000);
    assert.equal(meta.batchPlan.serialDurationMs, 102_000);
    assert.equal(meta.costUsd, 0.5);
    assert.deepEqual(meta.usage, { input_tokens: 220, output_tokens: 120, cache_read_input_tokens: 10 });
    assert.equal(meta.batchPlan.retriedBatches, 1);
    assert.deepEqual(meta.sessionIds, ['sess1', 'sess2']);
    assert.equal(meta.sessionId, 'sess1');
    assert.equal(meta.model, 'claude-sonnet-5');
  });

  it('keeps cost null when no batch reported one, rather than inventing 0', () => {
    const meta = aggregateBatchMeta(
      [{ durationMs: 10, costUsd: null, usage: null, sessionId: null, model: null, retried: false }],
      { batches: 1, batchSize: 1, maxConcurrency: 4, wallClockMs: 10, requestedModel: 'sonnet' },
    );
    assert.equal(meta.costUsd, null);
    assert.equal(meta.usage, null);
    assert.equal(meta.model, 'sonnet');
  });
});
