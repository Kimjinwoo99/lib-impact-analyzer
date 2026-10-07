/**
 * Collection performance measurement over a real project's direct deps.
 *
 * Runs the same chain the server runs (T1 atom -> T2 git for what T1 missed)
 * against every direct dependency, and reports per-package coverage, item
 * counts, precision split, timing and external request counts — plus GitHub
 * API quota before/after, which must not move.
 *
 *   node scripts/measure-collection.js --label round0
 *   node scripts/measure-collection.js --project <프로젝트_경로> --concurrency 4
 *
 * Results land in `.cache/measure/<label>.json` so rounds can be diffed.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runCollectionChain } from '../src/collect/collect-chain.js';
import {
  fetchPackageMetadata,
  resolveRepositoryDirectory,
  resolveRepositorySlug,
  selectStableVersions,
  selectVersionsAheadOf,
} from '../src/collect/npm-registry.js';
import { analyzeDependencies } from '../src/resolver/dependency-resolver.js';

const args = parseArgs(process.argv.slice(2));
const projectPath = resolve(args.project ?? '.');
const label = args.label ?? `round-${Date.now()}`;
const concurrency = Number(args.concurrency ?? 4);

// Every external HTTP call goes through this counter, so "how many requests
// did a round cost" is measured rather than estimated.
let httpRequests = 0;
const countingFetch = (url, init) => {
  httpRequests += 1;
  return fetch(url, init);
};

async function readGitHubQuota() {
  try {
    const response = await fetch('https://api.github.com/rate_limit', {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'lib-impact-analyzer-measure' },
    });
    if (!response.ok) return null;
    const body = await response.json();
    return body?.resources?.core ?? null;
  } catch {
    return null;
  }
}

function normalizeVersion(value) {
  const match = String(value ?? '').match(/\d+\.\d+\.\d+/);
  return match ? match[0] : null;
}

async function measurePackage(dep) {
  const startedAt = Date.now();
  const packageName = dep.name;
  const currentVersion = normalizeVersion(dep.resolvedVersion ?? dep.declaredRange);
  const row = {
    packageName,
    currentVersion,
    latest: null,
    repository: null,
    targetCount: 0,
    coveredCount: 0,
    coverage: null,
    itemCount: 0,
    tierCovered: { T1: 0, T2_GIT: 0, T3_CHANGELOG: 0 },
    precision: {},
    missingReasons: {},
    error: null,
    elapsedMs: 0,
  };

  try {
    if (!currentVersion) throw new Error(`unresolved installed version: ${dep.resolvedVersion ?? dep.declaredRange}`);
    const metadata = await fetchPackageMetadata(packageName, { fetchImpl: countingFetch });
    const stable = selectStableVersions(metadata);
    row.latest = stable[stable.length - 1] ?? null;
    row.repository = resolveRepositorySlug(metadata);

    const targetVersions = selectVersionsAheadOf(metadata, currentVersion);
    row.targetCount = targetVersions.length;
    if (!row.repository) {
      row.error = 'ADAPTER_REQUIRED';
      return row;
    }
    if (!targetVersions.length) return row;

    const { collection } = await runCollectionChain({
      packageName,
      repository: row.repository,
      targetVersions,
      pathFilter: resolveRepositoryDirectory(metadata),
      versionOrder: [currentVersion, ...targetVersions],
      fetchImpl: countingFetch,
    });

    for (const release of collection.collectedReleases) {
      if (!release.itemCount && !release.noChanges) continue;
      row.tierCovered[release.tier] = (row.tierCovered[release.tier] ?? 0) + 1;
      row.precision[release.precision] = (row.precision[release.precision] ?? 0) + release.itemCount;
      row.itemCount += release.itemCount;
    }
    for (const entry of collection.missingVersions) {
      row.missingReasons[entry.reason] = (row.missingReasons[entry.reason] ?? 0) + 1;
    }

    row.coveredCount = collection.coveredVersions.length;
    row.coverage = collection.coverage;
    return row;
  } catch (error) {
    row.error = error instanceof Error ? error.message : String(error);
    return row;
  } finally {
    row.elapsedMs = Date.now() - startedAt;
  }
}

function formatRow(row) {
  const behind = row.latest && row.currentVersion ? `${row.currentVersion} → ${row.latest}` : row.currentVersion ?? '?';
  const coverage = row.coverage === null ? '—' : `${row.coveredCount}/${row.targetCount}`;
  const tiers = Object.entries(row.tierCovered)
    .filter(([, count]) => count > 0)
    .map(([tier, count]) => `${tier}:${count}`)
    .join(' ');
  const missing = Object.entries(row.missingReasons)
    .map(([reason, count]) => `${reason}×${count}`)
    .join(' ');
  return [
    row.packageName.padEnd(26),
    behind.padEnd(20),
    coverage.padEnd(8),
    String(row.itemCount).padStart(5),
    (tiers || '—').padEnd(22),
    `${(row.elapsedMs / 1000).toFixed(1)}s`.padStart(7),
    row.error ? ` !${row.error}` : missing ? ` 미수집: ${missing}` : '',
  ].join(' ');
}

const startedAt = Date.now();
const quotaBefore = await readGitHubQuota();

const analysis = analyzeDependencies(projectPath);
const deps = (analysis.packages ?? []).flatMap((pkg) => pkg.directDependencies ?? []);
if (!deps.length) {
  console.error(`no direct dependencies found under ${projectPath}`);
  process.exit(1);
}
console.log(`${projectPath} — 직접 의존성 ${deps.length}개, 동시 실행 ${concurrency}`);

const queue = [...deps];
const rows = [];
await Promise.all(
  Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const dep = queue.shift();
      const row = await measurePackage(dep);
      rows.push(row);
      console.log(formatRow(row));
    }
  }),
);

const quotaAfter = await readGitHubQuota();
rows.sort((left, right) => left.packageName.localeCompare(right.packageName));

const summary = {
  label,
  projectPath,
  measuredAt: new Date().toISOString(),
  elapsedMs: Date.now() - startedAt,
  httpRequests,
  githubQuota: {
    before: quotaBefore ? { remaining: quotaBefore.remaining, limit: quotaBefore.limit } : null,
    after: quotaAfter ? { remaining: quotaAfter.remaining, limit: quotaAfter.limit } : null,
    consumed:
      quotaBefore && quotaAfter && quotaBefore.limit === quotaAfter.limit
        ? quotaBefore.remaining - quotaAfter.remaining
        : null,
  },
  totals: {
    packages: rows.length,
    collectable: rows.filter((row) => row.repository).length,
    targetVersions: rows.reduce((total, row) => total + row.targetCount, 0),
    coveredVersions: rows.reduce((total, row) => total + row.coveredCount, 0),
    changeItems: rows.reduce((total, row) => total + row.itemCount, 0),
    // Coverage over packages that have a repository and something to read.
    packagesAtThreshold: rows.filter((row) => row.coverage !== null && row.coverage >= 0.8).length,
    packagesBelowThreshold: rows
      .filter((row) => row.repository && row.targetCount > 0 && (row.coverage ?? 0) < 0.8)
      .map((row) => row.packageName),
  },
  rows,
};

console.log('\n합계:', JSON.stringify(summary.totals, null, 2));
console.log(
  `소요 ${(summary.elapsedMs / 1000).toFixed(1)}s · HTTP ${httpRequests}회 · GitHub API 쿼터 소모 ${summary.githubQuota.consumed ?? '측정불가'}`,
);

const outDir = resolve('.cache/measure');
await mkdir(outDir, { recursive: true });
const outFile = resolve(outDir, `${label}.json`);
await writeFile(outFile, JSON.stringify(summary, null, 2));
console.log(`저장: ${outFile}`);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[index + 1] : true;
    parsed[key] = value;
    if (value !== true) index += 1;
  }
  return parsed;
}
