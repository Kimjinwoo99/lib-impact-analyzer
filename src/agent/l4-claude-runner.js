/**
 * L4 runner — changelog classification through the Claude Code CLI.
 *
 * L4's contract is classification ONLY: it reads the Stage 3 items in the
 * prompt and returns judgments. It must not look at the project — that
 * evidence belongs to L6 — so this runner grants NO tools at all, and its
 * working directory stays the analyzer's own, never the analyzed project's.
 *
 * The model's output is deliberately minimal (judgment fields only) and
 * `synthesizeL4Result` rebuilds the full schema shape deterministically.
 * Measured effect of that split on a 20-item run: output 26.7k → a few k
 * tokens, and since generation time IS the run time, the same factor comes
 * off the wall clock and the usage quota.
 *
 * That same measurement is why the items are then split across concurrent
 * calls: what remains after the slimming is per-item generation, so one call
 * over N items costs about N × per-item. Batching turns that sum into the
 * wall clock of the slowest batch. Each batch carries the same global context
 * and classifies only its own slice; `synthesizeL4Result` still sees one
 * merged response and cannot tell how many calls produced it.
 */

import { parseJsonFromAgentMessage, runClaudePrint } from './claude-cli.js';
import { runAllWithSingleRetry, splitIntoBatches } from './concurrent-batches.js';
import { buildL4Input, buildL4PromptForInput } from './l4-prompt.js';
import { synthesizeL4Result } from './l4-result-synthesis.js';

/*
 * Batch sizing is a fixed-cost tradeoff: every spawn re-sends the CLI system
 * prompt + classification instructions (~40k tokens of shared prefix).
 * Measured on vite 6.4.3 → 8.2.1 (196 items): batch size 5 meant 40 spawns —
 * 458k cache-creation tokens against 110k of actual output. Size 12 cuts the
 * spawn count ~2.4× while a batch's generation time stays minutes-scale.
 */
const DEFAULT_BATCH_SIZE = 12;
const DEFAULT_MAX_CONCURRENCY = 4;

const OUTPUT_SPEC = `{
  "items": [{
    "itemId": string,                 // 입력 항목의 itemId 그대로, 전 항목 빠짐없이, 입력 순서 유지
    "agentCategory": "BREAKING"|"BUG_FIX"|"REVERT"|"FEATURE"|"LABS"|"REFACTOR"|"RELEASE_NOTE"|"PERFORMANCE"|"OTHER",
    "preliminaryRisk": "LOW"|"MEDIUM"|"HIGH",
    "reviewRequired": boolean,        // HIGH는 반드시 true
    "reasoning": string,              // 판단 근거 한 문장 (한국어)
    "searchTerms": string[],          // 선택: 이 변경을 프로젝트에서 찾을 때 쓸 API/prop/동작 용어, 아는 것만 최대 5개
    "configKeys": string[],           // 선택: 관련 설정 키, 아는 것만
    "relatedComponents": string[],    // 선택: scope 외에 함께 영향을 받는 컴포넌트, 아는 것만
    "fileGlobs": string[]             // 선택: searchTerms가 특정 파일 유형에서만 의미 있을 때만 — 예: "*.scss"
  }]
}`;

