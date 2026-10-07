import { computed, reactive } from 'vue';
import { api } from '../api/client.js';
import { buildManualCheckRows, mockImpactJudgment } from '../mock/notImplemented.js';

/*
 * The five stages inside the analysis run. Their fine-grained state is shown
 * by the stepper on screen 04; the header progress bar tracks the wizard step
 * instead, so there is no weighting here.
 */
const PIPELINE_STEPS = Object.freeze([
  { key: 'collect', label: '공식 변경사항 수집' },
  { key: 'classify', label: '변경사항 분석' },
  { key: 'search', label: '관련 코드 탐색' },
  { key: 'evidence', label: '영향 근거 확인' },
  { key: 'finalize', label: '결과 정리' },
]);

/** The wizard steps shown in the header rail, and the unit of progress. */
export const WIZARD_STEPS = Object.freeze([
  { view: 'project', label: '프로젝트' },
  { view: 'library', label: '라이브러리' },
  { view: 'version', label: '버전' },
  { view: 'running', label: '분석' },
  { view: 'result', label: '결과' },
]);

export const RESULT_TABS = Object.freeze([
  // Order is by AUDIENCE, not by pipeline stage — kept in step with the
  // product screen: deliverable tabs first, intermediate data last.
  { key: 'summary', label: '요약', width: 80 },
  { key: 'files', label: '영향 파일', width: 90 },
  { key: 'impact', label: '대응·테스트', width: 110 },
  { key: 'manual', label: '추가 확인', width: 80 },
  { key: 'changes', label: '변경사항', width: 90 },
  { key: 'classification', label: '분류결과', width: 100 },
]);

export function compareSemver(a, b) {
  const left = String(a || '').split('-')[0].split('.').map((n) => Number(n) || 0);
  const right = String(b || '').split('-')[0].split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < 3; i += 1) {
    if ((left[i] ?? 0) > (right[i] ?? 0)) return 1;
    if ((left[i] ?? 0) < (right[i] ?? 0)) return -1;
  }
  return 0;
}

function normalizeVersion(value) {
  const match = String(value || '').match(/\d+\.\d+\.\d+/);
  return match ? match[0] : '';
}

const IDLE_MESSAGE = '분석할 프로젝트 경로를 확인한 뒤 실행하세요';

/**
 * The single definition of "empty". `resetSession()` assigns this wholesale,
 * so a new field can never be forgotten by the reset path.
 */
function createInitialState() {
  return {
    // view: which screen is on the main card
    view: 'project', // project | library | version | running | result
    activeTab: 'summary',

    projectPath: '',
    platform: '',
    message: IDLE_MESSAGE,
    messageTone: 'muted',
    lastAnalyzedAt: null,

    busy: false,
    error: null,

    dependencies: null,
    librarySearch: '',
    libraryTypeFilter: 'ALL',
    librarySort: 'NAME',

    selectedDependency: null,
    targetVersion: '',
    // Both come from the server, which derives them from the release data
    // files. The UI keeps no version list of its own.
    supportedPackages: [],
    versionCatalog: [],

    steps: PIPELINE_STEPS.map((step) => ({
      ...step,
      status: 'pending',
      startedAt: null,
      endedAt: null,
    })),
    // Bumped once a second while a run is in flight so elapsed timers re-render.
    tick: 0,
    useMock: false,

    parseResult: null,
    l4JobId: null,
    l4Status: 'idle',
    l4Logs: [],
    l4Execution: null,

    selectedItemId: null,
    sourceMatch: null,
    selectedFilePath: null,
  };
}

const state = reactive(createInitialState());

let pollTimer = null;
let tickTimer = null;

// Bumped by every reset. An async flow that started under an older generation
// must not write state or surface errors after being superseded.
let generation = 0;
let sessionAbort = new AbortController();

const isCurrent = (token) => token === generation;

function setStep(key, status) {
  const step = state.steps.find((entry) => entry.key === key);
  if (!step) return;
  const now = Date.now();
  if (status === 'running' && !step.startedAt) step.startedAt = now;
  if ((status === 'done' || status === 'error') && step.startedAt && !step.endedAt) {
    step.endedAt = now;
  }
  step.status = status;
}

function resetSteps() {
  for (const step of state.steps) {
    step.status = 'pending';
    step.startedAt = null;
    step.endedAt = null;
  }
}

function startTicker() {
  stopTicker();
  tickTimer = setInterval(() => {
    state.tick += 1;
  }, 1000);
}

function stopTicker() {
  clearInterval(tickTimer);
  tickTimer = null;
}

function say(message, tone = 'muted') {
  state.message = message;
  state.messageTone = tone;
}

// --- derived ------------------------------------------------------------

