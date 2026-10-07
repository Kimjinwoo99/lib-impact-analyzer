import { readFileSync } from 'node:fs';

export function readPackageLock(lockfilePath) {
  const raw = stripBom(readFileSync(lockfilePath, 'utf8'));
  const data = JSON.parse(raw);
  return parsePackageLock(data);
}

export function parsePackageLock(data) {
  const entriesByPackageName = new Map();
  const versionsByPackageName = new Map();
  const packages = data.packages && typeof data.packages === 'object' ? data.packages : null;

  if (packages) {
    for (const [packagePath, entry] of Object.entries(packages)) {
      if (!packagePath || !entry || !entry.version) continue;
      const packageName = getPackageNameFromNodeModulesPath(packagePath);
      if (!packageName) continue;
      addVersion(versionsByPackageName, packageName, entry.version);
      if (!entriesByPackageName.has(packageName) || isTopLevelNodeModulesPath(packagePath)) {
        entriesByPackageName.set(packageName, {
          version: entry.version,
          resolved: entry.resolved ?? null,
          packagePath,
        });
      }
    }
  }

  if (data.dependencies && typeof data.dependencies === 'object') {
    collectLegacyDependencies(data.dependencies, entriesByPackageName, versionsByPackageName);
  }

  return { entriesByPackageName, versionsByPackageName };
}

function collectLegacyDependencies(dependencies, entriesByPackageName, versionsByPackageName) {
  for (const [name, entry] of Object.entries(dependencies)) {
    if (!entry || !entry.version) continue;
    addVersion(versionsByPackageName, name, entry.version);
    if (!entriesByPackageName.has(name)) {
      entriesByPackageName.set(name, {
        version: entry.version,
        resolved: entry.resolved ?? null,
        packagePath: `node_modules/${name}`,
      });
    }
    if (entry.dependencies) {
      collectLegacyDependencies(entry.dependencies, entriesByPackageName, versionsByPackageName);
    }
  }
}

function getPackageNameFromNodeModulesPath(packagePath) {
  const parts = packagePath.split('/');
  const index = parts.lastIndexOf('node_modules');
  if (index === -1 || index === parts.length - 1) return null;
  const first = parts[index + 1];
  if (first?.startsWith('@')) {
    const second = parts[index + 2];
    return second ? `${first}/${second}` : null;
  }
  return first;
}

function isTopLevelNodeModulesPath(packagePath) {
  return packagePath.split('/').filter((part) => part === 'node_modules').length === 1;
}

function addVersion(map, packageName, version) {
  if (!map.has(packageName)) map.set(packageName, new Set());
  map.get(packageName).add(version);
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
