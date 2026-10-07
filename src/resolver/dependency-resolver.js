import { dirname } from 'node:path';
import { discoverPackageJsonFiles, findNearestLockfile, toRelativePackagePath } from './discovery.js';
import { readPackageLock } from './package-lock.js';
import { collectDirectDependencies, readPackageJsonFile } from './package-json.js';
import { readYarnLockFile } from './yarn-lock.js';

export function analyzeDependencies(projectPath) {
  const packageJsonPaths = discoverPackageJsonFiles(projectPath);
  if (packageJsonPaths.length === 0) {
    throw new Error(`No package.json found under ${projectPath}`);
  }

  const packages = packageJsonPaths.map((packageJsonPath) => analyzePackageDependencies(projectPath, packageJsonPath));
  const aggregateSummary = summarizePackages(packages);
  const primaryPackage = packages[0];

  return {
    projectPath,
    packageDiscovery: {
      rootPath: projectPath,
      packageJsonCount: packages.length,
      packageJsonPaths: packages.map((pkg) => pkg.packageJsonPath),
    },
    packages,
    packageName: primaryPackage?.packageName ?? null,
    packageVersion: primaryPackage?.packageVersion ?? null,
    packageManager: primaryPackage?.packageManager ?? 'unknown',
    summary: packages.length === 1 ? primaryPackage.summary : aggregateSummary,
    directDependencies: packages.length === 1 ? primaryPackage.directDependencies : packages.flatMap((pkg) => pkg.directDependencies.map((dep) => ({ ...dep, packageName: pkg.packageName, packageRelativePath: pkg.relativePath }))),
  };
}

function analyzePackageDependencies(rootPath, packageJsonPath) {
  const packageDirectory = dirname(packageJsonPath);
  const packageJson = readPackageJsonFile(packageJsonPath);
  const directDependencies = collectDirectDependencies(packageJson);
  const lockfile = findNearestLockfile(packageDirectory, rootPath);
  const lockReader = lockfile ? readSupportedLockfile(lockfile) : null;

  const enriched = directDependencies.map((dependency) => enrichDependency(dependency, lockfile, lockReader));

  return {
    rootPath,
    packageJsonPath,
    packageDirectory,
    relativePath: toRelativePackagePath(rootPath, packageJsonPath),
    packageName: packageJson.name ?? null,
    packageVersion: packageJson.version ?? null,
    packageManager: lockfile?.packageManager ?? 'unknown',
    lockfilePath: lockfile?.path ?? null,
    lockfileSupported: Boolean(lockReader),
    summary: summarizeDependencies(enriched),
    directDependencies: enriched,
  };
}

function readSupportedLockfile(lockfile) {
  if (lockfile.packageManager === 'yarn-v1') return { type: 'yarn-v1', data: readYarnLockFile(lockfile.path) };
  if (lockfile.packageManager === 'npm' || lockfile.packageManager === 'npm-shrinkwrap') return { type: 'npm', data: readPackageLock(lockfile.path) };
  return null;
}

function enrichDependency(dependency, lockfile, lockReader) {
  if (!lockReader) {
    return {
      ...dependency,
      lockSelector: lockfile ? `${dependency.name}@${dependency.declaredRange}` : null,
      resolvedVersion: null,
      resolvedUrl: null,
      installedVersions: [],
      hasMultipleInstalledVersions: false,
      resolutionSource: lockfile ? `${lockfile.packageManager}:detected-unsupported` : 'none',
    };
  }

  if (lockReader.type === 'yarn-v1') {
    const lockSelector = `${dependency.name}@${dependency.declaredRange}`;
    const lockEntry = lockReader.data.entriesBySelector.get(lockSelector) ?? null;
    const installedVersions = Array.from(lockReader.data.versionsByPackageName.get(dependency.name) ?? []).sort(compareVersionText);
    return {
      ...dependency,
      lockSelector,
      resolvedVersion: lockEntry?.version ?? null,
      resolvedUrl: lockEntry?.resolved ?? null,
      installedVersions,
      hasMultipleInstalledVersions: installedVersions.length > 1,
      resolutionSource: 'yarn.lock',
    };
  }

  const lockEntry = lockReader.data.entriesByPackageName.get(dependency.name) ?? null;
  const installedVersions = Array.from(lockReader.data.versionsByPackageName.get(dependency.name) ?? []).sort(compareVersionText);
  return {
    ...dependency,
    lockSelector: dependency.name,
    resolvedVersion: lockEntry?.version ?? null,
    resolvedUrl: lockEntry?.resolved ?? null,
    installedVersions,
    hasMultipleInstalledVersions: installedVersions.length > 1,
    resolutionSource: 'package-lock.json',
  };
}

function summarizeDependencies(dependencies) {
  return {
    directTotal: dependencies.length,
    dependencies: dependencies.filter((dep) => dep.dependencyType === 'dependencies').length,
    devDependencies: dependencies.filter((dep) => dep.dependencyType === 'devDependencies').length,
    resolvedDirect: dependencies.filter((dep) => dep.resolvedVersion).length,
    unresolvedDirect: dependencies.filter((dep) => !dep.resolvedVersion).length,
    urlDependencies: dependencies.filter((dep) => dep.isUrlDependency).length,
    packagesWithMultipleVersions: dependencies.filter((dep) => dep.hasMultipleInstalledVersions).length,
  };
}

function summarizePackages(packages) {
  return packages.reduce((summary, pkg) => {
    summary.packageJsonCount += 1;
    summary.directTotal += pkg.summary.directTotal;
    summary.dependencies += pkg.summary.dependencies;
    summary.devDependencies += pkg.summary.devDependencies;
    summary.resolvedDirect += pkg.summary.resolvedDirect;
    summary.unresolvedDirect += pkg.summary.unresolvedDirect;
    summary.urlDependencies += pkg.summary.urlDependencies;
    summary.packagesWithMultipleVersions += pkg.summary.packagesWithMultipleVersions;
    return summary;
  }, {
    packageJsonCount: 0,
    directTotal: 0,
    dependencies: 0,
    devDependencies: 0,
    resolvedDirect: 0,
    unresolvedDirect: 0,
    urlDependencies: 0,
    packagesWithMultipleVersions: 0,
  });
}

function compareVersionText(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}