/*
 * Progress tracks the wizard step, not work inside a step: 프로젝트 20% →
 * 라이브러리 40% → 버전 60% → 분석 80% → 결과 100%. Screen 04's own stepper
 * covers what is happening inside the analysis run.
 */
const progressPercent = computed(() => {
  const index = WIZARD_STEPS.findIndex((step) => step.view === state.view);
  if (index < 0) return 0;
  return Math.round(((index + 1) / WIZARD_STEPS.length) * 100);
});

const directDependencies = computed(() => {
  const packages = state.dependencies?.packages ?? [];
  return packages.flatMap((pkg) => pkg.directDependencies ?? []);
});

const classificationItems = computed(() => state.l4Execution?.result?.items ?? []);

const selectedItem = computed(
  () => classificationItems.value.find((item) => item.itemId === state.selectedItemId) ?? null,
);

const selectedFile = computed(() => {
  const files = state.sourceMatch?.candidateFiles ?? [];
  return files.find((file) => file.path === state.selectedFilePath) ?? files[0] ?? null;
});

const impactJudgment = computed(() => mockImpactJudgment(selectedItem.value, state.sourceMatch));

const manualCheckRows = computed(() =>
  buildManualCheckRows({
    dependencies: directDependencies.value,
    l4Result: state.l4Execution,
    sourceMatch: state.sourceMatch,
  }),
);

const isMockClassification = computed(() => Boolean(state.l4Execution?.meta?.fallback));

// --- actions ------------------------------------------------------------

async function loadConfig() {
  const token = generation;
  try {
    const config = await api.config(sessionAbort.signal);
    if (!isCurrent(token)) return;
    state.platform = config.platform ?? '';
    state.supportedPackages = config.supportedPackages ?? [];
    if (config.defaultProjectPath && !state.projectPath.trim()) {
      state.projectPath = config.defaultProjectPath;
      say('기본 테스트 픽스처 경로가 준비되었습니다. 바로 실행할 수 있습니다.', 'muted');
    }
  } catch {
    if (!isCurrent(token)) return;
    say('설정 API를 불러오지 못했습니다. 프로젝트 경로를 직접 입력하세요.', 'warn');
  }
}

/*
 * The folder dialog is opened by the LOCAL SERVER, not the browser. The
 * browser's picker hides the absolute path by design, and this tool scans the
 * project by path — so the only picker that can actually fill the input is
 * one owned by a process on the same machine.
 */
async function pickDirectory() {
  const token = generation;
  say('폴더 선택 창을 열었습니다. 다른 창 뒤에 떠 있을 수 있습니다.', 'muted');
  try {
    const picked = await api.pickDirectory(sessionAbort.signal);
    if (!isCurrent(token)) return;
    if (picked?.cancelled) {
      say('폴더 선택을 취소했습니다.', 'muted');
      return;
    }
    state.projectPath = picked.path;
    say(`'${picked.path}' 로 설정했습니다. 실행을 누르면 의존성을 분석합니다.`, 'ok');
  } catch (error) {
    if (!isCurrent(token)) return;
    say(`폴더 선택 창을 열지 못했습니다: ${error.message} — 경로를 직접 입력하세요.`, 'warn');
  }
}

async function analyzeDependencies() {
  const projectPath = state.projectPath.trim();
  if (!projectPath) {
    say('프로젝트 경로를 입력하세요.', 'bad');
    return;
  }

  const token = generation;
  state.busy = true;
  state.error = null;
  say('의존성을 분석하고 있습니다...', 'muted');

  try {
    const result = await api.dependencies(projectPath, sessionAbort.signal);
    if (!isCurrent(token)) return;
    state.dependencies = result;
    state.lastAnalyzedAt = new Date();
    state.view = 'library';
    const count = directDependencies.value.length;
    say(`${count}개의 직접 의존성을 확인했습니다. 분석할 라이브러리를 선택하세요.`, 'ok');
  } catch (error) {
    if (!isCurrent(token)) return;
    state.error = error.message;
    say(error.message, 'bad');
  } finally {
    if (isCurrent(token)) state.busy = false;
  }
}

async function selectDependency(dependency) {
  const token = generation;
  state.selectedDependency = dependency;
  state.targetVersion = '';
  state.versionCatalog = [];
  state.view = 'version';
  say(`${dependency.name}의 버전 목록을 불러오는 중입니다...`, 'muted');

  try {
    const catalog = await api.changelogVersions(dependency.name, sessionAbort.signal);
    if (!isCurrent(token)) return;
    state.versionCatalog = catalog.versions ?? [];
    say(`${dependency.name}의 현재 버전과 목표 버전을 확인한 후 분석을 실행하세요.`, 'muted');
  } catch (error) {
    if (!isCurrent(token)) return;
    say(`${dependency.name}의 릴리즈 데이터를 불러오지 못했습니다: ${error.message}`, 'bad');
  }
}

