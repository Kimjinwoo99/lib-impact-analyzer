/**
 * Project runtime facts — E2b of l6-deterministic-evidence-design.md §5.
 *
 * When a registry `engines.node` diff (package-info.js's `diffRequirements`)
 * forces a `chain:node` unit, the detail that actually decided the judgment
 * on the vite 5→8 golden run was not the diff itself but whether THIS
 * project has anything that would catch a mismatch before it ships: "engines
 * 필드 없음 · .nvmrc 없음 · CI 워크플로 없음 → 강제 장치 부재". That sentence
 * was assembled by three Agent Glob calls every run. All three are static
 * filesystem facts about the analyzed project — nothing here reads the
 * registry or the upgraded package.
 *
 * Deliberately tiny: this collector answers "does an enforcement mechanism
 * exist", not "what does it require" (that is the project's own package.json
 * `engines` field, already readable by whoever assembles the L6 payload).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CI_WORKFLOW_EXTENSION = /\.ya?ml$/i;

/**
 * @param projectPath  the analyzed project's root
 * @returns {
 *   engines: { present, declared }   — this project's OWN package.json engines
 *                                       field (not the upgraded package's)
 *   nodeVersionFile: { present, path } — .nvmrc or .node-version, whichever exists
 *   ciWorkflow: { present, files }    — .github/workflows/*.y(a)ml
 * }
 */
export function collectProjectRuntimeFacts(projectPath) {
  const root = resolve(String(projectPath ?? '').trim());

  return {
    engines: readEnginesField(root),
    nodeVersionFile: findNodeVersionFile(root),
    ciWorkflow: findCiWorkflows(root),
  };
}

function readEnginesField(root) {
  const manifestPath = resolve(root, 'package.json');
  if (!existsSync(manifestPath)) return { present: false, declared: null };
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    // Unparsable package.json is not this collector's concern to diagnose.
    return { present: false, declared: null };
  }
  const engines = manifest?.engines;
  const hasEntries = engines && typeof engines === 'object' && Object.keys(engines).length > 0;
  return { present: Boolean(hasEntries), declared: hasEntries ? engines : null };
}

function findNodeVersionFile(root) {
  for (const name of ['.nvmrc', '.node-version']) {
    if (existsSync(resolve(root, name))) return { present: true, path: name };
  }
  return { present: false, path: null };
}

function findCiWorkflows(root) {
  const dir = resolve(root, '.github/workflows');
  if (!existsSync(dir)) return { present: false, files: [] };
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return { present: false, files: [] };
  }
  const files = entries.filter((entry) => entry.isFile() && CI_WORKFLOW_EXTENSION.test(entry.name)).map((entry) => entry.name);
  return { present: files.length > 0, files };
}
