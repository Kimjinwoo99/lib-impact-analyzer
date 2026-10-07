import { computed, reactive } from 'vue';
import { api } from '../api/client.js';
import { buildManualCheckRows } from './manualCheck.js';

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

/*
 * A healthcheck does not classify, search, or judge — it makes one collect
 * call and reads a verdict the server already assembled deterministically.
 * Marking the upgrade pipeline's classify/search/evidence steps "done"
 * instantly for a run that never did that work was dishonest progress UI
 * (steps flashing complete with no work behind them); this is the real,
 * shorter shape of what a healthcheck run does.
 */
const HEALTHCHECK_STEPS = Object.freeze([
  { key: 'collect', label: '릴리즈 정보 수집' },
  { key: 'diagnose', label: '진단' },
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
  // Order is by AUDIENCE, not by pipeline stage: the first four are the
  // deliverable a person acts on; the last three are intermediate data the
  // deliverable was derived from (kept for verification, each opens with a
  // line saying which stage produced it and what consumes it).
  { key: 'summary', label: '요약', width: 80 },
  /*
   * Healthcheck-only — the pipeline never runs L4/L6 for a healthcheck (see
   * runAnalysis), so this tab is that mode's entire deliverable instead of a
   * work checklist: a triage verdict (SECURITY/LINE_DORMANT/PATCH_AVAILABLE/
   * HEALTHY) assembled deterministically on the server, plus a one-click
   * route into an upgrade run when the verdict says to move.
   */
  { key: 'diagnosis', label: '진단', width: 70 },
  /*
   * The work checklist — one row per judgment, ACTION_REQUIRED first. This is
   * the deliverable a person executes, so it sits right after the summary.
   *
   * The DEFAULT axis is the ACTION, not the file: an upgrade is done as
   * "replace this plugin" (touching three files at once), and measured on the
   * vite golden run the file axis collapsed anyway — two config files carried
   * 14 of 21 citations, while 5 of 19 actionable judgments cited no file at
   * all and were unreachable from the file list.
   *
   * But the file axis is a real second reading of the SAME judgments (fold by
   * `files[]`), so it is a toggle inside this tab rather than the separate
   * 영향 파일 tab it used to be — and the per-judgment detail (근거·조치·검증
   * + the file:line the judgment cited) is the right-hand panel rather than
   * the separate 파일 상세 tab. Both former tabs were views OF this one's
   * data; splitting them cost the reader their place in the list on every
   * click. Text-match candidates moved to 분류결과, where the item that
   * produced them lives.
   */
  { key: 'impact', label: '대응·테스트', width: 110 },
  { key: 'manual', label: '추가 확인', width: 80 },
  { key: 'collect', label: '수집', width: 70 },
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

/*
 * DEV — Agent 모델 실험 설정 (개발도구 패널에서 변경).
 * 빈 값이면 러너 기본값(L4=sonnet, L6=CLI 기본 모델)을 쓴다. 최종적으로 모델이
 * 고정되면 이 설정과 패널은 함께 제거된다. localStorage에 남겨 리로드/세션
 * 초기화에도 실험 조건이 유지되게 한다. SSR(렌더 스모크)에는 localStorage가
 * 없으므로 가드한다.
 */
const MODEL_STORE_KEY = 'lia.dev.agentModels';

// 초기 버전이 저장한 별칭 값 → 이름+버전 명시 ID (별칭은 CLI가 최신으로
// 해석하므로 동작은 같지만, 패널 select 옵션과 값이 일치해야 표시된다).
const MODEL_ALIAS_TO_ID = {
  haiku: 'claude-haiku-4-5',
  sonnet: 'claude-sonnet-5',
  opus: 'claude-opus-5',
};

function readStoredAgentModels() {
  try {
    if (typeof localStorage === 'undefined') return { l4: '', l6: '' };
    const stored = { l4: '', l6: '', ...JSON.parse(localStorage.getItem(MODEL_STORE_KEY) ?? '{}') };
    stored.l4 = MODEL_ALIAS_TO_ID[stored.l4] ?? stored.l4;
    stored.l6 = MODEL_ALIAS_TO_ID[stored.l6] ?? stored.l6;
    return stored;
  } catch {
    return { l4: '', l6: '' };
  }
}

function setAgentModel(kind, model) {
  state.agentModels[kind] = model;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MODEL_STORE_KEY, JSON.stringify(state.agentModels));
    }
  } catch {
    /* 저장 실패는 실험 편의 기능이라 무시 */
  }
}

/*
 * DEV — 파이프라인 실행 방식 (개발도구 패널에서 변경).
 * 'real'  = 실제 Agent 호출 (실구현 동작, 기본값)
 * 'mock'  = 결정론 폴백 — 화면을 돌려보되 사용량을 쓰지 않는다
 * 운영에서는 패널과 함께 제거되고 기본값('real')만 남는다.
 */
const MODE_STORE_KEY = 'lia.dev.agentModes';
const DEFAULT_MODES = { l4: 'real', l6: 'real' };

function readStoredAgentModes() {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_MODES };
    const stored = { ...DEFAULT_MODES, ...JSON.parse(localStorage.getItem(MODE_STORE_KEY) ?? '{}') };
    // 알 수 없는 값은 실제 실행으로 —  실수로 mock에 갇히는 쪽이 더 나쁘다.
    for (const kind of ['l4', 'l6']) {
      if (stored[kind] !== 'mock') stored[kind] = 'real';
    }
    return stored;
  } catch {
    return { ...DEFAULT_MODES };
  }
}

