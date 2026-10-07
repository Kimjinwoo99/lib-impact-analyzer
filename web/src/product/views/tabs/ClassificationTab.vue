<script setup>
import { computed } from 'vue';
import DataTable from '../../components/DataTable.vue';
import StatusPill from '../../components/StatusPill.vue';
import InfoTooltip from '../../components/InfoTooltip.vue';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const COLUMNS = [
  { key: 'version', label: 'Version', width: 95, mono: true, sortable: true },
  { key: 'agentCategory', label: 'Category', width: 120, sortable: true },
  { key: 'preliminaryRisk', label: 'Risk', width: 105, sortable: true },
  // Display vocabulary only — the data stays reviewRequired/REVIEW/SKIP.
  // "영향 판정 대상" says what the flag actually is: not "you must review
  // this" but "the text alone could not clear it; the impact judgment (or,
  // if it is never run, the reader) settles it".
  { key: 'reviewLabel', label: '영향 판정 대상', width: 125 },
  { key: 'usage', label: '사용 신호', width: 120 },
  { key: 'terms', label: 'Inspection terms', width: 300 },
  { key: 'reasoning', label: 'Reasoning' },
];

/*
 * Usage verdicts come from the pre-L4 code scan, NOT from the Agent — the
 * Agent never sees them. They answer "does this project even contain the
 * scope this change names", which is evidence for the reader, not a risk
 * verdict: UNDETERMINED means the scope was not searchable (validation,
 * layout, …), and such items are still fully classified.
 */
const usagePrescan = computed(() => state.l4Execution?.inputSummary?.usagePrescan ?? null);

const USAGE_LABEL = {
  USED: (entry) => ({ text: `사용 · ${entry.fileCount}파일`, tone: 'ok' }),
  UNUSED: () => ({ text: '직접 사용 없음', tone: 'idle' }),
  UNDETERMINED: () => ({ text: '판정 불가', tone: 'idle' }),
};

/*
 * REVIEW + 직접 사용 없음 is a real combination, not a contradiction: the
 * scan proves only that the scope's tag/symbol never appears in this project,
 * and components compose internally — a VOverlay fix reaches this project
 * through v-select and v-snackbar without a single direct VOverlay usage.
 * Dismissing such rows would hide exactly that kind of finding, so REVIEW
 * stands and the impact judgment (L6) settles it with project evidence.
 * The tooltip carries this so the reader does not need the doctrine.
 */
function usageTitle(row) {
  const usage = row.usage;
  if (!usage) return '';
  if (usage.verdict === 'UNDETERMINED') {
    return 'scope가 검색 가능한 심볼이 아니라 사용 여부를 판정할 수 없습니다. 분류는 정상 수행됩니다.';
  }
  if (usage.verdict === 'UNUSED' && row.reviewRequired) {
    return '이 스캔은 직접 사용(템플릿 태그·심볼)만 봅니다. 다른 컴포넌트가 내부에서 쓰는 간접 경로는 배제하지 못하므로 판정 대상 표시가 유지되며, 영향 판정 단계가 프로젝트 근거로 최종 결론을 냅니다.';
  }
  return usage.files?.length ? usage.files.join('\n') : '';
}

// The design sorts REVIEW items first, then SKIP. Within REVIEW, rows the project
// demonstrably uses come first — they are the actionable ones.
const USAGE_RANK = { USED: 0, UNDETERMINED: 1, UNUSED: 2 };
const rows = computed(() =>
  [...props.analysis.classificationItems.value]
    .map((item) => ({
      ...item,
      reviewLabel: item.reviewRequired ? '판정 대상' : '대상 아님',
      terms: termsOf(item),
      usage: usagePrescan.value?.byItemId?.[item.itemId] ?? null,
    }))
    .sort(
      (a, b) =>
        Number(b.reviewRequired) - Number(a.reviewRequired) ||
        (USAGE_RANK[a.usage?.verdict] ?? 1) - (USAGE_RANK[b.usage?.verdict] ?? 1),
    ),
);

const deferredCount = computed(() => state.l4Execution?.inputSummary?.deferredItemCount ?? 0);

/*
 * Deferred items arrive pre-triaged by code: a concrete review list (risk-
 * shaped text the usage scan could not rule out) and an excluded remainder
 * (unused scope / fixes-features the upgrade simply delivers). The screen
 * shows the decision, not the raw pile.
 */
