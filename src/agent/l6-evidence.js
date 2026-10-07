/**
 * assembleJudgmentEvidence — the new stage from
 * l6-deterministic-evidence-design.md §4:
 *
 *   [기존]  L4 분류 ──payload──▶ dev-server ──프롬프트──▶ L6(Agent+도구) ──▶ 판정
 *   [신규]  L4 분류 ──payload──▶ dev-server
 *                                  │ assembleJudgmentEvidence()  ← 여기
 *                                  ▼
 *                             evidence 채운 payload ──▶ L6(Agent, 도구 0개) ──▶ 판정
 *
 * Pure code, no Agent call. Runs E1 (package-references.js) against the
 * peerAudit.blocked + companion rows, and E3 (matchSourceImpactBatch) against
 * the item- and group-scope units L6 will actually judge, then attaches the results
 * to the SAME payload shape `buildL6Input` already reads — `references` on
 * peer/companion rows, `usageEvidence` on classifiedItems/reviewGroups.
 *
 * Placed in src/ rather than server/dev-server.js (where its sibling
 * `reconcileRequirementsWithTarget` lives) because it has real branching
 * logic worth testing without an HTTP round-trip — the group→pseudo-item
 * shaping and the "which items get scanned" selection are exactly the kind
 * of thing a golden-run regression should pin directly.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { collectPackageReferences } from '../collect/package-references.js';
import { analyzeDependencies } from '../resolver/dependency-resolver.js';
import { matchSourceImpactBatch } from '../source-match/source-matcher.js';
import { detectProjectProfile } from '../source-match/project-profile.js';
import { selectClassifiedForJudgment } from './l6-prompt.js';

/**
 * A review group never went through L4 classification (it is exactly the
 * deferred pile L4's budget did not reach — src/agent/l4-prompt.js's
 * `buildDeferredTriage`), so its members carry no `inspectionPlan`. The only
 * searchable material a group has is its own scope token — the same
 * information `prescanScopeUsage` already keys off. `buildMatchPatterns`'s
 * existing `isSearchableSymbol` gate silently drops generic lowercase scopes
 * (`css`, `build`) from producing any pattern at all, so this needs no
 * filtering of its own.
 */
function groupPseudoItem(group) {
  return { scope: group.scope ?? null, inspectionPlan: { componentTags: group.scope ? [group.scope] : [] } };
}

/**
 * @param payload  the L6 job payload (same shape buildL6Input reads)
 * @param options.onLog  optional ({stream, message}) => void, for the job log
 * @returns { payload, planQuality, scannedFiles } — `payload` is a shallow
 *          copy with `peerAudit`/`classifiedItems`/`reviewGroups` replaced by
 *          evidence-carrying versions; everything else passes through
 *          unchanged. `planQuality` is E3-d observability data (never fed to
 *          the prompt) for the caller to log or persist in run meta.
 */
