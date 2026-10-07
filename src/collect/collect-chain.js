/**
 * The collection chain, in one place: T1 atom -> T3 repository CHANGELOG ->
 * T2 git commit range.
 *
 * Order is by precision of what each tier returns, not by tier number:
 *   T1  the release note itself                    precision RELEASE_NOTE
 *   T3  the curated CHANGELOG document             precision CHANGELOG
 *   T2  commits reconstructed into note shape      precision COMMIT_LOG
 * Each tier is only asked for the versions every earlier tier missed. None of
 * the three consumes GitHub API quota or needs a token.
 *
 * This module is shared by the server endpoint and the measurement script —
 * the number the tuning log reports is produced by the exact code the product
 * runs, not by a parallel reimplementation.
 */

import { collectT1 } from './atom-collector.js';
import { changelogUnavailableResult, collectT3Changelog } from './changelog-doc.js';
import { collectT2Git, ensureRepository, gitUnavailableResult } from './git-collector.js';
import { compareVersions } from './npm-registry.js';
import { collectVendorTier } from './vendor-adapter.js';

export async function runCollectionChain(options = {}) {
  const {
    packageName,
    repository,
    targetVersions = [],
    pathFilter = null,
    versionOrder = null,
    publishTimes = null,
    git = true,
    fetchImpl,
    cacheDir,
  } = options;
  const collectedAt = options.collectedAt ?? new Date().toISOString();

  const tiers = [];
  let remaining = [...targetVersions];

  /*
   * 벤더 문서 어댑터가 먼저다 — 등재된 패키지(상용 라이브러리)는 GitHub
   * 저장소가 아예 없어 아래 세 티어가 전부 빈손이기 때문이다. 등재되지 않은
   * 패키지는 null을 받아 이 티어를 건너뛰므로, 어댑터 추가가 다른 패키지의
   * 수집 결과를 바꾸지 않는다.
   */
  const vendor = await collectVendorTier({ packageName, targetVersions: remaining, collectedAt, fetchImpl });
  if (vendor) {
    tiers.push(vendor);
    const coveredByVendor = new Set(vendor.coveredVersions);
    remaining = remaining.filter((version) => !coveredByVendor.has(version));
  }

  /*
   * 저장소가 없으면 GitHub 기반 세 티어는 시도 자체가 불가능하다.
   * `!tiers.length`가 함께 걸린 이유: 목표 버전이 없는 헬스체크 호출
   * (targetVersions=[])에서도 T1은 돌아야 한다 — 티어가 하나도 없는 결과는
   * 화면의 수집 근거 표를 비운다.
   */
  if (repository && (remaining.length || !tiers.length)) {
    const t1 = await collectT1({ packageName, repository, targetVersions: remaining, collectedAt, fetchImpl });
    tiers.push(t1);
    remaining = t1.missingVersions.map((entry) => entry.version);
  }

  if (repository && remaining.length && git) {
    /*
     * One clone for both git-backed tiers. Letting T3 and T2 each call
     * ensureRepository doubled the work — and on a repository too large to
     * clone within the timeout, doubled the timeout: microsoft/TypeScript
     * cost 240s to fail twice. A failed clone now fails the run once, and
     * both tiers report degraded immediately.
     */
    let repoPath = null;
    let cloneError = null;
    try {
      repoPath = (await ensureRepository(repository, { cacheDir })).path;
    } catch (error) {
      cloneError = error;
    }

    const t3 = cloneError
      ? changelogUnavailableResult({ packageName, repository, targetVersions: remaining, collectedAt }, cloneError)
      : await collectT3Changelog({ packageName, repository, targetVersions: remaining, pathFilter, collectedAt, repoPath });
    tiers.push(t3);
    const covered = new Set(t3.coveredVersions);
    remaining = remaining.filter((version) => !covered.has(version));

    if (remaining.length) {
      tiers.push(
        cloneError
          ? gitUnavailableResult({ packageName, repository, targetVersions: remaining, pathFilter, collectedAt }, cloneError)
          : await collectT2Git({ packageName, repository, targetVersions: remaining, pathFilter, versionOrder, publishTimes, collectedAt, repoPath }),
      );
    }
  }

  const releases = dedupeReleases(tiers);
  return {
    tiers,
    collection: mergeCollection({ packageName, repository, targetVersions, tiers, releases }),
    // Parse input: at most one release object per version.
    releases: releases.map((entry) => entry.release),
  };
}

