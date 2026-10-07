import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_PROMPT_PATH = resolve('prompts/l4-classification.md');
const DEFAULT_MAX_ITEMS = 80;

const CATEGORY_PRIORITY = [
  'BREAKING',
  'BUG_FIX',
  'REVERT',
  'FEATURE',
  'LABS',
  'REFACTOR',
  'RELEASE_NOTE',
  'PERFORMANCE',
  'OTHER',
];

const CATEGORY_RANK = new Map(CATEGORY_PRIORITY.map((category, index) => [category, index]));
const ALWAYS_INCLUDE_CATEGORIES = new Set(['BREAKING', 'REVERT', 'OTHER']);
const CRITICAL_SIGNAL_PATTERN = /security|vulnerab|cve|ghsa|xss|sanitize|escape|injection|prototype\s+pollution|auth|token|permission|leak|expos|breaking|migration|migrate|deprecat|incompat/i;
const HIGH_SIGNAL_PATTERN = /remove|rename|required|default|behavior|validation|ssr|hydration|regression|a11y|accessibility|focus|keyboard|route|type|types/i;

export function buildL4Prompt(stage3Result, options = {}) {
  return buildL4PromptForInput(buildL4Input(stage3Result, options), options);
}

/**
 * The prompt serialization is deliberately slimmer than the input object.
 *
 * Measured on a 20-item run: the model's classification needs scope + summary
 * + section, while rawText (markdown links and commit hashes the parser has
 * already extracted), selection scores/reasons and the full selection policy
 * were context it never acts on — tokens in, nothing out. The full input
 * object still exists for selection, triage and the UI; only the prompt view
 * is cut.
 *
 * `options.batch` marks this prompt as one slice of a parallel fan-out. The
 * counts stay global on purpose — the model should still know how large the
 * inclusion and the deferred remainder are — so the batch clause is what tells
 * it that `items` is a subset and that the other slices are not its problem.
 * With no batch the prompt is unchanged, which keeps single-call runs exactly
 * as they were.
 */
export function buildL4PromptForInput(input, options = {}) {
  const systemPrompt = readFileSync(options.promptPath ?? DEFAULT_PROMPT_PATH, 'utf8');
  const batch = normalizeBatch(options.batch);
  const promptInput = {
    packageName: input.packageName,
    mode: input.mode,
    currentVersion: input.currentVersion,
    targetVersion: input.targetVersion,
    sourceItemCount: input.sourceItemCount,
    includedItemCount: input.includedItemCount,
    deferredItemCount: input.deferredItemCount,
    ...(batch ? { batch: { index: batch.index, count: batch.count, batchItemCount: input.items.length } } : {}),
    items: input.items.map((item) => ({
      itemId: item.itemId,
      version: item.version,
      versionRole: item.versionRole,
      parserCategory: item.parserCategory,
      sectionTitle: item.sectionTitle,
      scope: item.scope,
      summary: item.summary,
    })),
  };
  const batchClause = batch
    ? ` 이 호출은 포함 항목 ${input.includedItemCount}개를 ${batch.count}개 배치로 나눈 것 중 ${batch.index}번째다. 아래 items ${input.items.length}개만 분류하고, 다른 배치가 맡은 항목은 응답에 넣지 마라.`
    : '';
  return `${systemPrompt}\n\nStage 3 parse data follows as JSON. Classify exactly input.items only and keep their order. Deferred does not mean safe — deferredItemCount tells you how much was withheld for budget.${batchClause}\n\n${JSON.stringify(promptInput, null, 2)}\n`;
}

function normalizeBatch(batch) {
  if (!batch) return null;
  const index = Number(batch.index);
  const count = Number(batch.count);
  if (!Number.isFinite(index) || !Number.isFinite(count) || count <= 1) return null;
  return { index, count };
}

