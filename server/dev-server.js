import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { runL4Classification } from '../src/agent/l4-agent-runner.js';
import { runL6WithClaudeCli } from '../src/agent/l6-claude-runner.js';
import { buildL6Input } from '../src/agent/l6-prompt.js';
import { assembleJudgmentEvidence } from '../src/agent/l6-evidence.js';
import { buildL6FallbackResult } from '../src/agent/l6-fallback-result.js';
import { runL7WithClaudeCli } from '../src/agent/l7-claude-runner.js';
import { synthesizeDeterministicFixes, verifyFixBlocks } from '../src/agent/fix-synthesis.js';
import { buildDeferredTriage, buildL4Input } from '../src/agent/l4-prompt.js';
// 판정 Q&A — self-contained optional feature (judgment-chat-design.md §6).
import { askJudgmentQuestion, checkChatAvailability } from '../src/agent/judgment-chat.js';
import { buildChangelogParseResult, compareSemver } from '../src/changelog/release-range-parser.js';
import { collectT1 } from '../src/collect/atom-collector.js';
import { runCollectionChain } from '../src/collect/collect-chain.js';
import { describeVendorAdapter, hasVendorAdapter } from '../src/collect/vendor-adapter.js';
import { ensureRepository, findTag } from '../src/collect/git-collector.js';
import {
  listMigrationDocs,
  parseMigrationSections,
  readMigrationDoc,
  splitSectionsByUsage,
} from '../src/collect/migration-doc.js';
import {
  fetchPackageMetadata,
  resolveRepositoryDirectory,
  resolveRepositorySlug,
  selectStableVersions,
  selectVersionsAheadOf,
} from '../src/collect/npm-registry.js';
import { auditCompanions, selectToolConfigFiles } from '../src/collect/companion-audit.js';
import { discoverConfigFiles, matchConfigUsage } from '../src/collect/config-usage.js';
import { assembleHealthcheckVerdict } from '../src/collect/healthcheck-verdict.js';
import { assessPatchLine } from '../src/collect/line-health.js';
import { collectPackageInfoBatch, diffRequirements } from '../src/collect/package-info.js';
import { auditReversePeers } from '../src/collect/peer-audit.js';
import { collectPackageReferences } from '../src/collect/package-references.js';
import { analyzeDependencies } from '../src/resolver/dependency-resolver.js';
import { matchComponentUsage, matchGuideSignatures, matchTemplateUsage, prescanScopeUsage } from '../src/source-match/component-usage.js';
import { matchSourceImpact } from '../src/source-match/source-matcher.js';

// The Vite dev server owns the UI and proxies /api here, so this process is
// API-first. It still serves `web/dist` so a production build runs standalone.
const root = resolve('web/dist');
const port = Number(process.env.PORT ?? 5174);
const l4Jobs = new Map();

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
]);

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);

  if (url.pathname === '/api/config') {
    handleConfigRequest(response);
    return;
  }

  if (url.pathname === '/api/dependencies') {
    handleDependenciesRequest(url, response);
    return;
  }

  if (url.pathname === '/api/project/snippet') {
    handleProjectSnippetRequest(url, response);
    return;
  }

  if (url.pathname === '/api/project/readme') {
    handleProjectReadmeRequest(url, response);
    return;
  }

  if (url.pathname === '/api/changelog/versions') {
    handleChangelogVersionsRequest(url, response);
    return;
  }

  if (url.pathname === '/api/changelog/parse') {
    handleChangelogParseRequest(url, response);
    return;
  }

  if (url.pathname === '/api/collect/t1/versions') {
    handleT1VersionsRequest(url, response);
    return;
  }

  if (url.pathname === '/api/collect/t1/probe') {
    handleT1ProbeRequest(request, response);
    return;
  }

  if (url.pathname === '/api/collect/info') {
    handleCollectInfoRequest(request, response);
    return;
  }

  if (url.pathname === '/api/project/usage-refs') {
    handleUsageRefsRequest(request, response);
    return;
  }

  if (url.pathname === '/api/collect/peer-audit') {
    handlePeerAuditRequest(request, response);
    return;
  }

  if (url.pathname === '/api/pick-directory') {
    handlePickDirectoryRequest(request, response);
    return;
  }

  if (url.pathname === '/api/migration') {
    handleMigrationRequest(request, response);
    return;
  }

  if (url.pathname === '/api/collect') {
    handleCollectRequest(url, response);
    return;
  }

  if (url.pathname === '/api/collect/t1') {
    handleT1CollectRequest(url, response);
    return;
  }

  if (url.pathname === '/api/source-match') {
    handleSourceMatchRequest(request, response);
    return;
  }

  if (url.pathname === '/api/agent/runs') {
    handleAgentRunsRequest(request, response);
    return;
  }

  const runResultMatch = url.pathname.match(/^\/api\/agent\/runs\/([A-Za-z0-9-]+)\/result$/);
  if (runResultMatch) {
    handleAgentRunResultRequest(response, runResultMatch[1]);
    return;
  }

  const runFailureMatch = url.pathname.match(/^\/api\/agent\/runs\/([A-Za-z0-9-]+)\/failed$/);
  if (runFailureMatch) {
    handleAgentRunFailureRequest(response, runFailureMatch[1]);
    return;
  }

  if (url.pathname === '/api/agent/l4/jobs') {
    handleL4AgentJobsRequest(request, response);
    return;
  }

  if (url.pathname === '/api/agent/l6/jobs') {
    handleL6AgentJobsRequest(request, response);
    return;
  }

  const l6CancelMatch = url.pathname.match(/^\/api\/agent\/l6\/jobs\/([^/]+)\/cancel$/);
  if (l6CancelMatch) {
    handleL4AgentJobCancelRequest(request, response, decodeURIComponent(l6CancelMatch[1]));
    return;
  }

  const l6JobMatch = url.pathname.match(/^\/api\/agent\/l6\/jobs\/([^/]+)$/);
  if (l6JobMatch) {
    handleL4AgentJobStatusRequest(request, response, decodeURIComponent(l6JobMatch[1]));
    return;
  }

  const cancelMatch = url.pathname.match(/^\/api\/agent\/l4\/jobs\/([^/]+)\/cancel$/);
  if (cancelMatch) {
    handleL4AgentJobCancelRequest(request, response, decodeURIComponent(cancelMatch[1]));
    return;
  }

  const jobMatch = url.pathname.match(/^\/api\/agent\/l4\/jobs\/([^/]+)$/);
  if (jobMatch) {
    handleL4AgentJobStatusRequest(request, response, decodeURIComponent(jobMatch[1]));
    return;
  }

  if (url.pathname === '/api/agent/l4') {
    handleL4AgentRequest(request, response);
    return;
  }

  // ---- 판정 Q&A (optional feature; remove this block to drop it) --------
  if (url.pathname === '/api/agent/chat/health') {
    handleChatHealthRequest(response);
    return;
  }

  if (url.pathname === '/api/agent/chat') {
    handleChatRequest(request, response);
    return;
  }
  // ---- /판정 Q&A -------------------------------------------------------

  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = normalize(join(root, requestedPath));

  if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    if (!existsSync(root)) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end(
        'No built UI at web/dist.\n' +
          'Use `npm run dev` (Vite dev server + this API), or `npm run build` first.\n',
      );
      return;
    }
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'content-type': contentTypes.get(extname(filePath)) ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
});

const dataRoot = resolve('data');

/*
 * Release data is the single source of truth for which packages the pilot
 * parser can analyse and which versions exist. The UI used to carry its own
 * hardcoded Vuetify version list, which would silently go stale the first time
 * `npm run collect:vuetify` refreshed the data.
 */
function releaseFileFor(packageName) {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(packageName ?? '')) return null;
  const dir = resolve(dataRoot, packageName);
  if (!dir.startsWith(dataRoot) || !existsSync(dir) || !statSync(dir).isDirectory()) return null;
  const file = readdirSync(dir)
    .filter((name) => /^releases-.*\.json$/.test(name))
    .sort()
    .pop();
  return file ? join(dir, file) : null;
}

function loadReleases(packageName) {
  const file = releaseFileFor(packageName);
  if (!file) return null;
  const data = JSON.parse(readFileSync(file, 'utf8'));
  return Array.isArray(data) ? data : data.releases;
}

function listSupportedPackages() {
  if (!existsSync(dataRoot)) return [];
  return readdirSync(dataRoot)
    .filter((name) => statSync(join(dataRoot, name)).isDirectory())
    .filter((name) => releaseFileFor(name))
    .sort();
}

/*
 * The path field is prefilled with PROJECT_PATH when it is set and exists;
 * otherwise the field starts empty.
 */
function resolveDefaultProjectPath() {
  const candidate = process.env.PROJECT_PATH;
  if (!candidate) return '';
  const full = resolve(candidate);
  return existsSync(full) ? full : '';
}

function handleConfigRequest(response) {
  sendJson(response, 200, {
    cwd: resolve('.'),
    platform: process.platform,
    defaultProjectPath: resolveDefaultProjectPath(),
    supportedPackages: listSupportedPackages(),
  });
}

