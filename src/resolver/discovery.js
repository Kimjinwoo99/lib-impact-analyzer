import { readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const SKIP_DIRECTORIES = new Set([
  '.git',
  '.hg',
  '.svn',
  '.next',
  '.nuxt',
  '.turbo',
  '.cache',
  '.yarn',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'out',
]);

const LOCKFILE_CANDIDATES = [
  { fileName: 'yarn.lock', packageManager: 'yarn-v1' },
  { fileName: 'package-lock.json', packageManager: 'npm' },
  { fileName: 'npm-shrinkwrap.json', packageManager: 'npm-shrinkwrap' },
  { fileName: 'pnpm-lock.yaml', packageManager: 'pnpm' },
  { fileName: 'bun.lock', packageManager: 'bun' },
  { fileName: 'bun.lockb', packageManager: 'bun' },
];

export function discoverPackageJsonFiles(rootPath) {
  const discovered = [];
  walk(rootPath, discovered);
  return discovered.sort((a, b) => a.localeCompare(b));
}

export function findNearestLockfile(packageDirectory, rootPath) {
  let current = packageDirectory;
  while (current.startsWith(rootPath)) {
    for (const candidate of LOCKFILE_CANDIDATES) {
      const lockfilePath = join(current, candidate.fileName);
      if (isFile(lockfilePath)) {
        return { ...candidate, path: lockfilePath, directory: current };
      }
    }

    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

export function toRelativePackagePath(rootPath, packageJsonPath) {
  const packageDirectory = dirname(packageJsonPath);
  const rel = relative(rootPath, packageDirectory);
  return rel || '.';
}

function walk(directory, discovered) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isFile() && entry.name === 'package.json') {
      discovered.push(fullPath);
      continue;
    }

    if (!entry.isDirectory()) continue;
    if (SKIP_DIRECTORIES.has(entry.name)) continue;
    walk(fullPath, discovered);
  }
}

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}