function backToLibrary() {
  state.view = 'library';
  state.error = null;
  say('분석할 라이브러리를 선택하세요.', 'muted');
}

/** A step is reachable once the data it depends on exists, and never mid-run. */
function canVisit(view) {
  if (state.busy || view === state.view) return false;
  if (view === 'project') return true;
  if (view === 'library') return Boolean(state.dependencies);
  if (view === 'version') return Boolean(state.selectedDependency);
  if (view === 'result') return Boolean(state.l4Execution);
  return false; // 'running' is transient — never navigable
}

const STEP_MESSAGE = {
  project: '분석할 프로젝트 경로를 확인한 뒤 실행하세요',
  library: '분석할 라이브러리를 선택하세요.',
  version: '현재 버전과 목표 버전을 확인한 뒤 실행하세요.',
  result: '분석 결과를 탭에서 확인하세요.',
};

function goToStep(view) {
  if (!canVisit(view)) return;
  state.view = view;
  state.error = null;
  say(STEP_MESSAGE[view] ?? '', 'muted');
}

function backToVersion() {
  clearTimeout(pollTimer);
  stopTicker();
  state.view = 'version';
  state.error = null;
  state.busy = false;
  resetSteps();
  say('현재 버전과 목표 버전을 다시 확인한 뒤 실행하세요.', 'muted');
}

function targetVersionOptions() {
  const current = normalizeVersion(state.selectedDependency?.resolvedVersion);
  return state.versionCatalog.filter((version) => compareSemver(version, current) > 0);
}

/**
 * @param {{ useMock?: boolean }} [options]
 *   useMock skips the Claude CLI and runs L4 through the deterministic fallback
 *   generator. Everything downstream still runs for real against that output.
 */
async function runAnalysis(options = {}) {
  const dependency = state.selectedDependency;
  if (!dependency) return;

  const packageName = dependency.name;
  const currentVersion = normalizeVersion(dependency.resolvedVersion);
  const targetVersion = state.targetVersion || null;

  const token = generation;
  const signal = sessionAbort.signal;

  state.useMock = Boolean(options.useMock);
  state.busy = true;
  state.error = null;
  state.view = 'running';
  state.parseResult = null;
  state.l4Execution = null;
  state.sourceMatch = null;
  state.selectedItemId = null;
  state.selectedFilePath = null;
  state.l4Logs = [];
  resetSteps();
  startTicker();

  try {
    // Step 1 — official release documents
    setStep('collect', 'running');
    say(
      targetVersion
        ? `${packageName} ${currentVersion}에서 ${targetVersion}까지의 변경사항을 수집하고 분류하고 있습니다.`
        : `${packageName} ${currentVersion}의 현재 버전 변경사항을 수집하고 있습니다.`,
      'muted',
    );
    const parsed = await api.parseChangelog(
      { packageName, currentVersion, targetVersion },
      signal,
    );
    if (!isCurrent(token)) return;
    state.parseResult = parsed;
    setStep('collect', 'done');

    // Step 2 — L4 classification (async job with logs + cancel)
    setStep('classify', 'running');
    await runL4Job(token, signal);
    if (!isCurrent(token) || state.l4Status === 'cancelled') return;
    setStep('classify', 'done');

    // Step 3 — deterministic source matching for the highest-priority item
    setStep('search', 'running');
    const first = pickPriorityItem();
    if (first) {
      state.selectedItemId = first.itemId;
      await runSourceMatch(first, signal);
    }
    if (!isCurrent(token)) return;
    setStep('search', 'done');

    // Step 4 — L6 impact judgment is not implemented; the UI shows placeholders
    setStep('evidence', 'running');
    setStep('evidence', 'done');
    setStep('finalize', 'running');
    setStep('finalize', 'done');

    state.view = 'result';
    state.activeTab = 'summary';
    say('공식 변경 문서 수집과 구조화가 완료되었습니다. 변경사항과 분류결과를 순서대로 확인하세요.', 'ok');
  } catch (error) {
    // A session reset aborts in-flight requests; that is not a failure to report.
    if (!isCurrent(token)) return;
    state.error = error.message;
    for (const step of state.steps) {
      if (step.status === 'running') setStep(step.key, 'error');
    }
    say(error.message, 'bad');
  } finally {
    if (isCurrent(token)) {
      state.busy = false;
      stopTicker();
    }
  }
}

function pickPriorityItem() {
  const items = classificationItems.value;
  return (
    items.find((item) => item.reviewRequired && item.preliminaryRisk === 'HIGH') ??
    items.find((item) => item.reviewRequired) ??
    items[0] ??
    null
  );
}

