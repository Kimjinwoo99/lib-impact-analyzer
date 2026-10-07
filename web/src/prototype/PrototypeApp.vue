<script setup>
import { computed, onMounted, ref } from 'vue';
import AppHeader from './components/AppHeader.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import KpiCards from './components/KpiCards.vue';
import ProgressPanel from './components/ProgressPanel.vue';
import StepRail from './components/StepRail.vue';
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
    return [
      { label: '분석 대상', value: dependency?.name ?? '-' },
      { label: '현재 버전', value: current },
      { label: '목표 버전', value: target },
      { label: '분석 상태', value: state.l4Status === 'cancelled' ? '취소됨' : '진행 중' },
    ];
  }

  if (state.view === 'result') {
    const tail =
      state.activeTab === 'classification'
        ? { label: 'Classification Items', value: `${classificationItems.value.length}개` }
        : state.activeTab === 'files' || state.activeTab === 'impact'
          ? {
              label: '관련 파일 후보',
              value: `${state.sourceMatch?.candidateFiles?.length ?? 0}개`,
            }
          : state.activeTab === 'manual'
            ? { label: '수동 검토 필요', value: `${analysis.manualCheckRows.value.length}건` }
            : { label: 'Parsed Items', value: `${state.parseResult?.changeItemCount ?? 0}개` };

    return [
      { label: '분석 대상', value: dependency?.name ?? '-' },
      { label: '현재 버전', value: current },
      { label: '목표 버전', value: target },
      tail,
    ];
  }

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