export function assembleJudgmentEvidence(payload = {}, options = {}) {
  const projectPath = String(payload.projectPath ?? '').trim();
  if (!projectPath || !existsSync(resolve(projectPath))) {
    // No readable project — a health check payload built without a project
    // path, or a hand-built test/API payload. Evidence assembly is then a
    // no-op, not an error: the prompt's existing "confirm from the project"
    // fallback path still applies, just without the deterministic shortcut.
    return { payload, planQuality: {}, scannedFiles: 0 };
  }

  const enriched = { ...payload };

  const { peerAudit, referencedCandidateCount } = attachPackageReferences(payload, projectPath);
  enriched.peerAudit = peerAudit;
  enriched.installedPackages = readInstalledPackages(projectPath);
  // 타입 파이프라인 유무 같은 프로젝트 사실 — 타입 전용 유닛이 "확인 불가"가
  // 아니라 "해당 없음(근거)"으로 판정되게 하는 증거다 (project-profile.js).
  enriched.projectProfile = detectProjectProfile(projectPath);

  const selection = selectClassifiedForJudgment(payload.classifiedItems);
  const itemUnits = selection.selected
    .filter((item) => item?.itemId)
    .map((item) => ({ unit: `item:${item.itemId}`, item }));
  const reviewGroups = Array.isArray(payload.reviewGroups) ? payload.reviewGroups : [];
  const groupUnits = reviewGroups
    .filter((group) => group?.scope)
    .map((group) => ({ unit: `group:${group.scope}`, item: groupPseudoItem(group) }));
  const units = [...itemUnits, ...groupUnits];

  let planQuality = {};
  let scannedFiles = 0;
  if (units.length) {
    const batch = matchSourceImpactBatch({ projectPath, packageName: payload.packageName, units });
    planQuality = batch.planQuality;
    scannedFiles = batch.scannedFiles;

    const evidenceByItemId = new Map(selection.selected.map((item) => [item.itemId, batch.byUnit[`item:${item.itemId}`]]));
    enriched.classifiedItems = (payload.classifiedItems ?? []).map((item) => {
      const evidence = evidenceByItemId.get(item.itemId);
      return evidence ? { ...item, usageEvidence: evidence } : item;
    });
    enriched.reviewGroups = reviewGroups.map((group) => ({
      ...group,
      usageEvidence: batch.byUnit[`group:${group.scope}`] ?? { files: [], unmatchedTerms: [] },
    }));
  }

  options.onLog?.({
    stream: 'system',
    message:
      `evidence assembled: ${itemUnits.length} item + ${groupUnits.length} group unit(s) scanned` +
      ` (${scannedFiles} files), ${referencedCandidateCount} package reference lookup(s)`,
  });

  return { payload: enriched, planQuality, scannedFiles };
}

/**
 * The project's own direct dependencies, name → resolved (or declared)
 * version. E2c, added 2026-08-14 for chain:* determinization.
 *
 * Two things depend on it, both in buildChainUnits:
 *   1. An OPTIONAL peer the project never installed forces nothing. Vite 8
 *      tightens ranges on a dozen of them (less/stylus/sugarss/terser/
 *      @types/node …) and building a chain unit per name buried the three
 *      that mattered under ten the project has no relationship with.
 *   2. For the ones it DOES have, the installed version turns "범위가 조여졌다"
 *      into a decidable comparison. Round 8 could only answer chain:sass with
 *      SMOKE_TEST + an evidence gap ("현재 설치된 sass 버전이 입력에 없어");
 *      with 1.77.6 against ^1.70.0 the same unit is a determinate NOT_AFFECTED.
 *
 * Direct dependencies only, deliberately: a transitively-installed peer has
 * no version for this project to bump — there is no declaration to edit.
 * Returns null when the project cannot be read, which buildChainUnits reads
 * as "unknown" and treats as no-filter (absence must not silently drop units).
 */
function readInstalledPackages(projectPath) {
  try {
    const analysis = analyzeDependencies(projectPath);
    const entries = (analysis.directDependencies ?? [])
      .filter((dependency) => dependency?.name)
      .map((dependency) => [dependency.name, dependency.resolvedVersion ?? dependency.declaredRange ?? null]);
    return entries.length ? Object.fromEntries(entries) : null;
  } catch {
    // A project without a readable package.json/lockfile is the same "unknown"
    // as no project at all — never a hard failure of the whole judgment.
    return null;
  }
}

/** E1 — attaches `references` to peerAudit.blocked rows and companion rows. */
function attachPackageReferences(payload, projectPath) {
  const audit = payload.peerAudit;
  if (!audit) return { peerAudit: audit, referencedCandidateCount: 0 };

  const rows = Array.isArray(audit.rows) ? audit.rows : [];
  const companions = Array.isArray(audit.companions) ? audit.companions : [];
  const candidates = [...new Set([...rows, ...companions].map((row) => row?.name).filter(Boolean))];
  if (!candidates.length) return { peerAudit: audit, referencedCandidateCount: 0 };

  const references = collectPackageReferences({ projectPath, packageName: payload.packageName, candidates });
  const peerAudit = {
    ...audit,
    rows: rows.map((row) => (row?.name ? { ...row, references: references[row.name] ?? [] } : row)),
    companions: companions.map((row) => (row?.name ? { ...row, references: references[row.name] ?? [] } : row)),
  };
  return { peerAudit, referencedCandidateCount: candidates.length };
}
