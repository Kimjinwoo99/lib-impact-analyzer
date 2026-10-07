/**
 * A/B comparison of two persisted L4 results (.cache/agent-runs/*-result.json).
 *
 *   node scripts/compare-l4-results.js --base <id or path> --new <id or path>
 *
 * Joins items by itemId and reports agreement on the judgment fields
 * (agentCategory · preliminaryRisk · reviewRequired), listing every
 * disagreement with both reasonings so a human can tell drift from a
 * defensible difference. Cost/duration come from the sibling meta files.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = parseArgs(process.argv.slice(2));
if (!args.base || !args.new) {
  console.error('usage: node scripts/compare-l4-results.js --base <id|path> --new <id|path>');
  process.exit(1);
}

const base = load(args.base);
const next = load(args.new);

const baseItems = new Map(base.execution.result.items.map((item) => [item.itemId, item]));
const nextItems = new Map(next.execution.result.items.map((item) => [item.itemId, item]));

const shared = [...baseItems.keys()].filter((id) => nextItems.has(id));
const onlyBase = [...baseItems.keys()].filter((id) => !nextItems.has(id));
const onlyNext = [...nextItems.keys()].filter((id) => !baseItems.has(id));

console.log(`기준: ${args.base} (${baseItems.size}항목) · 대상: ${args.new} (${nextItems.size}항목) · 공통 ${shared.length}`);
if (onlyBase.length) console.log(`기준에만 있음: ${onlyBase.join(', ')}`);
if (onlyNext.length) console.log(`대상에만 있음: ${onlyNext.join(', ')}`);

const FIELDS = ['agentCategory', 'preliminaryRisk', 'reviewRequired'];
const agree = Object.fromEntries(FIELDS.map((field) => [field, 0]));
const diffs = [];

for (const id of shared) {
  const left = baseItems.get(id);
  const right = nextItems.get(id);
  const rowDiffs = FIELDS.filter((field) => String(left[field]) !== String(right[field]));
  for (const field of FIELDS) if (!rowDiffs.includes(field)) agree[field] += 1;
  if (rowDiffs.length) diffs.push({ id, rowDiffs, left, right });
}

console.log('\n판단 필드 일치율:');
for (const field of FIELDS) {
  console.log(`  ${field.padEnd(16)} ${agree[field]}/${shared.length} (${((agree[field] / shared.length) * 100).toFixed(0)}%)`);
}

if (diffs.length) {
  console.log(`\n불일치 ${diffs.length}건:`);
  for (const diff of diffs) {
    const show = (item) => FIELDS.map((field) => item[field]).join('/');
    console.log(`  ${diff.id} [${diff.rowDiffs.join(',')}]`);
    console.log(`    기준: ${show(diff.left)} — ${String(diff.left.reasoning ?? '').slice(0, 80)}`);
    console.log(`    대상: ${show(diff.right)} — ${String(diff.right.reasoning ?? '').slice(0, 80)}`);
  }
} else {
  console.log('\n불일치 없음.');
}

console.log('\n비용·소요:');
for (const [label, run] of [['기준', base], ['대상', next]]) {
  const meta = run.record;
  const usage = meta?.usage ?? run.execution.meta?.usage ?? {};
  const cost = meta?.costUsd ?? run.execution.meta?.costUsd;
  const duration = meta?.durationMs ?? run.execution.meta?.durationMs;
  console.log(
    `  ${label}: ${duration != null ? (duration / 1000).toFixed(0) + 's' : '?'} · ` +
    `out ${usage.output_tokens ?? '?'} tok · $${cost ?? '?'}`,
  );
}

function load(ref) {
  const candidates = [
    ref,
    resolve('.cache/agent-runs', ref),
    resolve('.cache/agent-runs', `${ref}-result.json`),
    resolve('.cache/agent-runs', `${ref}.json`),
  ];
  const path = candidates.find((candidate) => existsSync(candidate) && candidate.endsWith('-result.json'))
    ?? candidates.find((candidate) => existsSync(candidate));
  if (!path) {
    console.error(`결과 파일을 찾지 못함: ${ref}`);
    process.exit(1);
  }
  const execution = JSON.parse(readFileSync(path, 'utf8'));
  const metaPath = path.replace(/-result\.json$/, '.json');
  const record = metaPath !== path && existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, 'utf8')) : null;
  return { execution, record };
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith('--')) continue;
    parsed[argv[index].slice(2)] = argv[index + 1];
    index += 1;
  }
  return parsed;
}