function setAgentMode(kind, mode) {
  state.agentModes[kind] = mode === 'mock' ? 'mock' : 'real';
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(MODE_STORE_KEY, JSON.stringify(state.agentModes));
    }
  } catch {
    /* 저장 실패는 실험 편의 기능이라 무시 */
  }
}

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
    // 시스템이 목표를 권장 버전으로 설정했을 때의 사유 — 분석 설정 카드가
    // "왜 이 버전인가"를 그 자리에서 말하게 한다. { version, reason } | null
    targetRecommendation: null,
    // 분석하기 클릭 → 버전 화면으로 넘어가기 전, 카탈로그+권장 계산이 도는
    // 동안 라이브러리 화면에 로딩창을 띄우기 위한 패키지명. null이면 없음.
    versionPrep: null,
    // Version list comes from the npm registry through the server, not from a
    // checked-in data file. The UI keeps no version list of its own.
    supportedPackages: [],
    versionCatalog: [],
    // 소스 참조 실측('미사용 의심' 신호) — { [name]: { sourceRefCount, kinds } }
    usageRefs: {},
    // Which collection path the selected package can use: the resolved GitHub
    // repository, or the fact that it has none and needs a dedicated adapter.
    collectSource: null,
    // Registry probe over every direct dependency — answers which packages T1
    // can even be attempted for. Keyed by package name.
    probeResults: {},
    probeStatus: 'idle', // idle | loading | done | error
    // Per-library information cards (vulnerabilities, deprecation, requirement
    // changes) from registry + OSV. Keyed by package name.
    infoCards: {},
    infoStatus: 'idle', // idle | loading | done | error

    // T1 collection evidence for the current run: coverage, feed, what was
    // missed and why.
    collection: null,
    // Migration guide sections for a major upgrade, split by whether this
    // project uses the components they describe.
    migration: null,
    // Reverse peer audit for the chosen target — who breaks, who must move.
    peerAudit: null,

    steps: PIPELINE_STEPS.map((step) => ({
      ...step,
      status: 'pending',
      startedAt: null,
      endedAt: null,
    })),
    // Bumped once a second while a run is in flight so elapsed timers re-render.
    tick: 0,

    // 선택한 프로젝트의 README — 경로가 맞는지 사람이 눈으로 확인하는 창구.
    // status: idle | loading | found | absent | error
    readme: { status: 'idle', path: '', filename: null, sizeBytes: null, content: '', reason: null },
    useMock: false,
    parseResult: null,
    l4JobId: null,
    l4Status: 'idle',
    l4Logs: [],
    l4Execution: null,

    // L6 — synthesized impact judgment over review groups + Agent REVIEW
    // items + migration sections, one Claude CLI call.
    l6JobId: null,
    l6Status: 'idle', // idle | running | success | cancelled | error
    l6Mock: false, // 이번 판정이 개발도구의 Mock 실행이었는지
    l6Execution: null,
    l6Error: null,
    // 대응·테스트 체크리스트 — judgment.unit을 key로 완료 여부·비고를 든다.
    // { [unit]: { checked: true, note: string, completedAt: ISO string } }
    checklistProgress: {},

    selectedItemId: null,
    sourceMatch: null,
    selectedFilePath: null,

    /*
     * 대응·테스트 작업대의 축과 선택.
     *
     * impactAxis 'work' = 판정(조치) 목록, 'file' = 같은 판정을 파일로 접은
     * 목록. 두 축은 같은 판정 집합의 다른 읽기라, 선택도 축마다 따로 둔다.
     * 축을 직접 고르는 토글은 없앴다(2026-08-22) — 파일 축으로는 상세의 파일명을
     * 눌러 들어가고, 그 안의 판정 카드를 누르면 작업 축으로 돌아온다.
     *
     * selectedImpactPath를 selectedFilePath와 합치지 않는 이유: 후자는
     * 분류결과의 텍스트 매칭 후보 선택이고, 그 목록에 없는 파일(판정만 지목한
     * vite.config.js 등)이 전자에는 흔히 들어온다. 한 필드로 묶으면 한쪽
     * 화면의 선택이 다른 쪽에서 조용히 사라진다.
     */
    impactAxis: 'work', // work | file
    selectedUnit: null,
    selectedImpactPath: null,

    // DEV — 개발도구 패널의 Agent 모델·실행 방식 설정
    agentModels: readStoredAgentModels(),
    agentModes: readStoredAgentModes(),
  };
}

/*
 * This store is the product workspace's own singleton. The prototype has a
 * separate module with a separate instance; neither imports the other, and the
 * shell loads only the active workspace, so the two never coexist.
 */
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

