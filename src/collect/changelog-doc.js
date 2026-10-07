/**
 * T3 collector — the repository's own CHANGELOG document.
 *
 * Fills what neither earlier tier can: T1's feed forgets everything past 10
 * entries, and T2-git reconstructs items from commit subjects, which yields
 * nothing when a project does not write conventional commits. Round-0
 * measurement on this project's dependencies: 28 of 31 uncollected versions
 * were `NO_ITEMS_IN_COMMITS`, and every such package (sass, prettier,
 * date-fns) maintains a CHANGELOG.md in its repository.
 *
 * The document is read from the same blobless clone the git collector made,
 * via `git show` — a lazy blob fetch over git-over-HTTPS, so still no GitHub
 * API quota and no token.
 *
 * FORMAT REALITY (measured on the actual files, not assumed):
 *   sass       `## 1.102.0` + top-level bullets, no category headings,
 *              some versions carry only "No user-visible changes."
 *   prettier   `# 3.9.6` + one `#### Entry title (links)` per change, no bullets
 *   date-fns   keep-a-changelog: `## v4.4.0 - 2026-05-30` + `### Fixed` bullets
 *   vue family conventional-changelog: `## [3.5.41](compare-url) (date)` +
 *              `### Bug Fixes` bullets
 * The parser handles all four; anything it cannot read stays in
 * `missingVersions` with a reason rather than counting as "no changes".
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ensureRepository } from './git-collector.js';
import { compareVersions, normalizeRepositorySlug } from './npm-registry.js';

const run = promisify(execFile);
const GIT_TIMEOUT_MS = 30_000;

export const CHANGELOG_SOURCE = 'REPO_CHANGELOG';

/** Filename is the convention here, unlike migration guides where any path
 * keyword counts — `changelog_unreleased/TEMPLATE.md` must not match. */
/*
 * 이력 문서 파일명. `version-log`·`releases`류를 함께 보는 이유는
 * vite-plugin-require가 이력을 `version-log.md`에 쓰기 때문이다 — CHANGELOG.md만
 * 찾던 동안 이 패키지는 수집이 통째로 0건이었다.
 *
 * 후보를 넓혀도 오선택 위험이 낮은 근거: `collectT3Changelog`가 후보 5개를 모두
 * 읽어 **목표 버전을 가장 많이 담은 문서**를 고르므로, CHANGELOG.md가 있는
 * 저장소에서는 그쪽이 계속 이긴다.
 */
const CHANGELOG_NAME = /(^|\/)(changelog|changes|history|version-log|versionlog|version_log|releases|release-notes|relnotes)\.(md|markdown)$/i;

/**
 * A version heading, at any depth — prettier uses `#`, sass `##`.
 *
 * The heading text is cleaned of links/HTML first, then must START with the
 * version (optionally `v`-prefixed or preceded by one package-name token).
 * Requiring the leading position is what keeps prettier's own entry headings
 * (`#### TypeScript: Preserve quotes ...`) from reading as version headings.
 */
const VERSION_IN_HEADING = /^(?:[a-z0-9@._/-]+[\s:@]+)?v?(\d+\.\d+\.\d+)(-[0-9A-Za-z.-]+)?(?=$|[\s\])(:,–—-])/i;

/**
 * A no-changes declaration, in the wordings actually measured: sass writes
 * "No user-visible changes.", changelogithub-generated release notes write
 * "No significant changes". Shared with the atom collector — a release body
 * saying this is a covered version with zero items, not a collection failure.
 */
export const NO_CHANGES_PATTERN = /\bno\s+(?:significant\s+|notable\s+|user[- ]?(?:visible|facing)\s+)?changes\b/i;

const NO_CHANGES = NO_CHANGES_PATTERN;

const HEADING_DATE = /\(?(\d{4}-\d{2}-\d{2})\)?/;