export function buildL4Input(stage3Result, options = {}) {
  const sourceItems = Array.isArray(stage3Result.items) ? stage3Result.items : [];
  /*
   * `options.usage` is the pre-L4 project-usage scan (byItemId verdicts). It
   * influences ONLY the selection score of budget candidates — it is never
   * written onto the items, because this whole input object is serialized
   * into the Agent prompt and L4's contract is to classify the changelog
   * without seeing project evidence. Impact judgment against the project is
   * L6's job (and until L6 exists, the user's).
   */
  const usageByItemId = options.usage?.byItemId ?? null;
  // 범위 안 도입·되돌림 짝의 revert 쪽 — 순변화 0이므로 선택 대상에서 뺀다.
  const cancelledReverts = collectCancelledRevertIds(sourceItems);
  const normalizedItems = sourceItems
    .map((item, index) => annotateSelection(toAgentInputItem(item, stage3Result), stage3Result, index, usageByItemId))
    .map((item) => (cancelledReverts.has(item.itemId)
      ? { ...item, selectionKind: 'CANDIDATE', selectionScore: -1, selectionReasons: ['cancelled-by-in-range-revert-pair'] }
      : item));
  const selectionMode = options.all ? 'all' : options.selectionMode ?? 'priority';
  const maxItems = options.all ? null : Number(options.maxItems ?? DEFAULT_MAX_ITEMS);
  const items = selectItems(normalizedItems, { selectionMode, maxItems });
  const selectedIds = new Set(items.map((item) => item.itemId));
  const deferredItems = normalizedItems.filter((item) => !selectedIds.has(item.itemId));

  return {
    packageName: stage3Result.packageName,
    mode: stage3Result.mode,
    currentVersion: stage3Result.currentVersion,
    targetVersion: stage3Result.targetVersion ?? null,
    range: stage3Result.range ?? null,
    sortPolicy: stage3Result.sortPolicy ?? null,
    sourceItemCount: sourceItems.length,
    includedItemCount: items.length,
    deferredItemCount: deferredItems.length,
    truncated: deferredItems.length > 0,
    truncationPolicy: deferredItems.length > 0
      ? 'Priority selection guard: included items are mandatory or highest-signal candidates; deferred items are summarized, not discarded.'
      : null,
    selectionPolicy: buildSelectionPolicy({ stage3Result, selectionMode, maxItems, items, deferredItems }),
    items,
  };
}

/**
 * Deterministic triage of the items the Agent did not see.
 *
 * The system decides — it does not hand the whole remainder to the user:
 *
 *   검토 목록      risk-shaped text (removal/rename/default/behavior/…) and the
 *                 project's usage could not rule it out → the ONLY deferred
 *                 items a person reviews, listed concretely
 *   제외           everything else, stated as a decision:
 *                   - UNUSED: the project does not use what the item changes
 *                   - received: an intermediate fix/feature with no risk
 *                     signal is something the upgrade DELIVERS, not a risk
 *                   - quiet: no risk signal and no searchable scope
 *
 * In UPGRADE mode an intermediate BUG_FIX is a benefit collected by reaching
 * the target — measured on vuetify 3.6.10→4.1.7 against a real project, treating every
 * deferred used-scope item as review work handed a person 497 items, of which
 * only 94 carried any risk-shaped text. This triage is what keeps the review
 * surface at the 94, not the 497.
 */
export function buildDeferredTriage(stage3Result, l4Input, usage = null) {
  const includedIds = new Set(l4Input.items.map((item) => item.itemId));
  const deferred = (stage3Result.items ?? []).filter((item) => !includedIds.has(item.itemId));
  const revertedSubjects = collectRevertedSubjects(stage3Result.items ?? []);
  const cancelledReverts = collectCancelledRevertIds(stage3Result.items ?? []);

  const review = [];
  const excluded = { unused: 0, received: 0, quiet: 0, reverted: 0 };

  for (const item of deferred) {
    const verdict = usage?.byItemId?.[item.itemId]?.verdict ?? 'UNDETERMINED';
    const risky = hasCriticalSignal(item) || hasHighSignal(item);

    // 범위 안 짝의 revert 쪽 — 원본과 함께 순변화 0으로 상쇄된 항목.
    if (cancelledReverts.has(item.itemId)) {
      excluded.reverted += 1;
      continue;
    }
    if (verdict === 'UNUSED') {
      excluded.unused += 1;
      continue;
    }
    /*
     * A change that a LATER release reverted nets to zero at the target
     * version: the journey passed through it, the destination does not carry
     * it. The revert itself is a REVERT-category item and therefore already
     * in the Agent's mandatory input — cancelling the original here loses
     * nothing a person needed to see.
     */
    if (isRevertedLater(item, revertedSubjects)) {
      excluded.reverted += 1;
      continue;
    }
    if (!risky) {
      excluded[verdict === 'USED' ? 'received' : 'quiet'] += 1;
      continue;
    }
    review.push({
      itemId: item.itemId,
      version: item.version,
      category: item.category ?? item.parserCategory ?? 'OTHER',
      scope: item.scope ?? null,
      summary: item.summary,
      sourceUrl: item.sourceUrl ?? null,
      usageVerdict: verdict,
      usageFileCount: usage?.byItemId?.[item.itemId]?.fileCount ?? 0,
    });
  }

  review.sort((left, right) => (right.usageVerdict === 'USED') - (left.usageVerdict === 'USED'));

  return {
    deferredCount: deferred.length,
    review,
    /*
     * The same list, folded by scope. A reviewer thinks in units of "the
     * component I use × what changed about it", not per-release entries —
     * measured on a real project's vuetify 2-major jump the fold is what turns a
     * hundred-row list into a screenful. No information is dropped: groups
     * carry their items.
     */
    reviewGroups: groupReviewByScope(review),
    excluded,
    excludedCount: excluded.unused + excluded.received + excluded.quiet + excluded.reverted,
  };
}

