/**
 * T1 collector — `github.com/{repo}/releases.atom`.
 *
 * First of the three fallback paths (T1 atom -> T2 REST API -> T3 raw
 * CHANGELOG). T1 leads because it consumes no GitHub API quota, which is what
 * makes continuous monitoring viable; the survey measured 88% item coverage
 * from atom alone.
 *
 * Failure is never reported as "no changes". A version the feed cannot cover
 * comes back in `missingVersions` with a reason, and `manualReview.required`
 * is set so the pipeline can promote it instead of dropping it.
 */

import { normalizeRelease } from '../changelog/release-range-parser.js';
import { htmlToMarkdownLite, isTagForPackage, parseAtomFeed, parseTagRef } from './atom-feed.js';
import { NO_CHANGES_PATTERN } from './changelog-doc.js';
import { compareVersions, normalizeRepositorySlug } from './npm-registry.js';

/** The feed carries the 10 most recent entries; older versions need T2. */
export const ATOM_ENTRY_LIMIT = 10;

/** Provisional (survey §6-1): unstable when only 2-3 versions are in scope. */
export const T1_COVERAGE_THRESHOLD = 0.8;

export const ATOM_SOURCE = 'GITHUB_RELEASES_ATOM';

const USER_AGENT = 'lib-impact-analyzer-pilot';

export function buildAtomFeedUrl(repository) {
  return `https://github.com/${normalizeRepositorySlug(repository)}/releases.atom`;
}

export async function fetchAtomFeed(repository, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = buildAtomFeedUrl(repository);
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/atom+xml, application/xml',
      'user-agent': options.userAgent ?? USER_AGENT,
    },
  });

  if (!response.ok) {
    const hint = response.status === 404
      ? ' (check the repository slug — dots in the repo name must be kept, e.g. chartjs/Chart.js)'
      : '';
    throw new Error(`atom feed request failed for ${url}: ${response.status} ${response.statusText}${hint}`);
  }
  return response.text();
}

/**
 * Network wrapper. A transport failure returns a degraded result rather than
 * throwing, so one unreachable feed cannot be mistaken for an empty one.
 */
export async function collectT1(options = {}) {
  try {
    const atomXml = await fetchAtomFeed(options.repository, options);
    return collectFromAtomXml({ ...options, atomXml });
  } catch (error) {
    return buildUnavailableResult(options, error);
  }
}

