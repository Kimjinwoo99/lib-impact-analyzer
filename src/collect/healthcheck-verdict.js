/**
 * Healthcheck verdict — deterministic triage, no Agent call.
 *
 * A healthcheck answers a different question from an upgrade run: "should I
 * move at all", not "how do I move safely". The upgrade pipeline's L4/L6
 * agents answer the second question, once this one says yes — so this
 * assembler is pure code over facts the collect step already gathered
 * (OSV, npm deprecation, patch-line health, scope-usage scan), cheap enough
 * to run on every visit instead of spending a classification/judgment budget
 * on it.
 *
 * Priority order, most urgent first — and the ranking tracks CERTAINTY of the
 * signal, not just severity:
 *   SECURITY         an OSV vulnerability affects the installed version —
 *                     a curated, cross-referenced advisory database
 *   DEPRECATED       the maintainer explicitly marked this version deprecated
 *                     on npm — a direct statement, not an inference
 *   LINE_DORMANT     the current line stopped receiving patches; work moved
 *                     to a newer line instead (line-health.js) — INFERRED
 *                     from registry timing, so it is a trend, not a
 *                     statement, and ranks below the two explicit signals
 *   PATCH_AVAILABLE  the line is alive and has a fix touching a scope this
 *                     project's source actually uses
 *   HEALTHY          none of the above — staying is a defensible choice,
 *                     stated with why (nothing applicable, or nothing to fix)
 *
 * A security finding and a dormant line can both be true at once; only the
 * higher-ranked one becomes the headline verdict, but the evidence panel
 * (DiagnosisTab.vue) shows line status and deprecation independently of
 * which level won, so neither fact is lost to the other.
 */

import { compareVersions } from './peer-audit.js';

/**
 * The lowest version that resolves EVERY fixable vulnerability at once.
 *
 * Recommending "latest" for a security finding overstates what is actually
 * required and can even be dishonest: a fix that landed in 3.7.2 does not
 * need a jump to 4.1.8, and if OSV names no fix at all yet, "latest" is not
 * a fix either — it is a guess wearing a recommendation's clothes. Each
 * vulnerability's own `firstFixed` (package-info.js) is already "the lowest
 * version above installed that resolves THIS one"; the target must be at or
 * above the highest of those, since a single version has to clear all of
 * them and later releases are assumed to carry forward earlier fixes.
 */
function resolveSecurityTarget(vulnerabilities) {
  const fixed = vulnerabilities.map((vuln) => vuln.firstFixed).filter(Boolean).sort(compareVersions);
  const unresolvedCount = vulnerabilities.filter((vuln) => !vuln.firstFixed).length;
  return { targetVersion: fixed.length ? fixed[fixed.length - 1] : null, unresolvedCount };
}

/**
 * @param packageName
 * @param currentVersion
 * @param lineHealth      from `assessPatchLine`
 * @param vulnerabilities OSV items applicable to the installed version (may be [])
 * @param deprecation     { deprecated, message } — the installed version's
 *                         own npm `deprecated` field, or null/absent if unset
 * @param items           the healthcheck parseResult's items (CURRENT + PATCH_AHEAD)
 * @param usageByItemId   from `prescanScopeUsage(projectPath, items).byItemId` —
 *                        optional; PATCH_AVAILABLE cannot fire without it, and
 *                        that is the correct behavior (no project to check
 *                        usage against means no usage claim can be made)
 */
