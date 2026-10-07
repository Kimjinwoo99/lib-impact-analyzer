/**
 * T2-git collector — tag ranges from a blobless clone.
 *
 * Fills the gap T1 structurally cannot: `releases.atom` serves only its 10
 * most recent entries and ignores every pagination parameter, so a dependency
 * that is far behind is unreachable by atom no matter how many requests you
 * make.
 *
 * git-over-HTTPS is a different subsystem from `api.github.com` and consumes
 * none of its rate limit, so this path needs no token — measured on
 * vuetifyjs/vuetify: 683 tags, 24MB, 4.8s, rate limit unchanged at 58/60.
 * That is what makes it preferable to the REST API for the same job.
 *
 * WHAT THIS PATH CANNOT DO
 * Release note bodies live in GitHub's database, not in the repository, so git
 * can never return the note itself — only its inputs: tags, commits and files.
 * Where release notes are generated from conventional commits the two agree
 * exactly (verified on vuetify 4.1.6..4.1.7: 6 commits, 6 note items). Where
 * notes are written by hand the commit log is a different, noisier source, and
 * results carry `precision: 'COMMIT_LOG'` to say so.
 */

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { compareVersions, normalizeRepositorySlug } from './npm-registry.js';

const run = promisify(execFile);

export const GIT_SOURCE = 'GIT_TAG_RANGE';

/** Blobless so history costs megabytes rather than gigabytes. */
const CLONE_ARGS = ['--filter=blob:none', '--no-checkout', '--quiet'];

/*
 * 120s was measured too small for the biggest repositories: microsoft/
 * TypeScript's blobless clone does not finish in it, and the chain then
 * reported GIT_UNAVAILABLE for a package the path can actually serve. The
 * cost is one-time — the clone is cached — so the ceiling is generous.
 */
const CLONE_TIMEOUT_MS = Number(process.env.GIT_CLONE_TIMEOUT_MS ?? 300_000);
const GIT_TIMEOUT_MS = 30_000;

/*
 * Conventional commit types worth reading as change items.
 *
 * `chore`, `docs`, `test`, `ci`, `build` and `style` describe work on the
 * project, not changes to its published behaviour. They are counted and
 * reported as filtered rather than silently dropped — a caller comparing this
 * against a release note needs to know the difference is noise removal.
 */
const ITEM_TYPES = new Map([
  ['fix', 'Bug Fixes'],
  ['feat', 'Features'],
  ['perf', 'Performance'],
  ['revert', 'Reverts'],
  ['refactor', 'Refactors'],
]);

const RECORD = '';
const FIELD = '';

export function gitCacheDir(root = '.cache/git') {
  return resolve(root);
}

/**
 * Clones on first use, fetches on later runs.
 *
 * No checkout and no hooks run, so nothing from the cloned repository is
 * executed — only its history is read.
 */
export async function ensureRepository(repository, options = {}) {
  const slug = normalizeRepositorySlug(repository);
  const cacheDir = options.cacheDir ? resolve(options.cacheDir) : gitCacheDir();
  const target = resolve(cacheDir, slug.replace('/', '__'));
  const url = options.url ?? `https://github.com/${slug}.git`;

  if (existsSync(resolve(target, '.git'))) {
    if (options.fetch !== false) {
      await git(target, ['fetch', '--tags', '--prune', '--quiet', 'origin'], CLONE_TIMEOUT_MS);
    }
    return { path: target, cloned: false };
  }

  await mkdir(cacheDir, { recursive: true });
  await run('git', ['clone', ...CLONE_ARGS, url, target], { timeout: CLONE_TIMEOUT_MS });
  return { path: target, cloned: true };
}

/**
 * Change items for each target version, read from the commits between its tag
 * and the tag of the version released immediately before it.
 *
 * `versionOrder` is the full ascending version list, and it matters: this
 * collector is normally asked for a sparse subset — the versions T1 could not
 * reach. Diffing consecutive *targets* would then fold the commits of every
 * skipped version into the next target, attributing them to the wrong release
 * and double counting whatever T1 already collected. Predecessors are taken
 * from the full list instead.
 */
