<script setup>
import { computed } from 'vue';
import TabBar from '../components/TabBar.vue';
import { RESULT_TABS } from '../state/analysis.js';
import SummaryTab from './tabs/SummaryTab.vue';
import ParsedItemsTab from './tabs/ParsedItemsTab.vue';
import ClassificationTab from './tabs/ClassificationTab.vue';
import RelatedFilesTab from './tabs/RelatedFilesTab.vue';
import FileImpactTab from './tabs/FileImpactTab.vue';
import ManualCheckTab from './tabs/ManualCheckTab.vue';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const TABS = {
  summary: SummaryTab,
  changes: ParsedItemsTab,
  classification: ClassificationTab,
  files: RelatedFilesTab,
  impact: FileImpactTab,
  manual: ManualCheckTab,
};

const activeComponent = computed(() => TABS[state.activeTab] ?? SummaryTab);
const selectedFile = props.analysis.selectedFile;

const COUNTS = {
  changes: () => state.parseResult?.changeItemCount ?? null,
  classification: () => props.analysis.classificationItems.value.length || null,
  files: () => state.sourceMatch?.candidateFiles?.length ?? null,
  manual: () => props.analysis.manualCheckRows.value.length || null,
};

const MOCK_TABS = new Set(['files', 'impact', 'manual']);

const tabs = computed(() =>
  RESULT_TABS.map((tab) => ({
    ...tab,
    count: COUNTS[tab.key]?.() ?? null,
    flag: MOCK_TABS.has(tab.key) ? '구현 예정 항목 포함' : null,
    // 대응·테스트 is a DETAIL view: the only way in is clicking a row on the
    // 관련 파일 tab (selectFile navigates here). The tab itself never takes a
    // direct click — while you are inside it just renders as the active tab.
    disabled: tab.key === 'impact',
    disabledReason: '영향 파일 탭에서 항목을 선택하면 열립니다.',
  })),
);

const rangeTitle = computed(() => {
  const name = state.selectedDependency?.name ?? '';
  const current = state.parseResult?.currentVersion ?? '';
  const target = state.parseResult?.targetVersion;
  if (!target) return `${name} ${current} 헬스체크`;
  return `${name} ${current} → ${target}`;
});

// Screen 09 retitles the card around the file under inspection.
const isFileDetail = computed(() => state.activeTab === 'impact' && selectedFile.value);
const fileName = computed(() => (selectedFile.value?.path ?? '').split('/').pop() ?? '');
</script>

<template>
  <section class="card result">
    <header class="card-head">
      <!--
        The file-detail title keeps the path on the same line as the filename.
        A third line here would push the tab row down and misalign this tab
        against the other five.
      -->
      <div class="result__titles">
        <p class="eyebrow">{{ isFileDetail ? '영향 상세' : '분석 결과' }}</p>
        <h2 class="card-title result__title">
          <template v-if="isFileDetail">
            {{ fileName }}
            <span class="result__path mono">{{ selectedFile.path }}</span>
          </template>
          <template v-else>{{ rangeTitle }}</template>
        </h2>
      </div>

      <div class="result__head-actions">
        <span v-if="isFileDetail" class="pill">매칭 강도 {{ selectedFile.score }}</span>
        <span v-if="analysis.isMockClassification.value" class="pill pill--warn">Agent 미실행</span>
        <button
          v-if="isFileDetail"
          type="button"
          class="btn btn--sm"
          @click="analysis.setTab('files')"
        >
          영향 파일로
        </button>
      </div>
    </header>

    <div class="result__tabrow">
      <TabBar :tabs="tabs" :active="state.activeTab" @select="analysis.setTab" />
    </div>

    <component :is="activeComponent" :analysis="analysis" />
  </section>
</template>

<style scoped>
.result__titles {
  min-width: 0;
}

.result__title {
  display: flex;
  align-items: baseline;
  gap: var(--s-2);
  min-width: 0;
}

.result__path {
  font-size: var(--t-small);
  font-weight: 400;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.result__head-actions {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  flex-wrap: wrap;
  justify-content: flex-end;
}

.result__tabrow {
  margin-top: var(--s-5);
}
</style>