function handleChangelogVersionsRequest(url, response) {
  const packageName = url.searchParams.get('packageName');
  const releases = packageName ? loadReleases(packageName) : null;
  if (!releases) {
    sendJson(response, 404, { error: `no release data for ${packageName}` });
    return;
  }

  const versions = releases
    .map((release) => release.version)
    .filter((version) => /^\d+\.\d+\.\d+$/.test(version ?? ''))
    .sort(compareSemver);

  sendJson(response, 200, { packageName, versions, latest: versions[versions.length - 1] ?? null });
}

function handleDependenciesRequest(url, response) {
  const projectPath = url.searchParams.get('projectPath');
  if (!projectPath) {
    sendJson(response, 400, { error: 'projectPath is required' });
    return;
  }

  try {
    const result = analyzeDependencies(resolve(projectPath));
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

/*
 * The chosen project's own README, read from the directory root only.
 *
 * This is the one piece of the analyzer's UI that shows the project speaking
 * for itself, so the reviewer can tell at a glance they pointed at the right
 * repository before spending minutes of Agent time on it.
 *
 * Read-only and deliberately shallow: root entries only (no walk), the first
 * README-looking file, and a size cap — a README is a page, and anything
 * bigger than the cap is a data file wearing the name.
 */
const README_PATTERN = /^readme(\.(md|markdown|mdown|txt|rst))?$/i;
const README_LIMIT_BYTES = 256 * 1024;

/**
 * A few lines of a project file, for the 파일 상세 code panel.
 *
 * The panel's evidence rows need actual source text at the lines a judgment
 * cited (`vite.config.js:46-59`). Read-only, capped, and confined: the
 * resolved target must stay inside projectPath — the id-style traversal
 * guard the run-result route uses does not apply to a client-supplied path.
 *
 * GET /api/project/snippet?projectPath=..&file=vite.config.js&lines=39,46-59
 */
const SNIPPET_MAX_LINES = 60;
const SNIPPET_MAX_LINE_LENGTH = 400;

function handleProjectSnippetRequest(url, response) {
  const projectPath = url.searchParams.get('projectPath');
  const file = url.searchParams.get('file');
  const rangesParam = url.searchParams.get('lines');
  if (!projectPath || !file || !rangesParam) {
    sendJson(response, 400, { error: 'projectPath, file and lines are required' });
    return;
  }

  const root = resolve(projectPath);
  const target = resolve(root, normalize(file));
  if (target !== root && !target.startsWith(root + sep)) {
    sendJson(response, 400, { error: 'file must stay inside projectPath' });
    return;
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    sendJson(response, 404, { error: `no such file: ${file}` });
    return;
  }

  let text;
  try {
    text = readFileSync(target, 'utf8');
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
    return;
  }
  const allLines = text.split(/\r?\n/);

  const lines = [];
  const seen = new Set();
  for (const range of rangesParam.split(',')) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(range.trim());
    if (!match) continue;
    const start = Number(match[1]);
    const end = match[2] ? Math.max(start, Number(match[2])) : start;
    for (let line = start; line <= end && lines.length < SNIPPET_MAX_LINES; line += 1) {
      if (line < 1 || line > allLines.length || seen.has(line)) continue;
      seen.add(line);
      lines.push({ line, text: allLines[line - 1].slice(0, SNIPPET_MAX_LINE_LENGTH) });
    }
  }

  sendJson(response, 200, { file, totalLines: allLines.length, lines });
}

function handleProjectReadmeRequest(url, response) {
  const projectPath = url.searchParams.get('projectPath');
  if (!projectPath) {
    sendJson(response, 400, { error: 'projectPath is required' });
    return;
  }

  try {
    const root = resolve(projectPath);
    if (!existsSync(root) || !statSync(root).isDirectory()) {
      sendJson(response, 200, { found: false, reason: 'no-directory' });
      return;
    }

    // Sorted so the choice is stable when a project ships more than one
    // (README.md beats README.txt beats README).
    const name = readdirSync(root)
      .filter((entry) => README_PATTERN.test(entry))
      .sort()
      .find((entry) => {
        const path = join(root, entry);
        return statSync(path).isFile();
      });

    if (!name) {
      sendJson(response, 200, { found: false, reason: 'no-readme' });
      return;
    }

    const path = join(root, name);
    const sizeBytes = statSync(path).size;
    if (sizeBytes > README_LIMIT_BYTES) {
      sendJson(response, 200, { found: false, reason: 'too-large', filename: name, sizeBytes });
      return;
    }

    sendJson(response, 200, {
      found: true,
      filename: name,
      sizeBytes,
      content: readFileSync(path, 'utf8'),
    });
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

function handleChangelogParseRequest(url, response) {
  const packageName = url.searchParams.get('packageName');
  const currentVersion = url.searchParams.get('currentVersion');
  const targetVersion = url.searchParams.get('targetVersion') || null;

  if (!packageName || !currentVersion) {
    sendJson(response, 400, { error: 'packageName and currentVersion are required' });
    return;
  }

  if (targetVersion && compareSemver(targetVersion, currentVersion) <= 0) {
    sendJson(response, 400, { error: 'targetVersion must be greater than currentVersion' });
    return;
  }

  try {
    const releases = loadReleases(packageName);
    if (!releases) {
      sendJson(response, 400, {
        error: `no release data for ${packageName}. available: ${listSupportedPackages().join(', ') || 'none'}`,
      });
      return;
    }
    const result = buildChangelogParseResult({ packageName, currentVersion, targetVersion, releases });
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

/*
 * T1 collection — `releases.atom`, no GitHub API quota.
 *
 * These endpoints exist because the pilot's release data came from checked-in
 * `data/*.json` files, which only ever covered vuetify. T1 collects the same
 * shape live, so the product workspace can analyse any dependency whose
 * repository publishes release notes.
 *
 * Registry metadata is cached per process: the library screen probes every
 * dependency at once, and one npm request per package per run is enough.
 */
const REGISTRY_CACHE_TTL_MS = 10 * 60 * 1000;
const registryCache = new Map();
const PROBE_CONCURRENCY = 8;

async function loadPackageMetadata(packageName) {
  const cached = registryCache.get(packageName);
  if (cached && Date.now() - cached.at < REGISTRY_CACHE_TTL_MS) return cached.metadata;

  const metadata = await fetchPackageMetadata(packageName);
  registryCache.set(packageName, { at: Date.now(), metadata });
  return metadata;
}

/*
 * OSV has no equivalent caching to registryCache above, so a healthcheck run
 * on the same package+version re-queries OSV.dev from zero every time —
 * unlike npm registry lookups, which already share this 10-minute window.
 * Keyed by package+version (a property of the library, not the analyzing
 * project) so repeated healthchecks across different projects share one
 * lookup. Failures are never cached — an OSV outage must not freeze in as a
 * false "no vulnerabilities found" for the whole TTL window.
 */
const osvCache = new Map();

async function loadVulnerabilities(packageName, installedVersion) {
  const key = `${packageName}@${installedVersion}`;
  const cached = osvCache.get(key);
  if (cached && Date.now() - cached.at < REGISTRY_CACHE_TTL_MS) return cached.items;

  const [card] = await collectPackageInfoBatch(
    [{ packageName, installedVersion, targetVersion: null }],
    { loadMetadata: loadPackageMetadata, downloads: false },
  );
  if (!card?.vulnerabilities?.ok) throw new Error(card?.vulnerabilities?.error ?? 'OSV lookup failed');

  const items = card.vulnerabilities.items;
  osvCache.set(key, { at: Date.now(), items });
  return items;
}

async function handleT1VersionsRequest(url, response) {
  const packageName = url.searchParams.get('packageName');
  if (!packageName) {
    sendJson(response, 400, { error: 'packageName is required' });
    return;
  }

  try {
    const metadata = await loadPackageMetadata(packageName);
    const versions = selectStableVersions(metadata);
    const repository = resolveRepositorySlug(metadata);
    sendJson(response, 200, {
      packageName,
      source: 'npm-registry',
      repository,
      // No GitHub repository means no atom feed and no changelog: T1, T2 and
      // T3 are all unavailable and the package needs a dedicated adapter.
      // 등재된 벤더 문서 어댑터가 있으면 그 경로로 수집되므로 불가가 아니다.
      adapterRequired: !repository && !hasVendorAdapter(packageName),
      vendorAdapter: describeVendorAdapter(packageName),
      versions,
      latest: versions[versions.length - 1] ?? null,
    });
  } catch (error) {
    sendJson(response, 502, { error: error instanceof Error ? error.message : String(error) });
  }
}

async function handleT1ProbeRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'POST is required' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    return;
  }

  const packages = Array.isArray(body?.packages) ? body.packages.map(String).filter(Boolean) : [];
  if (!packages.length) {
    sendJson(response, 400, { error: 'packages must be a non-empty array' });
    return;
  }

  const results = [];
  const queue = [...packages];
  const workers = Array.from({ length: Math.min(PROBE_CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const packageName = queue.shift();
      try {
        // Registry only — the atom feed is not fetched here. This answers
        // "can T1 even be attempted", not "how good is the coverage".
        const metadata = await loadPackageMetadata(packageName);
        const versions = selectStableVersions(metadata);
        const repository = resolveRepositorySlug(metadata);
        results.push({
          packageName,
          repository,
          adapterRequired: !repository && !hasVendorAdapter(packageName),
          vendorAdapter: describeVendorAdapter(packageName),
          latestVersion: versions[versions.length - 1] ?? null,
          error: null,
        });
      } catch (error) {
        results.push({
          packageName,
          repository: null,
          adapterRequired: false,
          latestVersion: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  await Promise.all(workers);
  results.sort((left, right) => left.packageName.localeCompare(right.packageName));
  sendJson(response, 200, { source: 'npm-registry', results });
}

/**
 * Per-library information cards for a dependency list.
 *
 * Registry facts (behind, publish dates, deprecation, license/engines/peer
 * requirement changes) come from the same cached metadata documents the probe
 * fetches; vulnerabilities from one OSV.dev batch; downloads from
 * api.npmjs.org. All free, no keys, no GitHub API quota.
 */
/*
 * 프로젝트 소스에서의 참조 요약 — 라이브러리 화면의 '미사용 의심' 신호용.
 * collectPackageReferences 한 번의 파일 순회로 전체 후보를 훑고(POST
 * {projectPath, packages: [이름…]}), 패키지마다 매니페스트 외 참조 수만
 * 돌려준다. 판정이 아니라 실측 요약이다 — 미사용 "확정"은 여기서 하지 않는다
 * (폴리필·간접 사용이 있는 세계에서 확정은 거짓말이 된다).
 */
async function handleUsageRefsRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'POST is required' });
    return;
  }
  try {
    const body = await readJsonBody(request);
    const projectPath = String(body?.projectPath ?? '').trim();
    const packages = (body?.packages ?? []).map(String).filter(Boolean);
    if (!projectPath || !packages.length) {
      sendJson(response, 400, { error: 'projectPath and packages are required' });
      return;
    }
    const refs = collectPackageReferences({ projectPath: resolve(projectPath), packageName: null, candidates: packages });
    const results = {};
    for (const [name, entries] of Object.entries(refs)) {
      const nonManifest = entries.filter((entry) => entry.kind !== 'manifest');
      results[name] = {
        sourceRefCount: nonManifest.length,
        kinds: [...new Set(nonManifest.map((entry) => entry.kind))],
        sample: nonManifest[0] ?? null,
      };
    }
    sendJson(response, 200, { results });
  } catch (error) {
    sendJson(response, 502, { error: error instanceof Error ? error.message : String(error) });
  }
}

async function handleCollectInfoRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'POST is required' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    return;
  }

  const entries = (Array.isArray(body?.packages) ? body.packages : [])
    .map((entry) => ({
      packageName: String(entry?.name ?? '').trim(),
      installedVersion: String(entry?.version ?? '').trim(),
      targetVersion: entry?.targetVersion ? String(entry.targetVersion).trim() : null,
    }))
    .filter((entry) => entry.packageName && entry.installedVersion);
  if (!entries.length) {
    sendJson(response, 400, { error: 'packages must be a non-empty array of { name, version }' });
    return;
  }

  try {
    const results = await collectPackageInfoBatch(entries, { loadMetadata: loadPackageMetadata });
    sendJson(response, 200, { source: 'npm-registry + OSV.dev + api.npmjs.org', results });
  } catch (error) {
    sendJson(response, 502, { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Reverse peer audit: which of the project's OTHER dependencies break when
 * the analyzed package moves to the target. Registry-only and deterministic;
 * after the probe warmed the metadata cache this costs zero HTTP.
 */
async function handlePeerAuditRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'POST is required' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    return;
  }

  const packageName = String(body?.packageName ?? '').trim();
  const targetVersion = String(body?.targetVersion ?? '').trim();
  const projectPath = String(body?.projectPath ?? '').trim();
  const dependencies = (Array.isArray(body?.dependencies) ? body.dependencies : [])
    .map((entry) => ({ name: String(entry?.name ?? '').trim(), version: String(entry?.version ?? '').trim() }))
    .filter((entry) => entry.name && entry.version);
  if (!packageName || !targetVersion || !dependencies.length) {
    sendJson(response, 400, { error: 'packageName, targetVersion and dependencies[{name, version}] are required' });
    return;
  }

  try {
    const audit = await auditReversePeers({ packageName, targetVersion, dependencies, loadMetadata: loadPackageMetadata });

    /*
     * Companion audit rides the same request: same dependency list, same
     * warmed metadata cache. The tool's own config files (vite.config.js for
     * vite) are read here so discovery can see string-registered plugins too.
     */
    const configTexts = [];
    if (projectPath) {
      for (const file of selectToolConfigFiles(discoverConfigFiles(resolve(projectPath)), packageName)) {
        try {
          configTexts.push(readFileSync(resolve(projectPath, file), 'utf8'));
        } catch {
          // A config file that cannot be read just contributes no mentions.
        }
      }
    }
    const companions = await auditCompanions({
      packageName,
      targetVersion,
      dependencies,
      configTexts,
      loadMetadata: loadPackageMetadata,
    });

    sendJson(response, 200, { ...audit, companions: companions.rows });
  } catch (error) {
    sendJson(response, 502, { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Native folder picker, owned by this local server process.
 *
 * The browser's own picker (`showDirectoryPicker`) hides the absolute path by
 * design — a web page must never learn where a folder lives on disk. But this
 * server runs on the same machine as the user, so it can ask the OS directly
 * and hand the real path back to the UI. The dialog belongs to the server
 * process, not the browser window.
 */
async function handlePickDirectoryRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'POST is required' });
    return;
  }

  try {
    const path = await pickDirectoryNative();
    sendJson(response, 200, { cancelled: path === null, path });
  } catch (error) {
    const status = error?.code === 'UNSUPPORTED_PLATFORM' ? 501 : 500;
    sendJson(response, status, { error: error instanceof Error ? error.message : String(error) });
  }
}

const PICK_DIALOG_TIMEOUT_MS = 120_000;

async function pickDirectoryNative() {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);

  if (process.platform === 'darwin') {
    try {
      const { stdout } = await run(
        'osascript',
        ['-e', 'POSIX path of (choose folder with prompt "분석할 프로젝트 폴더를 선택하세요")'],
        { timeout: PICK_DIALOG_TIMEOUT_MS },
      );
      const path = stdout.trim().replace(/\/$/, '');
      return path || null;
    } catch (error) {
      // Cancel is exit code 1 with "User canceled." (AppleScript error -128) —
      // an answer, not a failure.
      if (/user canceled|-128/i.test(String(error?.stderr ?? '') + String(error?.message ?? ''))) return null;
      throw error;
    }
  }

  if (process.platform === 'win32') {
    const script =
      'Add-Type -AssemblyName System.Windows.Forms; ' +
      '$d = New-Object System.Windows.Forms.FolderBrowserDialog; ' +
      "$d.Description = '분석할 프로젝트 폴더를 선택하세요'; " +
      "if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($d.SelectedPath) }";
    const { stdout } = await run('powershell', ['-NoProfile', '-STA', '-Command', script], {
      timeout: PICK_DIALOG_TIMEOUT_MS,
    });
    const path = stdout.trim();
    return path || null;
  }

  const error = new Error('이 플랫폼에서는 서버 폴더 선택창을 지원하지 않습니다. 경로를 직접 입력하세요.');
  error.code = 'UNSUPPORTED_PLATFORM';
  throw error;
}

async function handleT1CollectRequest(url, response) {
  const packageName = url.searchParams.get('packageName');
  const currentVersion = url.searchParams.get('currentVersion');
  const targetVersion = url.searchParams.get('targetVersion') || null;

  if (!packageName || !currentVersion) {
    sendJson(response, 400, { error: 'packageName and currentVersion are required' });
    return;
  }
  if (targetVersion && compareSemver(targetVersion, currentVersion) <= 0) {
    sendJson(response, 400, { error: 'targetVersion must be greater than currentVersion' });
    return;
  }

  try {
    const metadata = await loadPackageMetadata(packageName);
    const repository = resolveRepositorySlug(metadata);
    if (!repository) {
      sendJson(response, 422, {
        error: `no GitHub repository for ${packageName}`,
        reason: 'ADAPTER_REQUIRED',
        detail: 'atom · REST · CHANGELOG 세 경로가 모두 없습니다. 개별 어댑터가 필요합니다.',
      });
      return;
    }

    // Only versions above the installed one. Backports to older maintenance
    // lines are published releases but not something this upgrade must read.
    //
    // Without a target version this is a healthcheck, and the range parser
    // only reads the rest of the current minor line. Collecting wider would
    // report coverage against versions the analysis never looks at, making a
    // complete healthcheck read as 2% covered.
    const targetVersions = targetVersion
      ? selectVersionsAheadOf(metadata, currentVersion, { toVersion: targetVersion })
      : selectVersionsAheadOf(metadata, currentVersion).filter((version) => inSameMinorLine(version, currentVersion));
    const collection = await collectT1({
      packageName,
      repository,
      targetVersions,
      collectedAt: new Date().toISOString(),
    });

    // The atom result feeds the existing range parser, so everything
    // downstream (L4, source matching) sees the shape it already handles.
    const parseResult = buildChangelogParseResult({
      packageName,
      currentVersion,
      targetVersion,
      releases: collection.sourceReleases,
    });

    sendJson(response, 200, {
      packageName,
      currentVersion,
      targetVersion,
      collection: summarizeCollection(collection),
      parseResult,
    });
  } catch (error) {
    sendJson(response, 502, { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * The collection chain: T1 atom, then T3 repository CHANGELOG, then T2-git for
 * whatever the earlier tiers could not read. The chain itself lives in
 * `src/collect/collect-chain.js`, shared with the measurement script.
 */
async function handleCollectRequest(url, response) {
  const packageName = url.searchParams.get('packageName');
  const currentVersion = url.searchParams.get('currentVersion');
  const targetVersion = url.searchParams.get('targetVersion') || null;
  const allowGit = url.searchParams.get('git') !== 'off';

  if (!packageName || !currentVersion) {
    sendJson(response, 400, { error: 'packageName and currentVersion are required' });
    return;
  }
  if (targetVersion && compareSemver(targetVersion, currentVersion) <= 0) {
    sendJson(response, 400, { error: 'targetVersion must be greater than currentVersion' });
    return;
  }

  try {
    const metadata = await loadPackageMetadata(packageName);
    const repository = resolveRepositorySlug(metadata);
    // 저장소가 없어도 벤더 문서 어댑터가 등재된 패키지는 수집할 수 있다
    // (상용 라이브러리 — 공식 문서가 릴리즈 노트를 관리한다).
    if (!repository && !hasVendorAdapter(packageName)) {
      sendJson(response, 422, {
        error: `no GitHub repository for ${packageName}`,
        reason: 'ADAPTER_REQUIRED',
        detail: 'atom · git · CHANGELOG 세 경로가 모두 없고, 등재된 벤더 문서 어댑터도 없습니다.',
      });
      return;
    }

    const targetVersions = targetVersion
      ? selectVersionsAheadOf(metadata, currentVersion, { toVersion: targetVersion })
      : selectVersionsAheadOf(metadata, currentVersion).filter((version) => inSameMinorLine(version, currentVersion));

    const { collection, releases } = await runCollectionChain({
      packageName,
      repository,
      targetVersions,
      git: allowGit,
      // Only set for packages the registry places in a subdirectory.
      pathFilter: resolveRepositoryDirectory(metadata),
      // Full stable list, so each git range starts at the version actually
      // released before it rather than at the previous gap.
      versionOrder: [currentVersion, ...selectStableVersions(metadata).filter((version) => compareSemver(version, currentVersion) > 0)],
      // 태그를 남기지 않은 버전의 커밋 구간을 잡는 데 쓴다(T2 폴백).
      publishTimes: metadata?.time ?? null,
    });

    const parseResult = buildChangelogParseResult({
      packageName,
      currentVersion,
      targetVersion,
      releases,
    });

    /*
     * Healthcheck asks a different question from an upgrade run ("should I
     * move at all", not "how do I move safely"), so it gets a different
     * answer: a deterministic triage attached here, computed from facts this
     * request already has in hand (registry metadata) or that cost nothing
     * extra to fetch (one OSV batch for a single package). No Agent call —
     * that is the whole point of a healthcheck being cheap enough to run on
     * every visit.
     */
    if (!targetVersion) {
      const lineHealth = assessPatchLine({ metadata, currentVersion, latestPatchInLine: parseResult.latestPatchInLine });

      let vulnerabilities = [];
      // "확인해서 0건"과 "확인을 못 함"은 다른 사실이다 — 후자를 전자로 접으면
      // OSV 장애가 조용히 "안전 확인됨"으로 둔갑한다. 실패 시 vulnerabilitiesChecked를
      // false로 보내 화면이 그 차이를 말하게 한다.
      let vulnerabilitiesChecked = true;
      try {
        vulnerabilities = await loadVulnerabilities(packageName, currentVersion);
      } catch {
        // OSV 실패가 헬스체크 전체를 죽이면 안 된다 — 라인 진단은 그것대로 유효하다.
        vulnerabilitiesChecked = false;
      }

      // 사용 여부 신호는 프로젝트가 있을 때만 존재한다 — 없으면 PATCH_AVAILABLE은
      // 자연히 발동하지 않는다(증거 부재는 사용의 증거가 아니다), 나머지는 그대로.
      let usageByItemId = {};
      const projectPath = url.searchParams.get('projectPath');
      if (projectPath) {
        try {
          usageByItemId = prescanScopeUsage(resolve(projectPath), parseResult.items).byItemId;
        } catch {
          // 잘못된/미접근 경로 — usage 없이 진행.
        }
      }

      /*
       * npm deprecation is a distinct signal from line dormancy — dormancy is
       * INFERRED from registry timing, while `deprecated` is a statement the
       * maintainer typed themselves via `npm deprecate`. Reading it costs
       * nothing extra: it lives on the same metadata document already loaded
       * above for the collection chain.
       */
      const deprecation = {
        deprecated: Boolean(metadata.versions?.[currentVersion]?.deprecated),
        message: metadata.versions?.[currentVersion]?.deprecated ?? null,
      };

      // Sent alongside the verdict — the diagnosis screen states line status
      // ("활성"/"단종") and support status ("지원 종료" 여부) independently
      // of which level won the headline, so neither fact is lost to the
      // other when e.g. SECURITY outranks a also-true DEPRECATED/DORMANT.
      parseResult.lineHealth = lineHealth;
      parseResult.deprecation = deprecation;
      parseResult.vulnerabilitiesChecked = vulnerabilitiesChecked;
      parseResult.healthcheck = assembleHealthcheckVerdict({
        packageName,
        currentVersion,
        lineHealth,
        vulnerabilities,
        deprecation,
        items: parseResult.items,
        usageByItemId,
      });
    }

    const payload = {
      packageName,
      currentVersion,
      targetVersion,
      collection,
      parseResult,
    };
    sendJson(response, 200, payload);
  } catch (error) {
    sendJson(response, 502, { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Migration guide for an upgrade, filtered to what the project actually uses.
 *
 * Runs only when the range crosses a major boundary, because that is where
 * these guides are written. The guide is read out of the same clone the commit
 * collector already made, so it costs no additional network call and no API
 * quota.
 */
async function handleMigrationRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'POST is required' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    return;
  }

  const packageName = String(body?.packageName ?? '').trim();
  const currentVersion = String(body?.currentVersion ?? '').trim();
  const targetVersion = String(body?.targetVersion ?? '').trim();
  const projectPath = String(body?.projectPath ?? '').trim();

  if (!packageName || !currentVersion || !targetVersion) {
    sendJson(response, 400, { error: 'packageName, currentVersion and targetVersion are required' });
    return;
  }

  const boundaries = majorBoundariesBetween(currentVersion, targetVersion);
  if (!boundaries.length) {
    sendJson(response, 200, { packageName, applies: false, reason: 'NO_MAJOR_BOUNDARY', boundaries: [], docs: [] });
    return;
  }

  try {
    const metadata = await loadPackageMetadata(packageName);
    const repository = resolveRepositorySlug(metadata);
    if (!repository) {
      sendJson(response, 200, { packageName, applies: false, reason: 'ADAPTER_REQUIRED', boundaries, docs: [] });
      return;
    }

    const repo = await ensureRepository(repository, { fetch: false });
    const stableVersions = selectStableVersions(metadata);
    const docs = [];

    for (const boundary of boundaries) {
      const tag = findTag(await listRepositoryTags(repo.path), boundary, packageName);
      if (!tag) {
        docs.push({ version: boundary, tag: null, found: false, reason: 'NO_TAG_IN_REPOSITORY' });
        continue;
      }

      const candidates = await listMigrationDocs(repo.path, tag, {
        targetMajor: Number(String(boundary).split('.')[0]) || null,
      });
      if (!candidates.length) {
        docs.push({ version: boundary, tag, found: false, reason: 'NO_GUIDE_IN_REPOSITORY' });
        continue;
      }

      // Only the highest ranked guide is read. Reading every candidate would
      // bury the general guide under version-specific ones a repository keeps
      // for upgrades nobody here is doing.
      const chosen = candidates[0];
      const text = await readMigrationDoc(repo.path, tag, chosen.path);
      const sections = parseMigrationSections(text);
      const components = [...new Set(sections.flatMap((section) => section.components))];
      const configKeys = [...new Set(sections.flatMap((section) => section.configKeys ?? []))];
      const { usage, scannedFiles } = projectPath
        ? matchComponentUsage(resolve(projectPath), components)
        : { usage: {}, scannedFiles: 0 };
      /*
       * The config axis. A build tool's guide names options, not components,
       * so without this every section falls through to `unknown` and the
       * judgment step never sees it.
       */
      const config = projectPath
        ? matchConfigUsage(resolve(projectPath), configKeys)
        : { usage: {}, scannedFiles: 0, files: [] };
      /*
       * 템플릿 축 — 슬롯 프로퍼티 접근(item.title 등)의 소스 실측. 설정 축이
       * 이 토큰을 들고 있으면 설정 파일 스캔의 당연한 ABSENT가 거짓 부정
       * 증거가 된다(2026-08-22 vuetify 실측 오판). 추출부터 두 축이 분리된다.
       */
      const templateTerms = [...new Set(sections.flatMap((section) => section.templateTerms ?? []))];
      const template = projectPath
        ? matchTemplateUsage(resolve(projectPath), templateTerms)
        : { usage: {}, scannedFiles: 0 };
      /*
       * 시그니처 축 — 컴포넌트도 옵션도 토큰도 없는 전역 섹션(Breakpoints·
       * Typography·Elevation)의 사용 실측. unknown으로 떨어져 판정 유닛이
       * 안 생기던 구멍(실제 프로젝트 2026-08-24 브레이크포인트 FN)을 막는다.
       */
      const signature = projectPath
        ? matchGuideSignatures(resolve(projectPath), sections.map((section) => section.heading))
        : { usage: {}, scannedFiles: 0 };
      const split = splitSectionsByUsage(sections, usage, config.usage, template.usage, signature.usage);

      docs.push({
        version: boundary,
        tag,
        found: true,
        path: chosen.path,
        rank: chosen.reason,
        url: `https://github.com/${repository}/blob/${tag}/${chosen.path}`,
        length: text.length,
        sectionCount: sections.length,
        scannedFiles,
        configFiles: config.files,
        configFileCount: config.scannedFiles,
        // Sections whose components appear in the project source: the ones
        // worth a person's time.
        used: split.used.map((section) => decorate(section, usage)),
        // Kept as a count only. Naming them would put the whole guide back on
        // screen, which is what this filter exists to prevent.
        unusedCount: split.unused.length,
        unusedHeadings: split.unused.map((section) => section.heading),
        // No component in the heading, so usage cannot decide. A build wide
        // change matters without naming a component, so these are not dropped.
        unknown: split.unknown.map((section) => decorate(section, usage)),
        otherCandidates: candidates.slice(1, 4).map((candidate) => ({ path: candidate.path, rank: candidate.reason })),
      });
    }

    const migrationPayload = {
      packageName,
      repository,
      applies: true,
      boundaries,
      stableVersionCount: stableVersions.length,
      docs,
    };
    saveDemoResult('migration', migrationDemoKey, migrationPayload);
    sendJson(response, 200, migrationPayload);
  } catch (error) {
    sendJson(response, 502, { error: error instanceof Error ? error.message : String(error) });
  }
}

function decorate(section, usage) {
  return {
    heading: section.heading,
    level: section.level ?? null,
    excerpt: section.excerpt,
    hasDiff: section.hasDiff,
    components: section.components,
    usedComponents: section.usedComponents,
    files: section.usedComponents.flatMap((component) => usage[component]?.files ?? []).slice(0, 6),
    fileCount: section.usedComponents.reduce((total, component) => total + (usage[component]?.fileCount ?? 0), 0),
    /*
     * Both halves travel: the keys that ARE set (with file and line, so a
     * judgment can name where to edit) and the ones that are NOT (so "the new
     * default now applies to you" can be said with a reason rather than
     * guessed at).
     */
    config: section.config ?? null,
    configKeys: section.configKeys ?? [],
    // 템플릿 축 실측(슬롯 프로퍼티 사용 file·line) — L6 판정과 L7 diff 생성이
    // 같은 증거를 쓴다.
    template: section.template ?? null,
  };
}

/** Major versions released inside the range — where migration guides live. */
function majorBoundariesBetween(currentVersion, targetVersion) {
  const from = Number(String(currentVersion).split('.')[0]) || 0;
  const to = Number(String(targetVersion).split('.')[0]) || 0;
  const boundaries = [];
  for (let major = from + 1; major <= to; major += 1) boundaries.push(`${major}.0.0`);
  return boundaries;
}

async function listRepositoryTags(repoPath) {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  const { stdout } = await run('git', ['-C', repoPath, 'tag', '--list'], { maxBuffer: 32 * 1024 * 1024 });
  return stdout.split('\n').map((line) => line.trim()).filter(Boolean);
}

function inSameMinorLine(version, reference) {
  const [major, minor] = String(version).split('.');
  const [refMajor, refMinor] = String(reference).split('.');
  return major === refMajor && minor === refMinor;
}

/** Drops the payload the UI never reads — release bodies are in parseResult. */
function summarizeCollection(collection) {
  const { releases, items, sourceReleases, ...summary } = collection;
  return {
    ...summary,
    collectedReleases: releases.map((release) => ({
      version: release.version,
      tagName: release.tagName,
      publishedAt: release.publishedAt,
      sourceUrl: release.sourceUrl,
      itemCount: release.items.length,
    })),
  };
}

async function handleSourceMatchRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'POST is required' });
    return;
  }

  try {
    const body = await readJsonBody(request, { limitBytes: 4 * 1024 * 1024 });
    if (!body.projectPath) throw new Error('projectPath is required');
    if (!body.classificationItem) throw new Error('classificationItem is required');

    const result = matchSourceImpact({
      projectPath: body.projectPath,
      packageName: body.packageName,
      currentVersion: body.currentVersion,
      targetVersion: body.targetVersion,
      classificationItem: body.classificationItem,
    });
    sendJson(response, 200, result);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}
async function handleL4AgentRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'POST is required' });
    return;
  }

  try {
    const body = await readJsonBody(request, { limitBytes: 12 * 1024 * 1024 });
    const { stage3Result, maxItems, selectionMode, usage } = validateL4RequestBody(body);
    const l4Input = buildL4Input(stage3Result, { maxItems, selectionMode, usage });
    const triage = buildDeferredTriage(stage3Result, l4Input, usage);
    const execution = await runL4Classification(stage3Result, {
      cwd: resolve('.'),
      maxItems,
      selectionMode,
      usage,
      model: body.model || undefined,
      provider: body.provider || undefined,
      fallbackOnError: body.fallbackOnError ?? true,
      fallbackRandomness: body.fallbackRandomness ?? body.randomness ?? 0,
      fallbackSeed: body.fallbackSeed || body.seed || undefined,
      // Per batch, not per run: each fan-out call is smaller than the single
      // call this replaced, so the ceiling stays generous.
      timeoutMs: body.timeoutMs ?? 10 * 60 * 1000,
      batchSize: body.batchSize,
      maxConcurrency: body.maxConcurrency,
    });
    sendJson(response, 200, attachInputSummary(execution, l4Input, usage, triage));
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
  }
}

/*
 * Every agent run leaves a durable record. Job state lives in memory and dies
 * with the process; a judgment that cost real money must not. One JSON file
 * per run under .cache/agent-runs — what it ran on, when it started and
 * finished, how long it took, and what it consumed (tokens · USD).
 */
const AGENT_RUNS_DIR = resolve('.cache/agent-runs');
/*
 * A generous cap, not a real limit — each record is ~1KB and there are
 * hundreds of them, so reading/sorting all of them costs low milliseconds.
 * The point of a cap at all is to bound response size if this directory ever
 * grows into the tens of thousands; it must never again be silently smaller
 * than what the dev panel implies, so the response always carries
 * `totalCount` (the real count on disk) alongside the possibly-truncated
 * `runs` — the panel showed "1–15 / 47" as if that were everything, when it
 * was 47 out of 300+, and nothing in the response said so.
 */
const AGENT_RUNS_LIST_LIMIT = 1000;

function recordAgentRun(record, execution = null, failure = null) {
  try {
    mkdirSync(AGENT_RUNS_DIR, { recursive: true });
    // The run record stays light for listing; the full result body goes to a
    // sibling file so an A/B comparison can diff actual outputs, not counts.
    if (execution) {
      record = { ...record, resultFile: `${record.id}-result.json` };
      writeFileSync(join(AGENT_RUNS_DIR, `${record.id}-result.json`), JSON.stringify(execution, null, 2));
    }
    /*
     * 실패한 실행의 응답 원문도 남긴다.
     *
     * 검증에 걸려 결과를 쓰지 못한 실행은 그때까지 **비용이 이미 나갔고**, 응답
     * 자체는 온전한 경우가 많다(2026-08-23 실측: 유닛 32개 중 1개가 빠졌을 뿐
     * 판정 61건이 정상이었는데 통째로 사라졌다). 원문이 없으면 왜 실패했는지
     * 사후에 알 수 없고, 부분 복구도 못 한다.
     *
     * 러너는 이미 에러에 rawText를 붙여 올린다(l6-claude-runner.js) — 받는 쪽이
     * 저장하지 않아 절반만 고쳐진 상태였다.
     */
    if (failure?.rawText) {
      record = { ...record, failureFile: `${record.id}-failed.json` };
      writeFileSync(
        join(AGENT_RUNS_DIR, `${record.id}-failed.json`),
        JSON.stringify(
          {
            // 이 파일이 무엇인지 첫 두 줄로 밝힌다 — 나중에 폴더를 열어 본
            // 사람이 성공 결과(`-result.json`)와 헷갈리지 않게.
            recordType: 'FAILED_AGENT_RESPONSE',
            note: '검증을 통과하지 못해 결과로 쓰이지 않은 응답의 원문. 비용은 이미 발생했다.',
            id: record.id,
            kind: record.kind,
            packageName: record.packageName ?? null,
            versionRange: record.currentVersion
              ? `${record.currentVersion} → ${record.targetVersion ?? '?'}`
              : null,
            failedAt: record.finishedAt ?? null,
            error: failure.message ?? null,
            truncated: failure.truncated ?? null,
            usage: failure.usage ?? null,
            budget: failure.budget ?? null,
            rawText: failure.rawText,
          },
          null,
          2,
        ),
      );
    }
    writeFileSync(join(AGENT_RUNS_DIR, `${record.id}.json`), JSON.stringify(record, null, 2));
  } catch {
    /* a failed log write must never fail the run it describes */
  }
}

function handleAgentRunsRequest(request, response) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'GET is required' });
    return;
  }
  if (!existsSync(AGENT_RUNS_DIR)) {
    sendJson(response, 200, { runs: [], totalCount: 0 });
    return;
  }
  const all = readdirSync(AGENT_RUNS_DIR)
    // 곁딸린 본문 파일(`-result.json` · `-failed.json`)은 실행 기록이 아니다 —
    // 목록에 섞이면 실행 한 건이 두세 건으로 세어진다.
    .filter((name) => name.endsWith('.json') && !name.endsWith('-result.json') && !name.endsWith('-failed.json'))
    .map((name) => {
      try {
        return JSON.parse(readFileSync(join(AGENT_RUNS_DIR, name), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => String(right.startedAt ?? '').localeCompare(String(left.startedAt ?? '')));
  sendJson(response, 200, { runs: all.slice(0, AGENT_RUNS_LIST_LIMIT), totalCount: all.length });
}

/** Serves one run's full result body — the dev panel opens it in a new tab. */
function handleAgentRunResultRequest(response, runId) {
  // The id was matched as [A-Za-z0-9-]+, so it cannot traverse out of the dir.
  const path = join(AGENT_RUNS_DIR, `${runId}-result.json`);
  if (!existsSync(path)) {
    sendJson(response, 404, { error: `no result body for ${runId}` });
    return;
  }
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  createReadStream(path).pipe(response);
}

/**
 * Serves the raw response of a run that failed validation.
 *
 * 검증에 걸린 실행은 결과를 쓰지 못하지만 **비용은 이미 나갔고 응답 자체는 온전한
 * 경우가 많다.** 원문을 남겨두면 왜 실패했는지 사후에 읽을 수 있고, 부분 복구도
 * 가능하다 (2026-08-23: 유닛 32개 중 1개 누락으로 정상 판정 61건이 함께 사라졌다).
 */
function handleAgentRunFailureRequest(response, runId) {
  // The id was matched as [A-Za-z0-9-]+, so it cannot traverse out of the dir.
  const path = join(AGENT_RUNS_DIR, `${runId}-failed.json`);
  if (!existsSync(path)) {
    sendJson(response, 404, { error: `no failed response saved for ${runId}` });
    return;
  }
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  createReadStream(path).pipe(response);
}

/**
 * L6 — one synthesized impact-judgment call over the compact structures the
 * code side built (review groups, Agent REVIEW items, migration sections,
 * requirement diff). Runs through the local Claude Code CLI; same job/poll/
 * cancel surface as L4, sharing the job map (ids are prefixed l6-).
 */
/**
 * Returns the requirements diff computed against the run's target version,
 * or null when that is not possible — never a diff against something else.
 *
 * The general failure this guards against: data collected in an earlier stage
 * under that stage's defaults (the library screen compares installed vs
 * LATEST, because no target exists yet) flowing into a later stage where the
 * user has since fixed the context (a concrete target version). Any consumer
 * comparing against the wrong baseline manufactures obligations the chosen
 * upgrade never imposes. So this recomputes from registry metadata (process
 * cache, usually already warm from the probe) whenever the incoming diff was
 * compared against anything else — and prefers absence over a wrong baseline
 * when the registry is unreachable.
 */
async function reconcileRequirementsWithTarget(payload, onLog) {
  const targetVersion = payload.targetVersion ?? null;
  // No target (health check): companion-upgrade requirements have no meaning.
  if (!targetVersion) return null;
  if (payload.requirements?.comparedTo === targetVersion) return payload.requirements;

  try {
    const metadata = await loadPackageMetadata(payload.packageName);
    const requirements = diffRequirements(metadata, payload.currentVersion, targetVersion);
    onLog({
      stream: 'system',
      message: `requirements recomputed against target ${targetVersion}` +
        (payload.requirements?.comparedTo ? ` (client sent a diff against ${payload.requirements.comparedTo})` : ''),
    });
    return requirements;
  } catch (error) {
    onLog({
      stream: 'system',
      message: `requirements dropped — could not recompute against ${targetVersion}: ${error instanceof Error ? error.message : String(error)}`,
    });
    return null;
  }
}

/**
 * fixes 조립 — 결정론 합성 + (실행 모드에서만) L7.
 *
 * 결정론: 대상 패키지 자체의 package.json 상향(항상) + chain:* ACTION 중
 * peerAudit이 호환 버전을 실측한 동반 상향. Agent 몫: 그 외 코드 수정형
 * ACTION(guide:*·item:*·호환 버전 없는 chain). 전 블록은 verifyFixBlocks가
 * 실파일 대조 — 통과 못 한 생성 블록은 verified:false로 화면에서 걸러진다.
 */
async function assembleFixes(payload, result, { mock, signal, model, onLog }) {
  const judgments = result.judgments ?? [];
  const deterministic = synthesizeDeterministicFixes({
    projectPath: payload.projectPath,
    packageName: payload.packageName,
    currentVersion: payload.currentVersion,
    targetVersion: payload.targetVersion ?? null,
    judgments,
    peerAudit: payload.peerAudit ?? null,
  });
  const coveredUnits = new Set(deterministic.map((fix) => fix.unit));

  const agentTargets = judgments.filter(
    (judgment) => judgment.verdict === 'ACTION_REQUIRED' && !coveredUnits.has(judgment.unit),
  );

  let agentFixes = [];
  if (!mock && agentTargets.length) {
    onLog?.({ stream: 'system', message: `수정안 생성: 결정론 ${deterministic.length}건 + 코드 수정형 ${agentTargets.length}건` });
    // L7 실패는 코드 수정형 diff만 잃는다 — 결정론 fixes는 항상 반환한다.
    // (이전에는 여기서 던진 오류가 위의 catch에서 fixes 전체를 []로 만들었다.)
    try {
      const l7 = await runL7WithClaudeCli(
        {
          packageName: payload.packageName,
          currentVersion: payload.currentVersion,
          targetVersion: payload.targetVersion ?? null,
          projectPath: payload.projectPath,
          judgments: agentTargets,
          migrationSections: payload.migrationSections ?? [],
        },
        { signal, model, onLog },
      );
      agentFixes = (l7.result.fixes ?? [])
        .filter((fix) => (fix.files ?? []).length)
        .map((fix) => ({
          unit: fix.unit,
          title: judgments.find((judgment) => judgment.unit === fix.unit)?.action?.slice(0, 80) ?? fix.unit,
          source: 'agent',
          files: fix.files,
        }));
      for (const note of l7.result.dropped ?? []) {
        onLog?.({ stream: 'system', message: `수정안 항목 제외 — ${note}` });
      }
      onLog?.({ stream: 'system', message: `수정안 생성 완료 — ${agentFixes.length}건 · $${l7.meta.costUsd ?? '?'} · ${Math.round((l7.meta.durationMs ?? 0) / 1000)}s` });
    } catch (error) {
      onLog?.({ stream: 'system', message: `코드 수정형 diff 생성 실패(결정론 수정안은 유지): ${error instanceof Error ? error.message : String(error)}` });
    }
  }

  return verifyFixBlocks(payload.projectPath, [...deterministic, ...agentFixes]);
}

async function handleL6AgentJobsRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'POST is required' });
    return;
  }

  try {
    const body = await readJsonBody(request, { limitBytes: 4 * 1024 * 1024 });
    const payload = body?.payload;
    if (!payload || !payload.packageName || !payload.currentVersion) {
      throw new Error('payload.packageName and payload.currentVersion are required');
    }

    const id = `l6-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const job = {
      id,
      status: 'running',
      createdAt: now,
      updatedAt: now,
      finishedAt: null,
      logs: [],
      execution: null,
      error: null,
      controller: new AbortController(),
    };
    // Mock runs go through the deterministic path — same job/poll/record
    // surface, no Claude usage. Requested from the dev-tools pipeline tab.
    const mock = body.provider === 'fallback' || body.provider === 'mock';
    appendJobLog(job, {
      stream: 'system',
      message: `job ${id} queued (${mock ? 'deterministic mock' : 'claude-cli'} impact judgment)`,
    });
    l4Jobs.set(id, job);

    // Whatever the client sent, the requirements diff the judgment sees must
    // be computed against THIS run's target. buildL6Input drops any other
    // comparison, so recomputing here is what keeps the signal instead of
    // losing it. Stage-collected cards compare against latest — see
    // reconcileRequirementsWithTarget.
    payload.requirements = await reconcileRequirementsWithTarget(payload, (entry) => appendJobLog(job, entry));

    // Working directory = the target project. L6 no longer reads it with
    // Read/Grep/Glob (l6-deterministic-evidence-design.md) — this cwd only
    // matters for the mock/fallback path's file existence checks below and
    // for assembleJudgmentEvidence's own filesystem scan.
    const projectCwd = String(payload.projectPath ?? '').trim();

    /*
     * assembleJudgmentEvidence() — l6-deterministic-evidence-design.md §4.
     * Real runs only: the synthetic fallback never reads evidence fields at all (l6-fallback-
     * result.js), so scanning the project for either would be pure waste.
     * This is the ONLY place project source gets read for an L6 job now —
     * everything downstream (buildL6Prompt, the runner) is pure/tool-free.
     */
    if (!mock) {
      const assembled = assembleJudgmentEvidence(payload, { onLog: (entry) => appendJobLog(job, entry) });
      Object.assign(payload, assembled.payload);
    }

    /*
     * Timeout scales with the work. L6 wall time is linear in judgment units
     * (~6s/unit on a 39-file fixture, 12~20s/unit measured on a 401-file
     * project), so a flat 10 minutes killed a legitimate 79-unit run while
     * being over-generous for a 4-unit one. 25s/unit covers the worst
     * measured per-unit rate with headroom; the floor keeps small runs at
     * the old default, the ceiling bounds a runaway.
     */
    const unitCount = buildL6Input(payload).units?.length ?? 0;
    const scaledTimeoutMs = Math.min(30 * 60 * 1000, Math.max(10 * 60 * 1000, unitCount * 25 * 1000));
    if (!body.timeoutMs) {
      appendJobLog(job, { stream: 'system', message: `L6 timeout: ${Math.round(scaledTimeoutMs / 60000)}m (units ${unitCount})` });
    }
    const run = mock
      ? Promise.resolve(buildL6FallbackResult(payload))
      : runL6WithClaudeCli(payload, {
          signal: job.controller.signal,
          timeoutMs: body.timeoutMs ?? scaledTimeoutMs,
          model: body.model || undefined,
          cwd: projectCwd && existsSync(projectCwd) ? resolve(projectCwd) : undefined,
          onLog: (entry) => appendJobLog(job, entry),
        });
    run
      .then(async (execution) => {
        /*
         * 수정안(diff) 조립 — 판정 단계의 일부다(별도 진행 표기 없음,
         * 2026-08-22 사용자 결정). 결정론 합성(항상) + 코드 수정형 ACTION에 한해
         * L7 호출(mock에서는 호출하지 않음 — 과금 경로). 실패해도 판정
         * 자체를 잃지 않는다: diff 없는 성공이 diff 때문에 죽는 실패보다 낫다.
         */
        if (execution.result && !Array.isArray(execution.result.fixes)) {
          try {
            execution.result.fixes = await assembleFixes(payload, execution.result, {
              mock,
              signal: job.controller.signal,
              model: body.model || undefined,
              onLog: (entry) => appendJobLog(job, entry),
            });
          } catch (error) {
            execution.result.fixes = execution.result.fixes ?? [];
            appendJobLog(job, { stream: 'system', message: `수정안 생성 실패(판정은 유지): ${error instanceof Error ? error.message : String(error)}` });
          }
        }
        job.status = 'success';
        job.execution = execution;
        appendJobLog(job, { stream: 'system', message: 'impact judgment completed' });
      })
      .catch((error) => {
        job.status = job.controller.signal.aborted ? 'cancelled' : 'error';
        job.error = error instanceof Error ? error.message : String(error);
        // 러너가 붙여 올린 응답 원문·사용량을 기록용으로 보관한다.
        job.failure = {
          message: job.error,
          rawText: error?.rawText ?? null,
          usage: error?.usage ?? null,
          budget: error?.budget ?? null,
          truncated: error?.truncated ?? null,
        };
        appendJobLog(job, { stream: 'system', message: `${job.status}: ${job.error}` });
      })
      .finally(() => {
        job.finishedAt = new Date().toISOString();
        job.updatedAt = job.finishedAt;
        recordAgentRun({
          id: job.id,
          kind: 'L6',
          status: job.status,
          projectPath: String(payload.projectPath ?? '').trim() || null,
          packageName: payload.packageName,
          currentVersion: payload.currentVersion,
          targetVersion: payload.targetVersion ?? null,
          inputs: {
            reviewGroups: payload.reviewGroups?.length ?? 0,
            classifiedItems: payload.classifiedItems?.length ?? 0,
            migrationSections: payload.migrationSections?.length ?? 0,
          },
          outputs: job.execution
            ? {
                judgments: job.execution.result?.judgments?.length ?? 0,
                actionRequired: job.execution.result?.judgments?.filter((j) => j.verdict === 'ACTION_REQUIRED').length ?? 0,
                smokePoints: job.execution.result?.smokePoints?.length ?? 0,
              }
            : null,
          startedAt: job.createdAt,
          finishedAt: job.finishedAt,
          durationMs: Date.parse(job.finishedAt) - Date.parse(job.createdAt),
          agentDurationMs: job.execution?.meta?.durationMs ?? null,
          runner: job.execution?.meta?.runner ?? null,
          // Actual model from the CLI envelope; on failure fall back to what
          // was requested (null = CLI default was in effect).
          model: job.execution?.meta?.model ?? body.model ?? null,
          costUsd: job.execution?.meta?.costUsd ?? null,
          usage: job.execution?.meta?.usage ?? null,
          sessionId: job.execution?.meta?.sessionId ?? null,
          error: job.error,
        }, job.execution, job.failure);
      });

    sendJson(response, 202, snapshotJob(job));
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

async function handleL4AgentJobsRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'POST is required' });
    return;
  }

  try {
    const body = await readJsonBody(request, { limitBytes: 12 * 1024 * 1024 });
    const { stage3Result, maxItems, selectionMode, usage } = validateL4RequestBody(body);
    const l4Input = buildL4Input(stage3Result, { maxItems, selectionMode, usage });
    const triage = buildDeferredTriage(stage3Result, l4Input, usage);
    const job = createL4Job({ stage3Result, body, maxItems, selectionMode, usage, triage, l4Input });
    l4Jobs.set(job.id, job);
    runL4Job(job);
    sendJson(response, 202, snapshotJob(job));
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
  }
}

function handleL4AgentJobStatusRequest(request, response, jobId) {
  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'GET is required' });
    return;
  }

  const job = l4Jobs.get(jobId);
  if (!job) {
    sendJson(response, 404, { error: 'L4 job not found' });
    return;
  }
  sendJson(response, 200, snapshotJob(job));
}

function handleL4AgentJobCancelRequest(request, response, jobId) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'POST is required' });
    return;
  }

  const job = l4Jobs.get(jobId);
  if (!job) {
    sendJson(response, 404, { error: 'L4 job not found' });
    return;
  }

  if (job.status === 'running') {
    appendJobLog(job, { stream: 'system', message: 'cancel requested from UI' });
    job.controller.abort();
  }
  sendJson(response, 200, snapshotJob(job));
}

function validateL4RequestBody(body) {
  const stage3Result = body.stage3Result ?? body;
  if (!stage3Result || !Array.isArray(stage3Result.items)) {
    throw new Error('stage3Result.items is required');
  }

  const maxItems = body.maxItems === undefined ? 20 : Number(body.maxItems);
  if (!Number.isFinite(maxItems) || maxItems <= 0) {
    throw new Error('maxItems must be a positive number');
  }

  return {
    stage3Result,
    maxItems,
    selectionMode: body.selectionMode ?? 'priority',
    usage: runUsagePrescan(body.projectPath, stage3Result),
  };
}

/**
 * Pre-L4 usage scan over the item scopes.
 *
 * Runs in code, before and outside the Agent: the verdicts adjust which
 * budget candidates are worth an Agent slot, and are reported to the user —
 * but they are never written into the Agent prompt. L4 classifies the
 * changelog; whether the project is affected is a later (human, for now)
 * judgment.
 *
 * Best effort by design: a bad path or unreadable project must not block
 * classification, which works fine without usage evidence.
 */
function runUsagePrescan(projectPath, stage3Result) {
  const path = String(projectPath ?? '').trim();
  if (!path) return null;
  try {
    return prescanScopeUsage(resolve(path), stage3Result.items);
  } catch {
    return null;
  }
}

function createL4Job({ stage3Result, body, maxItems, selectionMode, usage, triage, l4Input }) {
  const id = `l4-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const job = {
    id,
    status: 'running',
    createdAt: now,
    updatedAt: now,
    finishedAt: null,
    logs: [],
    execution: null,
    error: null,
    controller: new AbortController(),
    stage3Result,
    usage,
    triage,
    // Which project this run analyzed — the run record carries it so the dev
    // panel can filter history per directory.
    projectPath: String(body.projectPath ?? '').trim() || null,
    options: {
      cwd: resolve('.'),
      maxItems,
      selectionMode,
      usage,
      model: body.model || undefined,
      provider: body.provider || undefined,
      fallbackOnError: body.fallbackOnError ?? true,
      fallbackRandomness: body.fallbackRandomness ?? body.randomness ?? 0,
      fallbackSeed: body.fallbackSeed || body.seed || undefined,
      // Per batch, not per run — see the sync endpoint.
      timeoutMs: body.timeoutMs ?? 10 * 60 * 1000,
      batchSize: body.batchSize,
      maxConcurrency: body.maxConcurrency,
      signal: null,
    },
    l4Input,
  };
  appendJobLog(job, { stream: 'system', message: `job ${id} queued` });
  appendJobLog(job, { stream: 'system', message: `source items=${l4Input.sourceItemCount}, included=${l4Input.includedItemCount}, deferred=${l4Input.deferredItemCount}` });
  return job;
}

