<script setup>
/*
 * Product workspace root — the real implementation.
 *
 * Same structure as the prototype workspace on purpose: same five wizard
 * steps, same shell, same result tabs. The difference is what may appear in
 * them. This workspace renders measured data only; a stage the backend does
 * not implement stays empty behind a `NotImplemented` marker rather than being
 * filled with a placeholder value.
 *
 * Every import below resolves inside `web/src/product/`. Nothing is shared
 * with the prototype except the design tokens and the logo.
 */
import { computed, onMounted, ref } from 'vue';
import AppHeader from './components/AppHeader.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
// DEV-ONLY: 실구현 배포에서 제거 대상 (프로덕션 빌드에서는 자체 가드로 렌더 안 됨)
import DevPreviewPanel from './components/DevPreviewPanel.vue';
import KpiCards from './components/KpiCards.vue';
import ProgressPanel from './components/ProgressPanel.vue';
import StepRail from './components/StepRail.vue';
import { WIZARD_STEPS } from './state/analysis.js';
import ProjectSelect from './views/ProjectSelect.vue';
import LibrarySelect from './views/LibrarySelect.vue';
import VersionSelect from './views/VersionSelect.vue';
import AnalysisRunning from './views/AnalysisRunning.vue';
import ResultShell from './views/ResultShell.vue';
import { useAnalysis } from './state/analysis.js';

const analysis = useAnalysis();
const { state, progressPercent, directDependencies, classificationItems } = analysis;

onMounted(analysis.loadConfig);

// Clicking the logo resets everything. Confirm first when that would throw
// away a run in flight or a finished Agent classification.
const confirmingReset = ref(false);

function requestHome() {
  if (analysis.hasWorkToDiscard.value) {
    confirmingReset.value = true;
    return;
  }
  analysis.resetSession();
}

function confirmHome() {
  confirmingReset.value = false;
  analysis.resetSession();
}

const resetPoints = computed(() => {
  const points = [];
  if (state.busy) {
    const running = state.steps.find((step) => step.status === 'running');
    points.push(running ? `진행 중인 단계: ${running.label}` : '진행 중인 요청이 중단됩니다');
  }
  if (state.l4Status === 'running') points.push('실행 중인 Agent 작업이 서버에서 취소됩니다');
  if (state.l4Execution) {
    points.push(`분류 결과 ${classificationItems.value.length}건이 삭제됩니다`);
  }
  if (state.sourceMatch) {
    points.push(`관련 파일 후보 ${state.sourceMatch.candidateFiles?.length ?? 0}건이 삭제됩니다`);
  }
  return points;
});

/*
 * 진행 바 원점의 호버 팝업 문안.
 *
 * 제목은 WIZARD_STEPS의 라벨(프로젝트·라이브러리·버전…)을 쓰지 않는다 — 그쪽은
 * 헤더 스텝바의 좁은 폭에 맞춘 축약이고, 팝업은 그 단계에서 실제로 보게 되는
 * **화면의 제목**을 그대로 말해야 한다. 두 곳이 다른 이름을 쓰면 사용자가
 * 같은 단계를 두 이름으로 배우게 된다.
 *
 * `tag`가 있는 단계는 **사람이 관여하는 단계**다 — 그 단계의 팝업만 연한 브랜드
 * 초록 바탕이 되고, 제목 오른쪽에 이 문구가 라벨로 붙는다(도구가 자동으로
 * 진행하는 단계와 구분). 완료를 뜻하는 --ok 계열이 아니라 --accent 계열을 쓰는
 * 이유가 이것이다. 관여의 성격이 단계마다 달라 문구도 단계별로 둔다: 선택·설정은
 * 사람이 값을 넣는 '개입'이고, 결과는 사람이 결론을 내리는 '판단'이다.
 *
 * ⚠️ body는 임시 문안이다 — 발표용 최종 문구는 사용자가 별도로 준다(2026-08-20).
 * 이 상수만 고치면 화면에 반영된다. 위치(percent)는 WIZARD_STEPS 순서에서
 * 자동 계산하므로 여기서 정하지 않는다.
 */
const STEP_POPUPS = {
  project: {
    title: '프로젝트 분석',
    body: '분석할 프로젝트를 지정합니다. package.json과 lockfile을 읽어 실제로 설치된 버전을 확인합니다.',
  },
  library: {
    title: '분석할 라이브러리 선택',
    body: '프로젝트의 직접 의존성 목록입니다. 알려진 취약점과 지원 종료 여부를 함께 보고 무엇부터 다룰지 정합니다.',
    tag: '사람이 개입',
  },
  version: {
    title: '분석 설정',
    body: '현재 버전과 목표 버전을 확정합니다. 두 버전 사이의 모든 중간 릴리즈가 분석 범위에 들어갑니다.',
    tag: '사람이 개입',
  },
  running: {
    title: '영향 분석',
    body: '공식 릴리즈 노트를 수집해 분류하고, 프로젝트 소스와 대조해 영향을 판정합니다.',
  },
  result: {
    title: '분석 결과',
    body: '판정 결과입니다. 해야 할 작업과 확인이 필요한 항목으로 정리됩니다.',
    tag: '사람이 판단',
  },
};

