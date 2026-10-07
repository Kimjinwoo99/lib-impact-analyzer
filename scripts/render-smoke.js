/*
 * Builds the SSR smoke entry and renders every dashboard screen with real
 * pipeline output, then asserts the expected copy actually reached the DOM.
 *
 * Usage: node scripts/render-smoke.js
 * Requires the API server on API_PORT (default 5174).
 */
import { build } from 'vite';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';

const apiBase = `http://localhost:${process.env.API_PORT ?? 5174}`;

async function callJson(path, options) {
  const response = await fetch(apiBase + path, options);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? `${path} -> ${response.status}`);
  return payload;
}

function postJson(path, body) {
  return callJson(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function collectPipelineData() {
  const config = await callJson('/api/config');
  /*
   * Pinned to the test fixture, not the API's default path.
   *
   * The default is what the UI prefills, and it points at the exploration
   * project so the library list is worth looking at. Following it here made
   * the screen 03 assertions depend on whichever versions that project
   * happens to pin — they belong to the fixture, which exists to stay put.
   */
  const projectPath = resolve('test/fixtures/sample-app-minimal');
  const dependencies = await callJson(
    `/api/dependencies?projectPath=${encodeURIComponent(projectPath)}`,
  );
  const parseResult = await callJson(
    '/api/changelog/parse?packageName=vuetify&currentVersion=3.6.10&targetVersion=3.6.12',
  );

  // provider:'fallback' keeps the smoke test fast and offline-safe.
  let job = await postJson('/api/agent/l4/jobs', {
    stage3Result: parseResult,
    maxItems: 20,
    provider: 'fallback',
  });
  while (job.status === 'running') {
    await new Promise((r) => setTimeout(r, 300));
    job = await callJson(`/api/agent/l4/jobs/${job.id}`);
  }
  if (job.status !== 'success') throw new Error(`L4 job ${job.status}: ${job.error}`);

  const items = job.execution.result.items;
  const picked = items.find((item) => item.reviewRequired) ?? items[0];
  const sourceMatch = await postJson('/api/source-match', {
    projectPath,
    packageName: 'vuetify',
    currentVersion: '3.6.10',
    targetVersion: '3.6.12',
    classificationItem: picked,
  });

  const catalog = await callJson('/api/changelog/versions?packageName=vuetify');

  const directDependencies = dependencies.packages.flatMap((pkg) => pkg.directDependencies);
  return {
    projectPath,
    dependencies,
    parseResult,
    execution: job.execution,
    logs: job.logs,
    picked,
    sourceMatch,
    supportedPackages: config.supportedPackages ?? [],
    versionCatalog: catalog.versions ?? [],
    vuetify: directDependencies.find((dep) => dep.name === 'vuetify'),
    collection: await collectT1Fixture(),
  };
}

/*
 * Live T1 collection for the product workspace's 수집 screen.
 *
 * The range is derived from the registry so the feed's 10-entry window always
 * covers it. Network-dependent, unlike the rest of this script, so a failure
 * skips that one screen loudly instead of failing the run.
 */
async function collectT1Fixture() {
  try {
    const versions = (await callJson('/api/collect/t1/versions?packageName=vuetify')).versions ?? [];
    const currentVersion = versions[versions.length - 3];
    const targetVersion = versions[versions.length - 1];
    if (!currentVersion || !targetVersion) return null;

    const collected = await callJson(
      `/api/collect?packageName=vuetify&currentVersion=${currentVersion}&targetVersion=${targetVersion}`,
    );
    return collected.collection;
  } catch (error) {
    console.log(`skip 수집 화면 — T1 수집 실패: ${error.message}`);
    return null;
  }
}

async function buildSsrBundle() {
  await build({
    root: 'web',
    logLevel: 'error',
    plugins: [vue()],
    build: {
      ssr: 'src/ssr-smoke.js',
      outDir: '../.ssr-smoke',
      emptyOutDir: true,
      rollupOptions: { external: ['vue', 'vue/server-renderer'] },
    },
  });
  return pathToFileURL(resolve('.ssr-smoke/ssr-smoke.js')).href;
}

// Copy that must appear on each screen, expected by the UI spec.
const EXPECTED = {
  '01 프로젝트 선택': ['프로젝트 분석', '프로젝트 경로', '폴더 선택', '영향 분석 시작', '분석 준비'],
  '02 라이브러리 선택': ['분석할 라이브러리 선택', '라이브러리명 검색', '최신 버전', '전체 라이브러리', 'vuetify'],
  '03 버전 선택': ['분석 설정', '현재 버전', '목표 버전', '다음 단계 실행', '>4.1.5</option>'],
  '04 분석 진행': [
    '영향 분석',
    '공식 변경사항 수집',
    '변경사항 분석',
    '관련 코드 탐색',
    '영향 근거 확인',
    '결과 정리',
    '분석 취소',
    '2 / 5 단계',
    'stepper__item--done',
    'stepper__item--running',
    'stepper__bar-fill',
  ],
  '05 요약': ['릴리즈 수', 'Parsed Items', 'Classification Items', '예비 위험도 분포'],
  // '릴리즈 섹션' 컬럼은 파서 enum이 아니라 릴리즈 노트 섹션 제목 원문을 보여줍니다.
  // 분류결과 탭의 'Category'(agentCategory)와 구분하기 위해 이름을 다르게 둡니다.
  // dt__hint = 컬럼 타이틀 옆 설명 툴팁(Role · 릴리즈 섹션 · 스코프 · Summary 4개).
  '06 변경사항': [
    'Parsed Items · showing',
    '릴리즈 섹션',
    '스코프',
    'Summary',
    'Bug Fixes',
    'dt__hint',
  ],
  '07 분류결과': ['Classification Items · showing', 'Inspection terms', 'Reasoning', 'REVIEW'],
  '08 관련 파일': ['관련 파일 후보', '매칭 강도', '권장 검토 · 테스트 요약', '검토 항목', '테스트 항목'],
  '09 대응·테스트': ['영향 받는 코드 위치', '영향 분석 결과', '대응 권장안', '테스트 방법'],
  '10 추가 확인': ['자동 분석 범위 밖의 항목', '제외 · 불확실 사유', '수동 검토 권장'],
};

/*
 * The product workspace renders the same screens with the placeholder values
 * removed, so the two screens that showed mock checklists expect different
 * copy. Everything else is identical, which is the point of the split.
 */
const EXPECTED_BY_WORKSPACE = {
  prototype: EXPECTED,
  product: {
    ...EXPECTED,
    // 실구현 첫 화면은 README 뷰어(분석 준비) 대신 파이프라인 개요 카드 —
    // 진행 화면 스텝퍼와 같은 어휘로 절차를 소개한다.
    '01 프로젝트 선택': ['프로젝트 분석', '프로젝트 경로', '폴더 선택', '영향 분석 시작', '분석 파이프라인', '사용처 대조'],
    // The product list fills 최신 버전 from the registry and states which
    // collection path each package has.
    // 수집 경로 컬럼은 삭제됨 — 어느 티어가 읽는지는 수집을 돌려야 아는 사실이라
    // 결과의 수집 탭이 사후 보고한다. 사전 표시는 위험 신호 컬럼뿐.
    // 검색·유형·정렬 필터 줄과 선언 버전·유형 컬럼도 제거 — 목록은 위험 신호
    // (취약점 건수) 순 고정 정렬이라 별도 정렬 UI가 없다.
    '02 라이브러리 선택': ['분석할 라이브러리 선택', '직접 의존성', '최신 버전', '위험 신호', 'vuetify'],
    /*
     * 헬스체크 분기는 실구현에서 봉인했다(2026-08-22 사용자 결정 — 도달 불가
     * 분기라 흔적까지 제거). 시안(prototype)에는 그 문구가 남아 있으므로
     * 기대값을 워크스페이스별로 갈라 둔다. 실구현이 그 자리에 두는 사실은
     * "목표 버전이 권장 버전으로 자동 설정되어 도착한다"는 것이다.
     */
    '03 버전 선택': ['분석 설정', '현재 버전', '목표 버전', '다음 단계 실행', '권장 버전', '>4.1.5</option>'],
    // 실구현 요약탭 상단은 탭 배지와 1:1로 정합하는 결론 KPI 3장이다 —
    // 작업 항목(대응·테스트), 추가 확인, 취약점 해소. L6·수집이 없는 스모크
    // 상태에서도 카드 레이블 3개는 항상 렌더링되어야 한다.
    '05 요약': ['작업 항목', '추가 확인', '취약점', '예비 위험도 분포'],
    // 텍스트 매칭 후보 표는 옛 '관련 파일' 탭에서 분류결과 탭으로 옮겨왔다 —
    // 후보를 만들어내는 분류 항목 선택이 이 탭에 있기 때문.
    '07 분류결과': [...EXPECTED['07 분류결과'], '텍스트 매칭 후보', '매칭 강도'],
    '11 수집': [
      '수집 경로별 결과',
      'T1 atom',
      '커버리지',
      '대상 버전',
      'GitHub API 한도',
      '버전별 수집 결과',
      'vuetifyjs/vuetify',
      '토큰 불필요',
    ],
    /*
     * Product's 대응·테스트 is the run-level work checklist (the prototype
     * keeps the original file-detail here). L6 has not run in the smoke, so
     * the idle state must render: the run button and the verdict legend.
     */
    '09 대응·테스트': ['대응 · 테스트 작업 목록', '영향 판정 실행', '수정 필요 / 확인 필요 / 무영향'],
  },
};

async function main() {
  const data = await collectPipelineData();
  const entry = await buildSsrBundle();
  const { renderScreens, WORKSPACE_KEYS } = await import(entry);

  const base = {
    projectPath: data.projectPath,
    dependencies: data.dependencies,
    supportedPackages: data.supportedPackages,
    versionCatalog: data.versionCatalog,
    selectedDependency: data.vuetify,
    targetVersion: '3.6.12',
    parseResult: data.parseResult,
    l4Execution: data.execution,
    l4Logs: data.logs,
    l4Status: 'success',
    selectedItemId: data.picked.itemId,
    sourceMatch: data.sourceMatch,
    selectedFilePath: data.sourceMatch.candidateFiles[0]?.path ?? null,
    lastAnalyzedAt: new Date('2026-07-23T15:30:00'),
    message: '검증 렌더',
    messageTone: 'muted',
    collection: data.collection,
    collectSource: data.collection
      ? { repository: data.collection.repository, adapterRequired: false, latest: data.versionCatalog.at(-1) ?? null }
      : null,
    probeStatus: 'done',
    probeResults: {},
  };

  const fixtures = [
    { name: '01 프로젝트 선택', patch: { ...base, view: 'project', dependencies: null } },
    { name: '02 라이브러리 선택', patch: { ...base, view: 'library' } },
    // targetVersion cleared so the healthcheck option label renders.
    { name: '03 버전 선택', patch: { ...base, view: 'version', targetVersion: '' } },
    {
      name: '04 분석 진행',
      patch: {
        ...base,
        view: 'running',
        steps: [
          { key: 'collect', label: '공식 변경사항 수집', weight: 25, status: 'done', startedAt: 1000, endedAt: 4200 },
          { key: 'classify', label: '변경사항 분석', weight: 25, status: 'done', startedAt: 4200, endedAt: 61000 },
          { key: 'search', label: '관련 코드 탐색', weight: 20, status: 'running', startedAt: Date.now() - 7000, endedAt: null },
          { key: 'evidence', label: '영향 근거 확인', weight: 20, status: 'pending', startedAt: null, endedAt: null },
          { key: 'finalize', label: '결과 정리', weight: 10, status: 'pending', startedAt: null, endedAt: null },
        ],
      },
    },
    { name: '05 요약', patch: { ...base, view: 'result', activeTab: 'summary' } },
    { name: '06 변경사항', patch: { ...base, view: 'result', activeTab: 'changes' } },
    { name: '07 분류결과', patch: { ...base, view: 'result', activeTab: 'classification' } },
    { name: '08 관련 파일', patch: { ...base, view: 'result', activeTab: 'files' } },
    { name: '09 대응·테스트', patch: { ...base, view: 'result', activeTab: 'impact' } },
    { name: '10 추가 확인', patch: { ...base, view: 'result', activeTab: 'manual' } },
  ];

  // The 수집 screen exists only in the product workspace — it is the one
  // screen the two implementations do not share.
  const collectFixture = data.collection
    ? [{ name: '11 수집', patch: { ...base, view: 'result', activeTab: 'collect' } }]
    : [];

  const rendered = [];
  for (const workspace of WORKSPACE_KEYS) {
    // 실구현에는 '관련 파일'(files)·'파일 상세'(fileDetail) 탭이 더 이상 없다 —
    // 텍스트 매칭 후보 표는 분류결과 탭으로 옮겨졌고(07이 단언), 파일 상세는
    // 대응·테스트 작업대의 판정 상세로 흡수됐다. 존재하지 않는 탭 키를
    // 렌더링하면 전부-누락으로만 실패해 신호가 없다.
    const list = workspace === 'product'
      ? [...fixtures.filter((screen) => screen.name !== '08 관련 파일'), ...collectFixture]
      : fixtures;
    // eslint-disable-next-line no-await-in-loop
    rendered.push(...(await renderScreens(list, { workspace })));
  }

  // Present on every screen: the logo doubles as the session reset control,
  // and the wizard rail shows where you are.
  const ALWAYS = ['app-header__home', 'aria-label="처음으로"', 'aria-label="분석 단계"', 'rail__step--current'];

  let failures = 0;
  for (const screen of rendered) {
    const table = EXPECTED_BY_WORKSPACE[screen.workspace] ?? EXPECTED;
    const expected = [...(table[screen.name] ?? []), ...ALWAYS];
    const missing = expected.filter((text) => !screen.html.includes(text));
    // Count real badge instances only — tab tooltips carry the words too.
    const mockBadges = (screen.html.match(/class="mock"/g) ?? []).length;
    const pendingMarks = (screen.html.match(/class="pending"/g) ?? []).length;
    const label = `${screen.workspace.padEnd(9)} ${screen.name}`;

    // The product workspace must never render a mock placeholder. That is the
    // whole distinction between the two workspaces, so assert it rather than
    // trusting the imports.
    if (screen.workspace === 'product' && mockBadges > 0) {
      failures += 1;
      console.log(`FAIL ${label} — 실구현 화면에 mock 배지가 ${mockBadges}개 있습니다.`);
      continue;
    }

    if (missing.length) {
      failures += 1;
      console.log(`FAIL ${label} — 누락: ${missing.join(', ')}`);
    } else {
      const marks = screen.workspace === 'product'
        ? `미구현 표시 ${pendingMarks}개`
        : `구현 예정 배지 ${mockBadges}개`;
      console.log(`ok   ${label}  (${screen.length} bytes, ${marks})`);
    }
  }

  // The header bar tracks the wizard step: 프로젝트 20% … 결과 100%.
  // The number is not printed, so assert the bar width and the aria value.
  const EXPECTED_PROGRESS = {
    '01 프로젝트 선택': 20,
    '02 라이브러리 선택': 40,
    '03 버전 선택': 60,
    '04 분석 진행': 80,
    '05 요약': 100,
  };
  for (const [name, percent] of Object.entries(EXPECTED_PROGRESS)) {
    for (const screen of rendered.filter((entry) => entry.name === name)) {
      if (!screen.html.includes(`width:${percent}%`)) {
        failures += 1;
        console.log(`FAIL ${screen.workspace} ${name} — 진행 바가 ${percent}%가 아닙니다.`);
      }
      if (!screen.html.includes(`aria-valuenow="${percent}"`)) {
        failures += 1;
        console.log(`FAIL ${screen.workspace} ${name} — aria-valuenow가 ${percent}이 아닙니다.`);
      }
    }
  }

  const anyPercentText = rendered.find((s) => /<span[^>]*>\s*\d+%\s*<\/span>/.test(s.html));
  if (anyPercentText) {
    failures += 1;
    console.log(`FAIL ${anyPercentText.workspace} ${anyPercentText.name} — 진행률 숫자가 화면에 노출됩니다.`);
  }

  console.log(failures ? `\n${failures}개 화면 실패` : `\n${rendered.length}개 화면 모두 통과 (워크스페이스 ${WORKSPACE_KEYS.length}개)`);
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
