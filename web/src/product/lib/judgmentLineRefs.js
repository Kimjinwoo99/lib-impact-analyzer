/**
 * File:line references a judgment names for a given file.
 *
 * The code panel (now 대응·테스트 작업대의 상세 패널, 옛 파일 상세 탭)
 * showed only TEXT-MATCH evidence, so a file the
 * judgment itself pointed at (package.json, vite.config.js) rendered
 * "라인 단위 증거가 없습니다" right above an ACTION_REQUIRED verdict — the
 * screen said "fix this file" and "nothing here" in the same breath. But the
 * judgment prose already carries the where: measured on the vite run, 11 of
 * 36 actionable judgments embed `vite.config.js:46-59`-style references,
 * because L6 reads the project and cites what it saw. This module lifts
 * those references out so the panel can show the actual lines to edit.
 *
 * Parsing model prose is the honest trade-off here: the references are the
 * model's own citations, displayed as "판정 지목 위치" — not manufactured
 * evidence. A judgment that cites nothing contributes nothing.
 */

const MAX_REFS = 8;
const MAX_RANGE_LINES = 20;

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param path       the file the detail screen is showing (repo-relative)
 * @param judgments  the judgments citing that file (already filtered)
 * @returns [{ start, end, unit, verdict }] — deduped, capped, sorted
 */
export function judgmentLineRefs(path, judgments) {
  const fullPath = String(path ?? '').trim();
  if (!fullPath) return [];
  const baseName = fullPath.split('/').pop();
  // `vite.config.js:46-59` 또는 `runtime/env.d.ts:12` — 전체 경로/파일명 둘 다.
  const pattern = new RegExp(
    `(?:^|[^\\w/])(?:${escapeRegex(fullPath)}|${escapeRegex(baseName)}):(\\d+)(?:-(\\d+))?`,
    'g',
  );

  const refs = [];
  for (const judgment of judgments ?? []) {
    const text = [judgment.reason, judgment.action, judgment.verify].filter(Boolean).join(' ');
    for (const match of text.matchAll(pattern)) {
      const start = Number(match[1]);
      if (!Number.isInteger(start) || start < 1) continue;
      const rawEnd = match[2] ? Number(match[2]) : start;
      const end = Math.max(start, Math.min(rawEnd, start + MAX_RANGE_LINES - 1));
      refs.push({ start, end, unit: judgment.unit, verdict: judgment.verdict });
    }
  }

  const seen = new Set();
  return refs
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .filter((ref) => {
      const key = `${ref.start}-${ref.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_REFS);
}