/**
 * 범위 안에서 도입되고 범위 안에서 되돌려진 짝의 **revert 쪽** itemId들.
 *
 * 기존 상쇄(isRevertedLater)는 원본만 접고 revert 항목은 "Agent 입력에
 * 이미 있으니 잃는 게 없다"는 이유로 남겼다 — 그 결과 vuetify 3.6→4.1
 * 실측에서 3.7~3.12의 revert 6건이 각각 SMOKE 확인 행이 됐다. 짝이 모두
 * 범위 안이면 현재→목표 여정의 순변화가 0이므로 양쪽 다 상쇄가 맞다.
 * 원본이 범위 밖(설치 버전에 이미 들어 있던 동작)인 revert는 진짜 동작
 * 변화라 그대로 남는다 — 짝이 확인될 때만 접는 보수적 규칙.
 */
export function collectCancelledRevertIds(items) {
  const cancelled = new Set();
  const nonReverts = (items ?? []).filter(
    (item) => !/revert\s+"/i.test(String(item.summary ?? item.rawText ?? '')),
  );
  for (const item of items ?? []) {
    const match = String(item.summary ?? item.rawText ?? '').match(/revert\s+"(.+?)"\s*(?:\(#\d+\))?\s*$/i);
    if (!match) continue;
    // PR 번호가 최강 키 — 인용문 안의 (#N)은 원본 커밋의 PR이라 원문이 조금
    // 달라도 짝을 정확히 잇는다. normalizeSubject는 (#N)을 지우므로 그 전에 뽑는다.
    const prRefs = [...match[1].matchAll(/#(\d+)/g)].map((ref) => `#${ref[1]}`);
    const subject = normalizeSubject(match[1]);
    const original = nonReverts.find((candidate) => {
      if (compareSemverLoose(item.version, candidate.version) < 0) return false;
      const rawSummary = String(candidate.summary ?? '');
      if (prRefs.length && prRefs.some((ref) => rawSummary.includes(ref))) return true;
      if (subject.length < 15) return false;
      const summary = normalizeSubject(rawSummary);
      return summary.length >= 15 && (subject.includes(summary) || summary.includes(subject));
    });
    if (original) cancelled.add(item.itemId);
  }
  return cancelled;
}

/** Inner subjects of every revert in the range, normalized for matching. */
function collectRevertedSubjects(items) {
  const subjects = [];
  for (const item of items) {
    const match = String(item.summary ?? item.rawText ?? '').match(/revert\s+"(.+?)"\s*(?:\(#\d+\))?\s*$/i);
    if (!match) continue;
    const normalized = normalizeSubject(match[1]);
    if (normalized.length >= 15) subjects.push({ version: item.version, normalized });
  }
  return subjects;
}

function isRevertedLater(item, revertedSubjects) {
  if (!revertedSubjects.length) return false;
  const subject = normalizeSubject(item.summary ?? '');
  if (subject.length < 15) return false;
  return revertedSubjects.some(
    (revert) =>
      compareSemverLoose(revert.version, item.version) >= 0
      && (revert.normalized.includes(subject) || subject.includes(revert.normalized)),
  );
}

function normalizeSubject(text) {
  return String(text)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\(#\d+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function groupReviewByScope(review) {
  const groups = new Map();
  for (const item of review) {
    const key = String(item.scope ?? '').split(/[/,+&\s]+/)[0] || '(scope 없음)';
    if (!groups.has(key)) {
      groups.set(key, { scope: key, count: 0, usageVerdict: 'UNDETERMINED', fileCount: 0, items: [] });
    }
    const group = groups.get(key);
    group.count += 1;
    group.items.push(item);
    if (item.usageVerdict === 'USED') group.usageVerdict = 'USED';
    group.fileCount = Math.max(group.fileCount, item.usageFileCount);
  }
  return [...groups.values()].sort(
    (left, right) => (right.usageVerdict === 'USED') - (left.usageVerdict === 'USED') || right.count - left.count,
  );
}

function compareSemverLoose(a, b) {
  const [al, bl] = [splitSemver(a), splitSemver(b)];
  for (let index = 0; index < 3; index += 1) {
    if ((al[index] ?? 0) > (bl[index] ?? 0)) return 1;
    if ((al[index] ?? 0) < (bl[index] ?? 0)) return -1;
  }
  return 0;
}

function selectItems(items, options) {
  if (options.selectionMode === 'all') return items;
  if (options.selectionMode === 'first') return items.slice(0, options.maxItems);
  if (options.selectionMode !== 'priority') throw new Error(`Unsupported L4 selection mode: ${options.selectionMode}`);

  const mandatory = items.filter((item) => item.selectionKind === 'MANDATORY');
  const mandatoryIds = new Set(mandatory.map((item) => item.itemId));
  const remaining = items
    .filter((item) => !mandatoryIds.has(item.itemId))
    .sort((a, b) => b.selectionScore - a.selectionScore || a.sourceIndex - b.sourceIndex);
  const remainingBudget = Math.max(0, options.maxItems - mandatory.length);
  const selected = [...mandatory, ...remaining.slice(0, remainingBudget)];
  const selectedIds = new Set(selected.map((item) => item.itemId));
  return items.filter((item) => selectedIds.has(item.itemId));
}

function annotateSelection(item, stage3Result, sourceIndex, usageByItemId = null) {
  const selectionReasons = [];
  const targetMajorEntry = isTargetMajorEntry(item.version, stage3Result.currentVersion, stage3Result.targetVersion);
  const targetMajorRelease = isTargetMajorRelease(item.version, stage3Result.currentVersion, stage3Result.targetVersion);
  const criticalSignal = hasCriticalSignal(item);
  const highSignal = hasHighSignal(item);

  /*
   * OTHER (parser uncertainty) is mandatory ONLY when it carries a risk
   * signal. The unconditional rule was designed on the release-note path,
   * where OTHER is rare; the git-commit path mass-produces it — measured on
   * vite 6.4.3 → 8.2.1: 140 of 651 items came in as OTHER, blew a 20-item
   * budget up to 196 included items ($4.94), and the Agent then reclassified
   * most of them as REFACTOR/RELEASE_NOTE noise. Signal-less OTHER keeps its
   * high candidate score (parser uncertainty is still a reason to look) and
   * competes inside the budget; deferred, it lands in the triage's quiet
   * bucket like any other signal-less text.
   */
  const mandatoryCategory = ALWAYS_INCLUDE_CATEGORIES.has(item.parserCategory)
    && (item.parserCategory !== 'OTHER' || criticalSignal || highSignal);

  if (item.versionRole === 'CURRENT') selectionReasons.push('current-version-context');
  if (item.versionRole === 'TARGET') selectionReasons.push('target-version-destination');
  // Healthcheck mode: a fix released after the installed version describes a
  // defect the project is still carrying. These are the whole point of the run.
  if (item.versionRole === 'PATCH_AHEAD') selectionReasons.push('unfixed-defect-in-current-version');
  if (mandatoryCategory) selectionReasons.push(`mandatory-category:${item.parserCategory}`);
  else if (item.parserCategory === 'OTHER') selectionReasons.push('parser-uncertain-candidate');
  if (targetMajorEntry) selectionReasons.push('target-major-entry-release');
  if (criticalSignal) selectionReasons.push('critical-signal-text');
  if (highSignal) selectionReasons.push('high-signal-text');
  if (targetMajorRelease) selectionReasons.push('target-major-release');

  /*
   * Membership in the target-major ENTRY release is deliberately NOT
   * mandatory. Measured on vuetify 3.6.10 → 4.1.7 against a real project: 4.0.0
   * carries 357 items and blanket item-level inclusion selected 406 items
   * for a 20-item budget — a prompt of that size is the documented Agent
   * timeout, so "include everything" was the run-killing choice, not the
   * safe one. The entry release's breaking/revert/uncertain/critical items
   * stay mandatory through their own reasons; the rest get a strong score
   * boost and compete inside the budget, where the usage signal can rank
   * them.
   */
  const mandatory = item.versionRole === 'CURRENT'
    || item.versionRole === 'TARGET'
    || item.versionRole === 'PATCH_AHEAD'
    || mandatoryCategory
    || criticalSignal;

  const usageVerdict = usageByItemId?.[item.itemId]?.verdict ?? null;

  return {
    ...item,
    sourceIndex,
    selectionKind: mandatory ? 'MANDATORY' : 'CANDIDATE',
    selectionScore: calculateSelectionScore(item, { criticalSignal, highSignal, targetMajorRelease, targetMajorEntry, usageVerdict }),
    selectionReasons: selectionReasons.length ? selectionReasons : ['budget-candidate'],
  };
}

function calculateSelectionScore(item, flags) {
  const categoryScores = {
    BREAKING: 1000,
    BUG_FIX: 620,
    REVERT: 900,
    FEATURE: 480,
    LABS: 420,
    REFACTOR: 260,
    RELEASE_NOTE: 220,
    PERFORMANCE: 160,
    OTHER: 850,
  };
  const roleScores = {
    CURRENT: 700,
    TARGET: 680,
    PATCH_AHEAD: 720,
    INTERMEDIATE: 0,
  };
  /*
   * Project-usage adjustment, budget candidates only (mandatory items never
   * reach this scoring). USED must outrank a same-category UNUSED item but
   * must NOT let a used FEATURE overtake an unused critical-signal item —
   * hence smaller than the signal weights. UNDETERMINED is deliberately 0:
   * "cannot search the scope" is absence of evidence, not evidence of
   * absence, and penalizing it would starve config/build-wide changes.
   */
  const usageAdjustment = flags.usageVerdict === 'USED' ? 400 : flags.usageVerdict === 'UNUSED' ? -300 : 0;

  return (categoryScores[item.parserCategory] ?? 0)
    + (roleScores[item.versionRole] ?? 0)
    + (flags.criticalSignal ? 700 : 0)
    + (flags.highSignal ? 500 : 0)
    // Entry-release membership: below critical, above high — the release
    // where a major's changes concentrate, without drowning the budget.
    + (flags.targetMajorEntry ? 600 : 0)
    + (flags.targetMajorRelease ? 300 : 0)
    + usageAdjustment;
}

function buildSelectionPolicy({ stage3Result, selectionMode, maxItems, items, deferredItems }) {
  return {
    mode: selectionMode,
    maxItems,
    includedByReason: countSelectionReasons(items),
    deferredSummary: summarizeDeferredItems(deferredItems),
    majorUpgradePolicy: getMajorUpgradePolicy(stage3Result.currentVersion, stage3Result.targetVersion),
    rules: [
      'Always include CURRENT version items for current-version problem context.',
      'Always include TARGET version items because they represent the selected destination.',
      'Always include BREAKING and REVERT. OTHER (parser uncertainty) is included unconditionally only when it also carries a risk signal; signal-less OTHER competes inside the budget with a high score — the git-commit collection path mass-produces OTHER and blanket inclusion breaks the budget.',
      'For major upgrades, target-major entry release items (such as 4.0.0 when upgrading 3.x to 4.x) are strongly boosted within the budget; their breaking/revert/uncertain/critical items are included unconditionally through their own rules.',
      'Always include critical-signal text: security, vulnerability, CVE/GHSA, injection, auth, permission, breaking, migration, deprecation, or incompatibility terms.',
      'Prefer high-signal text within budget: removal, rename, default, behavior, validation, SSR, hydration, regression, accessibility, focus, keyboard, route, and type terms.',
      'Do not treat deferred items as discarded; Stage 7 may keep low-signal deferred groups as low priority or schedule another L4 batch.',
    ],
  };
}

function summarizeDeferredItems(items) {
  return {
    total: items.length,
    byCategory: countBy(items, (item) => item.parserCategory),
    byVersionRole: countBy(items, (item) => item.versionRole ?? 'NONE'),
    criticalSignalCount: items.filter(hasCriticalSignal).length,
    highSignalCount: items.filter(hasHighSignal).length,
    sampleVersions: Array.from(new Set(items.map((item) => item.version))).slice(0, 12),
  };
}

function countSelectionReasons(items) {
  const counts = {};
  for (const item of items) {
    for (const reason of item.selectionReasons) counts[reason] = (counts[reason] ?? 0) + 1;
  }
  return counts;
}

function countBy(items, getKey) {
  const counts = {};
  for (const item of items) {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function getMajorUpgradePolicy(currentVersion, targetVersion) {
  if (!targetVersion) return 'No target version. Classify current-version context only.';
  const currentMajor = getMajor(currentVersion);
  const targetMajor = getMajor(targetVersion);
  if (currentMajor === null || targetMajor === null || currentMajor === targetMajor) {
    return 'Same-major upgrade. Intermediate changes matter, but low-signal patch notes may be deferred after mandatory and high-signal items.';
  }
  return `Major upgrade ${currentMajor}.x to ${targetMajor}.x. Do not classify every ${currentMajor}.x intermediate patch as equally important. Prioritize current context, target version, ${targetMajor}.0.0 entry-release changes, breaking/revert/other, and critical migration or behavior changes.`;
}

function toAgentInputItem(item, stage3Result) {
  const parserCategory = item.category ?? item.parserCategory ?? 'OTHER';
  return {
    itemId: item.itemId,
    version: item.version,
    versionRole: item.versionRole ?? inferVersionRole(item.version, stage3Result),
    publishedAt: item.publishedAt ?? null,
    parserCategory,
    categoryPriority: item.categoryPriority ?? CATEGORY_RANK.get(parserCategory) ?? CATEGORY_RANK.get('OTHER'),
    sectionTitle: item.sectionTitle,
    scope: item.scope ?? null,
    summary: item.summary,
    rawText: item.rawText,
    prNumbers: item.prNumbers ?? [],
    issueNumbers: item.issueNumbers ?? [],
    commitHashes: item.commitHashes ?? [],
    sourceUrl: item.sourceUrl ?? null,
  };
}

function inferVersionRole(version, stage3Result) {
  if (version === stage3Result.currentVersion) return 'CURRENT';
  if (version === stage3Result.targetVersion) return 'TARGET';
  if (stage3Result.targetVersion) return 'INTERMEDIATE';
  return null;
}

function hasCriticalSignal(item) {
  return CRITICAL_SIGNAL_PATTERN.test(itemSearchText(item));
}

function hasHighSignal(item) {
  return HIGH_SIGNAL_PATTERN.test(itemSearchText(item));
}

function itemSearchText(item) {
  return [item.sectionTitle, item.scope, item.summary, item.rawText].filter(Boolean).join(' ');
}

function isTargetMajorRelease(version, currentVersion, targetVersion) {
  const currentMajor = getMajor(currentVersion);
  const targetMajor = getMajor(targetVersion);
  const versionMajor = getMajor(version);
  return targetVersion && currentMajor !== null && targetMajor !== null && currentMajor !== targetMajor && versionMajor === targetMajor;
}

function isTargetMajorEntry(version, currentVersion, targetVersion) {
  if (!isTargetMajorRelease(version, currentVersion, targetVersion)) return false;
  const [, minor, patch] = splitSemver(version);
  return minor === 0 && patch === 0;
}

function getMajor(version) {
  const [major] = splitSemver(version);
  return Number.isFinite(major) ? major : null;
}

function splitSemver(version) {
  const parts = String(version ?? '').split('-')[0].split('.').map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return [null, null, null];
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}