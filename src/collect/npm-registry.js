/**
 * npm registry reads: repository slug and the version list a collector is
 * asked to cover.
 *
 * The registry is the coverage denominator. Measuring coverage against the
 * atom feed itself would always report 100% — the feed cannot report a
 * version it never carried.
 *
 * `registry.npmjs.org` is unrelated to the GitHub API quota.
 */

const REGISTRY_BASE_URL = 'https://registry.npmjs.org';
const USER_AGENT = 'lib-impact-analyzer-pilot';

export async function fetchPackageMetadata(packageName, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = `${REGISTRY_BASE_URL}/${encodeRegistryName(packageName)}`;
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/json',
      'user-agent': options.userAgent ?? USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`npm registry request failed for ${packageName}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Repository slug, keeping dots in the repo name.
 *
 * Only an exact `.git` suffix is stripped. Splitting on the first dot turns
 * `chartjs/Chart.js` into `chartjs/Chart`, whose atom feed 404s — that single
 * bug misclassified `chart.js`, `bignumber.js` and `html2pdf.js` as
 * uncollectable during the survey.
 */
export function normalizeRepositorySlug(input) {
  let text = String(input ?? '').trim();
  if (!text) throw new Error('repository is required (owner/repo)');

  text = text
    .replace(/^git\+/i, '')
    .replace(/^git:\/\//i, 'https://')
    .replace(/^ssh:\/\//i, '')
    .replace(/^github:/i, '')
    .replace(/^git@github\.com[:/]/i, '')
    // Userinfo (`git@`) shows up in npm repository URLs, e.g. html2pdf.js
    // publishes `git+https://git@github.com/...` — without stripping it the
    // prefix never matches and the slug keeps `git@github.com` as its owner.
    .replace(/^https?:\/\/(?:[^/@]+@)?(?:www\.)?github\.com\//i, '')
    .replace(/^#.*$/, '')
    .split('#')[0];

  const segments = text.split('/').filter(Boolean);
  if (segments.length < 2) throw new Error(`cannot read owner/repo from repository: ${input}`);

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, '');
  if (!owner || !repo) throw new Error(`cannot read owner/repo from repository: ${input}`);
  return `${owner}/${repo}`;
}

export function resolveRepositorySlug(metadata) {
  const candidates = [
    metadata?.repository?.url,
    typeof metadata?.repository === 'string' ? metadata.repository : null,
    metadata?.homepage,
    metadata?.bugs?.url,
  ];

  for (const candidate of candidates) {
    if (!candidate || !/github\.com|^[\w.-]+\/[\w.-]+$/i.test(String(candidate))) continue;
    try {
      return normalizeRepositorySlug(candidate);
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Subdirectory the package lives in, when the registry states one.
 *
 * A monorepo tag range covers every package in the repository, so without
 * this a sibling package's commits are read as this package's changes —
 * measured at 10% of vite's items. Returns null when unstated: guessing a
 * path would drop real changes for every repository that does not match the
 * guess, which is worse than including a few foreign ones.
 */
export function resolveRepositoryDirectory(metadata) {
  const directory = metadata?.repository?.directory;
  if (typeof directory !== 'string') return null;
  const cleaned = directory.trim().replace(/^\.\//, '').replace(/^\/+|\/+$/g, '');
  // Anything that could escape the repository root is not a package path.
  if (!cleaned || cleaned.includes('..')) return null;
  return cleaned;
}

/**
 * Plain `x.y.z` versions in ascending order.
 *
 * Prereleases and nightlies are excluded: `typescript` publishes 3,788
 * versions, most of them `-dev.*` builds that carry no release note.
 */
export function selectStableVersions(metadata) {
  return Object.keys(metadata?.versions ?? {})
    .filter((version) => /^\d+\.\d+\.\d+$/.test(version))
    .sort(compareVersions);
}

/**
 * Grading window: the most recent N stable releases, not a calendar range.
 *
 * Release cadence differs by orders of magnitude across libraries (9 per
 * month to none in 8 years), so a 6-month window leaves low-activity
 * packages unjudgeable — `unplugin-auto-import` had 0 releases in the survey
 * window while sitting 21 majors behind.
 */
export function selectRecentStableVersions(metadata, count = 5) {
  const versions = selectStableVersions(metadata);
  return count > 0 ? versions.slice(-count) : versions;
}

/**
 * Versions actually worth reading: strictly above the installed version.
 *
 * Backports inflate raw counts without adding anything to read — `qs`
 * published 30 releases in two days by applying one patch to every
 * maintenance branch from 6.0.5 to 6.13.3.
 */
export function selectVersionsAheadOf(metadata, installedVersion, options = {}) {
  const toVersion = options.toVersion ?? null;
  return selectStableVersions(metadata).filter((version) => {
    if (compareVersions(version, installedVersion) <= 0) return false;
    return !toVersion || compareVersions(version, toVersion) <= 0;
  });
}

export function readPublishedAt(metadata, version) {
  return metadata?.time?.[version] ?? null;
}

/** Full `(major, minor, patch)` comparison — never a single position. */
export function compareVersions(a, b) {
  const left = splitVersion(a);
  const right = splitVersion(b);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] > right[index]) return 1;
    if (left[index] < right[index]) return -1;
  }
  return 0;
}

function splitVersion(version) {
  return String(version ?? '').split('-')[0].split('.').map((part) => Number(part) || 0);
}

function encodeRegistryName(packageName) {
  const name = String(packageName ?? '').trim();
  if (!name) throw new Error('packageName is required');
  return name.startsWith('@') ? name.replace('/', '%2f') : name;
}