export async function collectFromGitRepository(options = {}) {
  const packageName = requireText(options.packageName, 'packageName');
  const repository = normalizeRepositorySlug(options.repository);
  const repoPath = requireText(options.repoPath, 'repoPath');
  const fromVersion = options.fromVersion ?? null;
  const pathFilter = options.pathFilter ?? null;
  const targetVersions = [...new Set((options.targetVersions ?? []).map(String))].sort(compareVersions);
  const versionOrder = buildVersionOrder(options.versionOrder, targetVersions, fromVersion);

  const tags = await listTags(repoPath);
  const tagOf = (version) => (version ? findTag(tags, version, packageName) : null);

  const releases = [];
  const missingVersions = [];
  let filteredCommitCount = 0;

  const publishTimes = options.publishTimes ?? null;

  for (const version of targetVersions) {
    const tag = tagOf(version);
    if (!tag) {
      /*
       * 태그가 없는 버전은 npm 발행 시각으로 커밋 구간을 잡아 본다.
       * 저장소에 태그를 남기지 않고 npm에만 발행하는 패키지가 드물지 않고
       * (vue-cookies는 v1.8.3 이후 태그가 끊겼다), 그 구간은 태그 기반으로는
       * 영구히 빈손이다. 발행 시각 두 개가 모두 있어야만 시도한다.
       */
      const dated = publishTimes
        ? await readDatedRelease({ version, versionOrder, publishTimes, repoPath, pathFilter, repository })
        : null;
      if (dated) {
        releases.push(dated);
        continue;
      }
      missingVersions.push({ version, reason: 'NO_TAG_IN_REPOSITORY' });
      continue;
    }

    const start = findRangeStart(version, versionOrder, tagOf);
    // Nothing below this version carries a tag, so there is no range to read.
    if (!start) {
      missingVersions.push({ version, reason: 'NO_RANGE_START' });
      continue;
    }

    const commits = await readCommits(repoPath, start.tag, tag, pathFilter);
    const sections = buildSections(commits, repository);
    const itemCount = sections.reduce((total, section) => total + section.items.length, 0);
    filteredCommitCount += commits.length - itemCount;

    if (itemCount === 0) {
      missingVersions.push({ version, reason: 'NO_ITEMS_IN_COMMITS' });
      continue;
    }

    releases.push({
      version,
      tagName: tag,
      name: tag,
      publishedAt: await readTagDate(repoPath, tag),
      sourceUrl: `https://github.com/${repository}/compare/${start.tag}...${tag}`,
      sections,
      itemCount,
      rangeFrom: start.version,
      // True when the immediate predecessor had no tag and the range had to be
      // widened, so it carries more than this one release.
      rangeWidened: start.widened,
    });
  }

  const coveredVersions = releases.map((release) => release.version);
  const coverage = targetVersions.length ? round(coveredVersions.length / targetVersions.length) : null;

  return {
    packageName,
    repository,
    tier: 'T2_GIT',
    source: GIT_SOURCE,
    ok: true,
    evidence: {
      source: GIT_SOURCE,
      url: `https://github.com/${repository}`,
      rateLimitCost: 0,
      tagCount: tags.length,
      filteredCommitCount,
      // null means the whole repository was read: the registry gave no
      // directory, so sibling packages cannot be excluded.
      pathFilter,
      collectedAt: options.collectedAt ?? null,
    },
    // Commits are the inputs to a release note, not the note. Callers must not
    // present these with the same confidence as T1 output.
    precision: 'COMMIT_LOG',
    coverage,
    coverageBasis: 'REGISTRY_VERSIONS',
    degraded: true,
    targetVersions,
    coveredVersions,
    missingVersions,
    releaseCount: releases.length,
    sourceReleases: releases.slice().sort((left, right) => compareVersions(right.version, left.version)),
  };
}

