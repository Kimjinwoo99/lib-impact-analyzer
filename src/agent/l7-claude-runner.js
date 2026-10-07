/**
 * L7 runner — 코드 수정형 ACTION 판정의 수정 전/후 블록 생성.
 *
 * L4/L6와 같은 계약(도구 0 · 증거는 프롬프트에 · JSON 스키마 검증). 별도
 * 진행 단계로 노출하지 않는다 — L6 잡의 꼬리에서 돌고, 화면에는 판정 단계
 * 하나로 보인다(2026-08-22 사용자 결정). 생성물의 정직성은 러너 밖의
 * verifyFixBlocks(실파일 대조)가 책임진다.
 */

import { parseJsonFromAgentMessage, runClaudePrint } from './claude-cli.js';
import { buildL7Prompt, validateL7Result } from './l7-prompt.js';

export async function runL7WithClaudeCli(payload, options = {}) {
  const judgments = payload.judgments ?? [];
  if (!judgments.length) return { result: { fixes: [] }, meta: { runner: 'skipped', durationMs: 0, costUsd: null } };

  // 판정당 ~90초면 실측 여유가 크다(블록 몇 개짜리 생성). 하한 3분, 상한 10분.
  const timeoutMs = options.timeoutMs ?? Math.min(10 * 60 * 1000, Math.max(3 * 60 * 1000, judgments.length * 90 * 1000));

  const prompt = buildL7Prompt(payload);
  const runOnce = () => runClaudePrint(prompt, {
    command: options.command,
    // L6와 같은 이유로 명시 기본값 — 세션 모델 상속으로 최상위 티어가 잡히는
    // 것을 막는다. 코드 블록 생성은 sonnet으로 충분하다.
    model: options.model ?? 'sonnet',
    timeoutMs,
    signal: options.signal,
    onLog: options.onLog,
    allowedTools: '',
    disallowedTools: 'Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch,Read,Grep,Glob',
    maxOutputTokens: options.maxOutputTokens ?? 64000,
  });

  // 코드 문자열의 이스케이프 실수로 JSON이 깨지는 경우가 실측에서 관찰됐다
  // (vite 8종 배치, 2026-08-22). 동일 프롬프트로 1회만 재시도한다 —
  // 프롬프트를 바꾸지 않으므로 판정 조건은 그대로다.
  let execution = await runOnce();
  let result;
  for (let attempt = 0; ; attempt += 1) {
    try {
      result = validateL7Result(parseJsonFromAgentMessage(execution.text), {
        expectedUnits: judgments.map((judgment) => judgment.unit),
      });
      break;
    } catch (error) {
      if (attempt === 0 && !options.signal?.aborted) {
        options.onLog?.({ stream: 'system', message: `L7 응답 해석 실패 — 재시도 1회: ${error.message.slice(0, 120)}` });
        execution = await runOnce();
        continue;
      }
      const wrapped = new Error(`L7 결과 해석 실패: ${error.message}`);
      wrapped.rawText = execution.text;
      throw wrapped;
    }
  }

  return {
    result,
    meta: {
      runner: 'claude-cli',
      model: execution.model ?? options.model ?? null,
      durationMs: execution.durationMs,
      costUsd: execution.costUsd,
      usage: execution.usage,
      sessionId: execution.sessionId,
    },
  };
}