/** @param stepSet PIPELINE_STEPS for an upgrade run, HEALTHCHECK_STEPS for a healthcheck. */
function resetSteps(stepSet = PIPELINE_STEPS) {
  state.steps.splice(0, state.steps.length, ...stepSet.map((step) => ({ ...step, status: 'pending', startedAt: null, endedAt: null })));
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

/*
 * 대상 패키지 버전 상향(package.json 선언 + 락파일 재생성)을 판정 목록의
 * 정식 행으로 합성한다. 어떤 L6 판정도 이 조치를 말하지 않지만 실행 전체의
 * 전제라 목록에 서야 하고(2026-08-22 사용자 결정), 목록에 서는 이상 건수에도
 * 잡혀야 한다 — 요약 KPI·탭 배지·대응 탭이 같은 수를 말해야 한다.
 *
 * 근거·조치·검증은 고정 템플릿이다. 어느 라이브러리든 같은 과정(선언 수정 →
 * 설치/락파일 갱신 → 해석 확인)이라 판정이 따로 필요하지 않다.
 */
function manifestJudgmentOf(fix, targetVersion) {
  const packageName = String(fix.unit).slice('manifest:'.length);
  const rangeNote = fix.files?.[0]?.blocks?.[0]?.note ?? '';
  return {
    unit: fix.unit,
    verdict: 'ACTION_REQUIRED',
    reason: `이번 업데이트의 전제 조치입니다 — package.json의 ${packageName} 선언이 현재 버전을 고정하고 있어, 선언을 올리고 락파일을 재생성해야 아래의 다른 조치들이 적용됩니다.`,
    action: `package.json의 ${packageName} 선언을 수정(${rangeNote})하고 ${fix.command} 실행으로 설치·락파일 갱신`,
    verify: `설치 후 ${packageName} 해석 버전이 ${targetVersion}인지 확인(npm ls ${packageName})하고 빌드·dev 서버 기동을 확인`,
    files: ['package.json'],
  };
}

/** 화면이 세는 판정 목록 — L6 판정 + 전제 조치 행. */
const workJudgments = computed(() => {
  const result = state.l6Execution?.result;
  if (!result) return [];
  const base = result.judgments ?? [];
  const manifestFix = (result.fixes ?? []).find((fix) => String(fix.unit ?? '').startsWith('manifest:'));
  if (!manifestFix) return base;
  const target = state.parseResult?.targetVersion ?? state.targetVersion ?? '';
  return [manifestJudgmentOf(manifestFix, target), ...base];
});

/*
 * 라이브러리 선택 화면의 취약점/deprecated 배지가 결과 화면부터는 다루는
 * 데가 없어서 사용자가 "그거 처리된 거 맞나" 찝찝해하는 문제 — 사실은
 * 이미 있는 데이터다. `/api/collect/info`가 프로젝트 의존성 전체의 OSV
 * 취약점·npm deprecated를 이미 배치 수집해 state.infoCards에 들고 있고,
 * 지금까지는 그중 분석 대상 1개의 requirements 필드만 꺼내 쓰고
 * 나머지는(취약점 포함) 버려지고 있었다. 화면에 다시 연결만 하면 된다.
 *
 * "이 버전이 이 취약점을 고치는가"는 순수 버전 비교라 Agent(L6)에게
 * 넘기지 않는다 — 문장으로 재진술하게 하면 오늘 하루 종일 씨름한 "확신
 * 있는 오답" 위험을 그대로 재현하고, L6 재실행 없이는 Mock 재생 데이터에
 * 붙지도 않는다. 여기서 코드로 확정해 화면에 직접 표시한다.
 */
const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)/;
function parseVersionParts(value) {
  const match = VERSION_PATTERN.exec(String(value ?? '').trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}
function compareVersionStrings(a, b) {
  const left = parseVersionParts(a);
  const right = parseVersionParts(b);
  if (!left || !right) return 0;
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] < right[i] ? -1 : 1;
  }
  return 0;
}

/*
 * 개별 취약점 하나의 해결 여부. false는 두 가지 경우를 모두 뜻한다 —
 * 해결 버전 자체가 아직 없거나, 있어도 목표 버전이 그에 못 미치는 경우.
 * "고칠 방법이 없다"와 "고칠 방법은 있는데 이 목표 버전엔 없다"를 화면에서
 * 굳이 나눌 필요는 없어 하나로 묶는다 — 둘 다 결론은 "이 업그레이드로는
 * 안 고쳐진다"로 같다. null은 비교할 목표 버전 자체가 없는 경우.
 */
function resolveVulnerability(item, targetVersion) {
  if (!item.firstFixed) return false;
  if (!targetVersion) return null;
  return compareVersionStrings(targetVersion, item.firstFixed) >= 0;
}

function buildPackageAdvisory(card, targetVersion) {
  if (!card) return null;
  const rawVulnerabilities = card.vulnerabilities?.ok ? (card.vulnerabilities.items ?? []) : [];
  const deprecated = card.requirements?.deprecated?.installed ?? null;
  if (!rawVulnerabilities.length && !deprecated) return null;

  const vulnerabilities = rawVulnerabilities.map((item) => ({
    ...item,
    resolved: resolveVulnerability(item, targetVersion),
  }));

  return {
    vulnerabilities,
    resolvedCount: vulnerabilities.filter((item) => item.resolved === true).length,
    unresolvedCount: vulnerabilities.filter((item) => item.resolved === false).length,
    pendingCount: vulnerabilities.filter((item) => item.resolved === null).length,
    deprecated,
    targetVersion: targetVersion ?? null,
  };
}

/*
 * 분석 대상 패키지 + peerAudit이 걸어놓은 동반 패키지들만 — 프로젝트
 * 의존성 39개 전체를 보여주는 자리가 아니라, 지금 이 실행이 이미 다루고
 * 있는 패키지에 한해서만 취약점/deprecated 사실을 이어붙인다. 동반
 * 패키지의 "목표 버전"은 사용자가 고르지 않으므로 peer 제약을 실제로
 * 푸는 최소 버전(firstCompatible) 또는 그마저 없으면 최신 발행 버전을
 * 대신 쓴다.
 */
const packageAdvisories = computed(() => {
  const dependency = state.selectedDependency;
  const result = {};
  if (!dependency) return result;

  const add = (name, targetVersion) => {
    if (!name || result[name]) return;
    const advisory = buildPackageAdvisory(state.infoCards[name], targetVersion);
    if (advisory) result[name] = advisory;
  };

  add(dependency.name, state.targetVersion || null);
  for (const row of state.peerAudit?.blocked ?? []) add(row.name, row.firstCompatible ?? null);
  for (const row of state.peerAudit?.companions ?? []) add(row.name, row.firstCompatible ?? row.latestVersion ?? null);

  return result;
});

const selectedItem = computed(
  () => classificationItems.value.find((item) => item.itemId === state.selectedItemId) ?? null,
);

/*
 * The text-match candidate under inspection on 분류결과. Only ever one of the
 * candidates the matcher returned — a judgment's evidence file is a different
 * thing and belongs to the 대응·테스트 workbench, which keeps its own
 * selection (state.selectedImpactPath).
 */
const selectedFile = computed(() => {
  const files = state.sourceMatch?.candidateFiles ?? [];
  return files.find((file) => file.path === state.selectedFilePath) ?? files[0] ?? null;
});

