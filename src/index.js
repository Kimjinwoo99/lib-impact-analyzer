import { resolve } from 'node:path';
import { analyzeDependencies } from './resolver/dependency-resolver.js';

function printUsage() {
  console.error('Usage: node src/index.js <projectPath> [--json]');
}

function printTextReport(result) {
  console.log(`Project root: ${result.projectPath}`);
  console.log(`package.json found: ${result.packageDiscovery.packageJsonCount}`);
  console.log('');

  for (const pkg of result.packages) {
    console.log(`Package: ${pkg.packageName ?? '(unknown)'} (${pkg.relativePath})`);
    console.log(`Package manager: ${pkg.packageManager}${pkg.lockfileSupported ? '' : pkg.lockfilePath ? ' (detected, not parsed yet)' : ''}`);
    if (pkg.lockfilePath) console.log(`Lockfile: ${pkg.lockfilePath}`);
    console.log(`Direct dependencies: ${pkg.summary.directTotal} (${pkg.summary.dependencies} dependencies + ${pkg.summary.devDependencies} devDependencies)`);
    console.log(`Resolved from lockfile: ${pkg.summary.resolvedDirect}`);
    console.log(`URL dependencies: ${pkg.summary.urlDependencies}`);
    console.log(`Packages with multiple installed versions: ${pkg.summary.packagesWithMultipleVersions}`);
    console.log('');

    for (const dep of pkg.directDependencies) {
      const resolved = dep.resolvedVersion ?? 'UNRESOLVED';
      const flags = [];
      if (dep.isUrlDependency) flags.push('url');
      if (dep.installedVersions.length > 1) flags.push(`multi-version:${dep.installedVersions.join(',')}`);
      if (!dep.resolvedVersion && pkg.lockfilePath && !pkg.lockfileSupported) flags.push('lockfile-not-parsed');
      const suffix = flags.length ? ` [${flags.join('; ')}]` : '';
      console.log(`${dep.dependencyType.padEnd(16)} ${dep.name.padEnd(28)} ${dep.declaredRange.padEnd(32)} -> ${resolved}${suffix}`);
    }
    console.log('');
  }
}

const args = process.argv.slice(2);
const projectArg = args.find((arg) => !arg.startsWith('-'));
const asJson = args.includes('--json');

if (!projectArg) {
  printUsage();
  process.exitCode = 1;
} else {
  try {
    const result = analyzeDependencies(resolve(projectArg));
    if (asJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printTextReport(result);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
