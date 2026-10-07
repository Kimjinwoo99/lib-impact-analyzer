import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { buildChangelogParseResult } from '../src/changelog/release-range-parser.js';

function parseArgs(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    args.set(arg.slice(2), argv[i + 1]);
    i += 1;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const packageName = args.get('package') ?? 'vuetify';
const currentVersion = args.get('current');
const targetVersion = args.get('target') ?? null;
const input = args.get('input') ?? 'data/vuetify/releases-3.6.5-to-4.1.5.json';
const output = args.get('output') ?? null;

if (!currentVersion) {
  console.error('Usage: node scripts/parse-release-range.js --current <version> [--target <version>] [--package vuetify] [--input file] [--output file]');
  process.exit(1);
}

const source = JSON.parse(readFileSync(resolve(input), 'utf8'));
const result = buildChangelogParseResult({
  packageName,
  currentVersion,
  targetVersion,
  releases: source.releases ?? [],
});

if (output) {
  const outputPath = resolve(output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  packageName: result.packageName,
  mode: result.mode,
  currentVersion: result.currentVersion,
  targetVersion: result.targetVersion,
  releaseCount: result.releaseCount,
  changeItemCount: result.changeItemCount,
  output,
}, null, 2));
