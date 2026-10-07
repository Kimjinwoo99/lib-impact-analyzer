export const CHANGE_CATEGORY_PRIORITY = [
  'BREAKING',
  'BUG_FIX',
  'REVERT',
  'FEATURE',
  'LABS',
  'REFACTOR',
  'RELEASE_NOTE',
  'PERFORMANCE',
  'OTHER',
];

const CATEGORY_RANK = new Map(CHANGE_CATEGORY_PRIORITY.map((category, index) => [category, index]));

export function selectReleasesInUpgradeRange(releases, currentVersion, targetVersion) {
  return releases
    .filter((release) => isPlainSemver(release.version))
    .filter((release) => compareSemver(release.version, currentVersion) > 0 && compareSemver(release.version, targetVersion) <= 0)
    .sort((a, b) => compareSemver(a.version, b.version));
}

export function selectReleaseForCurrentVersion(releases, currentVersion) {
  return releases.find((release) => release.version === currentVersion) ?? null;
}

/**
 * Later patch releases in the same major.minor line, ascending.
 *
 * A defect present in 3.6.10 is never described by 3.6.10's own release note —
 * that note lists what 3.6.10 fixed, i.e. defects of 3.6.9. What is still
 * broken in 3.6.10 is described by whichever later release fixed it. So a
 * healthcheck has to read forward, not at the current release.
 *
 * The line is capped at the same minor because that is the remediation the
 * team can actually apply without a minor upgrade decision. Fixes that landed
 * only in a later minor and were never backported are NOT visible here.
 */
export function selectLaterPatchesInLine(releases, currentVersion) {
  const [major, minor] = String(currentVersion).split('.');
  return releases
    .filter((release) => isPlainSemver(release.version))
    .filter((release) => {
      const parts = release.version.split('.');
      return parts[0] === major && parts[1] === minor;
    })
    .filter((release) => compareSemver(release.version, currentVersion) > 0)
    .sort((a, b) => compareSemver(a.version, b.version));
}

export function buildChangelogParseResult({ packageName, currentVersion, targetVersion = null, releases }) {
  if (!targetVersion) {
    const currentRelease = selectReleaseForCurrentVersion(releases, currentVersion);
    const laterPatches = selectLaterPatchesInLine(releases, currentVersion);
    const latestPatch = laterPatches.length ? laterPatches[laterPatches.length - 1].version : null;

    // Current release first for context, then later patches newest-first —
    // the newest fix is the one most likely to matter.
    const orderedReleases = [
      currentRelease ? normalizeRelease(currentRelease, { versionRole: 'CURRENT' }) : null,
      ...[...laterPatches]
        .sort((a, b) => compareSemver(b.version, a.version))
        .map((release) => normalizeRelease(release, { versionRole: 'PATCH_AHEAD' })),
    ]
      .filter(Boolean)
      .map(sortReleaseItems);

    const items = orderedReleases.flatMap((release) => release.items);
    const [major, minor] = String(currentVersion).split('.');

    return {
      packageName,
      mode: 'CURRENT_VERSION_HEALTHCHECK',
      currentVersion,
      targetVersion: null,
      sortPolicy: buildSortPolicy(),
      range: {
        policy: 'current release for context, plus later patches in the same minor line',
        minorLine: `${major}.${minor}`,
        fromExclusive: currentVersion,
        toInclusive: latestPatch,
        latestPatchInLine: latestPatch,
        patchesAhead: laterPatches.length,
        displayOrder: 'current, then later patches descending',
        limitation:
          '같은 minor 라인만 확인합니다. 이후 minor에서만 고쳐지고 지금 쓰는 라인으로는 수정판이 나오지 않은 결함은 포함되지 않습니다.',
      },
      releaseCount: orderedReleases.length,
      patchesAhead: laterPatches.length,
      latestPatchInLine: latestPatch,
      changeItemCount: items.length,
      releases: orderedReleases,
      items,
    };
  }

  const currentRelease = selectReleaseForCurrentVersion(releases, currentVersion);
  const selectedUpgradeReleases = selectReleasesInUpgradeRange(releases, currentVersion, targetVersion);
  const targetRelease = selectedUpgradeReleases.find((release) => release.version === targetVersion) ?? null;
  const intermediateReleases = selectedUpgradeReleases
    .filter((release) => release.version !== targetVersion)
    .sort((a, b) => compareSemver(b.version, a.version));

  const orderedReleases = [
    currentRelease ? normalizeRelease(currentRelease, { versionRole: 'CURRENT' }) : null,
    targetRelease ? normalizeRelease(targetRelease, { versionRole: 'TARGET' }) : null,
    ...intermediateReleases.map((release) => normalizeRelease(release, { versionRole: 'INTERMEDIATE' })),
  ].filter(Boolean).map(sortReleaseItems);

  const items = orderedReleases.flatMap((release) => release.items);
  return {
    packageName,
    mode: 'UPGRADE_IMPACT',
    currentVersion,
    targetVersion,
    sortPolicy: buildSortPolicy(),
    range: {
      currentContextIncluded: true,
      fromExclusive: currentVersion,
      toInclusive: targetVersion,
      displayOrder: 'current, target, then intermediate versions descending',
    },
    releaseCount: orderedReleases.length,
    upgradeReleaseCount: selectedUpgradeReleases.length,
    changeItemCount: items.length,
    releases: orderedReleases,
    items,
  };
}

