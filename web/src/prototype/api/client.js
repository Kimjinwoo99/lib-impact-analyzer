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

  dependencies: (projectPath, signal) =>
    request(`/api/dependencies?projectPath=${encodeURIComponent(projectPath)}`, { signal }),

  changelogVersions: (packageName, signal) =>
    request(`/api/changelog/versions?packageName=${encodeURIComponent(packageName)}`, { signal }),

  parseChangelog: ({ packageName, currentVersion, targetVersion }, signal) => {
    const params = new URLSearchParams({ packageName, currentVersion });
    if (targetVersion) params.set('targetVersion', targetVersion);
    return request(`/api/changelog/parse?${params}`, { signal });
  },

  startL4Job: (body, signal) => postJson('/api/agent/l4/jobs', body, signal),
  getL4Job: (jobId, signal) => request(`/api/agent/l4/jobs/${encodeURIComponent(jobId)}`, { signal }),

  // Deliberately unsignalled: this is the call that stops server-side work,
  // so it must survive the abort that triggers it.
  cancelL4Job: (jobId) => postJson(`/api/agent/l4/jobs/${encodeURIComponent(jobId)}/cancel`, {}),

  sourceMatch: (body, signal) => postJson('/api/source-match', body, signal),
};