export async function runL4WithClaudeCli(stage3Result, options = {}) {
  const input = buildL4Input(stage3Result, options);
  const batches = splitIntoBatches(input.items, resolveBatchSize(options.batchSize));
  const maxConcurrency = resolveConcurrency(options.maxConcurrency);
  const startedAt = Date.now();

  if (batches.length > 1) {
    options.onLog?.({
      stream: 'system',
      message: `L4 fan-out: ${input.items.length} items → ${batches.length} batches (≤${batches[0].length}/batch, ${maxConcurrency} at a time)`,
    });
  }

  /*
   * A failed batch is retried rather than patched over: mixing real judgments
   * with fallback ones would produce a screen where some rows are analysis and
   * some are generated text, with nothing to tell them apart — the
   * `Agent 미실행` badge is an all-or-nothing signal and must stay honest. So a
   * batch that is still failing after its retry fails the whole run, and the
   * caller's fallback path takes over for every item at once.
   */
  const tasks = batches.map((items, index) => () => classifyBatch(input, items, index, batches.length, options));
  const retryOptions = {
    limit: maxConcurrency,
    beforeRetry: (reasons) => {
      // An abort is not a failure to retry — it stays cancelled, all the
      // way up to the caller that started it.
      if (options.signal?.aborted) throw reasons[0];
      options.onLog?.({ stream: 'system', message: `L4 fan-out: retrying ${reasons.length} failed batch(es) once` });
    },
  };

  /*
   * Cache priming: every batch shares the same prompt prefix (CLI system
   * prompt + classification instructions), but a cache entry only exists
   * after the first call finishes — launch all four at once and the whole
   * first wave misses, each writing the full prefix at the write rate.
   * Running ONE batch to completion first turns the other batches' prefix
   * into cache reads at a tenth of the price, for one batch of added
   * latency.
   */
  let outcomes;
  if (batches.length > 1) {
    const [first] = await runAllWithSingleRetry([tasks[0]], retryOptions);
    const rest = await runAllWithSingleRetry(tasks.slice(1), retryOptions);
    outcomes = [first, ...rest];
  } else {
    outcomes = await runAllWithSingleRetry(tasks, retryOptions);
  }

  const executions = outcomes.map((outcome) => ({ ...outcome.value, retried: outcome.retried }));
  const judged = { items: executions.flatMap((execution) => execution.judged.items) };
  const result = synthesizeL4Result(input, judged);

  const meta = aggregateBatchMeta(executions, {
    batches: batches.length,
    batchSize: batches[0]?.length ?? 0,
    maxConcurrency,
    wallClockMs: Date.now() - startedAt,
    requestedModel: options.model,
  });
  if (batches.length > 1) {
    options.onLog?.({
      stream: 'system',
      message: `L4 fan-out done: wall ${Math.round(meta.durationMs / 1000)}s vs ${Math.round(meta.batchPlan.serialDurationMs / 1000)}s of batch time`,
    });
  }

  return { result, meta };
}

/**
 * Folds the per-batch envelopes into the single meta object every consumer
 * already reads. Cost and usage are sums (the run really did spend all of
 * it); duration is the wall clock, not the sum, because that is what the user
 * waited. `serialDurationMs` keeps the sum alongside it, so the speedup is
 * evidence in the run record rather than a claim — equal values mean the
 * fan-out bought nothing.
 */
export function aggregateBatchMeta(executions, plan) {
  return {
    runner: 'claude-cli',
    // Envelope-reported model (evidence), falling back to what was asked.
    model: executions[0]?.model ?? plan.requestedModel ?? 'sonnet',
    durationMs: plan.wallClockMs,
    costUsd: sumCost(executions),
    usage: sumUsage(executions),
    // Kept singular for existing consumers; the fan-out also reports them all.
    sessionId: executions[0]?.sessionId ?? null,
    sessionIds: executions.map((execution) => execution.sessionId).filter(Boolean),
    // L4 grants no tools, so this is always empty — carried along for shape
    // parity with L6's meta rather than any expected signal.
    toolTrace: executions.flatMap((execution) => execution.toolTrace ?? []),
    batchPlan: {
      batches: plan.batches,
      batchSize: plan.batchSize,
      maxConcurrency: plan.maxConcurrency,
      retriedBatches: executions.filter((execution) => execution.retried).length,
      serialDurationMs: executions.reduce((total, execution) => total + (execution.durationMs ?? 0), 0),
    },
  };
}

