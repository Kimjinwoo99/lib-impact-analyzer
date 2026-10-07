/**
 * L7 — 코드 수정형 ACTION 판정의 수정 전/후 diff 생성 프롬프트.
 *
 * L6와 같은 계약: 도구 0, 필요한 것은 전부 프롬프트에 실어 보낸다. 여기서
 * "필요한 것"은 ① 판정(무엇을 왜 고치는지) ② 근거 가이드 섹션 원문
 * ③ **지목된 파일들의 실제 소스**다. 소스를 서버가 읽어 실어주므로 모델이
 * 지어낼 여지가 줄고, 그래도 남는 생성 리스크는 verifyFixBlocks(before 블록
 * 실파일 대조)가 화면 앞에서 거른다.
 *
 * 어떤 판정이 L7 대상인가: ACTION_REQUIRED 중 결정론 합성(fix-synthesis.js)이
 * 처리하지 못하는 것 — 즉 package.json 버전 치환으로 끝나지 않는, 소스 코드를
 * 고쳐야 하는 판정(guide:*·item:* 그리고 호환 버전이 없는 chain:*).
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MAX_FILE_LINES = 400;
const EVIDENCE_WINDOW = 60;

/** 판정이 지목한 파일들의 소스를 모은다 — 작으면 전체, 크면 증거 줄 주변 창. */
function collectSources(projectPath, judgment, guideSection) {
  const root = String(projectPath ?? '').trim();
  const paths = [...new Set([
    ...(judgment.files ?? []),
    ...((guideSection?.template?.evidence ?? []).map((entry) => entry.file)),
  ])].slice(0, 6);

  const sources = [];
  for (const path of paths) {
    const fullPath = root ? resolve(root, path) : null;
    if (!fullPath || !existsSync(fullPath)) continue;
    const lines = readFileSync(fullPath, 'utf8').split('\n');
    if (lines.length <= MAX_FILE_LINES) {
      sources.push({ path, text: lines.join('\n'), partial: false });
      continue;
    }
    // 큰 파일 — 증거 줄 주변 창만. 창이 없으면(증거가 다른 파일) 앞부분만.
    const anchors = (guideSection?.template?.evidence ?? [])
      .filter((entry) => entry.file === path)
      .map((entry) => entry.line);
    const from = anchors.length ? Math.max(0, Math.min(...anchors) - EVIDENCE_WINDOW) : 0;
    const to = anchors.length ? Math.min(lines.length, Math.max(...anchors) + EVIDENCE_WINDOW) : MAX_FILE_LINES;
    sources.push({ path, text: lines.slice(from, to).join('\n'), partial: true, from: from + 1, to });
  }
  return sources;
}

export function buildL7Input(payload) {
  const judgments = (payload.judgments ?? []).slice(0, 8);
  const units = judgments.map((judgment) => {
    const guideSection = (payload.migrationSections ?? []).find(
      (section) => `guide:${section.heading}` === judgment.unit,
    ) ?? null;
    return {
      judgment,
      guideSection,
      sources: collectSources(payload.projectPath, judgment, guideSection),
    };
  });
  return { units };
}

export function buildL7Prompt(payload) {
  const { units } = buildL7Input(payload);

  const blocks = units.map(({ judgment, guideSection, sources }) => [
    `### 판정 unit: ${judgment.unit}`,
    `- 사유: ${judgment.reason ?? ''}`,
    `- 조치: ${judgment.action ?? ''}`,
    guideSection ? `- 가이드 원문: ${guideSection.excerpt ?? ''}` : null,
    ...(guideSection?.template?.evidence ?? []).map(
      (entry) => `- 실측 사용 위치: ${entry.file}:${entry.line} → ${entry.excerpt}`,
    ),
    ...sources.map((source) =>
      `\n[소스 ${source.path}${source.partial ? ` — ${source.from}~${source.to}행 발췌` : ' — 전체'}]\n\`\`\`\n${source.text}\n\`\`\``),
  ].filter(Boolean).join('\n'));

  return [
    `당신은 라이브러리 업데이트의 코드 수정안을 작성한다. 대상: ${payload.packageName} ${payload.currentVersion} → ${payload.targetVersion}.`,
    '',
    '아래 각 판정에 대해, 제공된 소스에서 수정이 필요한 부분의 수정 전/후 블록을 만든다.',
    '',
    '규칙 — 전부 지켜야 한다:',
    '- `before`는 제공된 소스의 **연속된 줄들을 원문 그대로**(들여쓰기·공백 포함) 복사한다. 요약·생략·줄 번호 접두 금지. 서버가 실제 파일과 대조하므로 한 글자라도 다르면 그 블록은 버려진다.',
    '- `after`는 그 블록의 최소 수정본이다. 수정과 무관한 줄을 바꾸지 않는다.',
    '- 블록 범위는 수정되는 줄 + 문맥 1~2줄. 한 파일에서 떨어진 위치 여러 곳이면 블록을 나눈다.',
    '- 제공된 소스에 없는 파일을 지어내지 않는다. 수정할 것이 정말 없으면 그 unit의 files를 빈 배열로 두고 note에 이유를 적는다.',
    '- `note`는 이 블록이 무엇을 왜 바꾸는지 한 문장.',
    '',
    '응답은 아래 JSON 하나만. 코드펜스·설명 문장 금지.',
    '{"fixes":[{"unit":"판정 unit 그대로","files":[{"path":"소스에 제공된 경로 그대로","blocks":[{"before":"...","after":"...","note":"..."}]}]}]}',
    '',
    blocks.join('\n\n---\n\n'),
  ].join('\n');
}

/**
 * 스키마 검증 — 불량 항목만 버리고 유효한 것은 남긴다.
 *
 * 전체 실패는 fixes 배열 부재뿐이다. 이전에는 항목 하나의 결함(빈 파일 항목
 * 등)이 전체 throw로 이어져, assembleFixes의 결정론 manifest fix까지 함께
 * 사라졌다(vue-router 실측, 2026-08-22). 버린 항목은 `dropped`로 보고한다.
 */
export function validateL7Result(parsed, { expectedUnits }) {
  const fixes = parsed?.fixes;
  if (!Array.isArray(fixes)) throw new Error('fixes 배열이 없습니다');
  const dropped = [];
  const cleaned = [];
  for (const fix of fixes) {
    if (!fix?.unit || !Array.isArray(fix.files)) {
      dropped.push(`${fix?.unit ?? '?'}: files 배열 없음`);
      continue;
    }
    const files = [];
    for (const file of fix.files) {
      if (!file?.path || !Array.isArray(file.blocks) || !file.blocks.length) {
        dropped.push(`빈 파일 항목: ${fix.unit} → ${file?.path ?? '?'}`);
        continue;
      }
      const blocks = file.blocks.filter((block) => {
        if (!block?.before?.trim() || !block?.after?.trim()) {
          dropped.push(`빈 블록: ${fix.unit} → ${file.path}`);
          return false;
        }
        if (block.before === block.after) {
          dropped.push(`before==after: ${fix.unit} → ${file.path}`);
          return false;
        }
        return true;
      });
      if (blocks.length) files.push({ ...file, blocks });
    }
    if (files.length) cleaned.push({ ...fix, files });
  }
  for (const unit of expectedUnits) {
    if (!fixes.some((fix) => fix?.unit === unit)) dropped.push(`unit 응답 누락: ${unit}`);
  }
  return { fixes: cleaned, dropped };
}
