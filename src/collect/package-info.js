/**
 * Per-library information card, from free sources only.
 *
 * The change-item chain answers "what changed between these versions". This
 * module answers everything else a person needs before deciding to touch a
 * dependency, none of which was collected before:
 *
 *   registry document   how far behind, publish dates, deprecation, license
 *                       and engines/peerDependencies requirement changes —
 *                       all read from the SAME metadata document the T1 probe
 *                       already fetches, so the marginal cost is zero requests
 *   OSV.dev             known vulnerabilities for the installed version.
 *                       Free, no key, one `querybatch` call for the whole
 *                       dependency list. This is the gap the README states as
 *                       "CVE 취약점 조회 없음" — release-note BUG_FIX entries
 *                       are defects, not advisories.
 *   api.npmjs.org       monthly downloads, an abandonment signal. Free.
 *
 * A package with no GitHub repository (realgrid) gets a full card too: the
 * registry and OSV know it even though no changelog path can read it.
 */

import { compareVersions, resolveRepositoryDirectory, resolveRepositorySlug, selectStableVersions } from './npm-registry.js';
import { describeVendorAdapter, hasVendorAdapter } from './vendor-adapter.js';

const OSV_QUERYBATCH_URL = 'https://api.osv.dev/v1/querybatch';
const OSV_VULN_URL = 'https://api.osv.dev/v1/vulns';
const DOWNLOADS_URL = 'https://api.npmjs.org/downloads/point/last-month';
const USER_AGENT = 'lib-impact-analyzer-pilot';

/** Version-position facts. Pure — reads the already-fetched registry document. */
export function buildVersionFacts(metadata, installedVersion) {
  const stable = selectStableVersions(metadata);
  const latest = metadata?.['dist-tags']?.latest ?? stable[stable.length - 1] ?? null;
  const ahead = stable.filter((version) => compareVersions(version, installedVersion) > 0);

  const [curMajor, curMinor, curPatch] = splitVersion(installedVersion);
  const [latMajor, latMinor, latPatch] = splitVersion(latest);

  return {
    latest,
    /*
     * False when the registry has never seen the installed version — xlsx is
     * installed from SheetJS's own CDN tarball at 0.20.x while npm stops at
     * 0.18.5. Every registry-derived fact below is then about a DIFFERENT
     * distribution channel than the one installed, and the card must say so
     * instead of reporting "ahead of latest" as if it meant up to date.
     */
    registryKnowsInstalled: Boolean(metadata?.versions?.[installedVersion]),
    installedPublishedAt: metadata?.time?.[installedVersion] ?? null,
    latestPublishedAt: latest ? metadata?.time?.[latest] ?? null : null,
    // When the package last published anything at all — the staleness signal
    // is about the maintainer, not about this project's version choice.
    lastPublishedAt: metadata?.time?.modified ?? null,
    behind: {
      // Semver distance reads how big the jump is; versionsAhead reads how
      // much there is to read. Both matter and neither substitutes the other.
      majors: Math.max(0, latMajor - curMajor),
      minors: latMajor === curMajor ? Math.max(0, latMinor - curMinor) : null,
      patches: latMajor === curMajor && latMinor === curMinor ? Math.max(0, latPatch - curPatch) : null,
      versionsAhead: ahead.length,
    },
    upToDate: latest ? compareVersions(installedVersion, latest) >= 0 : null,
  };
}

/**
 * 최근 N개월(기본 12) 월별 정식 릴리즈 건수.
 *
 * 이미 받아온 packument의 `time` 맵만 읽는 순수 함수다 — 추가 요청 0회.
 * 라이브러리마다 릴리즈 주기가 자릿수로 다르고(월 9회 ~ 8년 무발행), 그
 * 차이가 곧 "이 라이브러리를 얼마나 자주 들여다봐야 하는가"라서 취약점처럼
 * 있는 데만 있는 신호가 아니라 **모든 패키지에 똑같이 있는** 신호다.
 *
 * 프리릴리즈·나이틀리는 뺀다 — selectStableVersions와 같은 기준. typescript의
 * `-dev.*` 3천여 건이 섞이면 막대가 발행 활동이 아니라 CI 빈도가 된다.
 *
 * 버킷 경계는 UTC로 자른다. 로컬 타임존에 따라 월말 발행이 옆 달로 넘어가면
 * 같은 fixture를 재생해도 그림이 달라진다.
 */