async function runL4Job(job) {
  try {
    job.options.signal = job.controller.signal;
    const execution = await runL4Classification(job.stage3Result, {
      ...job.options,
      onLog: (entry) => appendJobLog(job, entry),
    });
    job.status = 'success';
    job.execution = attachInputSummary(execution, job.l4Input, job.usage, job.triage);
    if (execution.meta?.fallback) appendJobLog(job, { stream: 'system', message: 'job completed with fallback: ' + execution.meta.fallbackReason });
    else appendJobLog(job, { stream: 'system', message: 'job completed successfully' });
  } catch (error) {
    job.status = job.controller.signal.aborted ? 'cancelled' : 'error';
    job.error = error instanceof Error ? error.message : String(error);
    // 러너가 붙여 올린 응답 원문·사용량을 기록용으로 보관한다.
    job.failure = {
      message: job.error,
      rawText: error?.rawText ?? null,
      usage: error?.usage ?? null,
      budget: error?.budget ?? null,
      truncated: error?.truncated ?? null,
    };
    appendJobLog(job, { stream: 'system', message: `${job.status}: ${job.error}` });
  } finally {
    job.finishedAt = new Date().toISOString();
    job.updatedAt = job.finishedAt;
    recordAgentRun({
      id: job.id,
      kind: 'L4',
      status: job.status,
      projectPath: job.projectPath,
      packageName: job.stage3Result.packageName ?? null,
      currentVersion: job.stage3Result.currentVersion ?? null,
      targetVersion: job.stage3Result.targetVersion ?? null,
      inputs: {
        sourceItems: job.l4Input.sourceItemCount,
        includedItems: job.l4Input.includedItemCount,
        deferredItems: job.l4Input.deferredItemCount,
      },
      outputs: job.execution ? { classifiedItems: job.execution.result?.items?.length ?? 0 } : null,
      startedAt: job.createdAt,
      finishedAt: job.finishedAt,
      durationMs: Date.parse(job.finishedAt) - Date.parse(job.createdAt),
      agentDurationMs: job.execution?.meta?.durationMs ?? null,
      runner: job.execution?.meta?.runner ?? null,
      // Actual model from the CLI envelope; on failure fall back to what was
      // requested (L4's runner default is sonnet when nothing was asked).
      model: job.execution?.meta?.model ?? job.options.model ?? null,
      costUsd: job.execution?.meta?.costUsd ?? null,
      usage: job.execution?.meta?.usage ?? null,
      sessionId: job.execution?.meta?.sessionId ?? null,
      // How the fan-out was shaped and what it bought — the run record is
      // where an A/B against a single call gets its numbers.
      batchPlan: job.execution?.meta?.batchPlan ?? null,
      error: job.error,
    }, job.execution, job.failure);
  }
}