export function normalizeRelease(release, options = {}) {
  const versionRole = options.versionRole ?? null;
  return {
    version: release.version,
    versionRole,
    tagName: release.tagName ?? null,
    name: release.name ?? release.releaseName ?? null,
    publishedAt: release.publishedAt ?? null,
    sourceUrl: release.sourceUrl ?? null,
    sections: (release.sections ?? []).map((section) => ({
      title: normalizeSectionTitle(section.title),
      items: (section.items ?? []).map((rawText, index) => parseChangeItem({ release, sectionTitle: section.title, rawText, index, versionRole })),
    })),
    items: (release.items?.length ? release.items : flattenSectionItems(release)).map((item, index) => normalizeChangeItem(item, release, index, versionRole)),
  };
}

export function parseChangeItem({ release, sectionTitle, rawText, index, versionRole = null }) {
  const text = cleanupText(rawText);
  const scoped = text.match(/^\*\*(.+?):\*\*\s*(.+)$/);
  const scope = scoped ? cleanupText(scoped[1]) : null;
  const summaryWithLinks = scoped ? scoped[2] : text;
  const summary = cleanupText(stripMarkdownLinks(summaryWithLinks));
  const category = categorizeSection(sectionTitle);

  return {
    itemId: `${release.tagName ?? release.version}:${slug(sectionTitle)}:${index + 1}`,
    version: release.version,
    versionRole,
    tagName: release.tagName ?? null,
    publishedAt: release.publishedAt ?? null,
    sectionTitle: normalizeSectionTitle(sectionTitle),
    category,
    categoryPriority: getCategoryPriority(category),
    scope,
    summary,
    rawText: text,
    prNumbers: extractIssueRefs(text, 'issues'),
    issueNumbers: extractIssueRefsFromCloses(text),
    commitHashes: extractCommitHashes(text),
    sourceUrl: release.sourceUrl ?? null,
  };
}

export function compareSemver(a, b) {
  const left = splitSemver(a);
  const right = splitSemver(b);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] > right[i]) return 1;
    if (left[i] < right[i]) return -1;
  }
  return 0;
}

function buildSortPolicy() {
  return {
    versionOrder: ['CURRENT', 'TARGET', 'INTERMEDIATE_DESC'],
    categoryOrder: CHANGE_CATEGORY_PRIORITY,
    otherPolicy: 'parser uncertainty; preserve rawText and pass to Agent for reclassification',
  };
}

function sortReleaseItems(release) {
  return {
    ...release,
    items: [...release.items].sort((a, b) => getCategoryPriority(a.category) - getCategoryPriority(b.category)),
  };
}

function getCategoryPriority(category) {
  return CATEGORY_RANK.get(category) ?? CATEGORY_RANK.get('OTHER');
}

function normalizeChangeItem(item, release, index, versionRole) {
  if (item.rawText) {
    return parseChangeItem({ release, sectionTitle: item.sectionTitle ?? 'Release Notes', rawText: item.rawText, index, versionRole });
  }
  return parseChangeItem({ release, sectionTitle: item.sectionTitle ?? 'Release Notes', rawText: String(item), index, versionRole });
}

function flattenSectionItems(release) {
  return (release.sections ?? []).flatMap((section) => (section.items ?? []).map((rawText) => ({
    sectionTitle: section.title,
    rawText,
  })));
}

function normalizeSectionTitle(title) {
  return cleanupText(String(title || 'Release Notes')).replace(/^:[^:]+:\s*/, '');
}

function categorizeSection(title) {
  const normalized = normalizeSectionTitle(title).toLowerCase();
  if (normalized.includes('breaking')) return 'BREAKING';
  if (normalized.includes('feature')) return 'FEATURE';
  if (normalized.includes('bug')) return 'BUG_FIX';
  if (normalized.includes('lab')) return 'LABS';
  if (normalized.includes('refactor')) return 'REFACTOR';
  if (normalized.includes('revert')) return 'REVERT';
  if (normalized.includes('performance')) return 'PERFORMANCE';
  if (normalized.includes('release notes')) return 'RELEASE_NOTE';
  return 'OTHER';
}

function extractIssueRefs(text) {
  return Array.from(text.matchAll(/github\.com\/[^/]+\/[^/]+\/issues\/(\d+)/g), (match) => Number(match[1]));
}

function extractIssueRefsFromCloses(text) {
  return Array.from(text.matchAll(/closes\s+(.+)$/gi))
    .flatMap((match) => Array.from(match[1].matchAll(/#(\d+)/g), (issue) => Number(issue[1])));
}

function extractCommitHashes(text) {
  return Array.from(text.matchAll(/github\.com\/[^/]+\/[^/]+\/commit\/([a-f0-9]{7,40})/gi), (match) => match[1]);
}

function stripMarkdownLinks(text) {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/\s+,\s+closes\s+.*$/i, '')
    .replace(/\s*\([a-f0-9]{7,40}\)\s*$/i, '');
}

function cleanupText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function splitSemver(version) {
  return String(version || '').split('-')[0].split('.').map((part) => Number(part) || 0);
}

function isPlainSemver(version) {
  return /^\d+\.\d+\.\d+$/.test(String(version || ''));
}

function slug(text) {
  return String(text || 'section')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}