const RELEASE_CADENCE_MONTHS = 12;

export function buildReleaseCadence(metadata, options = {}) {
  const windowMonths = options.months ?? RELEASE_CADENCE_MONTHS;
  const now = options.now ? new Date(options.now) : new Date();
  if (Number.isNaN(now.getTime())) return null;

  const buckets = [];
  const byMonth = new Map();
  for (let back = windowMonths - 1; back >= 0; back -= 1) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
    const month = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    const bucket = { month, count: 0 };
    byMonth.set(month, bucket);
    buckets.push(bucket);
  }

  const time = metadata?.time ?? {};
  let total = 0;
  let lastPublishedAt = null;
  let lastVersion = null;
  for (const version of selectStableVersions(metadata)) {
    const publishedAt = time[version];
    if (typeof publishedAt !== 'string') continue;
    // 발행 순서는 버전 순서와 다르다 — qs처럼 유지보수 브랜치에 백포트하면
    // 낮은 버전이 나중에 나온다. 그래서 최댓값으로 찾는다.
    if (!lastPublishedAt || publishedAt > lastPublishedAt) {
      lastPublishedAt = publishedAt;
      lastVersion = version;
    }
    const bucket = byMonth.get(publishedAt.slice(0, 7));
    if (bucket) {
      bucket.count += 1;
      total += 1;
    }
  }

  return {
    windowMonths,
    months: buckets,
    total,
    peak: buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0),
    quietMonths: buckets.filter((bucket) => bucket.count === 0).length,
    lastPublishedAt,
    lastVersion,
  };
}

/**
 * What upgrading would newly require, read from the version documents.
 *
 * The comparison target is the target version when one is chosen, otherwise
 * latest — the same default the analysis screens use.
 */
export function diffRequirements(metadata, installedVersion, targetVersion = null) {
  const installed = metadata?.versions?.[installedVersion] ?? null;
  const target = metadata?.versions?.[targetVersion ?? metadata?.['dist-tags']?.latest] ?? null;

  const installedPeers = installed?.peerDependencies ?? {};
  const targetPeers = target?.peerDependencies ?? {};
  const peerNames = new Set([...Object.keys(installedPeers), ...Object.keys(targetPeers)]);
  /*
   * `optional` comes from peerDependenciesMeta, and it decides whether a peer
   * the project does NOT have installed means anything. Vite declares a dozen
   * optional peers (less/stylus/sugarss/terser/@types/node …); a tightened
   * range on one you never installed forces no work, while a tightened or
   * newly added REQUIRED peer does — that is the difference L6's chain units
   * filter on (l6-prompt.js buildChainUnits). Reading it here keeps the
   * distinction with the registry fact it comes from. Target's declaration
   * wins; the installed version's is the fallback for removed peers.
   */
  const targetMeta = target?.peerDependenciesMeta ?? {};
  const installedMeta = installed?.peerDependenciesMeta ?? {};
  const isOptional = (name) => Boolean((targetMeta[name] ?? installedMeta[name])?.optional);

  const peerChanges = { added: [], removed: [], changed: [] };
  for (const name of peerNames) {
    const optional = isOptional(name);
    if (!(name in installedPeers)) peerChanges.added.push({ name, range: targetPeers[name], optional });
    else if (!(name in targetPeers)) peerChanges.removed.push({ name, range: installedPeers[name], optional });
    else if (installedPeers[name] !== targetPeers[name]) {
      peerChanges.changed.push({ name, from: installedPeers[name], to: targetPeers[name], optional });
    }
  }

  return {
    comparedTo: target?.version ?? null,
    // `deprecated` is a per-version string in the registry: the installed
    // version can be deprecated while latest is fine, and vice versa.
    deprecated: {
      installed: typeof installed?.deprecated === 'string' ? installed.deprecated : null,
      compared: typeof target?.deprecated === 'string' ? target.deprecated : null,
      // Every deprecated version, not just the two endpoints — the summary's
      // signal-path chart needs the escape point along an upgrade path (the
      // first non-deprecated version above the installed one), and the two
      // endpoints cannot answer that when the chosen target is not latest.
      versions: Object.entries(metadata?.versions ?? {})
        .filter(([, doc]) => typeof doc?.deprecated === 'string' && doc.deprecated)
        .map(([version]) => version),
    },
    license: {
      installed: installed?.license ?? metadata?.license ?? null,
      compared: target?.license ?? null,
      changed: Boolean(installed?.license && target?.license && installed.license !== target.license),
    },
    engines: {
      installed: installed?.engines?.node ?? null,
      compared: target?.engines?.node ?? null,
      changed: Boolean((installed?.engines?.node ?? null) !== (target?.engines?.node ?? null)),
    },
    peerDependencies: peerChanges,
  };
}