const manualCheckRows = computed(() => {
  const rows = buildManualCheckRows({
    dependencies: directDependencies.value,
    l4Result: state.l4Execution,
    sourceMatch: state.sourceMatch,
    // Review groups inherit their L6 group verdicts — judged ones are the
    // checklist's business, only judgment-less groups stay reading work.
    l6Result: state.l6Execution?.result ?? null,
  });
  return rows;
});

const isMockClassification = computed(() => Boolean(state.l4Execution?.meta?.fallback));

/**
 * One row per target version — covered or not, and why not.
 *
 * Built from the target list rather than from what came back, so a version the
 * feed never mentioned still gets a row. That is the whole point: a silent
 * omission is what this table is meant to make visible.
 */
const collectionRows = computed(() => {
  const collection = state.collection;
  if (!collection) return [];

  const missing = new Map((collection.missingVersions ?? []).map((entry) => [entry.version, entry.reason]));
  const collected = new Map(
    (collection.collectedReleases ?? []).map((release) => [release.version, release]),
  );

  return (collection.targetVersions ?? [])
    .slice()
    .reverse()
    .map((version) => {
      const release = collected.get(version) ?? null;
      const reason = missing.get(version) ?? null;
      return {
        version,
        covered: !reason,
        reason,
        // Which tier actually read it — a version collected from commits must
        // not read the same as one collected from a release note.
        tier: release?.tier ?? null,
        precision: release?.precision ?? null,
        itemCount: release?.itemCount ?? 0,
        // The source explicitly said nothing changed — covered with zero
        // items, which must not render like a failure.
        noChanges: Boolean(release?.noChanges),
        publishedAt: release?.publishedAt ?? null,
        tagName: release?.tagName ?? null,
        sourceUrl: release?.sourceUrl ?? null,
      };
    });
});

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
    if (state.projectPath.trim()) loadProjectReadme();
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
    loadProjectReadme();
  } catch (error) {
    if (!isCurrent(token)) return;
    say(`폴더 선택 창을 열지 못했습니다: ${error.message} — 경로를 직접 입력하세요.`, 'warn');
  }
}

/*
 * The chosen project's README, shown on the project screen.
 *
 * It is the cheapest confirmation that the path points at the intended
 * repository — the reviewer reads the project's own words before committing
 * minutes of Agent time. Absent README is a normal outcome, not an error:
 * `found: false` carries a reason and the screen says so plainly.
 */