function appendJobLog(job, entry) {
  const message = typeof entry === 'string' ? entry : entry.message;
  const stream = typeof entry === 'string' ? 'system' : entry.stream ?? 'system';
  job.logs.push({
    at: new Date().toISOString(),
    stream,
    message: String(message ?? '').trimEnd(),
  });
  if (job.logs.length > 500) job.logs.splice(0, job.logs.length - 500);
  job.updatedAt = new Date().toISOString();
}

function snapshotJob(job) {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    finishedAt: job.finishedAt,
    logs: job.logs,
    execution: job.execution,
    error: job.error,
  };
}

function attachInputSummary(execution, l4Input, usage = null, triage = null) {
  return {
    ...execution,
    inputSummary: {
      sourceItemCount: l4Input.sourceItemCount,
      includedItemCount: l4Input.includedItemCount,
      deferredItemCount: l4Input.deferredItemCount,
      truncated: l4Input.truncated,
      selectionPolicy: l4Input.selectionPolicy,
      // Deterministic triage of deferred items: the concrete review list, and
      // what was excluded from review as a decision (unused scope, received
      // fixes/features, no risk signal).
      deferredTriage: triage,
      // The usage scan the SELECTION used, reported to the user and kept out
      // of the Agent prompt. The included/deferred split matters most:
      // deferred+USED is the bucket a person must review by hand.
      usagePrescan: buildUsagePrescanSummary(l4Input, usage),
    },
  };
}

