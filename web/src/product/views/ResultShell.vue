<script setup>
import { computed } from 'vue';
import TabBar from '../components/TabBar.vue';
import InfoTooltip from '../components/InfoTooltip.vue';
import { HEALTHCHECK_TOOLTIP } from '../lib/healthcheckTerm.js';
import { RESULT_TABS } from '../state/analysis.js';
import { groupJudgmentsByAction } from '../lib/actionGroups.js';
import { workRowStats } from '../lib/verifyProcedures.js';
import CollectionTab from './tabs/CollectionTab.vue';
import SummaryTab from './tabs/SummaryTab.vue';
import ParsedItemsTab from './tabs/ParsedItemsTab.vue';
import ClassificationTab from './tabs/ClassificationTab.vue';
import ActionChecklistTab from './tabs/ActionChecklistTab.vue';
import ManualCheckTab from './tabs/ManualCheckTab.vue';
import DiagnosisTab from './tabs/DiagnosisTab.vue';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const TABS = {
  collect: CollectionTab,
  summary: SummaryTab,
  changes: ParsedItemsTab,
  classification: ClassificationTab,
  impact: ActionChecklistTab,
  manual: ManualCheckTab,
  diagnosis: DiagnosisTab,
};

/*
 * A healthcheck run never populates classification/impact/files (L4/L6 do
 * not run for it — see runAnalysis), so those tabs would just render
 * permanently empty rather than "not yet reached". 요약 is dropped too, not
 * only softened: its one healthcheck-relevant stat (미적용 패치 수) already
 * lives in 진단's evidence panel, and its Classification Items card would
 * always read 0 with no explanation — a half-empty tab whose only unique
 * content had no reason to exist. 진단 is the run's entire deliverable, so
 * it is the landing tab (see runAnalysis' healthcheck branch), not one tab
 * among several. An upgrade run has no triage verdict to show, so 진단 is
 * the one hidden the other way.
 */
const isHealthcheck = computed(() => state.parseResult?.mode === 'CURRENT_VERSION_HEALTHCHECK');
const HEALTHCHECK_TABS = new Set(['diagnosis', 'collect', 'changes']);

const activeComponent = computed(() => TABS[state.activeTab] ?? SummaryTab);

const COUNTS = {
  collect: () => state.collection?.coveredVersions?.length ?? null,
  changes: () => state.parseResult?.changeItemCount ?? null,
  classification: () => props.analysis.classificationItems.value.length || null,
  // Work rows: 수정 조치(같은 조치 판정 접힘) + 확인 절차(같은 검증 묶음) +
  // 개별 확인 — actionGroups.js · verifyProcedures.js와 같은 정의.
  impact: () =>
    workRowStats(
      // 전제 조치 행까지 포함한 목록 — 대응 탭·요약 KPI와 같은 수를 말한다.
      groupJudgmentsByAction(props.analysis.workJudgments.value),
      {},
      state.l6Execution?.result?.smokePoints ?? [],
    ).total || null,
  manual: () => props.analysis.manualCheckRows.value.length || null,
};

// Tabs whose panel is partly empty because the stage behind it is missing.
const PENDING_TABS = new Set(['impact', 'manual']);

const tabs = computed(() =>
  RESULT_TABS.filter((tab) => (isHealthcheck.value ? HEALTHCHECK_TABS.has(tab.key) : tab.key !== 'diagnosis')).map(
    (tab) => ({
      ...tab,
      count: COUNTS[tab.key]?.() ?? null,
      flag: PENDING_TABS.has(tab.key) ? '미구현 영역 포함' : null,
    }),
  ),
);

/*
 * 수집·변경사항·분류결과는 Agent가 소비한 중간 데이터다 — 결과를 검증할 때
 * 여는 근거 자료이지, 사람이 실행하는 산출물(요약·대응·추가 확인)과 같은
 * 레벨이 아니다. 그래서 탭줄을 두 그룹으로 가른다: 산출물은 왼쪽, 근거는
 * 오른쪽에 레이블을 달아 밀어둔다. 숨기지는 않는다 — 요약의 카드·그래프가
 * "수집 탭 참고" 식으로 이 탭들을 지목하므로 한 클릭 거리는 유지해야 한다.
 */
