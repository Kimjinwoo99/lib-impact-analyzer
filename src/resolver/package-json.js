import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function readPackageJson(projectPath) {
  return readPackageJsonFile(join(projectPath, 'package.json'));
}

export function readPackageJsonFile(packageJsonPath) {
  const raw = stripBom(readFileSync(packageJsonPath, 'utf8'));
  return JSON.parse(raw);
}

export function collectDirectDependencies(packageJson) {
  const dependencies = toDependencyRows(packageJson.dependencies, 'dependencies');
  const devDependencies = toDependencyRows(packageJson.devDependencies, 'devDependencies');
  return [...dependencies, ...devDependencies].sort((a, b) => a.name.localeCompare(b.name));
}

function toDependencyRows(record, dependencyType) {
  return Object.entries(record ?? {}).map(([name, declaredRange]) => ({
    name,
    declaredRange,
    dependencyType,
    isUrlDependency: isUrlSpecifier(declaredRange),
  }));
}

export function isUrlSpecifier(specifier) {
  return /^https?:\/\//i.test(specifier);
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