function runL4Job(token, signal) {
  return new Promise((resolvePromise, rejectPromise) => {
    api
      .startL4Job(
        {
          stage3Result: state.parseResult,
          maxItems: 20,
          selectionMode: 'priority',
          fallbackOnError: true,
          ...(state.useMock ? { provider: 'fallback' } : {}),
        },
        signal,
      )
      .then((job) => {
        if (!isCurrent(token)) return resolvePromise(null);
        state.l4JobId = job.id;
        state.l4Status = job.status;
        state.l4Logs = job.logs ?? [];
        return pollL4Job(token, signal, resolvePromise, rejectPromise);
      })
      .catch(rejectPromise);
  });
}

function pollL4Job(token, signal, resolvePromise, rejectPromise) {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    if (!isCurrent(token)) {
      resolvePromise(null);
      return;
    }
    try {
      const job = await api.getL4Job(state.l4JobId, signal);
      if (!isCurrent(token)) {
        resolvePromise(null);
        return;
      }
      state.l4Status = job.status;
      state.l4Logs = job.logs ?? [];

      if (job.status === 'running') {
        pollL4Job(token, signal, resolvePromise, rejectPromise);
        return;
      }
      if (job.status === 'success') {
        state.l4Execution = job.execution;
        resolvePromise(job.execution);
        return;
      }
      if (job.status === 'cancelled') {
        say('사용자가 분석을 취소했습니다.', 'warn');
        for (const step of state.steps) {
          if (step.status === 'running') step.status = 'pending';
        }
        resolvePromise(null);
        return;
      }
      rejectPromise(new Error(job.error ?? 'L4 분류 작업이 실패했습니다.'));
    } catch (error) {
      rejectPromise(error);
    }
  }, 700);
}

async function cancelAnalysis() {
  if (!state.l4JobId || state.l4Status !== 'running') {
    clearTimeout(pollTimer);
    stopTicker();
    state.view = 'version';
    state.busy = false;
    resetSteps();
    say('분석을 중단했습니다.', 'warn');
    return;
  }
  try {
    await api.cancelL4Job(state.l4JobId);
  } catch (error) {
    say(error.message, 'bad');
  }
}

async function runSourceMatch(item, signal) {
  const projectPath = state.projectPath.trim();
  if (!projectPath || !item) return;

  const result = await api.sourceMatch(
    {
      projectPath,
      packageName: state.selectedDependency?.name,
      currentVersion: normalizeVersion(state.selectedDependency?.resolvedVersion),
      targetVersion: state.targetVersion || null,
      classificationItem: item,
    },
    signal,
  );
  state.sourceMatch = result;
  state.selectedFilePath = result?.candidateFiles?.[0]?.path ?? null;
}

async function selectClassificationItem(item) {
  const token = generation;
  const signal = sessionAbort.signal;
  state.selectedItemId = item.itemId;
  state.activeTab = 'files';
  state.busy = true;
  try {
    await runSourceMatch(item, signal);
    if (!isCurrent(token)) return;
    say(`${item.scope || item.itemId}의 관련 파일 후보를 확인하세요.`, 'ok');
  } catch (error) {
    if (!isCurrent(token)) return;
    state.error = error.message;
    say(error.message, 'bad');
  } finally {
    if (isCurrent(token)) state.busy = false;
  }
}

function selectFile(path) {
  state.selectedFilePath = path;
  state.activeTab = 'impact';
}

function setTab(key) {
  state.activeTab = key;
}

/**
 * True when a reset would throw away work the user cannot cheaply redo:
 * a run in flight, or a finished Agent classification.
 */
const hasWorkToDiscard = computed(() => state.busy || Boolean(state.l4Execution));

/**
 * Full session reset. Stops the server-side Agent job, aborts every in-flight
 * request, clears all timers, and returns the store to its initial state.
 */
function resetSession() {
  // Ask the server to stop the agent process before dropping the job id.
  const runningJobId = state.l4JobId && state.l4Status === 'running' ? state.l4JobId : null;
  if (runningJobId) {
    api.cancelL4Job(runningJobId).catch(() => {
      /* best effort — the local session is being torn down regardless */
    });
  }

  generation += 1;
  sessionAbort.abort();
  sessionAbort = new AbortController();

  clearTimeout(pollTimer);
  pollTimer = null;
  stopTicker();

  Object.assign(state, createInitialState());
  loadConfig();
}

export function useAnalysis() {
  return {
    // Returned mutable so `v-model` can bind straight to inputs.
    state,
    progressPercent,
    directDependencies,
    classificationItems,
    selectedItem,
    selectedFile,
    impactJudgment,
    manualCheckRows,
    isMockClassification,
    hasWorkToDiscard,
    loadConfig,
    pickDirectory,
    analyzeDependencies,
    selectDependency,
    backToLibrary,
    backToVersion,
    canVisit,
    goToStep,
    targetVersionOptions,
    runAnalysis,
    cancelAnalysis,
    selectClassificationItem,
    selectFile,
    setTab,
    resetSession,
  };
}
