import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { parseEnvelope, parseStreamJson, readOutputBudget } from '../src/agent/claude-cli.js';

const resultEnvelope = { type: 'result', is_error: false, result: '{"ok": true}', total_cost_usd: 0.04, usage: { output_tokens: 9 }, session_id: 's1' };

function ndjson(...events) {
  return events.map((event) => JSON.stringify(event)).join('\n');
}

describe('stream-json parsing', () => {
  test('collects tool_use blocks across turns and returns the final result line', () => {
    const stdout = ndjson(
      { type: 'system', subtype: 'init' },
      { type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'Read', input: { file_path: 'runtime/env.d.ts' } }] } },
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: '...' }] } },
      { type: 'assistant', message: { content: [{ type: 'tool_use', id: 't2', name: 'Grep', input: { pattern: 'setupLayouts' } }] } },
      { type: 'assistant', message: { content: [{ type: 'text', text: '{"ok": true}' }] } },
      resultEnvelope,
    );

    const { envelope, toolTrace } = parseStreamJson(stdout);
    assert.deepEqual(envelope, resultEnvelope);
    assert.equal(toolTrace.length, 2);
    assert.deepEqual(toolTrace[0], { name: 'Read', input: { file_path: 'runtime/env.d.ts' } });
    assert.deepEqual(toolTrace[1], { name: 'Grep', input: { pattern: 'setupLayouts' } });
  });

  test('toolTrace is empty when the turn used no tools (L4 shape)', () => {
    const stdout = ndjson(
      { type: 'assistant', message: { content: [{ type: 'text', text: '{"items": []}' }] } },
      resultEnvelope,
    );
    const { toolTrace } = parseStreamJson(stdout);
    assert.deepEqual(toolTrace, []);
  });

  test('tolerates stray non-JSON lines around the events', () => {
    const stdout = `warning: something\n${ndjson(resultEnvelope)}\n`;
    const { envelope } = parseStreamJson(stdout);
    assert.deepEqual(envelope, resultEnvelope);
  });

  test('throws when no result line is present', () => {
    const stdout = ndjson({ type: 'system', subtype: 'init' });
    assert.throws(() => parseStreamJson(stdout), /did not contain a result line/);
  });

  test('the last result line wins if more than one appears', () => {
    const first = { ...resultEnvelope, result: 'first' };
    const second = { ...resultEnvelope, result: 'second' };
    const { envelope } = parseStreamJson(ndjson(first, second));
    assert.equal(envelope.result, 'second');
  });

  test('picks up the weekly usage warning, which the session transcript never keeps', () => {
    const info = { status: 'allowed_warning', rateLimitType: 'seven_day', utilization: 0.8, resetsAt: 1786615200 };
    const stdout = ndjson(
      { type: 'system', subtype: 'init' },
      { type: 'rate_limit_event', rate_limit_info: info },
      { type: 'assistant', message: { content: [{ type: 'text', text: '{"ok": true}' }] } },
      resultEnvelope,
    );
    const { rateLimit } = parseStreamJson(stdout);
    assert.deepEqual(rateLimit, info);
  });

  test('rateLimit is null when the stream carries no warning', () => {
    const { rateLimit } = parseStreamJson(ndjson(resultEnvelope));
    assert.equal(rateLimit, null);
  });
});

/*
 * 2026-08-13 골든이 죽은 자리. 실측으로 확인한 두 가지가 이 스위트의 전제다.
 *  1) 스트림의 assistant 이벤트는 `stop_reason`이 null이고 토큰 수도 자리값이라
 *     턴별 집계에 쓸 수 없다 — 진짜 수치는 `result` 봉투에만 있다.
 *  2) CLI가 한도 초과 후 이어쓰기에 성공하면 봉투의 `stop_reason`은 `end_turn`이
 *     된다. 그래서 `stop_reason`만 보면 절단을 놓친다.
 */
describe('output budget diagnostics', () => {
  const envelope = (usage, extra = {}) => ({ type: 'result', is_error: false, usage, ...extra });

  test('flags the truncation that end_turn hides, by comparing output against the cap', () => {
    // Round 9 실측값: 두 요청 합계 66,701 · thinking 49,324 · 봉투는 end_turn.
    const budget = readOutputBudget(
      envelope(
        { output_tokens: 66701, output_tokens_details: { thinking_tokens: 49324 } },
        { stop_reason: 'end_turn', num_turns: 2 },
      ),
      64000,
    );
    assert.equal(budget.stopReason, 'end_turn', '봉투는 정상 종료로 보고한다');
    assert.equal(budget.hitCap, true, 'end_turn이어도 합계가 한도 이상이면 절단으로 본다');
    assert.equal(budget.thinkingTokens, 49324);
    assert.equal(Math.round(budget.capRatio * 100), 104);
  });

  test('the Round 8 baseline reads as near the cap, not over it', () => {
    const budget = readOutputBudget(
      envelope(
        { output_tokens: 57111, output_tokens_details: { thinking_tokens: 40127 } },
        { stop_reason: 'end_turn', num_turns: 1 },
      ),
      64000,
    );
    assert.equal(budget.hitCap, false);
    assert.equal(budget.nearCap, true, '89%는 경고 대상이다 — 이걸 봤다면 Round 9를 예측할 수 있었다');
  });

  test('the same run is comfortable once the cap is raised to the model ceiling', () => {
    const budget = readOutputBudget(
      envelope({ output_tokens: 66701 }, { stop_reason: 'end_turn' }),
      128000,
    );
    assert.equal(budget.hitCap, false);
    assert.equal(budget.nearCap, false);
    assert.equal(Math.round(budget.capRatio * 100), 52);
  });

  test('an explicit max_tokens stop counts even without a known cap', () => {
    const budget = readOutputBudget(envelope({ output_tokens: 999 }, { stop_reason: 'max_tokens' }));
    assert.equal(budget.hitCap, true);
    assert.equal(budget.maxOutputTokens, null);
    assert.equal(budget.capRatio, null, '한도를 모르면 비율을 지어내지 않는다');
    assert.equal(budget.nearCap, false);
  });
});

describe('single-line envelope parsing (still used for the result line itself)', () => {
  test('reads the result envelope, tolerating stray lines before it', () => {
    assert.deepEqual(parseEnvelope(JSON.stringify(resultEnvelope)), resultEnvelope);
    const noisy = `warning: something\n${JSON.stringify(resultEnvelope)}`;
    assert.deepEqual(parseEnvelope(noisy), resultEnvelope);
    assert.throws(() => parseEnvelope(''), /no output/);
  });
});
