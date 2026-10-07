/**
 * Companion audit — registry facts about the packages that work WITH the
 * analyzed one, including the ones the peer audit must stay silent about.
 *
 * The peer audit answers "whose peer declaration rejects the target" — and
 * only that, because absence of a constraint is not a constraint. But an
 * upgrade plan needs the rest of the companion story too. Measured on the
 * vite 5→8 golden run: of the seven plugins in vite.config.js, peer evidence
 * covered two (plugin-vue 6.0.3+, layouts DEAD_END). The other five declare
 * no vite peer at all, so the judgment could only say "확보하라" with no
 * versions — the sentence's resolution was exactly the evidence's resolution.
 *
 * What the registry DOES know about a peer-silent companion:
 *   latest version + publish date   unplugin-auto-import: installed 0.17.6,
 *                                   latest 21.1.0 (2026-08) — 21 majors behind
 *   dormancy                        vite-plugin-remove-console: latest IS the
 *                                   installed 2.2.0, published 2023-12 — a
 *                                   plugin that stopped moving is replacement
 *                                   territory, not upgrade territory
 *
 * DISCOVERY IS CONVENTION, NOT A HARDCODE (골든 문서의 하드코딩 금지 조항).
 * A package is a companion of X when any of three generic rules holds:
 *   PEER_HISTORY      some published version declares a peer on X — pure
 *                     registry, catches pinia/vue-router/vuetify for `vue`
 *   CONFIG_REFERENCE  it is referenced in X's own config file ({X}.config.*,
 *                     .{X}rc*) — catches the unplugin trio for `vite`, and
 *                     string-registered plugins (.babelrc style) the same way
 *   NAME_MENTION      a name segment starts with X — vite-plugin-vuetify for
 *                     `vuetify`; segment-based so `vuetify` is not a hit for
 *                     `vue` by substring accident (peer history catches it)
 * For a package with no companion ecosystem (axios, lodash) all three rules
 * come up empty and the audit is silently empty — same "irrelevance is
 * silence" behavior as the peer audit.
 */

import { compareVersions, satisfiesRange } from './peer-audit.js';

const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000;

/** No release for two years — stagnation, not stability, for build tooling. */
const DORMANT_MONTHS = 24;

/**
 * Which of the project's config files belong to the analyzed tool. Operates
 * on paths, pure — the caller reads the survivors' text.
 */
export function selectToolConfigFiles(files, packageName) {
  const name = escapeRegex(String(packageName ?? ''));
  const pattern = new RegExp(`^(?:${name}\\.config\\.[^/]+|\\.${name}rc(?:\\..+)?)$`, 'i');
  // 구분자는 양쪽 다 자른다 — Windows 절대경로('C:\\...\\vite.config.js')에서
  // '/'만 자르면 경로 전체가 "파일명"이 되어 어떤 설정 파일도 매칭되지 않고,
  // CONFIG_REFERENCE 발견(unplugin류의 유일한 경로)이 조용히 전멸한다.
  // 2026-08-20 Round 13 재실행에서 chain:unplugin-* 3건이 사라진 원인.
  return (files ?? []).filter((file) => pattern.test(String(file).split(/[\\/]/).pop()));
}

function nameMentions(dependencyName, packageName) {
  return String(dependencyName)
    .replace(/^@/, '')
    .split(/[/\-_.]/)
    .some((segment) => segment.toLowerCase().startsWith(String(packageName).toLowerCase()));
}

/**
 * Packages a config file actually LOADS — not every name its text contains.
 *
 * Plain substring matching over-collected in two measured ways: `vuetify`
 * matched inside the specifier `vite-plugin-vuetify`, and auto-import's
 * preset list `imports: ['vue', 'pinia', 'vue-router']` — names of libraries
 * to generate imports FOR, not modules the build loads — flagged three
 * runtime libraries as vite companions. (vue-router as a vite companion is
 * the exact false-positive shape the peer-audit fix removed.)
 *
 * Two file shapes, one rule each:
 *   importing config (vite.config.js …)  the module specifiers of its
 *     import/require statements, reduced to package names
 *   rc file (.babelrc …, no imports)     quoted strings that ARE a package
 *     name — string registration is the loading mechanism there
 */
