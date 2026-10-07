<script setup>
import { computed, ref, watch } from 'vue';
import DataTable from '../../components/DataTable.vue';
import StatusPill from '../../components/StatusPill.vue';
import InfoTooltip from '../../components/InfoTooltip.vue';
import { openReviewGroups } from '../../state/manualCheck.js';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const COLUMNS = [
  // 이번 분석 vs 프로젝트 공통 — 공통 행은 매 실행마다 다시 나타나는 것이
  // 정상이라는 사실을 이 컬럼이 말해 준다.
  // '프로젝트 공통' 필이 100px를 넘어 옆 칼럼을 침범했다 — 필 실측 폭에 맞춘다.
  { key: 'scope', label: '범위', width: 132, sortable: true },
  // '비표준 배포'가 110px에서 줄바꿈됐다 — 가장 긴 값에 맞춘다.
  { key: 'category', label: '분류', width: 150, sortable: true },
  // 대상은 식별자 하나 — 좁게 고정하고 남는 폭을 산문 컬럼에 넘긴다.
  { key: 'target', label: '대상', width: 170 },
  /*
   * reason/recommendation are prose — flexible width + wrap mode below.
   * 사유가 압도적으로 길다(설명 문장 vs 지시 한 줄) — 유연 폭 대부분을
   * 사유에 준다(2026-08-22 피드백 재차).
   */
  { key: 'reason', label: '제외 · 불확실 사유', grow: 2.4 },
  // 권장은 최소 폭에 고정(grow 0) — 남는 폭은 전부 사유가 가진다.
  { key: 'recommendation', label: '수동 검토 권장', grow: 0, minWidth: 170 },
  { key: 'stateLabel', label: '상태', width: 110 },
];

const rows = computed(() =>
  props.analysis.manualCheckRows.value.map((row) => ({ ...row, stateLabel: row.state.label })),
);

/*
 * 검토 드릴다운 — 분류 범위 행을 누르면 이 탭이 검토 목록 화면으로 바뀐다.
 * 수집·변경사항·분류결과 탭은 증거 보관용이라 "거기 가서 보라"는 동선을
 * 만들지 않는다. 원문 링크와 요약이 여기서 바로 읽힌다.
 */
const view = ref('list'); // list | review

const reviewGroups = computed(() =>
  openReviewGroups(state.l4Execution, state.l6Execution?.result ?? null),
);
const reviewItemCount = computed(() =>
  reviewGroups.value.reduce((sum, group) => sum + (group.count ?? group.items?.length ?? 0), 0),
);

// 새 실행으로 목록이 사라지면 드릴다운도 함께 닫는다.
watch(reviewGroups, (groups) => {
  if (!groups.length) view.value = 'list';
});

function onRowClick(row) {
  if (row.drill === 'review-groups') view.value = 'review';
}

const USAGE_BADGE = {
  USED: { text: '사용 중', tone: 'bad', hint: '이 scope의 컴포넌트/심볼이 프로젝트 소스에서 실제로 검색됩니다 — 동작 변화가 화면에 닿을 수 있는 영역입니다.' },
  UNDETERMINED: { text: '판단 불가', tone: 'warn', hint: 'scope가 일반어라 정적 검색으로 사용 여부를 판정할 수 없습니다.' },
  UNUSED: { text: '미사용', tone: 'ok', hint: '이 scope의 심볼이 프로젝트에서 검색되지 않습니다.' },
};
</script>

<template>
  <div class="manual">
    <!-- 검토 목록 화면 -->
    <template v-if="view === 'review'">
      <div class="manual__head">
        <div>
          <h3 class="section-title">추가 검토 목록 — 원문 확인</h3>
          <p class="manual__sub">
            동작 변경 신호가 있으나 개별 판정이 닿지 않은 {{ reviewGroups.length }}개 영역
            ({{ reviewItemCount }}건) · 사용 파일 수 많은 순
          </p>
        </div>
        <button type="button" class="btn btn--sm" @click="view = 'list'">추가 확인으로</button>
      </div>

      <section v-for="group in reviewGroups" :key="group.scope" class="rg">
        <header class="rg__head">
          <span class="mono rg__scope">{{ group.scope }}</span>
          <InfoTooltip
            v-if="USAGE_BADGE[group.usageVerdict]"
            :heading="USAGE_BADGE[group.usageVerdict].text"
            :body="USAGE_BADGE[group.usageVerdict].hint"
          >
            <span class="pill" :class="`pill--${USAGE_BADGE[group.usageVerdict].tone}`">
              {{ USAGE_BADGE[group.usageVerdict].text }}
            </span>
          </InfoTooltip>
          <span v-if="group.fileCount" class="rg__meta">{{ group.fileCount }}개 파일에서 사용</span>
          <span class="rg__meta">{{ group.count ?? group.items?.length ?? 0 }}건</span>
        </header>
        <ul class="rg__list">
          <li v-for="item in group.items ?? []" :key="item.itemId" class="rg__row">
            <span class="mono rg__version">{{ item.version }}</span>
            <span class="rg__cat">{{ item.category }}</span>
            <span class="rg__summary">{{ item.summary }}</span>
            <a
              v-if="item.sourceUrl"
              class="rg__link"
              :href="item.sourceUrl"
              target="_blank"
              rel="noreferrer"
            >원문 ↗</a>
          </li>
        </ul>
      </section>

      <p v-if="!reviewGroups.length" class="manual__sub">검토할 영역이 없습니다.</p>
    </template>

    <!-- 기본 목록 -->
    <template v-else>
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
        clickable
        :max-height="380"
        empty-title="자동 분석 범위 밖 항목이 없습니다."
        empty-body="보류 항목·동적 사용 신호·비표준 배포·다중 설치 버전이 모두 없다는 뜻입니다."
        @row-click="onRowClick"
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
    </template>
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

.manual__sub {
  margin: var(--s-1) 0 0;
  font-size: var(--t-small);
  color: var(--muted);
}

.cat {
  color: var(--text);
  font-weight: 600;
}

.reason {
  color: var(--muted);
}

/* --- 검토 목록 --- */
.rg {
  margin-bottom: var(--s-4);
  padding: var(--s-3) var(--s-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft);
}

.rg__head {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  margin-bottom: var(--s-2);
}

.rg__scope {
  font-size: var(--t-body);
  font-weight: 700;
  color: var(--text);
}

.rg__meta {
  font-size: var(--t-small);
  color: var(--muted);
}

.rg__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.rg__row {
  display: grid;
  grid-template-columns: 72px 96px minmax(0, 1fr) auto;
  column-gap: var(--s-3);
  align-items: baseline;
  padding: var(--s-1) 0;
  border-top: 1px solid var(--line-soft);
  font-size: var(--t-small);
}

.rg__version {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.rg__cat {
  color: var(--muted);
  font-size: var(--t-micro);
  font-weight: 600;
  letter-spacing: 0.03em;
}

.rg__summary {
  color: var(--text-2);
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.rg__link {
  color: var(--accent);
  font-size: var(--t-small);
  white-space: nowrap;
  text-decoration: none;
}

.rg__link:hover {
  text-decoration: underline;
}
</style>