const milestones = computed(() =>
  WIZARD_STEPS.map((step, index) => ({
    view: step.view,
    // 팝업 제목이 없으면 스텝바 라벨로 떨어진다 — 화면이 늘어도 빈 제목은 없다.
    title: STEP_POPUPS[step.view]?.title ?? step.label,
    label: step.label,
    percent: Math.round(((index + 1) / WIZARD_STEPS.length) * 100),
    body: STEP_POPUPS[step.view]?.body ?? '',
    // 이 한 필드가 초록 바탕과 라벨을 함께 결정한다 — 둘이 어긋날 수 없다.
    tag: STEP_POPUPS[step.view]?.tag ?? '',
  })),
);

const VIEWS = {
  project: ProjectSelect,
  library: LibrarySelect,
  version: VersionSelect,
  running: AnalysisRunning,
  result: ResultShell,
};

const currentView = computed(() => VIEWS[state.view] ?? ProjectSelect);

/*
 * Workspace contract (see shell/workspaces.js). The shell switches screens
 * through these three functions and never reads this store directly.
 */
defineExpose({
  hasWorkToDiscard: () => analysis.hasWorkToDiscard.value,
  discardPoints: () => resetPoints.value,
  teardown: () => analysis.resetSession(),
});

// A count of what the resolver could pin, not a claim that these should be
// upgraded — that judgment needs registry data and L6/L7, neither of which exist.
const versionResolvedCount = computed(
  () => directDependencies.value.filter((dep) => dep.resolvedVersion && !dep.isUrlDependency).length,
);

const kpiCards = computed(() => {
  const dependency = state.selectedDependency;
  const current = dependency?.resolvedVersion ?? '-';
  const target = state.targetVersion || '헬스체크';

  if (state.view === 'library') {
    return [
      { label: '전체 라이브러리', value: `${directDependencies.value.length}개` },
      {
        label: '버전 확인됨',
        value: `${versionResolvedCount.value}개`,
        hint: 'lockfile에서 설치 버전을 해석함',
      },
      { label: '영향 가능 항목', value: '대상 선택 필요' },
      { label: '관련 파일', value: '대상 선택 필요' },
    ];
  }

  if (state.view === 'version') {
    return [
      { label: '전체 라이브러리', value: `${directDependencies.value.length}개` },
      { label: '버전 확인됨', value: `${versionResolvedCount.value}개` },
      { label: '선택 라이브러리', value: dependency?.name ?? '-' },
      { label: '현재 버전', value: current },
    ];
  }

  if (state.view === 'running') {
    // 시연 모드는 완료 후에도 이 화면에 머무른다('결과 보기' 대기) —
    // 그동안 상태가 '진행 중'으로 남으면 화면이 스스로 거짓말을 한다.
    const runStatus = state.l4Status === 'cancelled'
      ? '취소됨'
      : state.busy
        ? '진행 중'
        : state.error
          ? '중단'
          : '완료';
    return [
      { label: '분석 대상', value: dependency?.name ?? '-' },
      { label: '현재 버전', value: current },
      { label: '목표 버전', value: target },
      { label: '분석 상태', value: runStatus },
    ];
  }

  // 결과 화면은 상단 KPI를 걸지 않는다 — 분석 대상·버전은 요약탭의 range
  // 표시와 중복이었고, 결론 성격의 수치(작업 항목·검토 필요·취약점 해소)는
  // 요약탭 상단 카드가 맡는다. 다른 증거 탭은 자기 데이터가 곧 화면이다.
  return null;
});
</script>

<template>
  <div class="app">
    <AppHeader :analysis="analysis" @home="requestHome">
      <template #rail>
        <StepRail :analysis="analysis" />
      </template>
    </AppHeader>

    <main class="page">
      <KpiCards v-if="kpiCards" :cards="kpiCards" />
      <ProgressPanel
        :percent="progressPercent"
        :message="state.message"
        :tone="state.messageTone"
        :active="state.busy"
        :milestones="milestones"
      />
      <component :is="currentView" :analysis="analysis" />
    </main>

    <ConfirmDialog
      :open="confirmingReset"
      title="분석을 중단하고 처음으로 돌아갈까요?"
      body="진행 중인 작업을 모두 끊고 세션을 초기 상태로 되돌립니다. 되돌릴 수 없습니다."
      :points="resetPoints"
      confirm-label="중단하고 초기화"
      cancel-label="계속 진행"
      @confirm="confirmHome"
      @cancel="confirmingReset = false"
    />

    <!-- DEV-ONLY 오버레이 — 레이아웃 공간을 차지하지 않으며 실구현에서 제거. -->
    <DevPreviewPanel :analysis="analysis" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
}

.page {
  max-width: var(--page-w);
  margin: 0 auto;
  padding: var(--s-6) var(--gutter) var(--s-8);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}
</style>