const triage = computed(() => state.l4Execution?.inputSummary?.deferredTriage ?? null);
const reviewList = computed(() => triage.value?.review ?? []);
// Folded by scope: the reviewer's unit is "component × what changed about
// it", so 130 rows read as ~50 groups with their items one click away.
const reviewGroups = computed(() => triage.value?.reviewGroups ?? []);

function termsOf(item) {
  const plan = item.inspectionPlan ?? {};
  const list = [...(plan.componentTags ?? []), ...(plan.configKeys ?? []), ...(plan.searchTerms ?? [])];
  return [...new Set(list)].slice(0, 6).join(', ');
}

/* ---- 선택 항목의 텍스트 매칭 후보 (옛 '영향 파일' 탭 하단) ------------- */

const selectedItem = props.analysis.selectedItem;
const selectedFile = props.analysis.selectedFile;

const CANDIDATE_COLUMNS = [
  { key: 'confidence', label: '우선순위', width: 110, sortable: true },
  { key: 'path', label: '파일', width: 360, sortable: true },
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

const matchSummary = computed(() => state.sourceMatch?.summary ?? null);
const candidateFiles = computed(() => state.sourceMatch?.candidateFiles ?? []);
const unmatchedTerms = computed(() => state.sourceMatch?.unmatchedTerms ?? []);
const maxScore = computed(() => Math.max(1, ...candidateFiles.value.map((file) => file.score ?? 0)));

const candidateRows = computed(() =>
  candidateFiles.value.map((file) => ({ ...file, evidence: evidenceText(file) })),
);

function evidenceText(file) {
  const types = file.evidenceTypes ?? [];
  const strong = types.filter((type) => type !== 'RAW_TERM_WEAK');
  const chosen = (strong.length ? strong : types).slice(0, 2);
  return chosen.map((type) => EVIDENCE_LABEL[type] ?? type).join(' · ') || '—';
}

// 매칭 결과는 매치당 한 줄이지 주변 소스 창이 아니다 — 걸린 줄만 그대로 보인다.
const matchLines = computed(() => {
  const matches = selectedFile.value?.matches ?? [];
  return [...matches].sort((a, b) => a.line - b.line).slice(0, 12);
});

const hiddenMatches = computed(() =>
  Math.max(0, (selectedFile.value?.matches?.length ?? 0) - matchLines.value.length),
);
</script>

<template>
  <div class="cls">
    <p class="hint tab-intro">
      중간 과정 — 4단계 Agent가 변경 항목별 위험을 분류한 결과입니다. 영향 판정(대응·테스트
      탭)이 이 판정 대상들을 입력으로 쓰고, 행을 클릭하면 그 항목의 관련 파일 후보를 찾습니다.
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
        <InfoTooltip
          :heading="row.reviewLabel"
          :body="row.reviewRequired
            ? '릴리즈 노트 텍스트만으로는 안전 판정 불가 — 영향 판정(L6)을 실행하면 이 항목들이 프로젝트 근거로 최종 판정됩니다.'
            : '텍스트만으로 프로젝트 대조가 불필요하다고 분류된 항목입니다.'"
        >
          <StatusPill :value="row.reviewLabel" :tone="row.reviewRequired ? 'review' : 'skip'" />
        </InfoTooltip>
      </template>

      <template #cell-usage="{ row }">
        <InfoTooltip
          v-if="row.usage && usageTitle(row)"
          :heading="USAGE_LABEL[row.usage.verdict](row.usage).text"
          :body="usageTitle(row)"
        >
          <span class="pill" :class="`pill--${USAGE_LABEL[row.usage.verdict](row.usage).tone}`">
            {{ USAGE_LABEL[row.usage.verdict](row.usage).text }}
          </span>
        </InfoTooltip>
        <span
          v-else-if="row.usage"
          class="pill"
          :class="`pill--${USAGE_LABEL[row.usage.verdict](row.usage).tone}`"
        >
          {{ USAGE_LABEL[row.usage.verdict](row.usage).text }}
        </span>
        <span v-else>—</span>
      </template>

      <template #cell-terms="{ row }">
        <span class="truncate mono terms" :title="row.terms">{{ row.terms }}</span>
      </template>

      <template #cell-reasoning="{ row }">
        <span class="truncate reason" :title="row.reasoning">{{ row.reasoning }}</span>
      </template>
    </DataTable>

    <!--
      텍스트 매칭 후보 — 옛 '영향 파일' 탭의 아래쪽 표가 여기로 왔다.
      그 표의 단위는 실행 전체가 아니라 "지금 고른 분류 항목 1건"이라, 판정
      작업 목록(대응·테스트) 옆에 있으면 두 표의 축이 달라 서로 합산되는
      것처럼 읽혔다. 후보를 만들어내는 행이 있는 이 탭이 제자리다.
    -->
    <section class="cand">
      <div class="cand__head">
        <p class="cand__title">
          <template v-if="selectedItem">
            <span class="mono">{{ selectedItem.scope || selectedItem.itemId }}</span>의 관련 파일 후보
            <strong>{{ candidateFiles.length }}</strong>개
          </template>
          <template v-else>관련 파일 후보</template>
        </p>
        <p v-if="matchSummary" class="cand__meta">
          {{ matchSummary.scannedFiles }}개 파일 스캔
          <template v-if="unmatchedTerms.length"> · 미매칭 검사 용어 {{ unmatchedTerms.length }}건</template>
        </p>
      </div>

      <p v-if="!selectedItem" class="hint cand__empty">
        위 표에서 행을 클릭하면 해당 항목의 검사 계획으로 프로젝트 소스를 탐색해 관련 파일 후보를 찾습니다.
      </p>
      <template v-else>
        <DataTable
          :columns="CANDIDATE_COLUMNS"
          :rows="candidateRows"
          :row-key="(row) => row.path"
          :selected-key="state.selectedFilePath"
          :loading="state.busy && !candidateRows.length"
          clickable
          size="md"
          :max-height="260"
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

        <!-- 매칭 라인 — 후보를 고르면 그 자리에서 펼친다. 검사 용어가 실제로
             걸린 줄이지, 영향 판정이 아니다(판정은 대응·테스트 탭). -->
        <div v-if="selectedFile" class="cand__lines">
          <p class="cand__linehead">
            <span class="mono">{{ selectedFile.path }}</span>
            <span class="cand__linemeta">
              {{ matchLines.length ? `매칭 ${selectedFile.matches?.length ?? 0}건` : '라인 단위 증거 없음' }}
            </span>
          </p>
          <div v-if="matchLines.length" class="code">
            <div v-for="match in matchLines" :key="`${match.line}-${match.term}`" class="code__line">
              <span class="code__no mono">{{ match.line }}</span>
              <code class="code__src">{{ match.snippet }}</code>
              <span class="code__tag mono">{{ match.term }}</span>
            </div>
          </div>
          <p v-if="hiddenMatches" class="hint">동일 파일의 나머지 {{ hiddenMatches }}건은 생략했습니다.</p>
        </div>

        <p v-if="unmatchedTerms.length" class="hint cand__unmatched">
          미매칭: <span class="mono">{{ unmatchedTerms.join(', ') }}</span> — 프로젝트가 이름을 실행 시점에
          조립하는 경우에만 수동 검토 대상이 되며, 추가 확인 탭이 그 판단을 표시합니다.
        </p>
      </template>
    </section>

    <details v-if="reviewGroups.length" class="review" open>
      <summary class="review__summary">
        추가 검토 {{ reviewGroups.length }}개 영역 · {{ reviewList.length }}건
        <span class="collect__dim review__dim">
          — 동작 변경 신호가 있는 미분석 항목.
          나머지 {{ (triage.excludedCount ?? 0).toLocaleString() }}건은 미사용 대상·수령분·되돌려진 변경으로 검토에서 제외
        </span>
      </summary>
      <details v-for="group in reviewGroups" :key="group.scope" class="review__group">
        <summary class="review__group-head">
          <span class="mono review__scope">{{ group.scope }}</span>
          <span class="collect__dim">{{ group.count }}건</span>
          <InfoTooltip v-if="group.usageVerdict === 'USED'" :body="`이 프로젝트에서 ${group.fileCount}개 파일이 사용합니다.`">
            <span class="pill pill--ok">사용 {{ group.fileCount }}파일</span>
          </InfoTooltip>
          <span class="collect__dim review__peek">{{ group.items[0]?.summary }}</span>
        </summary>
        <ul class="review__list">
          <li v-for="item in group.items" :key="item.itemId" class="review__row">
            <span class="mono review__version">{{ item.version }}</span>
            <a v-if="item.sourceUrl" class="review__text" :href="item.sourceUrl" target="_blank" rel="noreferrer">
              {{ item.summary }}
            </a>
            <span v-else class="review__text">{{ item.summary }}</span>
          </li>
        </ul>
      </details>
    </details>
    <p v-else-if="deferredCount" class="hint">
      미분석 {{ deferredCount.toLocaleString() }}건은 전부 미사용 대상·업데이트 수령분·되돌려진 변경입니다 — 검토 항목 없음.
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

/* ---- 관련 파일 후보 ---------------------------------------------------- */

.cand {
  margin-top: var(--s-4);
  padding: var(--s-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft);
}

.cand__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
  margin-bottom: var(--s-3);
  flex-wrap: wrap;
}