async function loadProjectReadme() {
  const projectPath = state.projectPath.trim();
  if (!projectPath) {
    state.readme = { status: 'idle', path: '', filename: null, sizeBytes: null, content: '', reason: null };
    return;
  }
  // 같은 경로를 다시 읽지 않는다 — 경로가 바뀔 때만 의미가 있다.
  if (state.readme.path === projectPath && state.readme.status !== 'error') return;

  const token = generation;
  state.readme = { status: 'loading', path: projectPath, filename: null, sizeBytes: null, content: '', reason: null };
  try {
    const result = await api.projectReadme(projectPath, sessionAbort.signal);
    if (!isCurrent(token) || state.projectPath.trim() !== projectPath) return;
    state.readme = {
      status: result.found ? 'found' : 'absent',
      path: projectPath,
      filename: result.filename ?? null,
      sizeBytes: result.sizeBytes ?? null,
      content: result.found ? result.content : '',
      reason: result.found ? null : (result.reason ?? 'no-readme'),
    };
  } catch (error) {
    if (!isCurrent(token) || state.projectPath.trim() !== projectPath) return;
    state.readme = {
      status: 'error',
      path: projectPath,
      filename: null,
      sizeBytes: null,
      content: '',
      reason: error.message,
    };
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
  // Enter로 바로 실행한 경우 blur가 없어 아직 안 읽혔을 수 있다 — 같은 경로면
  // 아무 일도 하지 않는다. 프로젝트 화면으로 되돌아왔을 때 보이도록.
  loadProjectReadme();

  try {
    const result = await api.dependencies(projectPath, sessionAbort.signal);
    if (!isCurrent(token)) return;
    state.dependencies = result;
    state.lastAnalyzedAt = new Date();
    state.view = 'library';
    const count = directDependencies.value.length;
    say(`${count}개의 직접 의존성을 확인했습니다. 분석할 라이브러리를 선택하세요.`, 'ok');
    // Fills the 최신 버전 and 수집 경로 columns as it lands. Deliberately not
    // awaited: the list is usable before the registry answers.
    probeDependencies(token);
    // Same contract for the 위험 신호 column (vulnerabilities · deprecation).
    loadInfoCards(token);
    loadUsageRefs(token);
  } catch (error) {
    if (!isCurrent(token)) return;
    state.error = error.message;
    say(error.message, 'bad');
  } finally {
    if (isCurrent(token)) state.busy = false;
  }
}

/**
 * Registry probe for the whole dependency list.
 *
 * Registry only — no atom feed is fetched here, so this says whether T1 can be
 * attempted, never how good its coverage will be. That is only knowable after
 * collecting.
 */
async function probeDependencies(token) {
  const packages = directDependencies.value.map((dep) => dep.name).filter(Boolean);
  if (!packages.length) return;

  state.probeStatus = 'loading';
  try {
    const probe = await api.t1Probe(packages, sessionAbort.signal);
    if (!isCurrent(token)) return;
    state.probeResults = Object.fromEntries(
      (probe.results ?? []).map((entry) => [entry.packageName, entry]),
    );
    state.probeStatus = 'done';
  } catch {
    if (!isCurrent(token)) return;
    // A failed probe must not block analysis — collection is attempted per
    // package anyway, and it reports its own outcome.
    state.probeStatus = 'error';
  }
}

/**
 * Information cards for the whole list: known vulnerabilities (OSV),
 * per-version deprecation, requirement changes. One batch request; failure
 * must not block analysis — the column just stays empty.
 */
/*
 * '미사용 의심' 신호의 재료 — 런타임 의존성만 소스 참조를 실측한다.
 * devDependencies는 소스에 import가 없는 것이 정상(도구 계층)이라 훑지 않는다.
 * 실패는 신호 없음으로 둔다 — 이 신호는 부가 정보라 화면을 막지 않는다.
 */
async function loadUsageRefs(token) {
  const names = directDependencies.value
    .filter((dep) => dep.dependencyType === 'dependencies')
    .map((dep) => dep.name);
  if (!names.length || !state.projectPath.trim()) return;
  try {
    const response = await api.usageRefs({ projectPath: state.projectPath.trim(), packages: names }, sessionAbort.signal);
    if (!isCurrent(token)) return;
    state.usageRefs = response.results ?? {};
  } catch {
    if (isCurrent(token)) state.usageRefs = {};
  }
}

async function loadInfoCards(token) {
  const packages = directDependencies.value
    .map((dep) => ({ name: dep.name, version: normalizeVersion(dep.resolvedVersion) }))
    .filter((entry) => entry.name && entry.version);
  if (!packages.length) return;

  state.infoStatus = 'loading';
  try {
    const response = await api.collectInfo(packages, sessionAbort.signal);
    if (!isCurrent(token)) return;
    state.infoCards = Object.fromEntries(
      (response.results ?? []).map((card) => [card.packageName, card]),
    );
    state.infoStatus = 'done';
  } catch {
    if (!isCurrent(token)) return;
    state.infoStatus = 'error';
  }
}

/*
 * 권장 목표 버전 — 최신부터 내려가며 위험 신호(알려진 취약점·deprecated)가
 * 없는 첫 버전 (2026-08-22 결정). 검사는 /api/collect/info가 버전 인자
 * 기준으로 OSV·registry를 실측한 값이라 근거가 있다. 검사가 실패하거나
 * 후보가 전부 신호를 갖면 최신 버전으로 둔다 — 빈 목표로 두지 않는 것이
 * 우선이다(빈 목표는 더 이상 사용자 선택지가 아니다).
 */
const RECOMMEND_CANDIDATES = 5;

async function pickRecommendedTarget(dependency, token) {
  const candidates = targetVersionOptions().slice(0, RECOMMEND_CANDIDATES);
  if (!candidates.length) return;
  state.targetVersion = candidates[0]; // 검사 도중에도 목표가 비어 보이지 않게

  for (const version of candidates) {
    let card = null;
    try {
      const response = await api.collectInfo([{ name: dependency.name, version }], sessionAbort.signal);
      card = (response.results ?? [])[0] ?? null;
    } catch {
      break; // 검사 불가 — 최신 유지
    }
    if (!isCurrent(token)) return;
    if (!card || card.vulnerabilities?.ok === false) break; // 판정 불능 — 최신 유지
    const clean = (card.vulnerabilities?.count ?? 0) === 0 && !card.requirements?.deprecated?.installed;
    if (clean) {
      state.targetVersion = version;
      const skipped = candidates.indexOf(version);
      const reason = skipped === 0
        ? '최신 버전에 알려진 취약점·지원 종료가 없습니다'
        : `그 위 ${skipped}개 버전은 위험 신호가 있어 건너뛰었습니다`;
      state.targetRecommendation = { version, reason };
      say(`권장 목표 ${version} — ${reason}.`, 'muted');
      return;
    }
  }
  state.targetRecommendation = {
    version: state.targetVersion,
    reason: '상위 후보에 위험 신호가 있어 최신 버전을 그대로 두었습니다 — 필요하면 바꾸세요',
  };
  say(`권장 목표 ${state.targetVersion} — 상위 후보에 위험 신호가 있어 최신 버전을 그대로 둡니다. 필요하면 바꾸세요.`, 'muted');
}

/*
 * @param presetTarget 외부에서 정해 온 목표 버전 — 있으면 권장 계산을 건너
 *   뛰고 그 값으로 도착한다. 바로 실행하지 않는 이유: 사람이 버전 화면에서
 *   값을 눈으로 확인하고 실행하는 것이 흐름이다(2026-08-22 피드백 1).
 */
async function selectDependency(dependency, presetTarget = '') {
  const token = generation;
  state.selectedDependency = dependency;
  state.targetVersion = presetTarget || '';
  state.targetRecommendation = null;
  state.versionCatalog = [];
  state.collectSource = null;
  /*
   * 화면 전환은 권장 버전이 **확정된 뒤에** 한다(2026-08-22 피드백) — 그 동안
   * 라이브러리 화면에 로딩창을 띄운다. 반쯤 준비된 화면으로 넘어가 그 위에서
   * 값이 채워지는 것보다, 완성된 화면에 도착하는 것이 맞다.
   */
  state.versionPrep = dependency.name;

  try {
    const catalog = await api.t1Versions(dependency.name, sessionAbort.signal);
    if (!isCurrent(token)) return;
    state.versionCatalog = catalog.versions ?? [];
    state.collectSource = {
      repository: catalog.repository,
      adapterRequired: Boolean(catalog.adapterRequired),
      latest: catalog.latest ?? null,
    };
    if (catalog.adapterRequired) {
      state.view = 'version';
      say(
        `${dependency.name}은 GitHub 저장소가 없어 T1·T2·T3 어느 경로로도 수집할 수 없습니다. 개별 어댑터가 필요합니다.`,
        'warn',
      );
      return;
    }
    // 목표 버전은 항상 채워져 도착한다 — 외부 지정이 없으면 권장 계산.
    // (권장 계산은 자기 사유 문구를 남기므로 일반 안내로 덮지 않는다.)
    if (!state.targetVersion) {
      await pickRecommendedTarget(dependency, token);
      if (!isCurrent(token)) return;
    } else {
      say(`${dependency.name}의 현재 버전과 목표 버전을 확인한 후 분석을 실행하세요.`, 'muted');
    }
    state.view = 'version';
  } catch (error) {
    if (!isCurrent(token)) return;
    say(`${dependency.name}의 버전 목록을 불러오지 못했습니다: ${error.message}`, 'bad');
  } finally {
    if (isCurrent(token)) state.versionPrep = null;
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
  // 내림차순 — 사람이 고르는 건 대개 최신 쪽이라 높은 버전이 위에 온다
  // (2026-08-22 피드백).
  return state.versionCatalog
    .filter((version) => compareSemver(version, current) > 0)
    .sort((a, b) => compareSemver(b, a));
}

/**
 * Runs the whole pipeline: collect → classify (L4) → source match → judge (L6).
 *
 * Whether L4/L6 call Claude or the deterministic mock comes from the dev-tools
 * pipeline setting (`state.agentModes`), not from the product screens — the
 * product has exactly one way to run, the real one.
 */
async function runAnalysis() {
  const dependency = state.selectedDependency;
  if (!dependency) return;

  const packageName = dependency.name;
  const currentVersion = normalizeVersion(dependency.resolvedVersion);
  const targetVersion = state.targetVersion || null;

  const token = generation;
  const signal = sessionAbort.signal;

  // 진행 화면의 'Mock 모드' 표시용 — 실행 시점의 설정을 고정해둔다.
  state.useMock = state.agentModes.l4 === 'mock';
  state.busy = true;
  state.error = null;
  state.view = 'running';
  state.parseResult = null;
  state.collection = null;
  state.migration = null;
  state.peerAudit = null;
  state.l4Execution = null;
  state.sourceMatch = null;
  state.selectedItemId = null;
  state.selectedFilePath = null;
  state.l4Logs = [];
  resetSteps(targetVersion ? PIPELINE_STEPS : HEALTHCHECK_STEPS);
  startTicker();

  try {
    // Step 1 — official release documents, collected through the T1 -> T2-git
    // chain. Neither tier consumes GitHub API quota.
    setStep('collect', 'running');
    say(
      targetVersion
        ? `${packageName} ${currentVersion}에서 ${targetVersion}까지의 릴리즈 노트를 수집하고 있습니다.`
        : `${packageName} ${currentVersion} 이후의 릴리즈 노트를 수집하고 있습니다.`,
      'muted',
    );
    const collected = await api.collect(
      {
        packageName,
        currentVersion,
        targetVersion,
        // 헬스체크 분기에서만 의미 있는 값(서버가 그때만 읽는다) — 업그레이드
        // 요청에 실어 보내 두 분기가 같은 필드를 공유하는 것처럼 보이지 않게
        // 호출부에서부터 명시적으로 가른다.
        ...(targetVersion ? {} : { projectPath: state.projectPath.trim() }),
      },
      signal,
    );
    if (!isCurrent(token)) return;
    state.collection = collected.collection;
    state.parseResult = collected.parseResult;
    setStep('collect', 'done');

    /*
     * A collection that produced nothing stops the run here.
     *
     * Feeding zero change items into the Agent would burn minutes to classify
     * an empty list and return a result screen that looks like "no impact".
     * The collection tab states what was actually missed and which path could
     * still read it.
     */
    /*
     * Breaking changes are not in the release notes or the commits — measured
     * across six dependencies, 0 of 4 major release notes carried a Breaking
     * section. They are in a guide inside the repository, so it is read
     * separately and filtered to the components this project uses.
     *
     * Best effort: a missing guide must not fail a run that collected fine.
     */
    if (targetVersion) {
      try {
        state.migration = await api.migration(
          { packageName, currentVersion, targetVersion, projectPath: state.projectPath.trim() },
          signal,
        );
      } catch {
        if (isCurrent(token)) state.migration = null;
      }
      if (!isCurrent(token)) return;

      /*
       * Reverse peer audit — which OTHER installed packages the target breaks
       * (peer 선언 기준). Registry-only; the probe already warmed the metadata
       * cache, so this is effectively free. Best effort like the guide: an
       * audit failure must not fail a run that collected fine.
       */
      try {
        state.peerAudit = await api.peerAudit(
          {
            packageName,
            targetVersion,
            // Lets the server read the tool's own config files, so the
            // companion audit can discover string-registered plugins too.
            projectPath: state.projectPath.trim(),
            dependencies: directDependencies.value
              .filter((dep) => dep.resolvedVersion && !dep.isUrlDependency)
              .map((dep) => ({ name: dep.name, version: normalizeVersion(dep.resolvedVersion) })),
          },
          signal,
        );
      } catch {
        if (isCurrent(token)) state.peerAudit = null;
      }
      if (!isCurrent(token)) return;
    }

    /*
     * Healthcheck asks "should I move at all", not "how do I move safely" —
     * a different question from an upgrade run, answered by a different
     * mechanism. The server already assembled the answer deterministically
     * (registry facts + OSV + a usage scan, no Agent call) and attached it
     * as parseResult.healthcheck; the pipeline's job here is to skip
     * straight to that answer rather than spend an Agent classification
     * budget classifying a patch line nobody asked to move onto.
     *
     * This runs BEFORE the "0 items" shortfall check below on purpose: for a
     * healthcheck, 0 items commonly just means "already on the newest patch
     * in line, nothing to report" — a normal HEALTHY outcome, not a
     * collection failure. Routing that to the 수집 tab as if collection had
     * failed was the actual bug this ordering fixes. A genuine collection
     * failure (registry/repo unreachable) already threw earlier and landed
     * in the outer catch block, so nothing is lost by checking mode first.
     */
    if (!targetVersion) {
      setStep('diagnose', 'running');
      setStep('diagnose', 'done');
      state.view = 'result';
      state.activeTab = 'diagnosis';
      sayHealthcheckVerdict();
      return;
    }

    if ((state.parseResult?.changeItemCount ?? 0) === 0) {
      state.view = 'result';
      state.activeTab = 'collect';
      say(collectionShortfallMessage(state.collection), 'warn');
      return;
    }

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

    /*
     * Step 4 — L6 impact judgment. This is the step that turns "what changed"
     * into "what you must do", so the pipeline runs it rather than leaving it
     * to a button on a tab the user has to find. Skipped only when there is
     * nothing to judge: L6's input is the REVIEW items plus review groups.
     */
    setStep('evidence', 'running');
    if (hasJudgmentInput()) {
      say('수집·분류 결과를 근거로 영향을 판정하고 있습니다.');
      await runImpactJudgment({ signal, token });
    } else {
      say('판정할 검토 대상이 없어 영향 판정을 건너뜁니다.', 'warn');
    }
    if (!isCurrent(token)) return;
    setStep('evidence', state.l6Status === 'error' ? 'error' : 'done');

    setStep('finalize', 'running');
    setStep('finalize', 'done');

    state.view = 'result';
    // The deliverable leads — 수집 stays the landing tab only when the run
    // STOPS there (collection shortfall above), where it explains why.
    state.activeTab = 'summary';
    say(
      `${state.collection?.coveredVersions?.length ?? 0}/${state.collection?.targetVersions?.length ?? 0} 버전을 수집했습니다. 요약부터 확인하세요 — 수집 근거는 수집 탭에 있습니다.`,
      'ok',
    );
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

const FALLBACK_LABEL = {
  T2_REST_API: 'T2 REST API',
  T2_GIT: 'T2 git 태그 범위',
  T3_RAW_CHANGELOG: 'T3 raw CHANGELOG',
};

/** Names the reason rather than reporting an empty result as "no changes". */
function collectionShortfallMessage(collection) {
  if (!collection) return '수집 결과가 없습니다.';
  if (!collection.targetVersions?.length) {
    return '설치 버전보다 높은 릴리즈가 없습니다. 읽을 변경사항이 없습니다.';
  }
  if (collection.ok === false) {
    return `릴리즈 피드를 읽지 못했습니다: ${collection.error?.message ?? '원인 불명'}`;
  }
  const next = collection.needsFallback?.map((key) => FALLBACK_LABEL[key] ?? key).join(' → ');
  return `대상 ${collection.targetVersions.length}개 버전에서 변경항목을 얻지 못했습니다.${next ? ` 다음 경로: ${next}` : ''} 수집 탭에서 사유를 확인하세요.`;
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

/** 진단 판정을 진행 메시지로 옮긴다 — 자동 전환과 버튼 전환이 같은 문장을 쓴다. */
function sayHealthcheckVerdict() {
  const verdict = state.parseResult?.healthcheck ?? null;
  const tone = { SECURITY: 'bad', DEPRECATED: 'bad', LINE_DORMANT: 'warn', PATCH_AVAILABLE: 'warn', HEALTHY: 'ok' };
  say(verdict?.headline ?? '헬스체크를 완료했지만 진단 정보를 만들지 못했습니다.', tone[verdict?.level] ?? 'warn');
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
          // Enables the server-side usage pre-scan: budget slots go to items
          // whose scope this project actually uses. Selection-only — the
          // Agent prompt never sees usage evidence.
          projectPath: state.projectPath.trim(),
          ...(state.agentModels.l4 ? { model: state.agentModels.l4 } : {}),
          ...(state.agentModes.l4 === 'mock' ? { provider: 'fallback' } : {}),
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

/** L6 has something to judge only if L4 produced REVIEW items or review groups. */
function hasJudgmentInput() {
  if (!state.l4Execution) return false;
  const groups = state.l4Execution.inputSummary?.deferredTriage?.reviewGroups ?? [];
  return groups.length > 0 || classificationItems.value.some((item) => item.reviewRequired);
}

/**
 * L6 impact judgment — one call over what the pipeline already condensed.
 *
 * Called by the pipeline as its 4th step, and again from the 대응·테스트 tab
 * when the reviewer wants a re-run. `options` carries the pipeline's token and
 * signal so a session reset mid-pipeline drops this too; a manual re-run passes
 * nothing and picks up the current ones.
 */
async function runImpactJudgment(options = {}) {
  const dependency = state.selectedDependency;
  if (!dependency || !state.l4Execution || state.l6Status === 'running') return;

  const token = options.token ?? generation;
  const signal = options.signal ?? sessionAbort.signal;
  state.l6Mock = state.agentModes.l6 === 'mock';
  state.l6Status = 'running';
  state.l6Error = null;
  state.l6Execution = null;

  const payload = {
    packageName: dependency.name,
    currentVersion: normalizeVersion(dependency.resolvedVersion),
    targetVersion: state.targetVersion || null,
    mode: state.parseResult?.mode ?? 'UPGRADE_IMPACT',
    // The judgment process runs WITH this directory as cwd, so it can verify
    // usage in the real source (read-only) instead of trusting text evidence.
    projectPath: state.projectPath.trim(),
    reviewGroups: state.l4Execution.inputSummary?.deferredTriage?.reviewGroups ?? [],
    classifiedItems: classificationItems.value,
    /*
     * `used` only: sections whose components the project uses OR whose config
     * keys it actually sets (config-PRESENT promotes into `used`).
     *
     * config-ABSENT sections were sent too, once — Round 2 실측이 되돌렸다.
     * L6 시간은 유닛 수에 선형(~6초/유닛, 3회 실측)이라 ABSENT 15유닛이
     * L6를 393s→528s로 밀어 기본 10분 타임아웃까지 넘겼는데, 그 판정 15건은
     * 전부 다른 채널(릴리즈 item·group)과 중복이거나 일반적 스모크 조언이었다.
     * "설정 안 했으니 기본값 변경을 그대로 받는다"는 사실 자체는 결정론
     * 계층이 이미 확정한 것 — 수집 탭이 보여주고, agent에 다시 물을 일이
     * 아니다.
     */
    migrationSections: (state.migration?.docs ?? [])
      .filter((doc) => doc.found)
      .flatMap((doc) => doc.used ?? []),
    requirements: state.infoCards[dependency.name]?.requirements ?? null,
    // Deterministic registry facts — the judgment turns them into chain units
    // and reads the project for references (설정·타입 선언) to name in 조치.
    peerAudit: state.peerAudit ?? null,
    usageSummary: state.l4Execution.inputSummary?.usagePrescan?.summary ?? null,
  };

  try {
    const job = await api.startL6Job(
      {
        payload,
        ...(state.agentModels.l6 ? { model: state.agentModels.l6 } : {}),
        ...(state.agentModes.l6 === 'mock' ? { provider: 'fallback' } : {}),
      },
      signal,
    );
    if (!isCurrent(token)) return;
    state.l6JobId = job.id;

    // Poll until the job settles. The L6 call is minutes-scale, same as L4.
    while (isCurrent(token)) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1200));
      const status = await api.getL6Job(state.l6JobId, signal);
      if (!isCurrent(token)) return;
      if (status.status === 'running') continue;
      state.l6Status = status.status;
      state.l6Execution = status.execution;
      state.l6Error = status.error ?? null;
      if (status.status === 'success') {
        const actions = status.execution?.result?.judgments?.filter((j) => j.verdict === 'ACTION_REQUIRED').length ?? 0;
        say(`영향 판정 완료 — 수정 필요 ${actions}건.`, 'ok');
      } else if (status.status === 'error') {
        say(`영향 판정 실패: ${status.error}`, 'bad');
      }
      return;
    }
  } catch (error) {
    if (!isCurrent(token)) return;
    state.l6Status = 'error';
    state.l6Error = error.message;
    say(`영향 판정을 시작하지 못했습니다: ${error.message}`, 'bad');
  }
}

async function cancelImpactJudgment() {
  if (state.l6JobId && state.l6Status === 'running') {
    try {
      await api.cancelL6Job(state.l6JobId);
    } catch {
      /* job is torn down locally regardless */
    }
  }
}

/**
 * DEV — one interrupt for whichever Agent is in flight.
 *
 * The product screens each cancel their own step; the dev panel is visible on
 * every screen, so it needs a single button that stops the run wherever it is.
 * Returns what it stopped so the panel can say so.
 */
async function interruptAgents() {
  const stopped = [];
  if (state.l6JobId && state.l6Status === 'running') {
    await cancelImpactJudgment();
    stopped.push('L6');
  }
  if (state.l4JobId && state.l4Status === 'running') {
    try {
      await api.cancelL4Job(state.l4JobId);
      stopped.push('L4');
    } catch {
      /* 서버가 이미 정리했을 수 있다 — 로컬 상태는 폴링이 반영한다 */
    }
  }
  if (stopped.length) say(`${stopped.join(' · ')} 실행을 중단 요청했습니다.`, 'warn');
  return stopped;
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
  // Candidates render under the table that was just clicked — the reader stays
  // where they are instead of being thrown to another tab and having to come
  // back for the next item.
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

/** 분류결과의 텍스트 매칭 후보 선택 — 그 자리에서 매칭 라인을 펼친다. */
function selectFile(path) {
  state.selectedFilePath = path;
}

function selectJudgmentUnit(unit) {
  state.selectedUnit = unit;
  state.impactAxis = 'work';
}

function selectImpactFile(path) {
  state.selectedImpactPath = path;
  state.impactAxis = 'file';
}

/*
 * 체크(확인함)와 비고 둘 다 있어야 완료로 남긴다 — 체크만 있으면 "봤다"는
 * 건지 "처리했다"는 건지 나중에 구분이 안 되고, 비고 없는 완료는 왜
 * 끝났다고 판단했는지가 사라진다.
 */
function completeChecklistItem(unit, note) {
  const trimmed = String(note ?? '').trim();
  if (!unit || !trimmed) return;
  state.checklistProgress[unit] = { checked: true, note: trimmed, completedAt: new Date().toISOString() };
}

function reopenChecklistItem(unit) {
  if (!unit) return;
  delete state.checklistProgress[unit];
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
  // Ask the server to stop agent processes before dropping the job ids.
  const runningJobId = state.l4JobId && state.l4Status === 'running' ? state.l4JobId : null;
  if (runningJobId) {
    api.cancelL4Job(runningJobId).catch(() => {
      /* best effort — the local session is being torn down regardless */
    });
  }
  const runningL6JobId = state.l6JobId && state.l6Status === 'running' ? state.l6JobId : null;
  if (runningL6JobId) {
    api.cancelL6Job(runningL6JobId).catch(() => {
      /* best effort */
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
    workJudgments,
    packageAdvisories,
    selectedItem,
    selectedFile,
    manualCheckRows,
    isMockClassification,
    hasWorkToDiscard,
    collectionRows,
    loadConfig,
    pickDirectory,
    loadProjectReadme,
    analyzeDependencies,
    selectDependency,
    backToLibrary,
    backToVersion,
    canVisit,
    goToStep,
    targetVersionOptions,
    runAnalysis,
    cancelAnalysis,
    runImpactJudgment,
    cancelImpactJudgment,
    setAgentModel,
    setAgentMode,
    interruptAgents,
    selectClassificationItem,
    selectFile,
    selectJudgmentUnit,
    selectImpactFile,
    completeChecklistItem,
    reopenChecklistItem,
    setTab,
    resetSession,
  };
}