export function collectFromAtomXml(options = {}) {
  const packageName = requireText(options.packageName, 'packageName');
  const repository = normalizeRepositorySlug(options.repository);
  const includePrerelease = Boolean(options.includePrerelease);
  // An explicit empty array means "nothing above the installed version" —
  // an up to date package. A missing array means the caller never supplied a
  // denominator. The two must not collapse into the same result.
  const hasTargetList = Array.isArray(options.targetVersions);
  const targetVersions = normalizeTargetVersions(options.targetVersions);
  const feedUrl = buildAtomFeedUrl(repository);
  const { entries } = parseAtomFeed(options.atomXml);

  const releases = [];
  const rejectedEntries = [];
  for (const entry of entries) {
    const ref = parseTagRef(entry.tagName);
    if (!ref.version) {
      rejectedEntries.push({ tagName: entry.tagName, reason: 'UNPARSABLE_TAG' });
      continue;
    }
    if (!isTagForPackage(ref.packageName, packageName)) {
      rejectedEntries.push({ tagName: entry.tagName, reason: 'FOREIGN_MONOREPO_TAG' });
      continue;
    }
    if (ref.prerelease && !includePrerelease) {
      rejectedEntries.push({ tagName: entry.tagName, reason: 'PRERELEASE' });
      continue;
    }
    releases.push(buildRelease(entry, ref));
  }

  // Without a target list, coverage could only be reported against the feed's
  // own contents, which proves nothing about versions the feed never carried.
  const coverageBasis = hasTargetList ? 'REGISTRY_VERSIONS' : 'FEED_ONLY';
  const scopedReleases = coverageBasis === 'REGISTRY_VERSIONS'
    ? releases.filter((release) => targetVersions.includes(release.version))
    : releases;
  const scopedVersions = coverageBasis === 'REGISTRY_VERSIONS'
    ? targetVersions
    : scopedReleases.map((release) => release.version).sort(compareVersions);

  const truncated = entries.length >= ATOM_ENTRY_LIMIT;

  const coveredVersions = [];
  const missingVersions = [];
  for (const version of scopedVersions) {
    const release = scopedReleases.find((candidate) => candidate.version === version);
    // A body that declares "no significant changes" is covered with zero
    // items — the release was read and said nothing changed. Only an itemless
    // body WITHOUT that declaration is a collection gap.
    if (release && (release.itemCount > 0 || release.noChanges)) {
      coveredVersions.push(version);
      continue;
    }
    missingVersions.push({ version, reason: missingReason(release, { truncated }) });
  }

  const orderedReleases = scopedReleases
    .slice()
    .sort((left, right) => compareVersions(right.version, left.version));
  const normalizedReleases = orderedReleases.map((release) => normalizeRelease(release));
  const items = normalizedReleases.flatMap((release) => release.items);
  const coverage = scopedVersions.length ? round(coveredVersions.length / scopedVersions.length) : null;
  const needsFallback = buildFallbackPlan(missingVersions);

  return {
    packageName,
    repository,
    tier: 'T1',
    source: ATOM_SOURCE,
    ok: true,
    evidence: {
      source: ATOM_SOURCE,
      url: feedUrl,
      entryCount: entries.length,
      rateLimitCost: 0,
      collectedAt: options.collectedAt ?? null,
    },
    coverage,
    coverageBasis,
    grade: gradeCoverage({ coverage, coverageBasis, missingVersions }),
    degraded: isDegraded({ coverage, coverageBasis, missingVersions }),
    truncated,
    entryLimit: ATOM_ENTRY_LIMIT,
    coverageThreshold: T1_COVERAGE_THRESHOLD,
    targetVersions: scopedVersions,
    coveredVersions,
    missingVersions,
    needsFallback,
    manualReview: buildManualReview(missingVersions, needsFallback),
    rejectedEntries,
    releaseCount: normalizedReleases.length,
    changeItemCount: items.length,
    releases: normalizedReleases,
    items,
    // Pre-normalization shape, i.e. sections whose items are raw text. This is
    // what `buildChangelogParseResult` consumes, so a T1 collection can feed
    // the existing range parser without a second normalization pass.
    sourceReleases: orderedReleases,
  };
}

/**
 * Coverage is the share of target versions that actually yielded items — not
 * whether any entry anywhere had items.
 *
 * Judging by existence misgraded `vue` as collectable: 1 of its 10 entries
 * carried 21 items while the other 9 were bare links, so real coverage was 0%.
 */
export function gradeCoverage({ coverage, coverageBasis, missingVersions }) {
  if (coverage === null) return 'NO_TARGET_VERSIONS';
  if (coverageBasis === 'FEED_ONLY') return 'UNVERIFIED_COVERAGE';
  if (coverage >= T1_COVERAGE_THRESHOLD && missingVersions.length === 0) return 'T1';
  if (coverage >= T1_COVERAGE_THRESHOLD) return 'T1_PARTIAL';
  return 'T1_INSUFFICIENT';
}

function buildRelease(entry, ref) {
  const itemCount = entry.sections.reduce((total, section) => total + section.items.length, 0);
  return {
    version: ref.version,
    tagName: ref.tagName,
    name: entry.title || null,
    publishedAt: entry.updated,
    sourceUrl: entry.link,
    prerelease: ref.prerelease,
    sections: entry.sections,
    itemCount,
    noChanges: itemCount === 0 && NO_CHANGES_PATTERN.test(htmlToMarkdownLite(entry.contentHtml)),
    bodyTextLength: entry.contentHtml.length,
  };
}