export function listChangelogFiles(files, { pathFilter = null } = {}) {
  const candidates = (files ?? [])
    .filter((file) => CHANGELOG_NAME.test(file))
    .map((file) => ({ path: file, depth: file.split('/').length }));

  /*
   * Order decides which blob is fetched first. The registry's stated package
   * directory wins (`pkgs/core/CHANGELOG.md` is date-fns's real changelog, the
   * root has none), the repository root is next, everything else by depth —
   * a monorepo carries one changelog per sibling package.
   */
  return candidates
    .sort((left, right) => {
      const rank = (candidate) => {
        if (pathFilter && candidate.path.startsWith(`${pathFilter}/`)) return 0;
        if (candidate.depth === 1) return 1;
        return 2;
      };
      return rank(left) - rank(right) || left.depth - right.depth || left.path.localeCompare(right.path);
    })
    .map((candidate) => candidate.path);
}

/**
 * The whole document split into per-version entries.
 *
 * Returns `{ version, heading, publishedAt, prerelease, noChanges, sections }`
 * where sections carry raw markdown item strings — the exact shape
 * `normalizeRelease` already consumes, so T3 output flows through the same
 * parser as T1 and T2.
 */
export function parseChangelogMarkdown(text) {
  const lines = String(text ?? '').split(/\r?\n/);

  /*
   * 통상 문서는 h1~h4가 버전 헤딩이다. 그 범위에서 하나도 못 찾았을 때만
   * h5·h6까지 내려본다 — vite-plugin-require의 `version-log.md`는 `##### 1.3.0`
   * 형식이라 h4 제한에서 전 버전이 통째로 누락됐다.
   *
   * 2패스로 나눈 이유: h5를 처음부터 후보로 넣으면, h5를 하위 구조로 쓰는
   * 기존 문서에서 카테고리 헤딩이 버전 헤딩으로 오인될 수 있다. 상위 레벨이
   * 성공한 문서는 두 번째 패스를 아예 보지 않으므로 기존 결과가 변하지 않는다.
   */
  const shallow = collectVersionEntries(lines, 4);
  const entries = shallow.length ? shallow : collectVersionEntries(lines, 6);
  return entries.map((entry) => buildEntry(entry));
}

function collectVersionEntries(lines, maxHeadingLevel) {
  const headingPattern = new RegExp(`^(#{1,${maxHeadingLevel}})\\s+(.*)$`);
  const entries = [];
  let current = null;
  let inCodeFence = false;

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const heading = line.match(headingPattern);
    if (heading) {
      const cleaned = cleanHeading(heading[2]);
      const version = cleaned.match(VERSION_IN_HEADING);
      if (version) {
        current = {
          version: version[1],
          prerelease: Boolean(version[2]),
          heading: cleaned,
          headingLevel: heading[1].length,
          publishedAt: readHeadingDate(heading[2]),
          lines: [],
          subheadings: [],
        };
        entries.push(current);
        continue;
      }
      // A deeper, non-version heading inside an entry is either a category
      // (`### Bug Fixes`) or, in prettier's format, the change itself.
      if (current && heading[1].length > current.headingLevel) {
        current.subheadings.push({ text: heading[2].trim(), index: current.lines.length });
        current.lines.push(line);
        continue;
      }
      // Same-or-shallower non-version heading ends the entry ("## Credits").
      current = null;
      continue;
    }
    if (current) current.lines.push(line);
  }

  return entries;
}

function buildEntry(entry) {
  const body = entry.lines.join('\n');
  const groups = groupByCategory(entry);
  let sections = groups
    .map((group) => ({ title: group.title, items: extractBullets(group.lines) }))
    .filter((section) => section.items.length);

  // No bullets anywhere, but sub-headings exist: prettier's format, where each
  // `#### Title (links)` IS one change item.
  if (!sections.length && entry.subheadings.length) {
    sections = [{ title: 'Release Notes', items: entry.subheadings.map((sub) => sub.text) }];
  }

  // "No user-visible changes." — sass writes it as a bullet, others as prose.
  // Either way it is a covered version with zero items, not a change item and
  // not a collection failure.
  //
  // A version heading with a completely EMPTY body means the same thing:
  // conventional-changelog emits the heading and nothing under it when a
  // release carried no fix/feat commits (vue 3.5.37, verified against its
  // commit range — one `release:` commit). An entry that HAS content the
  // parser could not read must not take this path; it stays missing.
  const flatItems = sections.flatMap((section) => section.items);
  const hasContent = entry.lines.some((line) => line.trim());
  const noChanges = flatItems.length
    ? flatItems.every((item) => NO_CHANGES.test(item))
    : NO_CHANGES.test(body) || !hasContent;
  if (noChanges) sections = [];

  // Prose-only entry (date-fns writes some releases as paragraphs). One item
  // from the first paragraph keeps the version covered without inventing
  // structure the document does not have.
  if (!sections.length && !noChanges) {
    const paragraph = firstParagraph(body);
    if (paragraph) sections = [{ title: 'Release Notes', items: [paragraph] }];
  }

  return {
    version: entry.version,
    prerelease: entry.prerelease,
    heading: entry.heading,
    publishedAt: entry.publishedAt,
    noChanges,
    sections,
    itemCount: sections.reduce((total, section) => total + section.items.length, 0),
  };
}