/** Clone-or-fetch, then read. Returns a degraded result if git itself fails. */
export async function collectT2Git(options = {}) {
  try {
    // A caller that already holds the clone (the collection chain shares one
    // across T3 and T2) passes repoPath; cloning again would double the cost
    // — and on a timeout, double the failure.
    const repo = options.repoPath
      ? { path: options.repoPath, cloned: false }
      : await ensureRepository(options.repository, options);
    const result = await collectFromGitRepository({ ...options, repoPath: repo.path });
    return { ...result, cloned: repo.cloned };
  } catch (error) {
    return gitUnavailableResult(options, error);
  }
}

/** The degraded T2 shape, shared with the chain's clone-failed path. */
export function gitUnavailableResult(options, error) {
  const targetVersions = [...new Set((options.targetVersions ?? []).map(String))].sort(compareVersions);
  return {
    packageName: String(options.packageName ?? ''),
    repository: String(options.repository ?? ''),
    tier: 'T2_GIT',
    source: GIT_SOURCE,
    ok: false,
    error: { message: error instanceof Error ? error.message : String(error) },
    evidence: { source: GIT_SOURCE, url: null, rateLimitCost: 0, tagCount: 0, filteredCommitCount: 0, pathFilter: options.pathFilter ?? null, collectedAt: options.collectedAt ?? null },
    precision: 'COMMIT_LOG',
    coverage: targetVersions.length ? 0 : null,
    coverageBasis: 'REGISTRY_VERSIONS',
    degraded: true,
    targetVersions,
    coveredVersions: [],
    missingVersions: targetVersions.map((version) => ({ version, reason: 'GIT_UNAVAILABLE' })),
    releaseCount: 0,
    sourceReleases: [],
  };
}

function buildVersionOrder(provided, targetVersions, fromVersion) {
  const source = Array.isArray(provided) && provided.length
    ? provided
    : [...(fromVersion ? [fromVersion] : []), ...targetVersions];
  return [...new Set(source.map(String))].sort(compareVersions);
}

/**
 * The nearest version below `version` that actually has a tag.
 *
 * Walking back matters for packages that tag selectively: stopping at the
 * first untagged predecessor would drop the release entirely, when widening
 * the range still yields its commits.
 */
function findRangeStart(version, versionOrder, tagOf) {
  const index = versionOrder.indexOf(version);
  if (index <= 0) return null;

  for (let step = index - 1; step >= 0; step -= 1) {
    const candidate = versionOrder[step];
    const tag = tagOf(candidate);
    if (tag) return { version: candidate, tag, widened: step !== index - 1 };
  }
  return null;
}

/** 발행 시각 구간 커밋이 이 상한을 넘으면 포기한다 — 릴리즈 하나의 변경으로 읽을 수 없는 양이다. */
const DATED_RANGE_COMMIT_LIMIT = 60;

/**
 * 태그 없는 버전을 npm 발행 시각 구간의 커밋으로 재구성한다.
 *
 * 정밀도는 태그 범위보다 낮다(구간 경계가 발행 시점이라 앞뒤 커밋이 섞일 수
 * 있다). 그래서 `rangeWidened`를 켜서 하류가 이 릴리즈를 넓은 범위로 다루게
 * 하고, 커밋이 상한을 넘으면 아예 포기해 노이즈를 판정에 넘기지 않는다.
 */