function missingReason(release, { truncated }) {
  // Body present but itemless — vite-style "see CHANGELOG" links. T3 reads
  // the changelog the release note is pointing at.
  if (release) return 'NO_ITEMS_IN_BODY';

  /*
   * A full feed cannot distinguish "evicted by the window" from "no matching
   * tag", so it reports the window — the constraint that is certainly true.
   *
   * Version order must not be used to decide this. The feed is ordered by
   * publish date, and a maintenance release on an old line is published after
   * a newer line's release: vuetify's feed holds 3.12.9-3.13.0 alongside
   * 4.1.2-4.1.7, with 4.0.x evicted in between. Comparing against the oldest
   * version present would call 4.0.0 a tag mismatch when it was simply pushed
   * out of a 10-entry window.
   */
  if (truncated) return 'BEYOND_ENTRY_LIMIT';

  // The feed held fewer than its limit, so it carried everything it has and
  // this version genuinely has no matching tag — the @types/node case.
  return 'NOT_IN_FEED';
}

function buildFallbackPlan(missingVersions) {
  const plan = [];
  if (missingVersions.some((entry) => entry.reason === 'NO_ITEMS_IN_BODY')) plan.push('T3_RAW_CHANGELOG');
  if (missingVersions.some((entry) => entry.reason === 'BEYOND_ENTRY_LIMIT' || entry.reason === 'NOT_IN_FEED')) plan.push('T2_REST_API');
  return plan;
}

function buildManualReview(missingVersions, needsFallback) {
  if (missingVersions.length === 0) return { required: false, reason: null, versions: [] };
  return {
    // Promotion is conditional on the remaining tiers, per the fallback
    // contract: T1 alone cannot decide that a version is unreadable.
    required: needsFallback.length === 0,
    // User-facing sentence — `required` is the machine signal, so the text
    // carries no marker prefix.
    reason: needsFallback.length === 0
      ? '릴리즈 피드가 남은 버전을 하나도 읽지 못했고 적용할 폴백 경로가 없습니다 — 남은 버전은 원문을 직접 확인해야 합니다'
      : `폴백 경로 대기 중: ${needsFallback.join(' → ')}`,
    versions: missingVersions.map((entry) => entry.version),
  };
}

function isDegraded({ coverage, coverageBasis, missingVersions }) {
  if (coverage === null) return false;
  return coverageBasis === 'FEED_ONLY' || missingVersions.length > 0;
}

function buildUnavailableResult(options, error) {
  const repository = String(options.repository ?? '');
  const hasTargetList = Array.isArray(options.targetVersions);
  const targetVersions = normalizeTargetVersions(options.targetVersions);
  return {
    packageName: String(options.packageName ?? ''),
    repository,
    tier: 'T1',
    source: ATOM_SOURCE,
    ok: false,
    error: { message: error instanceof Error ? error.message : String(error) },
    evidence: { source: ATOM_SOURCE, url: safeFeedUrl(repository), entryCount: 0, rateLimitCost: 0, collectedAt: options.collectedAt ?? null },
    coverage: targetVersions.length ? 0 : null,
    coverageBasis: hasTargetList ? 'REGISTRY_VERSIONS' : 'FEED_ONLY',
    grade: 'T1_UNAVAILABLE',
    degraded: true,
    truncated: false,
    entryLimit: ATOM_ENTRY_LIMIT,
    coverageThreshold: T1_COVERAGE_THRESHOLD,
    targetVersions,
    coveredVersions: [],
    missingVersions: targetVersions.map((version) => ({ version, reason: 'FEED_UNAVAILABLE' })),
    needsFallback: ['T2_REST_API'],
    manualReview: {
      required: false,
      reason: 'pending fallback: T2_REST_API',
      versions: targetVersions,
    },
    rejectedEntries: [],
    releaseCount: 0,
    changeItemCount: 0,
    releases: [],
    items: [],
    sourceReleases: [],
  };
}

function safeFeedUrl(repository) {
  try {
    return buildAtomFeedUrl(repository);
  } catch {
    return null;
  }
}

function normalizeTargetVersions(value) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map((version) => String(version).trim()).filter(Boolean))).sort(compareVersions)
    : [];
}

function requireText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${field} is required`);
  return text;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
