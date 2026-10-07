/**
 * Information-card completeness measurement over a real project's direct deps.
 *
 * The card's job is to be fillable for EVERY dependency — including the ones
 * the changelog chain cannot read (realgrid has no GitHub repository, but the
 * registry and OSV both know it). Fill rate is measured over fields that are
 * always knowable; engines/peerDependencies are legitimately absent for many
 * packages and are reported but not scored.
 *
 *   node scripts/measure-package-info.js --label info-round1
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchPackageMetadata } from '../src/collect/npm-registry.js';
import { collectPackageInfoBatch } from '../src/collect/package-info.js';
import { analyzeDependencies } from '../src/resolver/dependency-resolver.js';

const args = parseArgs(process.argv.slice(2));
const projectPath = resolve(args.project ?? '.');
const label = args.label ?? `info-${Date.now()}`;

let httpRequests = 0;
const countingFetch = (url, init) => {
  httpRequests += 1;
  return fetch(url, init);
};

// One registry fetch per package per run — the server keeps a 10-minute cache
// for the same reason.
const metadataCache = new Map();
async function loadMetadata(packageName) {
  if (!metadataCache.has(packageName)) {
    metadataCache.set(packageName, fetchPackageMetadata(packageName, { fetchImpl: countingFetch }));
  }
  return metadataCache.get(packageName);
}

/** Always-knowable fields. A card missing one of these is a collection gap. */
const SCORED_FIELDS = [
  ['latest', (card) => card.registry?.latest],
  // A CDN-tarball install (xlsx) has no registry publish date for the
  // installed version — the card knowing WHY counts as answered.
  ['installedPublishedAt', (card) => card.registry?.installedPublishedAt || card.registry?.registryKnowsInstalled === false],
  ['latestPublishedAt', (card) => card.registry?.latestPublishedAt],
  ['behind', (card) => card.registry?.behind && Number.isFinite(card.registry.behind.versionsAhead)],
  ['license', (card) => card.requirements?.license?.installed],
  ['deprecatedKnown', (card) => card.requirements && 'deprecated' in card.requirements],
  ['collectPathKnown', (card) => card.repository || card.adapterRequired === true],
  ['vulnerabilityAnswer', (card) => card.vulnerabilities?.ok === true],
  ['downloads', (card) => Number.isFinite(card.downloads?.lastMonth)],
];

function normalizeVersion(value) {
  const match = String(value ?? '').match(/\d+\.\d+\.\d+/);
  return match ? match[0] : null;
}

const startedAt = Date.now();
const analysis = analyzeDependencies(projectPath);
const deps = (analysis.packages ?? []).flatMap((pkg) => pkg.directDependencies ?? []);
const entries = deps
  .map((dep) => ({ packageName: dep.name, installedVersion: normalizeVersion(dep.resolvedVersion ?? dep.declaredRange) }))
  .filter((entry) => entry.packageName && entry.installedVersion);

console.log(`${projectPath} — 정보 카드 대상 ${entries.length}개`);
const cards = await collectPackageInfoBatch(entries, { loadMetadata, fetchImpl: countingFetch });

const rows = cards.map((card) => {
  const filled = SCORED_FIELDS.filter(([, read]) => Boolean(read(card)));
  const missing = SCORED_FIELDS.filter(([, read]) => !read(card)).map(([name]) => name);
  const vulnNote = card.vulnerabilities.count
    ? `취약점 ${card.vulnerabilities.count}건(${card.vulnerabilities.items.map((item) => item.severity ?? '?').join(',')})`
    : '';
  const deprecatedNote = card.requirements?.deprecated?.installed ? 'DEPRECATED' : '';
  console.log(
    [
      card.packageName.padEnd(26),
      `${card.installedVersion} → ${card.registry?.latest ?? '?'}`.padEnd(22),
      `${filled.length}/${SCORED_FIELDS.length}`.padEnd(6),
      (card.downloads.lastMonth ? `${Math.round(card.downloads.lastMonth / 1000)}k/월` : '—').padStart(9),
      ` ${[vulnNote, deprecatedNote, missing.length ? `누락: ${missing.join(',')}` : ''].filter(Boolean).join(' · ')}`,
    ].join(' '),
  );
  return {
    packageName: card.packageName,
    filled: filled.length,
    total: SCORED_FIELDS.length,
    missingFields: missing,
    vulnerabilityCount: card.vulnerabilities.count,
    deprecated: Boolean(card.requirements?.deprecated?.installed),
    card,
  };
});

const filledTotal = rows.reduce((total, row) => total + row.filled, 0);
const fieldTotal = rows.length * SCORED_FIELDS.length;
const summary = {
  label,
  projectPath,
  measuredAt: new Date().toISOString(),
  elapsedMs: Date.now() - startedAt,
  httpRequests,
  totals: {
    packages: rows.length,
    fillRate: Math.round((filledTotal / fieldTotal) * 1000) / 1000,
    fullyFilled: rows.filter((row) => row.filled === row.total).length,
    withVulnerabilities: rows.filter((row) => row.vulnerabilityCount > 0).map((row) => row.packageName),
    deprecatedInstalled: rows.filter((row) => row.deprecated).map((row) => row.packageName),
  },
  rows,
};

console.log('\n합계:', JSON.stringify(summary.totals, null, 2));
console.log(`소요 ${(summary.elapsedMs / 1000).toFixed(1)}s · HTTP ${httpRequests}회 (registry ${metadataCache.size} + OSV/다운로드 ${httpRequests - metadataCache.size})`);

const outDir = resolve('.cache/measure');
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, `${label}.json`), JSON.stringify(summary, null, 2));
console.log(`저장: ${resolve(outDir, `${label}.json`)}`);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const value = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[index + 1] : true;
    parsed[token.slice(2)] = value;
    if (value !== true) index += 1;
  }
  return parsed;
}