function buildUsagePrescanSummary(l4Input, usage) {
  if (!usage) return null;
  const includedIds = new Set(l4Input.items.map((item) => item.itemId));
  const split = {
    included: { USED: 0, UNUSED: 0, UNDETERMINED: 0 },
    deferred: { USED: 0, UNUSED: 0, UNDETERMINED: 0 },
  };
  for (const [itemId, entry] of Object.entries(usage.byItemId)) {
    split[includedIds.has(itemId) ? 'included' : 'deferred'][entry.verdict] += 1;
  }
  return {
    scannedFiles: usage.scannedFiles,
    summary: usage.summary,
    ...split,
    byItemId: usage.byItemId,
  };
}

/* ---- 판정 Q&A handlers (optional feature; remove this block to drop it) ---
 *
 * Requires a local Claude CLI — see src/agent/judgment-chat.js. The health
 * route exists so the UI can disable its button with a reason instead of
 * failing on the user's first question.
 */

async function handleChatHealthRequest(response) {
  try {
    sendJson(response, 200, await checkChatAvailability());
  } catch (error) {
    // A probe that itself broke is still "unavailable" as far as the UI goes.
    sendJson(response, 200, { available: false, reason: error instanceof Error ? error.message : String(error) });
  }
}

async function handleChatRequest(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'POST is required' });
    return;
  }

  /*
   * The client aborts on 중단; killing the CLI child is the point of doing so.
   *
   * This listens on the RESPONSE, not the request: since Node 16 an
   * IncomingMessage emits 'close' as soon as its body has been fully
   * consumed, so `request.on('close')` fires on every normal request and
   * would abort the CLI the instant the body finished parsing — measured, it
   * killed the child mid-spawn and the resulting stdin EPIPE took the whole
   * server down. A response that closes while `writableFinished` is false is
   * the actual "client went away" signal.
   */
  const controller = new AbortController();
  response.on('close', () => {
    if (!response.writableFinished) controller.abort();
  });

  try {
    const body = await readJsonBody(request, { limitBytes: 2 * 1024 * 1024 });
    const question = String(body.question ?? '').trim();
    if (!question) throw new Error('question is required');
    if (!body.judgment) throw new Error('judgment is required');

    // A missing/absent projectPath is rejected by askJudgmentQuestion itself
    // (it owns the spawn whose cwd this becomes), so there is no check here.
    const projectPath = String(body.projectPath ?? '').trim();

    const result = await askJudgmentQuestion(
      {
        packageName: body.packageName ?? null,
        currentVersion: body.currentVersion ?? null,
        targetVersion: body.targetVersion ?? null,
        projectPath: projectPath ? resolve(projectPath) : null,
        judgment: body.judgment,
        sourceItem: body.sourceItem ?? null,
        // 화면의 「패키지 상태」와 같은 데이터(지원 종료·취약점) — 이게 없으면
        // Agent가 화면에 보이는 사실을 부정하는 답을 낸다.
        advisory: body.advisory ?? null,
        // 전수 조사(2026-08-13): 화면에 뜨는 항목별 정보는 전부 넘긴다.
        evidenceGap: body.evidenceGap ?? null,
        checklistEntry: body.checklistEntry ?? null,
        runSummary: body.runSummary ?? null,
        smokePoints: body.smokePoints ?? null,
        // History is capped inside judgment-chat.js regardless of what the
        // client sent — the cost guard cannot live on the client alone.
        history: body.history,
        question,
      },
      { model: body.model, signal: controller.signal },
    );

    sendJson(response, 200, result);
  } catch (error) {
    if (response.writableEnded) return;
    const message = error instanceof Error ? error.message : String(error);
    sendJson(response, /cancelled/i.test(message) ? 499 : 400, { error: message });
  }
}

/* ---- /판정 Q&A handlers -------------------------------------------------- */

function readJsonBody(request, options = {}) {
  const limitBytes = options.limitBytes ?? 1024 * 1024;
  return new Promise((resolvePromise, reject) => {
    let size = 0;
    let body = '';

    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        request.destroy();
        reject(new Error(`Request body exceeds ${limitBytes} bytes`));
        return;
      }
      body += chunk.toString('utf8');
    });

    request.on('end', () => {
      try {
        resolvePromise(body ? JSON.parse(stripBom(body)) : {});
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
  });
}

function stripBom(text) {
  return String(text).charCodeAt(0) === 0xfeff ? String(text).slice(1) : String(text);
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload, null, 2));
}

server.listen(port, () => {
  console.log(`lib-impact-analyzer web: http://localhost:${port}`);
});