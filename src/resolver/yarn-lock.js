import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function readYarnLock(projectPath) {
  return readYarnLockFile(join(projectPath, 'yarn.lock'));
}

export function readYarnLockFile(lockfilePath) {
  return parseYarnV1Lock(readFileSync(lockfilePath, 'utf8'));
}

export function parseYarnV1Lock(content) {
  const entriesBySelector = new Map();
  const versionsByPackageName = new Map();
  let currentSelectors = [];
  let currentEntry = null;

  const flush = () => {
    if (!currentEntry) return;
    for (const selector of currentSelectors) {
      entriesBySelector.set(selector, currentEntry);
      const packageName = getPackageNameFromSelector(selector);
      if (!versionsByPackageName.has(packageName)) versionsByPackageName.set(packageName, new Set());
      if (currentEntry.version) versionsByPackageName.get(packageName).add(currentEntry.version);
    }
  };

  for (const line of stripBom(content).split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;

    if (!line.startsWith(' ') && line.endsWith(':')) {
      flush();
      currentSelectors = splitSelectorHeader(line.slice(0, -1));
      currentEntry = { selectors: currentSelectors, version: null, resolved: null };
      continue;
    }

    if (!currentEntry) continue;
    const trimmed = line.trim();
    const versionMatch = trimmed.match(/^version\s+"?([^"\s]+)"?$/);
    if (versionMatch) {
      currentEntry.version = versionMatch[1];
      continue;
    }
    const resolvedMatch = trimmed.match(/^resolved\s+"?([^"\s]+)"?$/);
    if (resolvedMatch) {
      currentEntry.resolved = resolvedMatch[1];
    }
  }

  flush();

  return {
    entriesBySelector,
    versionsByPackageName,
  };
}

export function splitSelectorHeader(header) {
  const selectors = [];
  let current = '';
  let inQuote = false;

  for (const char of header) {
    if (char === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (char === ',' && !inQuote) {
      selectors.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  if (current.trim()) selectors.push(current.trim());
  return selectors;
}

export function getPackageNameFromSelector(selector) {
  if (selector.startsWith('@')) {
    const secondAt = selector.indexOf('@', 1);
    return secondAt === -1 ? selector : selector.slice(0, secondAt);
  }
  const firstAt = selector.indexOf('@');
  return firstAt === -1 ? selector : selector.slice(0, firstAt);
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
