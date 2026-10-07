<script setup>
import { computed } from 'vue';
import DataTable from '../../components/DataTable.vue';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

/*
 * Four columns carry a header hint, because each is a different kind of value
 * and the difference is not guessable from the value alone: Role is ours and
 * rule-based, 릴리즈 섹션 and 스코프 are upstream's wording verbatim, Summary is
 * upstream's wording with markup stripped.
 */
const COLUMNS = [
  { key: 'version', label: '버전', width: 90, mono: true, sortable: true },
  { key: 'publishedAt', label: '날짜', width: 105, mono: true, sortable: true },
  {
    key: 'versionRole',
    label: 'Role',
    width: 125,
    hint: {
      heading: 'Role',
      body:
        '이 항목이 어느 릴리즈에서 나왔는지 표시합니다. Current는 현재 설치 버전, ' +
        'Target은 목표 버전, Intermediate는 그 사이 버전입니다. ' +
        '미적용 수정은 헬스체크에서 현재 버전보다 나중에 나온 패치입니다.',
      caution: '버전 번호만 비교해 붙이며 항목 내용은 보지 않습니다.',
    },
  },
  /*
   * The release note's own section title, not the parser's enum.
   *
   * Named 릴리즈 섹션 rather than 카테고리 to keep it distinct from the
   * Classification tab's `Category`, which is the Agent's own verdict
   * (agentCategory). This column is upstream's wording; that one is ours.
   *
   * The enum is a section-title keyword match, so "Supporting Vuetify" and
   * "Other Commits" both collapse into OTHER and read on screen as "the parser
   * failed here". It still drives the tone and the sort: sorting on
   * categoryPriority keeps click-to-sort in severity order (BREAKING first)
   * rather than alphabetical order on the title.
   */
  {
    key: 'categoryPriority',
    label: '릴리즈 섹션',
    width: 185,
    sortable: true,
    hint: {
      heading: '릴리즈 섹션',
      body:
        '릴리즈 노트에 적힌 소제목 그대로입니다. Bug Fixes · Labs · Reverts처럼 ' +
        '라이브러리 쪽이 나눈 구분이며, 이 도구가 분류한 값이 아닙니다. ' +
        '정렬하면 알파벳순이 아니라 심각한 것부터 올라옵니다.',
      caution: '섹션 단위 표시입니다. Bug Fixes 안의 항목이 실제로 호환성을 깨뜨릴 수도 있습니다.',
    },
  },
  {
    key: 'scope',
    label: '스코프',
    width: 165,
    sortable: true,
    hint: {
      heading: '스코프',
      body:
        '항목이 어느 대상을 건드렸는지 릴리즈 노트가 밝힌 이름입니다. ' +
        '원문에서 굵게 앞에 붙은 부분을 그대로 가져옵니다.',
      caution: '그 표기를 쓰지 않은 항목은 비어 있습니다(—). 대상이 없다는 뜻은 아닙니다.',
    },
  },
  {
    key: 'summary',
    label: 'Summary',
    hint: {
      heading: 'Summary',
      body:
        '릴리즈 노트 원문에서 스코프 접두사와 링크·이슈 번호·커밋 해시를 걷어낸 문장입니다. ' +
        '문장을 새로 쓰거나 줄이지는 않으며, 셀에 마우스를 올리면 걷어내기 전 원문이 보입니다.',
    },
  },
  { key: 'sourceUrl', label: 'Source', width: 80 },
];

const PAGE_LIMIT = 50;

const allItems = computed(() => state.parseResult?.items ?? []);
const rows = computed(() => allItems.value.slice(0, PAGE_LIMIT));

const ROLE_LABEL = {
  CURRENT: 'Current',
  TARGET: 'Target',
  INTERMEDIATE: 'Intermediate',
  PATCH_AHEAD: '미적용 수정',
};
const CATEGORY_TONE = {
  BREAKING: 'bad',
  REVERT: 'warn',
  BUG_FIX: 'warn',
  OTHER: 'idle',
};

function formatDate(value) {
  return value ? String(value).slice(0, 10) : '—';
}
</script>

<template>
  <div class="parsed">
    <p class="hint tab-intro">
      중간 과정 — 3단계 파서가 릴리즈 원문을 구조화한 전체 항목입니다. Agent 분류(분류결과
      탭)와 관련 파일 매칭이 이 데이터를 입력으로 씁니다.
    </p>
    <div class="parsed__head">
      <p class="parsed__count">
        Parsed Items · showing {{ rows.length }} / {{ allItems.length.toLocaleString() }}
      </p>
      <p class="parsed__sort">
        정렬: 현재 버전 → 타겟 버전 → 중간 버전(최신순), 버전 내 카테고리 우선순위
      </p>
    </div>

    <DataTable
      :columns="COLUMNS"
      :rows="rows"
      :row-key="(row) => row.itemId"
      :max-height="420"
      empty-title="구조화된 변경항목이 없습니다."
      empty-body="선택한 버전 범위에 릴리즈 노트가 없거나 파서가 항목을 찾지 못했습니다."
    >
      <template #cell-publishedAt="{ row }">{{ formatDate(row.publishedAt) }}</template>

      <template #cell-versionRole="{ row }">
        <span class="role" :class="`role--${row.versionRole}`">
          {{ ROLE_LABEL[row.versionRole] ?? row.versionRole }}
        </span>
      </template>

      <template #cell-categoryPriority="{ row }">
        <span class="cat" :class="`cat--${CATEGORY_TONE[row.category] ?? 'plain'}`">
          {{ row.sectionTitle }}
        </span>
      </template>

      <template #cell-scope="{ row }">{{ row.scope || '—' }}</template>

      <template #cell-summary="{ row }">
        <span class="truncate summary" :title="row.rawText">{{ row.summary }}</span>
      </template>

      <template #cell-sourceUrl="{ row }">
        <a :href="row.sourceUrl" target="_blank" rel="noreferrer" class="link">release ↗</a>
      </template>
    </DataTable>
  </div>
</template>

<style scoped>
.parsed {
  margin-top: var(--s-5);
}

.parsed__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-4);
  margin-bottom: var(--s-3);
  flex-wrap: wrap;
}

.parsed__count {
  margin: 0;
  font-size: var(--t-body);
  font-weight: 600;
  color: var(--text-2);
}

.parsed__sort {
  margin: 0;
  font-size: var(--t-small);
  color: var(--muted-soft);
}

.role {
  font-weight: 600;
}

.role--CURRENT {
  color: var(--ok-fg);
}
.role--TARGET {
  color: var(--accent);
}
.role--INTERMEDIATE {
  color: var(--muted-soft);
}
.role--PATCH_AHEAD {
  color: var(--bad-fg);
}

.cat {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cat--bad {
  color: var(--bad-fg);
}
.cat--warn {
  color: var(--warn-fg);
}
.cat--idle {
  color: var(--muted-soft);
}
.cat--plain {
  color: var(--muted);
}

.summary {
  display: block;
  color: var(--text-2);
}

.link {
  color: var(--muted);
  text-decoration: none;
  font-size: var(--t-micro);
}

.link:hover {
  color: var(--accent);
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
