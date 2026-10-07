/**
 * L6 runner — project-impact judgment through the Claude Code CLI.
 *
 * Same contract as L4 now: zero tools, no working-directory dependency
 * (l6-deterministic-evidence-design.md). L6 was born (Round F, 8/7) with
 * Read/Grep/Glob granted — at the time there was no deterministic evidence
 * infrastructure, and the pinia smoke run showed free tools were the only
 * way to get evidence-grade verdicts ("$subscribe 호출이 전혀 없다 — grep
 * 확인") instead of text-only reasoning. That premise is gone: E1
 * (package-references.js) and E3 (matchSourceImpactBatch) now assemble the
 * same file:line evidence deterministically and attach it to the payload
 * BEFORE this runner is called (src/agent/l6-evidence.js), so the judgment
 * quotes prepared evidence instead of exploring for it. Measured cost of the
 * old contract: run-to-run non-determinism (the same project, same prompt,
 * different files read) that a golden run (2026-08-11/12) traced to a
 * concrete false judgment — an Agent that read one Sass file out of several
 * and generalized wrong about a legacy `@import` chain it never opened.
 */

import { parseJsonFromAgentMessage, runClaudePrint } from './claude-cli.js';
import { buildL6Input, buildL6Prompt, validateL6Result } from './l6-prompt.js';

export async function runL6WithClaudeCli(payload, options = {}) {
  // Which gate rule shaped the classified units — in the job log, so a run
  // where L6 judged backfilled items reads differently from one where the
  // review filter did its normal work. `units` doubles as the completeness
  // contract: buildL6Input is pure, so this is exactly the list the prompt
  // will carry, and validateL6Result below requires a judgment for each.
  const { gate, units } = buildL6Input(payload);
  options.onLog?.({
    stream: 'system',
    message: `L6 gate: ${gate.rule} — classified ${gate.totalItems}, review ${gate.reviewItems}, judged ${gate.selectedItems}`,
  });

  /*
   * 타임아웃 기본값을 여기서 유닛 수에 비례해 계산한다.
   *
   * 이 스케일링은 2026-08-10에 도입됐지만 `server/dev-server.js`의 L6 job
   * 핸들러에만 있었다. 그래서 러너를 직접 부르는 스크립트·프로브는 조용히
   * `claude-cli.js`의 최후 폴백 5분을 받았고, 2026-08-13 실측에서 그걸로
   * 한 번 죽어 실비용을 날렸다 — 프로덕션은 30분인데 프로브는 5분이라는
   * 차이를 호출부가 기억해야 하는 구조가 함정이었다.
   *
   * 이제 러너가 기본값을 알고, 호출자는 필요할 때만 덮어쓴다(dev-server는
   * 계속 자기 값을 넘기므로 동작 변화 없음).
   */
  const unitCount = units.length;
  const scaledTimeoutMs = Math.min(30 * 60 * 1000, Math.max(10 * 60 * 1000, unitCount * 25 * 1000));
  const timeoutMs = options.timeoutMs ?? scaledTimeoutMs;
  if (!options.timeoutMs) {
    options.onLog?.({
      stream: 'system',
      message: `L6 timeout: ${Math.round(timeoutMs / 60000)}m (units ${unitCount}, 러너 기본값)`,
    });
  }

  const prompt = buildL6Prompt(payload);
  const execution = await runClaudePrint(prompt, {
    command: options.command,
    // Explicit default: without it the CLI inherits the user's session model,
    // which can be the top tier — a vite 2-major run judged on fable-5 cost
    // $2.64 where the pinia E2E produced evidence-grade verdicts on sonnet
    // for $1.94. Callers opt UP via body.model when a run warrants it.
    model: options.model ?? 'sonnet',
    timeoutMs,
    signal: options.signal,
    onLog: options.onLog,
    // No cwd override: the judgment reads nothing from disk, so there is no
    // "target project" to run inside of — same as L4.
    allowedTools: '',
    disallowedTools: 'Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch,Read,Grep,Glob',
    /*
     * CLI 기본 출력 한도(sonnet 5: 64,000)로는 이 판정이 안 들어간다. 총출력의
     * 70~74%가 thinking이고 그게 응답 텍스트와 같은 예산을 쓰기 때문에, 판정
     * JSON이 1.7만 토큰밖에 안 되는데도 2026-08-13 골든이 배열 중간에서 잘렸다.
     * 모델 상한까지 올려 한 턴에 끝낸다 — 상한 초과는 CLI가 안전하게 절삭한다.
     */
    maxOutputTokens: options.maxOutputTokens ?? 128000,
  });

  /*
   * 파싱 실패 시 rawText를 살려서 올린다. 이전에는 이 한 줄이 던지면 아래
   * `meta.rawText`에 닿기 전이라 에이전트가 실제로 뭘 썼는지가 통째로
   * 사라졌고, 2026-08-13에는 원인을 찾으려고 CLI 세션 jsonl을 뒤져야 했다.
   */
  let result;
  try {
    result = validateL6Result(parseJsonFromAgentMessage(execution.text), {
      expectedUnits: units.map((unit) => unit.unit),
    });
  } catch (error) {
    const budget = execution.budget ?? null;
    const reason = execution.truncated
      ? `출력이 한도에서 잘렸습니다 (출력 ${budget?.outputTokens ?? '?'} / 한도 ${budget?.maxOutputTokens ?? '?'})`
      : '결과 형식이 스키마와 맞지 않습니다';
    options.onLog?.({
      stream: 'system',
      message: `L6 결과 해석 실패 — ${reason}. 최종 메시지 ${execution.text.length}자`
        + `, thinking ${budget?.thinkingTokens ?? '?'} · stop=${budget?.stopReason ?? '?'} · turns=${budget?.numTurns ?? '?'}`,
    });
    const wrapped = new Error(`L6 결과 해석 실패 (${reason}): ${error.message}`);
    wrapped.rawText = execution.text;
    wrapped.usage = execution.usage;
    wrapped.budget = budget;
    wrapped.truncated = execution.truncated ?? false;
    throw wrapped;
  }

  return {
    result,
    meta: {
      runner: 'claude-cli',
      // Envelope-reported model. When no --model was passed this is the only
      // way to know which model the CLI default actually resolved to.
      model: execution.model ?? options.model ?? null,
      durationMs: execution.durationMs,
      costUsd: execution.costUsd,
      usage: execution.usage,
      sessionId: execution.sessionId,
      // The agent's final message verbatim — the dev markdown panel renders
      // this while the output format is still being iterated on.
      rawText: execution.text,
      // 출력 예산 진단. 성공한 실행에도 남긴다 — 한도까지 얼마나 남았는지가
      // 여기 있고, 그걸 봤다면 2026-08-13 절단은 예측할 수 있었다(기준선이 이미
      // 89% 지점이었다).
      budget: execution.budget ?? null,
      rateLimit: execution.rateLimit ?? null,
      gate,
      // L6 grants no tools now (same as L4) — always empty. Kept for shape
      // parity with recordings made under the old tool-granted contract,
      // where this carried every Read/Grep/Glob call the judgment made.
      toolTrace: execution.toolTrace ?? [],
    },
  };
}