async function readDatedRelease({ version, versionOrder, publishTimes, repoPath, pathFilter, repository }) {
  const index = versionOrder.indexOf(version);
  if (index <= 0) return null;

  const until = publishTimes[version] ?? null;
  const previous = versionOrder[index - 1];
  const since = previous ? publishTimes[previous] ?? null : null;
  if (!since || !until || new Date(since) >= new Date(until)) return null;

  const commits = await readCommitsInRange(repoPath, since, until, pathFilter);
  if (!commits.length || commits.length > DATED_RANGE_COMMIT_LIMIT) return null;

  /*
   * conventional commit 분류를 먼저 시도하고, 하나도 걸리지 않으면 커밋 제목을
   * 그대로 항목으로 쓴다.
   *
   * 이 관용을 **날짜 폴백 경로에만** 두는 이유: 태그 기반 T2에서 같은 관용을
   * 허용하면 `update`·`wip` 같은 제목이 항목으로 올라와, T2까지 내려간 모든
   * 패키지의 판정 노이즈가 함께 늘어난다. 여기까지 오는 패키지는 태그도
   * CHANGELOG도 릴리즈도 없는 경우뿐이라 영향 범위가 격리된다.
   */
  let sections = buildSections(commits, repository);
  let itemCount = sections.reduce((total, section) => total + section.items.length, 0);
  if (itemCount === 0) {
    const subjects = [...new Set(commits.map((commit) => commit.subject.trim()).filter(isMeaningfulSubject))];
    if (!subjects.length) return null;
    sections = [{ title: 'Release Notes', items: subjects }];
    itemCount = subjects.length;
  }

  return {
    version,
    tagName: null,
    name: `${previous}…${version} (발행 시각 구간)`,
    publishedAt: until,
    sourceUrl: `https://github.com/${repository}/commits?since=${since.slice(0, 10)}&until=${until.slice(0, 10)}`,
    sections,
    itemCount,
    rangeFrom: previous,
    // 태그 경계가 아니라 발행 시각 경계다 — 넓은 범위로 표시한다.
    rangeWidened: true,
  };
}

/**
 * 릴리즈 작업 자체를 가리키는 커밋 제목은 변경 항목이 아니다.
 *
 * 버전 범프(`1.8.5`, `v1.8.5`, `release 1.8.5`)와 내용이 없는 상투어를 걸러낸다.
 * 나머지는 빈약해도 남긴다 — 판정 단계가 근거를 아예 못 받는 것보다 낫다.
 */
function isMeaningfulSubject(subject) {
  if (subject.length < 4) return false;
  if (/^v?\d+\.\d+\.\d+(-[\w.]+)?$/.test(subject)) return false;
  if (/^(release|bump|publish|version)\b/i.test(subject)) return false;
  if (/^(update|updates|wip|test|tmp|temp|\.+)$/i.test(subject)) return false;
  return true;
}

async function readCommitsInRange(repoPath, since, until, pathFilter = null) {
  const { stdout } = await git(repoPath, [
    'log',
    '--no-merges',
    `--pretty=format:%H${FIELD}%s${FIELD}%b${RECORD}`,
    `--since=${since}`,
    `--until=${until}`,
    ...(pathFilter ? ['--', pathFilter] : []),
  ]);
  return parseCommitRecords(stdout);
}

async function listTags(repoPath) {
  const { stdout } = await git(repoPath, ['tag', '--list']);
  return stdout.split('\n').map((line) => line.trim()).filter(Boolean);
}

/**
 * Tag naming is per repository, and a monorepo prefixes the package name.
 * Candidates are checked against the actual tag list rather than assumed.
 */
export function findTag(tags, version, packageName) {
  const unscoped = String(packageName ?? '').replace(/^@[^/]+\//, '');
  const candidates = [
    `v${version}`,
    `${version}`,
    `${packageName}@${version}`,
    `${unscoped}@${version}`,
    `${packageName}-v${version}`,
    `${unscoped}-v${version}`,
  ];
  const available = new Set(tags);
  return candidates.find((candidate) => available.has(candidate)) ?? null;
}

async function readCommits(repoPath, fromTag, toTag, pathFilter = null) {
  const { stdout } = await git(repoPath, [
    'log',
    '--no-merges',
    `--pretty=format:%H${FIELD}%s${FIELD}%b${RECORD}`,
    `${fromTag}..${toTag}`,
    // Restricts the range to the package's own directory. Only applied when
    // the registry states one — guessing a path would silently drop real
    // changes for every repository that does not follow the guess.
    ...(pathFilter ? ['--', pathFilter] : []),
  ]);

  return parseCommitRecords(stdout);
}

function parseCommitRecords(stdout) {
  return stdout
    .split(RECORD)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, subject, body] = record.split(FIELD);
      return { hash: (hash ?? '').trim(), subject: (subject ?? '').trim(), body: (body ?? '').trim() };
    })
    .filter((commit) => commit.subject);
}

