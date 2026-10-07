/**
 * 수정안(fix) 조립 — 결정론 합성과 검증 가드.
 *
 * 대응·테스트 화면의 diff는 두 공급원에서 온다:
 *   1. 여기(결정론) — package.json 버전 상향. 대상 패키지 자체는 **항상**
 *      들어가고(업데이트의 전제 그 자체라 어떤 판정도 이걸 말하지 않는다),
 *      chain:* ACTION 중 peerAudit이 호환 버전을 실측해 둔 동반 의존성도
 *      문자열 치환으로 정확히 합성된다. `npm install pkg@x`가 쓰는 값과
 *      동일하므로 근사가 아니라 수정안이다. Agent 비용 0.
 *   2. L7 Agent(l7-claude-runner.js) — 코드 수정형 ACTION. 생성물이므로
 *      아래 verifyFixBlocks가 before 블록을 실제 파일과 대조해 통과한 것만
 *      diff로 표시된다(불일치는 verified:false — 지어낸 diff가 화면에 오르지
 *      못하게 하는 정직성 가드).
 *
 * fix 항목의 모양 (UI·기록 공유 계약):
 *   { unit, title, source: 'deterministic'|'agent',
 *     files: [{ path, blocks: [{ before, after, note, verified }] }] }
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** package.json에서 `"<name>": "<range>"` 선언 줄을 찾아 접두 보존 치환 블록을 만든다. */
function manifestBumpBlock(manifestText, name, targetVersion) {
  const lines = manifestText.split('\n');
  const pattern = new RegExp(`^(\\s*)"${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:\\s*"([^"]+)"(,?)\\s*$`);
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(pattern);
    if (!match) continue;
    const [, indent, range, comma] = match;
    // URL·workspace 선언은 버전 치환의 대상이 아니고, `*`는 이미 목표를 허용한다.
    if (/^(https?:|file:|workspace:|\*$)/.test(range)) return null;
    // 기존 접두(^·~·>= 등)를 보존하고 버전 숫자만 목표로 — npm이 쓰는 값과 같다.
    const prefix = range.match(/^[^\d]*/)?.[0] ?? '';
    const nextRange = `${prefix}${targetVersion}`;
    if (nextRange === range) return null;
    return {
      before: lines[index],
      after: `${indent}"${name}": "${nextRange}"${comma}`,
      note: `${range} → ${nextRange}`,
      verified: true,
      line: index + 1,
    };
  }
  return null;
}

/**
 * 결정론 fix 목록.
 *
 * @param judgments  L6 판정 — chain:* ACTION의 동반 상향을 여기서 합성한다
 * @param peerAudit  구조화 호환 버전(firstCompatible/latestCompatible)의 출처
 */
export function synthesizeDeterministicFixes({ projectPath, packageName, currentVersion, targetVersion, judgments, peerAudit }) {
  const root = String(projectPath ?? '').trim();
  const manifestPath = root ? resolve(root, 'package.json') : null;
  if (!manifestPath || !existsSync(manifestPath)) return [];
  const manifestText = readFileSync(manifestPath, 'utf8');

  const fixes = [];

  // 1. 대상 패키지 자체 — 항상. 이 줄이 이번 실행 전체의 전제다.
  if (targetVersion) {
    const block = manifestBumpBlock(manifestText, packageName, targetVersion);
    if (block) {
      fixes.push({
        unit: `manifest:${packageName}`,
        title: `${packageName} ${currentVersion} → ${targetVersion}`,
        source: 'deterministic',
        command: `npm install ${packageName}@${targetVersion}`,
        files: [{ path: 'package.json', blocks: [block] }],
      });
    }
  }

  // 2. chain:* ACTION — peerAudit의 실측 호환 버전으로 동반 상향.
  const rows = [...(peerAudit?.rows ?? []), ...(peerAudit?.companions ?? [])];
  for (const judgment of judgments ?? []) {
    if (judgment.verdict !== 'ACTION_REQUIRED') continue;
    const chainName = judgment.unit?.startsWith('chain:') ? judgment.unit.slice('chain:'.length) : null;
    if (!chainName) continue;
    const row = rows.find((entry) => entry.name === chainName);
    const compatible = row?.latestCompatible ?? row?.firstCompatible ?? null;
    if (!compatible) continue; // DEAD_END·정보 없음 — 치환할 목표가 없다(L7/산문 몫)
    const block = manifestBumpBlock(manifestText, chainName, compatible);
    if (!block) continue;
    fixes.push({
      unit: judgment.unit,
      title: `${chainName} → ${compatible} (동반 상향)`,
      source: 'deterministic',
      command: `npm install ${chainName}@${compatible}`,
      files: [{ path: 'package.json', blocks: [block] }],
    });
  }

  return fixes;
}

/**
 * before 블록을 실제 파일과 대조한다 — 통과 못 한 블록은 verified:false.
 *
 * 1차는 원문 부분 문자열, 2차는 줄별 trim 후 연속 일치(들여쓰기 표기 차이만
 * 흡수). 더 느슨한 매칭은 하지 않는다 — "지금 코드의 이 부분"이라는 주장의
 * 절반이 검증이라서, 느슨해질수록 diff 전체의 신뢰가 같이 무너진다.
 */
export function verifyFixBlocks(projectPath, fixes) {
  const root = String(projectPath ?? '').trim();
  for (const fix of fixes ?? []) {
    for (const file of fix.files ?? []) {
      const fullPath = root ? resolve(root, file.path) : null;
      const text = fullPath && existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : null;
      const trimmedLines = text === null ? null : text.split('\n').map((line) => line.trim());
      for (const block of file.blocks ?? []) {
        if (block.verified === true) continue; // 결정론 합성분 — 파일에서 직접 만들었다
        if (text === null) { block.verified = false; continue; }
        const exactIndex = text.indexOf(block.before);
        if (exactIndex !== -1) {
          block.verified = true;
          // 대조가 찾은 시작 줄 — 화면의 줄 번호 거터가 그대로 쓴다.
          block.line = block.line ?? text.slice(0, exactIndex).split('\n').length;
          continue;
        }
        const wanted = String(block.before).split('\n').map((line) => line.trim());
        const runStart = trimmedLines === null ? -1 : findContiguousRun(trimmedLines, wanted);
        block.verified = runStart !== -1;
        if (runStart !== -1) block.line = block.line ?? runStart + 1;
      }
    }
  }
  return fixes;
}

/** run이 시작하는 인덱스, 없으면 -1. */
function findContiguousRun(haystack, run) {
  if (!run.length) return -1;
  outer: for (let start = 0; start <= haystack.length - run.length; start += 1) {
    for (let offset = 0; offset < run.length; offset += 1) {
      if (haystack[start + offset] !== run[offset]) continue outer;
    }
    return start;
  }
  return -1;
}
