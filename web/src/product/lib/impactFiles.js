/**
 * Run-level impact files, aggregated from L6 judgments.
 *
 * The step-8 candidate table is per-item TEXT matching, and for build tools
 * that surface is structurally one file: nothing in an app's source imports
 * `vite`, so a 3-major vite run showed a single LOW candidate while six
 * ACTION_REQUIRED verdicts sat one tab away. The genuinely affected files —
 * vite.config.js, the Sass chain, package.json — were already named in the
 * judgments' `files` fields as evidence. This aggregation is that answer,
 * folded per file.
 *
 * NOT_AFFECTED judgments are excluded on purpose: their files are grep
 * evidence of absence ("여기 없더라"), not impact.
 */

const VERDICT_RANK = { ACTION_REQUIRED: 0, SMOKE_TEST: 1 };

export function aggregateImpactFiles(judgments) {
  const byPath = new Map();

  for (const judgment of judgments ?? []) {
    if (!(judgment?.verdict in VERDICT_RANK)) continue;
    for (const rawPath of judgment.files ?? []) {
      const path = String(rawPath ?? '').trim();
      if (!path) continue;
      const entry = byPath.get(path) ?? { path, verdict: judgment.verdict, judgments: [] };
      // The file's badge is its most severe verdict.
      if (VERDICT_RANK[judgment.verdict] < VERDICT_RANK[entry.verdict]) entry.verdict = judgment.verdict;
      entry.judgments.push({
        unit: judgment.unit,
        verdict: judgment.verdict,
        reason: judgment.reason ?? '',
        action: judgment.action ?? null,
      });
      byPath.set(path, entry);
    }
  }

  return [...byPath.values()].sort(
    (a, b) =>
      VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict] ||
      b.judgments.length - a.judgments.length ||
      a.path.localeCompare(b.path),
  );
}
