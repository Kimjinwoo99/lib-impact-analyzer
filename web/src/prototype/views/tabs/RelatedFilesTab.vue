<script setup>
import { computed } from 'vue';
import DataTable from '../../components/DataTable.vue';
import StatusPill from '../../components/StatusPill.vue';
import MockBadge from '../../components/MockBadge.vue';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const COLUMNS = [
  { key: 'confidence', label: '우선순위', width: 110, sortable: true },
  { key: 'path', label: '파일', width: 380, sortable: true },
  { key: 'evidence', label: '근거' },
  // Named for what it is — match strength, not a final risk verdict.
  { key: 'score', label: '매칭 강도', width: 110, align: 'right', sortable: true },
];

const EVIDENCE_LABEL = {
  LIBRARY_IMPORT: '라이브러리 직접 import',
  IMPORT_SPECIFIER: '직접 컴포넌트 import',
  VUE_TEMPLATE_TAG: '템플릿 태그 사용',
  COMPONENT_SYMBOL: '컴포넌트 심볼 참조',
  DYNAMIC_COMPONENT: '동적 컴포넌트 등록',
  CONFIG_KEY: '설정 · defaults 키',
  RAW_TERM_WEAK: '약한 원문 용어',
};

const summary = computed(() => state.sourceMatch?.summary ?? null);
const maxScore = computed(() =>
  Math.max(1, ...(state.sourceMatch?.candidateFiles ?? []).map((file) => file.score ?? 0)),
);

const files = computed(() =>
  (state.sourceMatch?.candidateFiles ?? []).map((file) => ({
    ...file,
    evidence: evidenceText(file),
  })),
);

const unmatched = computed(() => state.sourceMatch?.unmatchedTerms ?? []);
const judgment = props.analysis.impactJudgment;

function evidenceText(file) {
  const types = file.evidenceTypes ?? [];
  const strong = types.filter((type) => type !== 'RAW_TERM_WEAK');
  const chosen = (strong.length ? strong : types).slice(0, 2);
  return chosen.map((type) => EVIDENCE_LABEL[type] ?? type).join(' · ') || '—';
}
</script>

<template>
  <div class="related">
    <div class="related__grid">
      <div class="related__main">
        <div class="related__head">
          <p class="related__count">
            관련 파일 후보 <strong>{{ files.length }}</strong>개
            <template v-if="summary"> · {{ summary.scannedFiles }}개 파일 스캔</template>
          </p>
          <p v-if="unmatched.length" class="related__unmatched">
            미매칭 검사 용어 {{ unmatched.length }}건
          </p>
        </div>

        <DataTable
          :columns="COLUMNS"
          :rows="files"
          :row-key="(row) => row.path"
          :selected-key="state.selectedFilePath"
          :loading="state.busy && !files.length"
          clickable
          size="md"
          :max-height="380"
          empty-title="검사 계획에 해당하는 소스가 발견되지 않았습니다."
          empty-body="추가 확인 탭에서 수동 검토 대상으로 넘어갑니다."
          empty-tone="warn"
          @row-click="(row) => analysis.selectFile(row.path)"
        >
          <template #cell-confidence="{ row }">
            <StatusPill :value="row.confidence" />
          </template>

          <template #cell-path="{ row }">
            <code class="path">{{ row.path }}</code>
          </template>

          <template #cell-evidence="{ row }">
            <span class="truncate evidence">{{ row.evidence }}</span>
          </template>

          <template #cell-score="{ row }">
            <span class="score">
              <span class="score__bar" :style="{ width: `${(row.score / maxScore) * 100}%` }" />
              <strong>{{ row.score }}</strong>
            </span>
          </template>
        </DataTable>

      </div>

      <aside class="side">
        <div class="side__head">
          <h3 class="section-title">권장 검토 · 테스트 요약</h3>
          <MockBadge reason="영향 판단·리스크 산정 기능은 구현 예정입니다." />
        </div>

        <template v-if="judgment">
          <p class="side__label">검토 항목</p>
          <ul class="checklist">
            <li v-for="line in judgment.recommendations" :key="line">
              <label><input type="checkbox" /><span>{{ line }}</span></label>
            </li>
          </ul>

          <p class="side__label">테스트 항목</p>
          <ul class="checklist">
            <li v-for="line in judgment.testSteps" :key="line">
              <label><input type="checkbox" /><span>{{ line }}</span></label>
            </li>
          </ul>
        </template>

        <p v-else class="side__empty">분류결과에서 항목을 선택하세요.</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.related {
  margin-top: var(--s-5);
}

.related__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: var(--s-4);
  align-items: start;
}

.related__main {
  min-width: 0;
}

.related__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
  margin-bottom: var(--s-3);
}

.related__count {
  margin: 0;
  font-size: var(--t-body);
  color: var(--muted);
}

.related__count strong {
  color: var(--text);
}

.related__unmatched {
  margin: 0;
  font-size: var(--t-small);
  color: var(--warn-fg);
}

.path {
  font-size: var(--t-small);
  color: var(--text);
}

.evidence {
  display: block;
  color: var(--muted);
}

.score {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 64px;
  padding: 2px 0;
}

.score__bar {
  position: absolute;
  right: 0;
  bottom: 0;
  height: 3px;
  border-radius: 2px;
  background: var(--accent);
  opacity: 0.45;
}

.score strong {
  font-variant-numeric: tabular-nums;
  color: var(--text);
}

.side {
  padding: var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft-alt);
}

.side__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-2);
  flex-wrap: wrap;
}

.side__label {
  margin: var(--s-5) 0 var(--s-2);
  font-size: var(--t-small);
  font-weight: 700;
  color: var(--accent);
}

.checklist {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.checklist label {
  display: flex;
  align-items: flex-start;
  gap: var(--s-2);
  padding: 6px 8px;
  margin: 0 -8px;
  border-radius: var(--radius-sm);
  font-size: var(--t-small);
  color: var(--text-2);
  cursor: pointer;
  transition: background var(--fast);
}

.checklist label:hover {
  background: var(--panel);
}

.checklist input {
  margin: 3px 0 0;
  accent-color: var(--accent);
  flex: none;
}

.checklist input:checked + span {
  color: var(--muted-soft);
  text-decoration: line-through;
}

.side__empty {
  margin: var(--s-4) 0 0;
  font-size: var(--t-small);
  color: var(--muted);
}

@media (max-width: 1180px) {
  .related__grid {
    grid-template-columns: 1fr;
  }
}
</style>
