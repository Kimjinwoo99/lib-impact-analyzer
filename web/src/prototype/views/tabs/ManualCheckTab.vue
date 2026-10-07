<script setup>
import { computed } from 'vue';
import DataTable from '../../components/DataTable.vue';
import StatusPill from '../../components/StatusPill.vue';
import InfoTooltip from '../../components/InfoTooltip.vue';

const props = defineProps({ analysis: { type: Object, required: true } });

const COLUMNS = [
  // 이번 분석 vs 프로젝트 공통 — 공통 행은 매 실행마다 다시 나타나는 것이
  // 정상이라는 사실을 이 컬럼이 말해 준다.
  // '프로젝트 공통' 필이 100px를 넘어 옆 칼럼을 침범했다 — 필 실측 폭에 맞춘다.
  { key: 'scope', label: '범위', width: 132, sortable: true },
  { key: 'category', label: '분류', width: 110, sortable: true },
  { key: 'target', label: '대상', width: 220 },
  // reason/recommendation are prose — flexible width + wrap mode below.
  { key: 'reason', label: '제외 · 불확실 사유' },
  { key: 'recommendation', label: '수동 검토 권장' },
  { key: 'stateLabel', label: '상태', width: 110 },
];

const rows = computed(() =>
  props.analysis.manualCheckRows.value.map((row) => ({ ...row, stateLabel: row.state.label })),
);
</script>

<template>
  <div class="manual">
    <div class="manual__head">
      <h3 class="section-title">자동 분석 범위 밖의 항목</h3>
      <span class="pill pill--warn">{{ rows.length }}건</span>
    </div>

    <DataTable
      :columns="COLUMNS"
      :rows="rows"
      :row-key="(row) => `${row.category}:${row.target}`"
      size="md"
      wrap
      :max-height="380"
      empty-title="자동 분석 범위 밖 항목이 없습니다."
      empty-body="보류 항목·동적 사용 신호·비표준 배포·다중 설치 버전이 모두 없다는 뜻입니다."
    >
      <template #cell-scope="{ row }">
        <InfoTooltip
          :heading="row.scope"
          :body="row.scope === '프로젝트 공통'
            ? '분석 대상 라이브러리와 무관한 의존성 트리 자체의 사실 — 사실이 유지되는 한 매 실행마다 표시됩니다.'
            : '이번에 분석한 라이브러리에서 도출된 항목입니다.'"
        >
          <span class="pill" :class="row.scope === '이번 분석' ? null : 'pill--idle'">{{ row.scope }}</span>
        </InfoTooltip>
      </template>

      <template #cell-category="{ row }">
        <strong class="cat">{{ row.category }}</strong>
      </template>

      <template #cell-target="{ row }">
        <span>{{ row.target }}</span>
      </template>

      <template #cell-reason="{ row }">
        <span class="reason">{{ row.reason }}</span>
      </template>

      <template #cell-stateLabel="{ row }">
        <StatusPill :value="row.state.label" :tone="row.state.tone" />
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.manual {
  margin-top: var(--s-5);
}

.manual__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  margin-bottom: var(--s-4);
}

.cat {
  color: var(--text);
  font-weight: 600;
}

.reason {
  color: var(--muted);
}
</style>
