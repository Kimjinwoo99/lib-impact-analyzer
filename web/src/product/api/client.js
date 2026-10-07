export class AbortedError extends Error {
  constructor() {
    super('요청이 중단되었습니다.');
    this.name = 'AbortedError';
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, options);
  } catch (error) {
    if (error?.name === 'AbortError') throw new AbortedError();
    throw error;
  }
  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`Unexpected non-JSON response from ${path}`);
    }
  }

  if (!response.ok) {
    throw new Error(payload?.error ?? `${path} failed with ${response.status}`);
  }
  return payload;
}

function postJson(path, body, signal) {
  return request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

// Every call takes an optional AbortSignal so a session reset can drop
// in-flight requests instead of letting them land on cleared state.
export const api = {
  config: (signal) => request('/api/config', { signal }),

  // Opens a native folder dialog on the machine the server runs on and
  // returns the absolute path — the one thing the browser's own picker is
  // forbidden from revealing.
  pickDirectory: (signal) => postJson('/api/pick-directory', {}, signal),

  // The chosen project's own README (root only). Never throws for "absent" —
  // that is a normal answer with found:false.
  projectReadme: (projectPath, signal) =>
    request(`/api/project/readme?projectPath=${encodeURIComponent(projectPath)}`, { signal }),

  dependencies: (projectPath, signal) =>
    request(`/api/dependencies?projectPath=${encodeURIComponent(projectPath)}`, { signal }),

  // A few source lines at judgment-cited positions — the 대응·테스트 작업대
  // 상세 패널의 "판정 지목 위치" rows. lines is "39,46-59" style.
  projectSnippet: (projectPath, file, lines, signal) =>
    request(
      `/api/project/snippet?projectPath=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(file)}&lines=${encodeURIComponent(lines)}`,
      { signal },
    ),

  /*
   * T1 collection. Versions come from the npm registry rather than a
   * checked-in data file, so any dependency with a GitHub repository can be
   * analysed — not only the ones someone collected in advance.
   */
  t1Versions: (packageName, signal) =>
    request(`/api/collect/t1/versions?packageName=${encodeURIComponent(packageName)}`, { signal }),

  // Registry lookup only: tells which packages T1 can be attempted for.
  t1Probe: (packages, signal) => postJson('/api/collect/t1/probe', { packages }, signal),

  // Per-library information cards: registry facts + OSV vulnerabilities +
  // downloads. `packages` is [{ name, version }].
  collectInfo: (packages, signal) => postJson('/api/collect/info', { packages }, signal),

  // 프로젝트 소스에서의 참조 요약 — '미사용 의심' 신호용 실측.
  usageRefs: (body, signal) => postJson('/api/project/usage-refs', body, signal),

  // Reverse peer audit: which installed packages' peer declarations reject
  // the chosen target version of the analyzed package.
  peerAudit: (body, signal) => postJson('/api/collect/peer-audit', body, signal),

  // The chain: T1 atom, then T2-git for whatever atom could not read. Neither
  // tier needs a token, so this is the whole implemented collection path.
  // projectPath is optional and only load-bearing for a healthcheck run
  // (targetVersion empty) — it lets the server check which unapplied patches
  // touch a scope this project actually uses.
  collect: ({ packageName, currentVersion, targetVersion, projectPath }, signal) => {
    const params = new URLSearchParams({ packageName, currentVersion });
    if (targetVersion) params.set('targetVersion', targetVersion);
    if (projectPath) params.set('projectPath', projectPath);
    return request(`/api/collect?${params}`, { signal });
  },

  startL4Job: (body, signal) => postJson('/api/agent/l4/jobs', body, signal),
  getL4Job: (jobId, signal) => request(`/api/agent/l4/jobs/${encodeURIComponent(jobId)}`, { signal }),

  // Durable per-run agent records (what · when · duration · tokens · cost).
  agentRuns: (signal) => request('/api/agent/runs', { signal }),

  // L6 — one synthesized impact-judgment call (local Claude CLI).
  startL6Job: (body, signal) => postJson('/api/agent/l6/jobs', body, signal),
  getL6Job: (jobId, signal) => request(`/api/agent/l6/jobs/${encodeURIComponent(jobId)}`, { signal }),
  cancelL6Job: (jobId) => postJson(`/api/agent/l6/jobs/${encodeURIComponent(jobId)}/cancel`, {}),

  // Deliberately unsignalled: this is the call that stops server-side work,
  // so it must survive the abort that triggers it.
  cancelL4Job: (jobId) => postJson(`/api/agent/l4/jobs/${encodeURIComponent(jobId)}/cancel`, {}),

  // Migration guide for a major upgrade, filtered to components this project
  // uses. Read from the clone the collector already made — no extra network.
  migration: (body, signal) => postJson('/api/migration', body, signal),

  sourceMatch: (body, signal) => postJson('/api/source-match', body, signal),

  // ---- 판정 Q&A (optional feature; remove these two to drop it) ----------
  // Both need a local Claude CLI. `chatHealth` is what lets the panel say so
  // up front rather than failing on the user's first question.
  chatHealth: (signal) => request('/api/agent/chat/health', { signal }),
  askJudgment: (body, signal) => postJson('/api/agent/chat', body, signal),
};