/**
 * One OSV request for the whole dependency list.
 *
 * `querybatch` returns vulnerability IDs per query, in query order. IDs only —
 * severity and fixed-in live in the per-vulnerability documents, fetched once
 * per unique ID afterwards.
 */
export async function queryOsvBatch(entries, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(OSV_QUERYBATCH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': options.userAgent ?? USER_AGENT },
    body: JSON.stringify({
      queries: entries.map((entry) => ({
        package: { ecosystem: 'npm', name: entry.packageName },
        version: entry.installedVersion,
      })),
    }),
  });
  if (!response.ok) throw new Error(`OSV querybatch failed: ${response.status} ${response.statusText}`);
  const body = await response.json();
  return entries.map((entry, index) => ({
    packageName: entry.packageName,
    installedVersion: entry.installedVersion,
    vulnIds: (body?.results?.[index]?.vulns ?? []).map((vuln) => vuln.id),
  }));
}

export async function fetchOsvVulnerability(id, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${OSV_VULN_URL}/${encodeURIComponent(id)}`, {
    headers: { accept: 'application/json', 'user-agent': options.userAgent ?? USER_AGENT },
  });
  if (!response.ok) throw new Error(`OSV vulnerability fetch failed for ${id}: ${response.status}`);
  return response.json();
}

/** The fields a person acts on, out of the (large) OSV document. */
export function summarizeOsvVulnerability(vuln, packageName, installedVersion = null) {
  const affected = (vuln?.affected ?? []).filter(
    (entry) => entry?.package?.ecosystem === 'npm' && entry?.package?.name === packageName,
  );
  const fixedIn = [
    ...new Set(
      affected.flatMap((entry) =>
        (entry.ranges ?? []).flatMap((range) => (range.events ?? []).map((event) => event.fixed).filter(Boolean)),
      ),
    ),
  ].sort(compareVersions);

  /*
   * The cheapest remediation must be relative to what is installed. An
   * advisory that hits both the 0.x and 1.x lines lists a fix per line, and
   * the lowest overall (0.30.3) is BELOW an installed 1.13.1 — not an upgrade
   * anyone can perform. Measured on axios: 24 of 30 findings named a 0.x
   * release as "first fixed" until this filtered by the installed version.
   * No fix above the installed version means no remediation exists yet.
   */
  const applicable = installedVersion
    ? fixedIn.filter((version) => compareVersions(version, installedVersion) > 0)
    : fixedIn;

  return {
    id: vuln?.id ?? null,
    // The CVE number people cross-reference; GHSA ids double as the URL slug.
    aliases: vuln?.aliases ?? [],
    summary: vuln?.summary ?? null,
    severity: vuln?.database_specific?.severity ?? vuln?.severity?.[0]?.score ?? null,
    fixedIn,
    firstFixed: applicable[0] ?? null,
    published: vuln?.published ?? null,
    url: vuln?.id ? `https://osv.dev/vulnerability/${vuln.id}` : null,
  };
}

