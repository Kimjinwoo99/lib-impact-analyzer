/**
 * T1 collection CLI — `releases.atom`, zero GitHub API quota.
 *
 * Usage:
 *   node scripts/collect-t1-atom.js --package vuetify --current 3.6.10
 *   node scripts/collect-t1-atom.js --package vuetify --current 3.6.10 --target 4.1.5
 *   node scripts/collect-t1-atom.js --package chart.js --window 5
 *   node scripts/collect-t1-atom.js --package vite --repo vitejs/vite --input feed.xml
 */

import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { collectFromAtomXml, collectT1 } from '../src/collect/atom-collector.js';
import {
  fetchPackageMetadata,
  readPublishedAt,
  resolveRepositorySlug,
  selectRecentStableVersions,
  selectVersionsAheadOf,
} from '../src/collect/npm-registry.js';

const USAGE = 'Usage: node scripts/collect-t1-atom.js --package <name> [--repo owner/repo] [--current <version>] [--target <version>] [--window 5] [--input feed.xml] [--output file.json]';

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args.set(arg.slice(2), 'true');
      continue;
    }
    args.set(arg.slice(2), next);
    index += 1;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const packageName = args.get('package');
  if (!packageName) {
    console.error(USAGE);
    process.exit(1);
  }

  const currentVersion = args.get('current') ?? null;
  const targetVersion = args.get('target') ?? null;
  const windowSize = Number(args.get('window') ?? 5);
  const inputPath = args.get('input') ?? null;
  const outputPath = args.get('output') ?? null;

  let repository = args.get('repo') ?? null;
  let targetVersions = [];
  let metadata = null;

  // The registry supplies both the slug and the coverage denominator.
  if (!repository || !inputPath) {
    metadata = await fetchPackageMetadata(packageName);
    repository = repository ?? resolveRepositorySlug(metadata);
    if (!repository) {
      console.error(`no GitHub repository found for ${packageName} — this package needs a dedicated adapter (see realgrid / realgrid-vue)`);
      process.exit(2);
    }
    targetVersions = currentVersion
      ? selectVersionsAheadOf(metadata, currentVersion, { toVersion: targetVersion })
      : selectRecentStableVersions(metadata, windowSize);
  }

  const collectedAt = new Date().toISOString();
  const result = inputPath
    ? collectFromAtomXml({ packageName, repository, atomXml: readFileSync(resolve(inputPath), 'utf8'), targetVersions, collectedAt })
    : await collectT1({ packageName, repository, targetVersions, collectedAt });

  if (outputPath) {
    const path = resolve(outputPath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(withPublishDates(result, metadata), null, 2)}\n`, 'utf8');
  }

  printReport(result, { currentVersion, targetVersion, windowSize, outputPath });
  if (!result.ok) process.exitCode = 3;
}

function withPublishDates(result, metadata) {
  if (!metadata) return result;
  return {
    ...result,
    targetVersionDetail: result.targetVersions.map((version) => ({
      version,
      publishedAt: readPublishedAt(metadata, version),
      covered: result.coveredVersions.includes(version),
    })),
  };
}

function printReport(result, context) {
  const lines = [];
  lines.push(`[T1] ${result.packageName}  ${result.repository}`);
  lines.push(`  feed            ${result.evidence.url}  (entries ${result.evidence.entryCount}, API quota cost ${result.evidence.rateLimitCost})`);
  lines.push(`  window          ${context.currentVersion ? `versions above ${context.currentVersion}${context.targetVersion ? ` up to ${context.targetVersion}` : ''}` : `recent ${context.windowSize} stable releases`}`);
  lines.push(`  target versions ${result.targetVersions.length ? result.targetVersions.join(', ') : '(none — installed version is current)'}`);
  lines.push(`  coverage        ${formatCoverage(result)}  basis=${result.coverageBasis}  threshold=${result.coverageThreshold}`);
  lines.push(`  grade           ${result.grade}${result.degraded ? '  (degraded)' : ''}`);
  lines.push(`  collected       ${result.releaseCount} releases, ${result.changeItemCount} change items${result.truncated ? `  [feed truncated at ${result.entryLimit} entries]` : ''}`);

  if (!result.ok) lines.push(`  error           ${result.error.message}`);
  if (result.missingVersions.length) {
    lines.push(`  not covered     ${result.missingVersions.map((entry) => `${entry.version} (${entry.reason})`).join(', ')}`);
  }
  if (result.needsFallback.length) lines.push(`  next path       ${result.needsFallback.join(' -> ')}`);
  if (result.manualReview.required) lines.push(`  manual review   ${result.manualReview.reason}`);
  if (result.rejectedEntries.length) {
    lines.push(`  rejected feed entries  ${result.rejectedEntries.map((entry) => `${entry.tagName} (${entry.reason})`).join(', ')}`);
  }
  if (context.outputPath) lines.push(`  output          ${context.outputPath}`);

  console.log(lines.join('\n'));

  for (const release of result.releases.slice(0, 5)) {
    console.log(`\n  ${release.tagName ?? release.version}  ${release.publishedAt ?? ''}  ${release.items.length} items`);
    for (const item of release.items.slice(0, 3)) {
      console.log(`    - [${item.category}] ${item.scope ? `${item.scope}: ` : ''}${item.summary.slice(0, 110)}`);
    }
  }
}

function formatCoverage(result) {
  if (result.coverage === null) return 'n/a';
  return `${Math.round(result.coverage * 100)}% (${result.coveredVersions.length}/${result.targetVersions.length})`;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