function referencedPackages(configText) {
  const text = String(configText ?? '');
  const specifiers = [
    ...text.matchAll(/(?:from\s*|import\s*\(\s*|require\s*\(\s*)["']([^"']+)["']/g),
    ...text.matchAll(/import\s+["']([^"']+)["']/g),
  ].map((match) => match[1]);

  if (specifiers.length) return new Set(specifiers.map(packageOfSpecifier));

  // No imports — an rc file. Every quoted string is a candidate name; the
  // caller intersects with the installed dependency list, so junk is inert.
  return new Set([...text.matchAll(/["']([^"']+)["']/g)].map((match) => packageOfSpecifier(match[1])));
}

/** `unplugin-auto-import/vite` → `unplugin-auto-import`; scopes keep both segments. */
function packageOfSpecifier(specifier) {
  const parts = String(specifier).split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function isStableVersion(version) {
  return /^\d+\.\d+\.\d+$/.test(version);
}

function latestStableOf(metadata) {
  const tagged = metadata?.['dist-tags']?.latest ?? null;
  if (tagged && isStableVersion(tagged)) return tagged;
  const stable = Object.keys(metadata?.versions ?? {}).filter(isStableVersion).sort(compareVersions);
  return stable[stable.length - 1] ?? tagged;
}

/**
 * @param options.packageName    the analyzed package
 * @param options.targetVersion  upgrade destination (peer facts are computed
 *                               against it, same as the peer audit)
 * @param options.dependencies   [{ name, version }] — the project's other deps
 * @param options.configTexts    contents of the tool's own config files, from
 *                               `selectToolConfigFiles` (empty array is fine)
 * @param options.loadMetadata   (name) => registry document (process cache —
 *                               the probe already paid for these)
 * @param options.now            injection point for tests; defaults to today
 */
export async function auditCompanions({ packageName, targetVersion, dependencies, configTexts = [], loadMetadata, now = Date.now() }) {
  const configReferenced = new Set(configTexts.flatMap((text) => [...referencedPackages(text)]));
  const rows = [];

  for (const dependency of dependencies ?? []) {
    if (!dependency?.name || dependency.name === packageName) continue;

    let metadata;
    try {
      metadata = await loadMetadata(dependency.name);
    } catch {
      // Not on the registry (CDN installs) — no facts to report.
      continue;
    }
    const versions = metadata?.versions ?? {};

    const discoveredBy = [];
    if (Object.values(versions).some((entry) => entry?.peerDependencies?.[packageName])) {
      discoveredBy.push('PEER_HISTORY');
    }
    if (configReferenced.has(dependency.name)) discoveredBy.push('CONFIG_REFERENCE');
    if (nameMentions(dependency.name, packageName)) discoveredBy.push('NAME_MENTION');
    if (!discoveredBy.length) continue;

    const installedPeerRange = versions[dependency.version]?.peerDependencies?.[packageName] ?? null;
    const latestVersion = latestStableOf(metadata);
    const latestPublishedAt = metadata?.time?.[latestVersion] ?? null;
    const dormantMonths = latestPublishedAt
      ? Math.floor((now - Date.parse(latestPublishedAt)) / MS_PER_MONTH)
      : null;

    /*
     * Peer verdict mirrors the peer audit for declared installs and stays
     * null for silent ones — null is the row this audit exists for, and the
     * L6 payload sends ONLY those (declared rows already travel as
     * peerAudit.blocked; saying it twice invites double chain units).
     */
    let peerVerdict = null;
    let firstCompatible = null;
    if (installedPeerRange !== null && targetVersion) {
      const compatible = Object.keys(versions)
        .filter((version) => versions[version]?.peerDependencies?.[packageName])
        .filter(isStableVersion)
        .filter((version) => satisfiesRange(targetVersion, versions[version].peerDependencies[packageName]))
        .sort(compareVersions);
      firstCompatible = compatible[0] ?? null;
      peerVerdict = satisfiesRange(targetVersion, installedPeerRange)
        ? 'OK'
        : compatible.length ? 'UPGRADE_REQUIRED' : 'DEAD_END';
    }

    rows.push({
      name: dependency.name,
      installedVersion: dependency.version,
      discoveredBy,
      latestVersion,
      latestPublishedAt,
      majorsBehind: majorsBetween(dependency.version, latestVersion),
      dormantMonths,
      dormant: dormantMonths !== null && dormantMonths >= DORMANT_MONTHS,
      installedPeerRange,
      peerVerdict,
      firstCompatible,
    });
  }

  // The rows needing a decision first: dormant, then furthest behind.
  rows.sort(
    (a, b) =>
      Number(b.dormant) - Number(a.dormant) ||
      (b.majorsBehind ?? 0) - (a.majorsBehind ?? 0) ||
      a.name.localeCompare(b.name),
  );
  return { packageName, targetVersion: targetVersion ?? null, rows };
}

function majorsBetween(installedVersion, latestVersion) {
  const installed = parseInt(String(installedVersion), 10);
  const latest = parseInt(String(latestVersion), 10);
  if (!Number.isFinite(installed) || !Number.isFinite(latest)) return null;
  return Math.max(0, latest - installed);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