export async function fetchMonthlyDownloads(packageName, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${DOWNLOADS_URL}/${encodeURIComponent(packageName).replace('%2F', '/')}`, {
    headers: { accept: 'application/json', 'user-agent': options.userAgent ?? USER_AGENT },
  });
  if (!response.ok) throw new Error(`downloads fetch failed for ${packageName}: ${response.status}`);
  const body = await response.json();
  return typeof body?.downloads === 'number' ? body.downloads : null;
}

/**
 * Cards for a whole dependency list.
 *
 * `loadMetadata` is injected so the server's per-process registry cache is
 * reused — the probe endpoint has usually fetched these documents already and
 * this call then costs one OSV batch, one OSV document per unique finding,
 * and one downloads request per package.
 *
 * Failures degrade per field, never per batch: a package whose downloads
 * lookup fails still carries its registry facts and vulnerability answer.
 */
export async function collectPackageInfoBatch(entries, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const loadMetadata = options.loadMetadata;
  if (typeof loadMetadata !== 'function') throw new Error('loadMetadata is required');
  const concurrency = options.concurrency ?? 8;
  const collectedAt = options.collectedAt ?? new Date().toISOString();

  const cards = new Map();
  await runPool(entries, concurrency, async (entry) => {
    const card = {
      packageName: entry.packageName,
      installedVersion: entry.installedVersion,
      targetVersion: entry.targetVersion ?? null,
      collectedAt,
      registry: null,
      requirements: null,
      releaseCadence: null,
      repository: null,
      repositoryDirectory: null,
      adapterRequired: null,
      vendorAdapter: null,
      downloads: { lastMonth: null, error: null },
      vulnerabilities: { source: 'OSV.dev', ok: false, count: 0, items: [], error: null },
      error: null,
    };
    cards.set(entry.packageName, card);

    try {
      const metadata = await loadMetadata(entry.packageName);
      card.registry = buildVersionFacts(metadata, entry.installedVersion);
      card.requirements = diffRequirements(metadata, entry.installedVersion, entry.targetVersion ?? null);
      // 카드의 수집 시각을 기준으로 자른다 — 같은 카드 안의 다른 사실들과
      // 시점이 어긋나지 않고, 재생(replay)에서도 그림이 카드와 함께 움직인다.
      card.releaseCadence = buildReleaseCadence(metadata, { now: collectedAt });
      card.repository = resolveRepositorySlug(metadata);
      card.repositoryDirectory = resolveRepositoryDirectory(metadata);
      // 저장소가 없어도 등재된 벤더 문서 어댑터가 있으면 수집 경로가 있다.
      card.adapterRequired = !card.repository && !hasVendorAdapter(entry.packageName);
      card.vendorAdapter = describeVendorAdapter(entry.packageName);
    } catch (error) {
      card.error = error instanceof Error ? error.message : String(error);
    }

    if (options.downloads !== false) {
      try {
        card.downloads.lastMonth = await fetchMonthlyDownloads(entry.packageName, { fetchImpl });
      } catch (error) {
        card.downloads.error = error instanceof Error ? error.message : String(error);
      }
    }
  });

  // One vulnerability request for everything, then one document per unique id.
  try {
    const batch = await queryOsvBatch(entries, { fetchImpl });
    const uniqueIds = [...new Set(batch.flatMap((entry) => entry.vulnIds))];
    const documents = new Map();
    await runPool(uniqueIds, concurrency, async (id) => {
      try {
        documents.set(id, await fetchOsvVulnerability(id, { fetchImpl }));
      } catch {
        documents.set(id, null);
      }
    });

    for (const entry of batch) {
      const card = cards.get(entry.packageName);
      if (!card) continue;
      card.vulnerabilities.ok = true;
      card.vulnerabilities.count = entry.vulnIds.length;
      /*
       * OSV is asked about the npm ecosystem, but a CDN-tarball install
       * (xlsx) is a different distribution channel: npm's advisory range
       * stays open because the fix never shipped TO NPM, while the installed
       * channel may have shipped it long ago. Measured on xlsx 0.20.3 — OSV
       * reports two HIGHs whose fixes (0.19.3 / 0.20.2) exist upstream but
       * not on npm. The findings are kept (they MAY apply) with the caveat
       * attached, because both asserting and suppressing would be wrong.
       */
      if (card.registry && card.registry.registryKnowsInstalled === false) {
        card.vulnerabilities.caveat =
          '설치 버전이 npm 레지스트리에 없는 배포 채널입니다. OSV의 npm 생태계 판정이 이 설치본에 그대로 적용되지 않을 수 있습니다.';
      }
      card.vulnerabilities.items = entry.vulnIds.map((id) => {
        const document = documents.get(id);
        return document
          ? summarizeOsvVulnerability(document, entry.packageName, entry.installedVersion)
          : { id, aliases: [], summary: null, severity: null, fixedIn: [], firstFixed: null, published: null, url: `https://osv.dev/vulnerability/${id}` };
      });
    }
  } catch (error) {
    for (const card of cards.values()) {
      card.vulnerabilities.error = error instanceof Error ? error.message : String(error);
    }
  }

  return entries.map((entry) => cards.get(entry.packageName));
}

async function runPool(items, concurrency, worker) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, queue.length)) }, async () => {
      while (queue.length) {
        await worker(queue.shift());
      }
    }),
  );
}

function splitVersion(version) {
  return String(version ?? '').split('-')[0].split('.').map((part) => Number(part) || 0);
}