async function classifyBatch(input, items, index, batchCount, options) {
  const prompt = [
    buildL4PromptForInput({ ...input, items }, { ...options, batch: { index: index + 1, count: batchCount } }),
    '',
    'Respond with ONE minified JSON object only — no prose, no code fences, no tool use. Shape:',
    OUTPUT_SPEC,
    '',
    '선택 필드(searchTerms/configKeys/relatedComponents/fileGlobs)는 확실히 아는 경우에만 채우고, 모르면 빈 배열로 두어라. 추측으로 채우지 마라.',
    '',
    /*
     * §5.5 판별 신호 지침 — l6-deterministic-evidence-design.md §1.2c의
     * 실측 오판(sass 관련 3유닛이 "@import 없음"이라고 사실과 다르게
     * NOT_AFFECTED됨) 원인을 코드 규칙이 아니라 여기서 막는다: 원인은
     * searchTerms가 "sass"·"scss" 같은 주제어였다는 것 — 프로젝트 어디서나
     * (주석·문서 포함) 걸리는 단어라 증거가 되지 못했다.
     */
    'searchTerms는 주제어가 아니라 판별 신호다 — "그 텍스트가 프로젝트 코드에 있으면 영향이',
    '있고, 없으면 없다"고 말할 수 있는 것만 넣는다. 라이브러리 이름·기능 이름처럼 어디에나',
    '나올 수 있는 일반어(예: "sass", "css", "config")는 넣지 않는다 — 검색 결과가 코드인지',
    '문서·주석인지 구분되지 않아 증거가 되지 못한다.',
    '',
    '변경이 문법·전처리기 차원이면(예: "always use sass compiler API", 특정 API deprecation)',
    '그 문법 토큰 자체를 searchTerms에 넣고, 대상 파일 유형을 fileGlobs에 넣는다. 예:',
    '"always use sass compiler API"라는 변경이면 searchTerms에 `"@import"`(legacy 문법의',
    '실제 표식), fileGlobs에 `"*.scss"` — "sass"라는 주제어가 아니라. fileGlobs는 searchTerms가',
    '특정 파일 유형에서만 의미 있을 때만 채운다 — 대부분의 항목은 비워 둔다.',
  ].join('\n');

  const execution = await runClaudePrint(prompt, {
    command: options.command,
    // Classification is mechanical enum-mapping over provided text — the
    // faster tier is the right default, and callers can still override.
    model: options.model ?? 'sonnet',
    timeoutMs: options.timeoutMs,
    signal: options.signal,
    onLog: options.onLog,
    // Classification sees only the prompt: no read tools, no side effects.
    allowedTools: '',
    disallowedTools: 'Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch,Read,Grep,Glob',
  });

  const judged = parseJsonFromAgentMessage(execution.text);
  assertBatchIsComplete(judged, items, index + 1, batchCount);
  return { ...execution, judged, retried: false };
}

/**
 * Completeness is checked per batch, not once on the merged response, so a
 * short answer costs one batch retry instead of the entire run.
 */
function assertBatchIsComplete(judged, items, batchNumber, batchCount) {
  const label = batchCount > 1 ? `batch ${batchNumber}/${batchCount} ` : '';
  if (!judged || !Array.isArray(judged.items)) {
    throw new Error(`L4 ${label}response is missing an items array`);
  }
  const answered = new Set(judged.items.map((item) => item?.itemId));
  const missing = items.filter((item) => !answered.has(item.itemId)).map((item) => item.itemId);
  if (missing.length) {
    throw new Error(`L4 ${label}response is missing ${missing.length} item(s): ${missing.slice(0, 5).join(', ')}`);
  }
}

function resolveBatchSize(batchSize) {
  if (batchSize === undefined || batchSize === null) return DEFAULT_BATCH_SIZE;
  const size = Number(batchSize);
  // 0 / negative / NaN all mean "one call", which is how the fan-out is
  // switched off without a separate flag.
  return Number.isFinite(size) && size > 0 ? Math.floor(size) : 0;
}

function resolveConcurrency(maxConcurrency) {
  const limit = Number(maxConcurrency);
  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_MAX_CONCURRENCY;
}

function sumCost(executions) {
  const costs = executions.map((execution) => execution.costUsd).filter((cost) => typeof cost === 'number');
  return costs.length ? costs.reduce((total, cost) => total + cost, 0) : null;
}

/**
 * Usage fields differ by CLI version, so this sums whatever numeric keys the
 * envelopes actually carry instead of naming them.
 */
function sumUsage(executions) {
  const usages = executions.map((execution) => execution.usage).filter((usage) => usage && typeof usage === 'object');
  if (!usages.length) return null;

  const total = {};
  for (const usage of usages) {
    for (const [key, value] of Object.entries(usage)) {
      if (typeof value === 'number') total[key] = (total[key] ?? 0) + value;
    }
  }
  return total;
}
