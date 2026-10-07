/**
 * L4 result synthesis — the LLM judges, the code types.
 *
 * Measured on a 20-item minor-range run, the old contract made the model
 * write ~1,340 output tokens per item, and tracing consumers showed most of
 * it was either mechanical (componentTags=[scope], importSpecifiers=
 * [package, scope]) or read by nothing at all (fileGlobs, domains,
 * mechanisms, inspectionPlan.reason). Generation time IS the run time, so
 * that was the whole latency and most of the quota.
 *
 * The model now returns only what needs judgment — category, risk, review,
 * one-line reasoning, plus semantic search terms it actually knows — and this
 * module deterministically rebuilds the full schema shape every downstream
 * consumer already expects. Nothing downstream changes.
 */

import { inferDomains, inferMechanisms } from './l4-fallback-result.js';

const CATEGORIES = new Set(['BREAKING', 'BUG_FIX', 'REVERT', 'FEATURE', 'LABS', 'REFACTOR', 'RELEASE_NOTE', 'PERFORMANCE', 'OTHER']);
const RISKS = new Set(['LOW', 'MEDIUM', 'HIGH']);

/**
 * @param l4Input   the (full) input object the selection produced
 * @param judged    the model's slim response: { items: [{ itemId, agentCategory,
 *                  preliminaryRisk, reviewRequired, reasoning, searchTerms?,
 *                  configKeys?, relatedComponents? }] }
 */
export function synthesizeL4Result(l4Input, judged) {
  if (!judged || !Array.isArray(judged.items)) {
    throw new Error('L4 result is missing an items array');
  }

  const judgedById = new Map(judged.items.map((item) => [item.itemId, item]));
  const missing = l4Input.items.filter((item) => !judgedById.has(item.itemId)).map((item) => item.itemId);
  if (missing.length) {
    // A silent gap here would surface as "no impact" downstream. Strict is
    // correct: the caller's fallback path still yields a usable screen.
    throw new Error(`L4 response is missing ${missing.length} item(s): ${missing.slice(0, 5).join(', ')}`);
  }

  const items = l4Input.items.map((source) => {
    const verdict = judgedById.get(source.itemId);
    const agentCategory = CATEGORIES.has(verdict.agentCategory) ? verdict.agentCategory : 'OTHER';
    const preliminaryRisk = RISKS.has(verdict.preliminaryRisk) ? verdict.preliminaryRisk : 'MEDIUM';
    // The schema's one hard invariant, enforced rather than trusted.
    const reviewRequired = preliminaryRisk === 'HIGH' ? true : Boolean(verdict.reviewRequired);
    const raw = `${source.scope ?? ''} ${source.summary ?? ''}`.toLowerCase();
    const scope = source.scope ?? null;

    return {
      itemId: source.itemId,
      version: source.version,
      versionRole: source.versionRole ?? null,
      publishedAt: source.publishedAt ?? null,
      parserCategory: source.parserCategory,
      agentCategory,
      scope,
      summary: source.summary ?? '',
      sourceUrl: source.sourceUrl ?? null,
      inputSelectionReasons: source.selectionReasons ?? [],
      preliminaryRisk,
      reviewRequired,
      suspectedImpactDomains: inferDomains(raw, scope),
      suspectedChangeMechanisms: inferMechanisms(agentCategory, raw),
      inspectionPlan: {
        // §5.5: the model's own file-type scope for its searchTerms — a
        // syntax token like `@import` is only evidence in `*.scss`, and
        // source-matcher.js's compileFileGlob() silently ignores anything it
        // does not recognize, so unsupported forms just stay unscoped.
        fileGlobs: stringList(verdict.fileGlobs),
        searchTerms: stringList(verdict.searchTerms),
        componentTags: [...new Set([scope, ...stringList(verdict.relatedComponents)].filter(Boolean))],
        importSpecifiers: [...new Set([l4Input.packageName, scope].filter(Boolean))],
        configKeys: stringList(verdict.configKeys),
        reason: '검사 용어는 판단(모델) + 결정론 합성(코드)으로 구성됨',
      },
      reasoning: String(verdict.reasoning ?? '').trim() || '모델이 근거를 제공하지 않음',
    };
  });

  const byAgentCategory = {};
  const byPreliminaryRisk = {};
  for (const item of items) {
    byAgentCategory[item.agentCategory] = (byAgentCategory[item.agentCategory] ?? 0) + 1;
    byPreliminaryRisk[item.preliminaryRisk] = (byPreliminaryRisk[item.preliminaryRisk] ?? 0) + 1;
  }

  return {
    packageName: l4Input.packageName,
    mode: l4Input.mode,
    currentVersion: l4Input.currentVersion,
    targetVersion: l4Input.targetVersion ?? null,
    itemCount: items.length,
    summary: {
      byAgentCategory,
      byPreliminaryRisk,
      reviewRequired: items.filter((item) => item.reviewRequired).length,
    },
    items,
    globalInspectionPlan: buildGlobalPlan(items),
    warnings: [],
  };
}

function buildGlobalPlan(items) {
  const union = (key) => [...new Set(items.flatMap((item) => item.inspectionPlan[key]))];
  return {
    fileGlobs: union('fileGlobs'),
    searchTerms: union('searchTerms'),
    componentTags: union('componentTags'),
    importSpecifiers: union('importSpecifiers'),
    configKeys: union('configKeys'),
    notes: [],
  };
}

function stringList(value) {
  return Array.isArray(value) ? value.map((entry) => String(entry).trim()).filter(Boolean).slice(0, 8) : [];
}