async function readTagDate(repoPath, tag) {
  try {
    const { stdout } = await git(repoPath, ['log', '-1', '--pretty=format:%cI', tag]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Groups commits into the same section titles a generated release note uses,
 * so the existing parser assigns the same categories.
 */
export function buildSections(commits, repository) {
  const grouped = new Map();

  for (const commit of commits) {
    const parsed = parseConventionalCommit(commit.subject);
    // A breaking marker outranks the type: `feat!:` is a breaking change.
    const breaking = parsed.breaking || /^BREAKING[ -]CHANGE/m.test(commit.body);
    const title = breaking ? 'Breaking Changes' : ITEM_TYPES.get(parsed.type);
    if (!title) continue;

    if (!grouped.has(title)) grouped.set(title, []);
    grouped.get(title).push(formatItem(parsed, commit, repository));
  }

  // Same order the parser ranks categories in, so the most severe reads first.
  const ORDER = ['Breaking Changes', 'Bug Fixes', 'Reverts', 'Features', 'Refactors', 'Performance'];
  return ORDER.filter((title) => grouped.has(title)).map((title) => ({
    title,
    items: grouped.get(title),
  }));
}

export function parseConventionalCommit(subject) {
  const text = String(subject).trim();

  /*
   * A revert is a change, not noise.
   *
   * GitHub writes reverts as `Revert "<original subject>"`, which is not
   * conventional-commit shaped, so a plain type match drops them. Three
   * vuetify patch releases in the 3.6-3.12 range contain nothing but a revert:
   * reading them as noise reported those versions as having no changes at all.
   *
   * A merged revert PR carries a trailing ` (#548)` after the closing quote.
   * Anchoring the quote to end-of-line rejected exactly those — plugin-vue
   * 5.2.3 is a release whose only change is such a revert, and it read as
   * having no changes at all. The ref is kept so the item links to the PR.
   */
  const reverted = text.match(/^Revert\s+"(.+)"\s*((?:\(#\d+\)\s*)*)$/i);
  if (reverted) {
    const inner = parseConventionalCommit(reverted[1]);
    const refs = (reverted[2] ?? '').trim();
    return {
      type: 'revert',
      scope: inner.scope,
      breaking: false,
      summary: `revert "${inner.summary}"${refs ? ` ${refs}` : ''}`,
    };
  }

  const match = text.match(/^([a-z]+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/i);
  if (!match) return { type: null, scope: null, breaking: false, summary: text };
  return {
    type: match[1].toLowerCase(),
    scope: match[2] ? match[2].trim() : null,
    breaking: Boolean(match[3]),
    summary: match[4].trim(),
  };
}

/**
 * Renders a commit as the markdown a release note would carry, so scope, PR
 * numbers and commit hashes come out through the existing item parser instead
 * of a second extraction path.
 */
function formatItem(parsed, commit, repository) {
  const short = commit.hash.slice(0, 7);
  const summary = parsed.summary.replace(
    /\(#(\d+)\)/g,
    (_, number) => `([#${number}](https://github.com/${repository}/issues/${number}))`,
  );
  const link = short ? ` ([${short}](https://github.com/${repository}/commit/${commit.hash}))` : '';
  return parsed.scope ? `**${parsed.scope}:** ${summary}${link}` : `${summary}${link}`;
}

function git(repoPath, args, timeout = GIT_TIMEOUT_MS) {
  // execFile with an argument array: no shell, so a repository slug can never
  // be read as a command.
  return run('git', ['-C', repoPath, ...args], { timeout, maxBuffer: 32 * 1024 * 1024 });
}

function requireText(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${field} is required`);
  return text;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