.cand__title {
  margin: 0;
  font-size: var(--t-body);
  font-weight: 600;
  color: var(--text-2);
}

.cand__meta {
  margin: 0;
  font-size: var(--t-small);
  color: var(--muted-soft);
}

.cand__empty {
  margin: 0;
}

.path {
  font-size: var(--t-small);
  color: var(--text-2);
}

.evidence {
  display: block;
  color: var(--muted);
}

.score {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  justify-content: flex-end;
  width: 100%;
}

.score__bar {
  height: 4px;
  min-width: 2px;
  max-width: 56px;
  border-radius: var(--radius-pill);
  background: var(--brand);
}

.cand__lines {
  margin-top: var(--s-3);
}

.cand__linehead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
  margin: 0 0 var(--s-2);
  font-size: var(--t-small);
  font-weight: 600;
  color: var(--text-2);
  flex-wrap: wrap;
}

.cand__linemeta {
  font-weight: 400;
  color: var(--muted-soft);
}

.code {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--panel);
  overflow-x: auto;
}

.code__line {
  display: flex;
  align-items: baseline;
  gap: var(--s-3);
  padding: 3px var(--s-3);
  font-size: var(--t-small);
  white-space: nowrap;
}

.code__line + .code__line {
  border-top: 1px dashed var(--line-soft);
}