/**
 * One release object per version across tiers.
 *
 * T1 reports a release it saw but could not read (a body that is only a
 * "see CHANGELOG" link) in its `sourceReleases` too, and a later tier then
 * collects the same version for real. Keeping both would hand the parser two
 * releases for one version and put two contradicting rows in the collection
 * table. The covered one wins; tier order already guarantees no two tiers
 * cover the same version.
 */
export function dedupeReleases(tiers) {
  const byVersion = new Map();
  for (const tier of tiers) {
    for (const release of tier.sourceReleases ?? []) {
      const candidate = { release, tier: tier.tier, precision: tier.precision ?? 'RELEASE_NOTE' };
      const existing = byVersion.get(release.version);
      if (!existing) {
        byVersion.set(release.version, candidate);
        continue;
      }
      if (isCovered(candidate.release) && !isCovered(existing.release)) {
        byVersion.set(release.version, candidate);
      }
    }
  }
  return [...byVersion.values()];
}

/** Covered means read: it yielded items, or the document said "no changes". */
function isCovered(release) {
  return (release.itemCount ?? 0) > 0 || Boolean(release.noChanges);
}

/**
 * One view over the tiers that ran. Coverage is recomputed over the union;
 * what stays in `missingVersions` is what no implemented tier could read, with
 * the reason from the LAST tier that tried it — the first tier's reason names
 * a constraint a later tier already worked around.
 */
export function mergeCollection({ packageName, repository, targetVersions, tiers, releases = dedupeReleases(tiers) }) {
  const covered = new Set(tiers.flatMap((tier) => tier.coveredVersions ?? []));

  const lastReason = new Map();
  for (const tier of tiers) {
    for (const entry of tier.missingVersions ?? []) {
      if (!covered.has(entry.version)) lastReason.set(entry.version, { ...entry, tier: tier.tier });
    }
  }

  const missingVersions = targetVersions
    .filter((version) => !covered.has(version))
    .map((version) => lastReason.get(version) ?? { version, reason: 'NOT_ATTEMPTED', tier: null });

  const collectedReleases = releases
    .map(({ release, tier, precision }) => ({
      version: release.version,
      tagName: release.tagName ?? null,
      publishedAt: release.publishedAt ?? null,
      sourceUrl: release.sourceUrl ?? null,
      itemCount: release.itemCount ?? 0,
      noChanges: Boolean(release.noChanges),
      tier,
      precision,
      rangeFrom: release.rangeFrom ?? null,
      rangeWidened: Boolean(release.rangeWidened),
    }))
    .sort((left, right) => compareVersions(right.version, left.version));

  return {
    packageName,
    repository,
    targetVersions,
    coveredVersions: targetVersions.filter((version) => covered.has(version)),
    missingVersions,
    coverage: targetVersions.length
      ? Math.round((targetVersions.filter((version) => covered.has(version)).length / targetVersions.length) * 1000) / 1000
      : null,
    coverageThreshold: tiers[0]?.coverageThreshold ?? 0.8,
    rateLimitCost: tiers.reduce((total, tier) => total + (tier.evidence?.rateLimitCost ?? 0), 0),
    collectedAt: tiers[0]?.evidence?.collectedAt ?? null,
    changeItemCount: collectedReleases.reduce((total, release) => total + release.itemCount, 0),
    collectedReleases,
    // T1, T3 and T2-git all ran. What none of them read has one implemented
    // path left: the GitHub REST API, which costs quota and is not built.
    needsFallback: missingVersions.length ? ['T2_REST_API'] : [],
    manualReview: {
      required: missingVersions.length > 0,
      // User-facing sentence — `required` is the machine signal, so the text
      // carries no marker prefix.
      reason: missingVersions.length
        ? '구현된 세 경로(T1 atom · T3 CHANGELOG · T2 git)로 읽지 못한 버전이 남았습니다 — 해당 버전의 릴리즈 원문을 직접 확인하세요'
        : null,
      versions: missingVersions.map((entry) => entry.version),
    },
    tiers: tiers.map((tier) => ({
      tier: tier.tier,
      source: tier.source,
      ok: tier.ok,
      error: tier.error ?? null,
      precision: tier.precision ?? 'RELEASE_NOTE',
      grade: tier.grade ?? null,
      coverage: tier.coverage,
      askedFor: tier.targetVersions.length,
      covered: tier.coveredVersions.length,
      evidence: tier.evidence,
      truncated: Boolean(tier.truncated),
      entryLimit: tier.entryLimit ?? null,
      rejectedEntries: tier.rejectedEntries ?? [],
      cloned: tier.cloned ?? null,
    })),
  };
}