const EVIDENCE_KEYS = new Set(['collect', 'changes', 'classification']);
const primaryTabs = computed(() => tabs.value.filter((tab) => !EVIDENCE_KEYS.has(tab.key)));
const evidenceTabs = computed(() => tabs.value.filter((tab) => EVIDENCE_KEYS.has(tab.key)));

/*
 * 헬스체크 실행에서는 제목의 '헬스체크'가 용어 툴팁을 달고 나온다(그 단어를
 * 처음 보는 사람이 결과를 읽는 화면이므로). 그래서 제목을 한 문자열로 만들지
 * 않고 앞부분과 용어를 나눈다.
 */
const rangePrefix = computed(() => {
  const name = state.selectedDependency?.name ?? '';
  const current = state.parseResult?.currentVersion ?? '';
  return `${name} ${current}`.trim();
});

const rangeTitle = computed(() => {
  const target = state.parseResult?.targetVersion;
  if (!target) return `${rangePrefix.value} 헬스체크`;
  return `${rangePrefix.value} → ${target}`;
});

/*
 * 제목 = 패키지명 + 범위 필. 요약탭이 쓰던 형식을 여기로 올렸다(2026-08-22
 * 피드백) — 같은 사실이 상단과 요약탭에 두 번 뜨던 중복을 없애고, 남기는
 * 쪽(모든 탭에서 보이는 상단)이 더 읽기 쉬운 형식을 가진다.
 */
const packageName = computed(() => state.selectedDependency?.name ?? '');

const rangePill = computed(() => {
  const current = state.parseResult?.currentVersion;
  const target = state.parseResult?.targetVersion;
  if (target) return `현재 ${current} → 목표 ${target}`;
  const latest = state.parseResult?.latestPatchInLine;
  return latest ? `${current} 헬스체크 · ${latest}까지 확인` : `${current} 헬스체크`;
});

</script>

<template>
  <section class="card result">
    <header class="card-head">
      <div class="result__titles">
        <p class="eyebrow">분석 결과</p>
        <h2 class="card-title result__title">
          <span class="mono result__pkg">{{ packageName }}</span>
          <InfoTooltip v-if="isHealthcheck" v-bind="HEALTHCHECK_TOOLTIP" class="result__term">헬스체크</InfoTooltip>
          <span class="pill result__range">{{ rangePill }}</span>
        </h2>
      </div>

      <div class="result__head-actions">
        <span
          v-if="analysis.isMockClassification.value"
          class="pill pill--warn"
          title="개발도구의 합성 Mock 데이터 — 실제 판정이 아닙니다"
        >Agent 미실행</span>
      </div>
    </header>

    <div class="result__tabrow">
      <TabBar :tabs="primaryTabs" :active="state.activeTab" @select="analysis.setTab" />
      <div v-if="evidenceTabs.length" class="result__evidence">
        <span
          class="result__evidence-label"
          title="분석이 소비한 중간 데이터 — 결과를 검증할 때 여는 자료입니다"
        >근거 자료</span>
        <TabBar :tabs="evidenceTabs" :active="state.activeTab" @select="analysis.setTab" />
      </div>
    </div>

    <component :is="activeComponent" :analysis="analysis" />
  </section>
</template>

<style scoped>
.result__pkg {
  font-weight: 700;
  /* 필과 같은 광학 중심에 놓이도록 줄 높이를 눌러 둔다 — 폰트 어센더 여백이
     baseline 정렬을 어긋나 보이게 했다(2026-08-22). */
  line-height: 1;
}

.result__titles {
  min-width: 0;
}

.result__title {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  flex-wrap: wrap;
  min-width: 0;
}

/* 제목 안의 용어 툴팁 — 서체는 제목을 그대로 상속하고 ⓘ만 덧붙는다. */
.result__term {
  font: inherit;
  color: inherit;
}

.result__head-actions {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.result__tabrow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  flex-wrap: wrap;
  margin-top: var(--s-5);
}

.result__evidence {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  min-width: 0;
}

.result__evidence-label {
  flex: none;
  font-size: var(--t-micro);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--muted-soft);
  cursor: help;
}
</style>