.code__no {
  flex: none;
  width: 34px;
  text-align: right;
  font-size: var(--t-micro);
  color: var(--muted-soft);
}

.code__src {
  color: var(--text-2);
}

.code__tag {
  margin-left: auto;
  flex: none;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--idle-bg);
  color: var(--idle-fg);
  font-size: var(--t-micro);
}

.cand__unmatched {
  margin-top: var(--s-3);
}

.review {
  margin-top: var(--s-4);
  padding: var(--s-3) var(--s-4);
  border: 1px solid var(--line);
  border-left: 3px solid var(--warn-fg);
  border-radius: var(--radius-inner);
  background: var(--soft);
}

.review__summary {
  cursor: pointer;
  font-size: var(--t-body);
  font-weight: 600;
  color: var(--text-2);
}

.review__dim {
  font-weight: 400;
}

.review__group {
  margin-top: var(--s-2);
  padding-left: var(--s-2);
}

.review__group-head {
  display: flex;
  align-items: baseline;
  gap: var(--s-3);
  cursor: pointer;
  font-size: var(--t-small);
  padding: 2px 0;
}

.review__peek {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.review__list {
  margin: var(--s-2) 0 0 var(--s-5);
  padding: 0;
  list-style: none;
  max-height: 220px;
  overflow-y: auto;
}

.review__row {
  display: flex;
  align-items: baseline;
  gap: var(--s-3);
  padding: 3px 0;
  font-size: var(--t-small);
}

.review__version {
  flex: none;
  width: 64px;
  color: var(--muted);
}

.review__scope {
  flex: none;
  width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-2);
}

.review__text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-2);
}

a.review__text:hover {
  text-decoration: underline;
}

.tab-intro {
  margin: 0 0 var(--s-4);
  padding: var(--s-2) var(--s-3);
  border-left: 3px solid var(--line-strong);
  background: var(--soft);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
</style>