/** Lines of an entry, grouped under the deepest heading run above them. */
function groupByCategory(entry) {
  if (!entry.subheadings.length) return [{ title: 'Release Notes', lines: entry.lines }];

  const groups = [{ title: 'Release Notes', lines: entry.lines.slice(0, entry.subheadings[0].index) }];
  entry.subheadings.forEach((sub, order) => {
    const end = order + 1 < entry.subheadings.length ? entry.subheadings[order + 1].index : entry.lines.length;
    groups.push({ title: sub.text, lines: entry.lines.slice(sub.index + 1, end) });
  });
  return groups;
}

/**
 * Top-level bullets with their indented continuation lines.
 *
 * sass wraps one item across five continuation lines; joining on whitespace is
 * required or the item splits into fragments. Nested bullets are dropped, the
 * same rule the atom parser applies to nested `<li>`.
 */
export function extractBullets(lines) {
  const items = [];
  let currentItem = null;

  for (const line of lines) {
    const bullet = line.match(/^([-*+])\s+(.*)$/);
    if (bullet) {
      if (currentItem) items.push(currentItem);
      currentItem = bullet[2];
      continue;
    }
    const nested = line.match(/^\s+[-*+]\s+/);
    if (nested) continue;
    if (currentItem && /^\s+\S/.test(line)) {
      currentItem += ` ${line.trim()}`;
      continue;
    }
    if (currentItem) {
      items.push(currentItem);
      currentItem = null;
    }
  }
  if (currentItem) items.push(currentItem);

  return items.map((item) => item.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function firstParagraph(body) {
  const plain = body
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .find((paragraph) => paragraph && !/^\[?diff\]?/i.test(paragraph) && !/^</.test(paragraph));
  return plain ? plain.slice(0, 400) : null;
}

function cleanHeading(text) {
  return String(text)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [3.5.41](compare-url) -> 3.5.41
    .replace(/<[^>]+>/g, ' ') // <small> wrappers
    .replace(/[[\]`]/g, '')
    // Bold/italic emphasis around the version — qs writes `## **6.15.3**`,
    // which otherwise never reaches VERSION_IN_HEADING. Single underscores
    // stay: they are legal inside package names.
    .replace(/\*{1,3}/g, '')
    .replace(/__/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function readHeadingDate(text) {
  const match = String(text).match(HEADING_DATE);
  return match ? `${match[1]}T00:00:00Z` : null;
}

/**
 * Clone-or-reuse, find the document, read it, keep the target versions.
 *
 * Candidate files are read in ranked order and the one covering the most
 * target versions wins — reading only the first would let a monorepo sibling's
 * changelog answer for the package (date-fns keeps three).
 */
export async function collectT3Changelog(options = {}) {
  const packageName = requireText(options.packageName, 'packageName');
  const targetVersions = [...new Set((options.targetVersions ?? []).map(String))].sort(compareVersions);

  try {
    const repository = normalizeRepositorySlug(options.repository);
    const repoPath = options.repoPath ?? (await ensureRepository(repository, { ...options, fetch: options.fetch ?? false })).path;
    const ref = await resolveHeadRef(repoPath);
    const files = await listTreeFiles(repoPath, ref);
    const candidates = listChangelogFiles(files, { pathFilter: options.pathFilter ?? null }).slice(0, 5);

    let best = null;
    for (const path of candidates) {
      const text = await readFileAtRef(repoPath, ref, path);
      if (!text) continue;
      const entries = parseChangelogMarkdown(text).filter((entry) => !entry.prerelease);
      const byVersion = new Map(entries.map((entry) => [entry.version, entry]));
      const hits = targetVersions.filter((version) => byVersion.get(version)?.itemCount || byVersion.get(version)?.noChanges);
      if (!best || hits.length > best.hits.length) best = { path, entries, byVersion, hits };
      if (best.hits.length === targetVersions.length) break;
    }

    if (!best) {
      return buildResult({ packageName, repository, targetVersions, path: null, releases: [], reason: 'NO_CHANGELOG_IN_REPOSITORY', collectedAt: options.collectedAt });
    }

    const releases = targetVersions
      .map((version) => best.byVersion.get(version))
      .filter((entry) => entry && (entry.itemCount > 0 || entry.noChanges))
      .map((entry) => ({
        version: entry.version,
        tagName: null,
        name: entry.heading,
        publishedAt: entry.publishedAt,
        sourceUrl: `https://github.com/${repository}/blob/HEAD/${best.path}`,
        sections: entry.sections,
        itemCount: entry.itemCount,
        // The document explicitly said nothing changed. Covered, zero items —
        // distinct from "could not read", which stays in missingVersions.
        noChanges: entry.noChanges,
      }));

    return buildResult({ packageName, repository, targetVersions, path: best.path, releases, reason: 'VERSION_NOT_IN_CHANGELOG', collectedAt: options.collectedAt });
  } catch (error) {
    return changelogUnavailableResult(options, error);
  }
}

/** The degraded T3 shape, shared with the chain's clone-failed path. */
export function changelogUnavailableResult(options, error) {
  const targetVersions = [...new Set((options.targetVersions ?? []).map(String))].sort(compareVersions);
  return {
    ...buildResult({
      packageName: String(options.packageName ?? ''),
      repository: String(options.repository ?? ''),
      targetVersions,
      path: null,
      releases: [],
      reason: 'CHANGELOG_UNAVAILABLE',
      collectedAt: options.collectedAt,
    }),
    ok: false,
    error: { message: error instanceof Error ? error.message : String(error) },
  };
}

function buildResult({ packageName, repository, targetVersions, path, releases, reason, collectedAt }) {
  const coveredVersions = releases.map((release) => release.version);
  const covered = new Set(coveredVersions);

  return {
    packageName,
    repository,
    tier: 'T3_CHANGELOG',
    source: CHANGELOG_SOURCE,
    ok: true,
    evidence: {
      source: CHANGELOG_SOURCE,
      url: path && repository ? `https://github.com/${repository}/blob/HEAD/${path}` : null,
      path,
      rateLimitCost: 0,
      collectedAt: collectedAt ?? null,
    },
    // A curated document, but not the release note itself: category headings
    // vary by house style and some entries are prose summaries.
    precision: 'CHANGELOG',
    coverage: targetVersions.length ? Math.round((coveredVersions.length / targetVersions.length) * 1000) / 1000 : null,
    coverageBasis: 'REGISTRY_VERSIONS',
    degraded: coveredVersions.length < targetVersions.length,
    targetVersions,
    coveredVersions,
    missingVersions: targetVersions.filter((version) => !covered.has(version)).map((version) => ({ version, reason })),
    releaseCount: releases.length,
    sourceReleases: releases.slice().sort((left, right) => compareVersions(right.version, left.version)),
  };
}

async function resolveHeadRef(repoPath) {
  for (const ref of ['origin/HEAD', 'origin/main', 'origin/master']) {
    try {
      await git(repoPath, ['rev-parse', '--verify', '--quiet', ref]);
      return ref;
    } catch {
      continue;
    }
  }
  return 'HEAD';
}

async function listTreeFiles(repoPath, ref) {
  const { stdout } = await git(repoPath, ['ls-tree', '-r', '--name-only', ref]);
  return stdout.split('\n').map((line) => line.trim()).filter(Boolean);
}

async function readFileAtRef(repoPath, ref, path) {
  try {
    const { stdout } = await git(repoPath, ['show', `${ref}:${path}`]);
    return stdout;
  } catch {
    return null;
  }
}

function git(repoPath, args) {
  return run('git', ['-C', repoPath, ...args], { timeout: GIT_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024 });
}

function requireText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${field} is required`);
  return text;
}