export function assembleHealthcheckVerdict({
  packageName,
  currentVersion,
  lineHealth,
  vulnerabilities = [],
  deprecation = null,
  items = [],
  usageByItemId = {},
}) {
  // Context items (versionRole CURRENT) describe what fixed the CURRENT
  // release, not what is still broken — only later-in-line patches count as
  // "unapplied fixes".
  const patchAheadItems = items.filter((item) => item.versionRole === 'PATCH_AHEAD');
  const usedItems = patchAheadItems.filter((item) => usageByItemId[item.itemId]?.verdict === 'USED');

  if (vulnerabilities.length) {
    const { targetVersion, unresolvedCount } = resolveSecurityTarget(vulnerabilities);
    const resolvedCount = vulnerabilities.length - unresolvedCount;
    return {
      level: 'SECURITY',
      headline: targetVersion
        ? `${packageName} ${currentVersion}에 알려진 취약점 ${vulnerabilities.length}건이 있습니다`
        : `${packageName} ${currentVersion}에 알려진 취약점 ${vulnerabilities.length}건이 있으나 해결 버전이 아직 발행되지 않았습니다`,
      detail:
        targetVersion && unresolvedCount
          ? `${targetVersion} 이상에서 ${resolvedCount}건이 해결되지만, ${unresolvedCount}건은 아직 해결 버전이 없습니다`
          : null,
      vulnerabilities,
      patchAheadCount: patchAheadItems.length,
      // No fix published anywhere means "upgrade" is not a remediation —
      // no target is offered rather than pointing at a version that does
      // not actually resolve the finding.
      routingTargetVersion: targetVersion,
      // Why THIS version and not "latest" — the routing button must not ask
      // for trust it hasn't earned. Rendered next to the button in
      // DiagnosisTab.vue, not hidden behind a hover. Answers both directions
      // at once: why not lower (unresolved) and why not higher (unneeded).
      routingReason: targetVersion
        ? unresolvedCount
          ? `해결 버전이 있는 취약점 ${resolvedCount}건을 모두 포함하는 가장 낮은 버전입니다 — 해결 버전이 아직 없는 ${unresolvedCount}건은 이 버전에도 남아 있습니다`
          : `확인된 취약점을 모두 해결하는 가장 낮은 버전입니다 — 이보다 낮으면 취약점이 남고, 높은 버전은 불필요한 변경까지 포함하게 됩니다`
        : null,
    };
  }

  if (deprecation?.deprecated) {
    return {
      level: 'DEPRECATED',
      headline: `설치된 ${packageName} ${currentVersion}은 npm에서 지원 종료(deprecated)로 표시되어 있습니다`,
      // The maintainer's own words, verbatim — this is a statement, not
      // something this tool infers, so it is quoted rather than paraphrased.
      detail: deprecation.message || null,
      patchAheadCount: patchAheadItems.length,
      routingTargetVersion: lineHealth?.latestOverall ?? null,
      // No lower-bound signal exists for "which version un-deprecates this"
      // (deprecation messages are free text, not parsed for a version) — the
      // honest reason names that directly, rather than implying this target
      // was computed the way the security target was.
      routingReason: lineHealth?.latestOverall
        ? `이 상태를 해결하는 특정 버전을 지목할 근거가 없어, 현재 유지보수되는 최신 버전을 기본값으로 제안합니다`
        : null,
    };
  }

  if (lineHealth?.status === 'DORMANT') {
    return {
      level: 'LINE_DORMANT',
      headline: `${lineHealth.myLine} 라인은 더 이상 수정을 받지 않습니다`,
      detail:
        `마지막 패치(${lineHealth.lineFloor}) 이후 다른 라인에서 ${lineHealth.fixForwardCount}개 릴리즈가 나왔습니다` +
        (lineHealth.fixForwardSince ? ` — ${String(lineHealth.fixForwardSince).slice(0, 10)}부터` : ''),
      patchAheadCount: patchAheadItems.length,
      routingTargetVersion: lineHealth.latestOverall,
      // Same shape as DEPRECATED's reason — no computed minimum exists here
      // either, only "this line stopped, that one didn't".
      routingReason: `이 라인에서는 더 이상 패치가 나오지 않아, 특정 버전을 지목할 근거가 없습니다 — 현재 유지보수되는 최신 라인의 최신 버전을 기본값으로 제안합니다`,
    };
  }

  if (usedItems.length) {
    return {
      level: 'PATCH_AVAILABLE',
      headline: `${lineHealth?.myLine ?? currentVersion} 라인에 이 프로젝트가 쓰는 영역의 미적용 수정이 있습니다`,
      usedItems,
      patchAheadCount: patchAheadItems.length,
      routingTargetVersion: lineHealth?.lineFloor ?? null,
      // 패치는 semver 정의상 호환성을 깨지 않으므로, 같은 라인 안에서는 "최소
      // 필요"가 아니라 "가장 최신"이 곧 안전한 선택 — SECURITY의 최소화 원칙과
      // 반대 방향이지만 이유가 다르다: 여기선 더 받아도 위험이 늘지 않는다.
      routingReason: `같은 라인에서 발행된 가장 최신 패치입니다 — 패치는 호환성을 깨지 않으므로 낮은 버전을 고를 이유가 없습니다`,
    };
  }

  return {
    level: 'HEALTHY',
    headline: patchAheadItems.length
      ? `${lineHealth?.myLine ?? currentVersion} 라인에 미적용 수정 ${patchAheadItems.length}건이 있으나 이 프로젝트가 쓰는 영역과 무관합니다`
      : `${lineHealth?.myLine ?? currentVersion} 라인의 최신 패치를 쓰고 있습니다`,
    patchAheadCount: patchAheadItems.length,
    routingTargetVersion: null,
  };
}
