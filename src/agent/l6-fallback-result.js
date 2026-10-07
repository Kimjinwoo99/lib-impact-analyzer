/**
 * Deterministic L6 result — the dev-tools "Mock 실행" path.
 *
 * Its only job is to let the impact-judgment SCREEN be exercised without
 * spending Claude usage: same shape as a real judgment, same unit keys, so
 * every downstream consumer behaves identically. It is not an approximation
 * of the judgment — no project file is read, so the reasons say so plainly
 * rather than pretending to evidence they do not have.
 *
 * The verdict mapping is mechanical and stated in each reason, so a mock
 * result can never be mistaken for a real one on screen:
 *   HIGH / migration guide section → ACTION_REQUIRED
 *   everything else                → SMOKE_TEST
 * NOT_AFFECTED is never produced: claiming "this project is unaffected"
 * without reading the project is exactly the unfounded verdict the real
 * prompt forbids.
 */

import { buildL6Input } from './l6-prompt.js';

export function buildL6FallbackResult(payload = {}, options = {}) {
  const input = buildL6Input(payload);
  const startedAt = Date.now();

  const judgments = input.units.map((unit) => {
    const isGuide = unit.unit.startsWith('guide:');
    const isHighRisk = unit.preliminaryRisk === 'HIGH';
    // chain units judged from registry facts alone stay honest without the
    // project: blocked/engines are "the registry/metadata already ruled"
    // facts, so ACTION_REQUIRED needs no source reading. peer-diff/companion
    // chains still need project context → SMOKE_TEST like everything else.
    const isDecidedChain = unit.unit.startsWith('chain:') && Boolean(unit.blocked || unit.engines);
    const verdict = isGuide || isHighRisk || isDecidedChain ? 'ACTION_REQUIRED' : 'SMOKE_TEST';
    const label = unit.heading ?? unit.scope ?? unit.name ?? unit.unit;

    return {
      unit: unit.unit,
      verdict,
      reason: `[Mock] 프로젝트 소스를 읽지 않은 결정론 결과 — ${
        isGuide ? '마이그레이션 가이드 항목'
        : isDecidedChain ? `동반 상향 registry 실측(${unit.blocked ? `peer ${unit.blocked.verdict}` : 'engines 변화'})`
        : isHighRisk ? '분류 위험도 HIGH'
        : '분류 위험도 LOW/MEDIUM'
      }이라 규칙상 ${verdict}로 매핑됨.`,
      action: verdict === 'ACTION_REQUIRED' ? `[Mock] ${label} 관련 코드를 실제 판정으로 확인하세요.` : null,
      verify: `[Mock] ${label}을(를) 사용하는 화면을 눌러 동작을 확인하세요.`,
      files: [],
    };
  });

  return {
    result: {
      judgments,
      smokePoints: [
        '[Mock] 이 결과는 개발도구의 Mock 실행으로 생성되었습니다 — 실제 영향 판정이 아닙니다.',
      ],
      // Shape parity with a real result (§7's evidenceGaps) — a rule-based
      // mapping has no "input evidence was insufficient" moments to report.
      evidenceGaps: [],
      summary: {
        keyActions: ['[Mock] 실제 판정은 개발도구에서 실제 실행으로 전환한 뒤 다시 돌리세요.'],
        commonRisks: [],
      },
    },
    meta: {
      runner: 'fallback-mock',
      model: null,
      fallback: true,
      fallbackReason: options.reason ?? 'Mock L6 requested from dev tools.',
      deterministic: true,
      durationMs: Date.now() - startedAt,
      costUsd: null,
      usage: null,
      sessionId: null,
      unitCount: input.units.length,
      rawText: null,
      gate: input.gate,
    },
  };
}
