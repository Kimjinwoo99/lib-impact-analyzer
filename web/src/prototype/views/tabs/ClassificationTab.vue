<script setup>
import { computed } from 'vue';
import DataTable from '../../components/DataTable.vue';
import StatusPill from '../../components/StatusPill.vue';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const COLUMNS = [
  { key: 'version', label: 'Version', width: 95, mono: true, sortable: true },
  { key: 'agentCategory', label: 'Category', width: 120, sortable: true },
  { key: 'preliminaryRisk', label: 'Risk', width: 105, sortable: true },
  // Display vocabulary only (kept in step with the product screen) — the
  // data stays reviewRequired.
  { key: 'reviewLabel', label: '영향 판정 대상', width: 125 },
  { key: 'terms', label: 'Inspection terms', width: 320 },
  { key: 'reasoning', label: 'Reasoning' },
];

// Judgment targets first, then the rest.
const rows = computed(() =>
  [...props.analysis.classificationItems.value]
    .sort((a, b) => Number(b.reviewRequired) - Number(a.reviewRequired))
    .map((item) => ({
      ...item,
      reviewLabel: item.reviewRequired ? '판정 대상' : '대상 아님',
      terms: termsOf(item),
    })),
);

const deferredCount = computed(() => state.l4Execution?.inputSummary?.deferredItemCount ?? 0);

function termsOf(item) {
  const plan = item.inspectionPlan ?? {};
  const list = [...(plan.componentTags ?? []), ...(plan.configKeys ?? []), ...(plan.searchTerms ?? [])];
  return [...new Set(list)].slice(0, 6).join(', ');
}
</script>

<template>
  <div class="cls">
    <p class="hint tab-intro">
      중간 과정 — 4단계 Agent가 변경 항목별 위험을 분류한 결과입니다. 행을 클릭하면 그
      항목의 관련 파일 후보를 찾습니다.
    </p>
    <div class="cls__head">
      <p class="cls__count">
        Classification Items · showing {{ rows.length }} / {{ rows.length + deferredCount }}
      </p>
      <p class="cls__sort">정렬: 판정 대상 우선 → 대상 아님 하단</p>
    </div>

    <DataTable
      :columns="COLUMNS"
      :rows="rows"
      :row-key="(row) => row.itemId"
      :selected-key="state.selectedItemId"
      :loading="state.busy && !rows.length"
      clickable
      :max-height="420"
      empty-title="분류 결과가 없습니다."
      empty-body="Agent가 항목을 반환하지 않았습니다. 실행 로그를 확인하세요."
      @row-click="analysis.selectClassificationItem"
    >
      <template #cell-preliminaryRisk="{ row }">
        <StatusPill :value="row.preliminaryRisk" />
      </template>

      <template #cell-reviewLabel="{ row }">
        <!-- Tone passed explicitly: the pill's value→tone table keys on the
             internal REVIEW/SKIP vocabulary, which no longer reaches it. -->
        <StatusPill :value="row.reviewLabel" :tone="row.reviewRequired ? 'review' : 'skip'" />
      </template>

      <template #cell-terms="{ row }">
        <span class="truncate mono terms" :title="row.terms">{{ row.terms }}</span>
      </template>

      <template #cell-reasoning="{ row }">
        <span class="truncate reason" :title="row.reasoning">{{ row.reasoning }}</span>
      </template>
    </DataTable>

    <p class="hint cls__hint">
      행을 클릭하면 해당 항목의 검사 계획으로 프로젝트 소스를 탐색해 관련 파일 후보를 찾습니다.
      <template v-if="deferredCount">
        보류 {{ deferredCount.toLocaleString() }}건은 분류 입력에서 제외되었으며, 보류는 안전을 뜻하지 않습니다.
      </template>
    </p>
  </div>
</template>

<style scoped>
.cls {
  margin-top: var(--s-5);
}

.cls__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-4);
  margin-bottom: var(--s-3);
  flex-wrap: wrap;
}

.cls__count {
  margin: 0;
  font-size: var(--t-body);
  font-weight: 600;
  color: var(--text-2);
}

.cls__sort {
  margin: 0;
  font-size: var(--t-small);
  color: var(--muted-soft);
}

.terms {
  display: block;
  font-size: var(--t-micro);
  color: var(--text-2);
}

.reason {
  display: block;
  color: var(--muted);
}

.cls__hint {
  margin-top: var(--s-3);
}

.tab-intro {
  margin: 0 0 var(--s-4);
  padding: var(--s-2) var(--s-3);
  border-left: 3px solid var(--line-strong);
  background: var(--soft);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
</style>
