<script setup>
/*
 * T1 collection evidence.
 *
 * Every later screen is downstream of this one, so this tab answers the
 * question that decides how much they are worth: of the versions that had to
 * be read, how many actually produced change items, and what happened to the
 * rest.
 *
 * Coverage here is a ratio over the target versions from the npm registry, not
 * over what the feed happened to return. Measuring against the feed would
 * always read 100% — a version the feed never carried cannot be reported
 * missing by the feed itself.
 */
import { computed } from 'vue';
import DataTable from '../../components/DataTable.vue';
import EmptyState from '../../components/EmptyState.vue';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const collection = computed(() => state.collection);
const rows = props.analysis.collectionRows;

const COLUMNS = [
  { key: 'version', label: '버전', width: 120, mono: true },
  { key: 'covered', label: '수집', width: 100 },
  { key: 'tier', label: '경로', width: 150 },
  { key: 'itemCount', label: '변경항목', width: 100, align: 'right' },
  { key: 'publishedAt', label: '공개일', width: 130, mono: true },
  { key: 'reason', label: '미수집 사유', width: 210 },
  { key: 'sourceUrl', label: '출처' },
];

const TIER_LABEL = {
  T1: { text: 'T1 atom', hint: '공식 릴리즈 노트', tone: 'ok' },
  T3_CHANGELOG: { text: 'T3 CHANGELOG', hint: '저장소 CHANGELOG 문서', tone: 'ok' },
  T2_GIT: { text: 'T2 git', hint: '태그 구간 커밋 로그', tone: 'warn' },
};

const REASON_LABEL = {
  NO_ITEMS_IN_BODY: '릴리즈 본문에 항목 없음 (링크뿐)',
  BEYOND_ENTRY_LIMIT: '피드 10건 창에서 밀려남',
  NOT_IN_FEED: '피드에 해당 태그 없음',
  FEED_UNAVAILABLE: '피드 요청 실패',
  NO_TAG_IN_REPOSITORY: '저장소에 해당 태그 없음',
  NO_RANGE_START: '비교 시작 태그 없음',
  NO_ITEMS_IN_COMMITS: '커밋에 변경항목 없음 (전부 노이즈)',
  GIT_UNAVAILABLE: 'git 접근 실패',
  NO_CHANGELOG_IN_REPOSITORY: '저장소에 CHANGELOG 문서 없음',
  VERSION_NOT_IN_CHANGELOG: 'CHANGELOG에 해당 버전 없음',
  CHANGELOG_UNAVAILABLE: 'CHANGELOG 읽기 실패',
  NOT_ATTEMPTED: '시도되지 않음',
  NO_GUIDE_IN_REPOSITORY: '저장소에 마이그레이션 가이드 없음',
};

// Why a feed entry was excluded from this package's releases.
const REJECTED_LABEL = {
  UNPARSABLE_TAG: '태그에서 버전을 읽지 못함',
  FOREIGN_MONOREPO_TAG: '같은 저장소의 다른 패키지 릴리즈',
  PRERELEASE: '프리릴리즈',
};

const FALLBACK_LABEL = {
  T2_REST_API: 'T2 REST API (한도 소모)',
  T3_RAW_CHANGELOG: 'T3 raw CHANGELOG (한도 0)',
};

const tiers = computed(() => collection.value?.tiers ?? []);

/*
 * Migration guides carry the breaking changes, and nothing else does: across
 * six of this project's dependencies, not one major release note had a
 * Breaking section and vuetify's commits carried zero breaking markers in 65.
 * Sections are filtered to components the project actually uses — 19 sections
 * down to 4 on the pilot fixture.
 */
const migrationDocs = computed(
  () => (state.migration?.applies ? state.migration.docs.filter((doc) => doc.found) : []),
);
const migrationMisses = computed(
  () => (state.migration?.applies ? state.migration.docs.filter((doc) => !doc.found) : []),
);

/*
 * `unknown` sections name no component the usage scan can search for, but a
 * config-shaped section (`build.target`, `css.preprocessorOptions...`) still
 * gets an answer from the config scan (갭 B): ABSENT means the project does
 * not set that key, which is a CONFIRMED fact — the new default applies
 * unfiltered — not an "unable to judge" case. Lumping both under "판정할 수
 * 없는 섹션" mislabeled a decision as a gap, the same shape as the file-detail
 * "0건 증거" bug: a channel (config verdict) existed and the summary text
 * ignored it.
 */
function absentSections(doc) {
  return doc.unknown.filter((section) => section.config?.verdict === 'ABSENT');
}
function undecidableSections(doc) {
  return doc.unknown.filter((section) => section.config?.verdict !== 'ABSENT');
}

const coveragePercent = computed(() => {
  const value = collection.value?.coverage;
  return typeof value === 'number' ? Math.round(value * 100) : null;
});

const stats = computed(() => {
  const data = collection.value;
  if (!data) return [];
  return [
    {
      label: '대상 버전',
      value: data.targetVersions?.length ?? 0,
      unit: '개',
      // The denominator is what npm actually published. Skipped numbers
      // (@commitlint/cli has no 20.5.1) are not gaps, and patches released
      // for OLDER version lines are not on this upgrade's path.
      hint: 'npm에 실제 발행된 릴리즈 중 설치 버전보다 높은 것만 — 건너뛴 번호와 구버전 라인용 수정판은 제외',
    },
    {
      label: '수집된 버전',
      value: data.coveredVersions?.length ?? 0,
      unit: '개',
      hint: '변경항목을 얻었거나 「변경 없음」이 확인된 버전',
    },
    {
      label: '변경항목',
      value: data.changeItemCount ?? 0,
      unit: '건',
      hint: '파서가 구조화한 원문 항목',
    },
    {
      label: '수집하지 못한 버전',
      value: data.missingVersions?.length ?? 0,
      unit: '개',
      hint: (data.missingVersions?.length ?? 0)
        ? '수집 실패는 「변경 없음」이 아닙니다 — 사유는 아래 목록에 있습니다'
        : '대상 버전을 모두 읽었습니다',
    },
  ];
});

const missingByReason = computed(() => {
  const grouped = new Map();
  for (const entry of collection.value?.missingVersions ?? []) {
    if (!grouped.has(entry.reason)) grouped.set(entry.reason, []);
    grouped.get(entry.reason).push(entry.version);
  }
  return [...grouped].map(([reason, versions]) => ({
    reason,
    label: REASON_LABEL[reason] ?? reason,
    versions,
  }));
});

// Sibling packages in the same monorepo publish to the same feed. Showing what
// was thrown out is the only way to tell "no release" from "wrong release".
const rejected = computed(() => tiers.value.flatMap((tier) => tier.rejectedEntries ?? []));

// Commit-log items are the release note's inputs, not the note. Mixing the two
// without saying which is which would overstate the weaker source.
const commitLogCount = computed(
  () => (collection.value?.collectedReleases ?? [])
    .filter((release) => release.precision === 'COMMIT_LOG')
    .reduce((total, release) => total + release.itemCount, 0),
);

function shortDate(value) {
  return value ? String(value).slice(0, 10) : '—';
}
</script>

<template>
  <div v-if="collection" class="collect">
    <p class="hint tab-intro">
      중간 과정 — 1~3단계 수집기가 릴리즈 변경 이력을 어떤 경로(T1 atom · T3 CHANGELOG · T2
      git)로 얼마나 읽었는지의 증빙입니다. 여기서 읽지 못한 버전의 변경은 다른 모든 탭의
      결과에도 없습니다.
    </p>
    <div class="collect__hero">
      <div class="collect__headline">
        <p class="collect__title">
          {{ collection.packageName }} · 대상 {{ collection.targetVersions?.length ?? 0 }}개 중
          <strong>{{ collection.coveredVersions?.length ?? 0 }}개</strong> 수집
        </p>
        <p class="collect__source">
          <span class="mono">{{ collection.repository }}</span>
          <span class="collect__dim">
            GitHub API 한도 소모 {{ collection.rateLimitCost }}회 · 토큰 불필요
          </span>
        </p>
      </div>

      <div class="collect__verdict">
        <p v-if="coveragePercent !== null" class="collect__coverage">
          커버리지 <strong>{{ coveragePercent }}%</strong>
        </p>
        <p v-if="commitLogCount" class="collect__dim">
          이 중 {{ commitLogCount.toLocaleString() }}건은 커밋 로그 기반
        </p>
      </div>
    </div>

    <div v-if="coveragePercent !== null" class="gauge">
      <span class="gauge__fill" :style="{ width: `${coveragePercent}%` }" />
    </div>

    <div class="tiers">
      <p class="section-title">수집 경로별 결과</p>
      <ul class="tiers__list">
        <li v-for="tier in tiers" :key="tier.tier" class="tiers__row">
          <span class="pill" :class="`pill--${(TIER_LABEL[tier.tier] ?? {}).tone ?? 'idle'}`">
            {{ (TIER_LABEL[tier.tier] ?? {}).text ?? tier.tier }}
          </span>
          <span class="tiers__hint">{{ (TIER_LABEL[tier.tier] ?? {}).hint ?? tier.source }}</span>
          <span>요청 <strong>{{ tier.askedFor }}</strong>개 → 수집 <strong>{{ tier.covered }}</strong>개</span>
          <span class="collect__dim">한도 {{ tier.evidence?.rateLimitCost ?? 0 }}회</span>
          <span v-if="tier.truncated" class="collect__dim">피드 {{ tier.entryLimit }}건 제한</span>
          <span v-if="tier.evidence?.tagCount" class="collect__dim">태그 {{ tier.evidence.tagCount }}개</span>
          <span v-if="tier.evidence?.filteredCommitCount" class="collect__dim">
            노이즈 커밋 {{ tier.evidence.filteredCommitCount }}건 제외
          </span>
          <span v-if="!tier.ok" class="collect__fail">실패: {{ tier.error?.message }}</span>
        </li>
      </ul>
      <p class="tiers__note">
        T1은 공식 릴리즈 노트를 그대로 읽고, T3는 저장소가 관리하는 CHANGELOG 문서를
        읽습니다. T2 git은 태그 구간의 커밋 로그이므로 릴리즈 노트의 <strong>재료</strong>이고
        정밀도가 가장 낮습니다 — 노트 본문은 GitHub 데이터베이스에 있어 git에는 존재하지
        않습니다. 세 경로 모두 GitHub API 한도를 쓰지 않습니다.
      </p>
    </div>

    <div class="collect__stats">
      <div v-for="stat in stats" :key="stat.label" class="stat">
        <p class="stat__label">{{ stat.label }}</p>
        <p class="stat__value">{{ stat.value.toLocaleString() }}<span>{{ stat.unit }}</span></p>
        <p class="stat__hint">{{ stat.hint }}</p>
      </div>
    </div>

    <div v-for="doc in migrationDocs" :key="doc.version" class="migration">
      <div class="migration__head">
        <p class="section-title">마이그레이션 가이드 · {{ doc.version }}</p>
        <a :href="doc.url" target="_blank" rel="noreferrer" class="mono migration__path">{{ doc.path }}</a>
      </div>
      <p class="migration__lead">
        {{ doc.length.toLocaleString() }}자 · 섹션 {{ doc.sectionCount }}개 중
        <strong>{{ doc.used.length }}개</strong>가 이 프로젝트가 쓰는 컴포넌트를 다룹니다
        <span class="collect__dim">(소스 {{ doc.scannedFiles }}파일 대조 · 미사용 {{ doc.unusedCount }}개 제외)</span>
      </p>

      <ul v-if="doc.used.length" class="migration__list">
        <li v-for="section in doc.used" :key="section.heading">
          <p class="migration__heading">
            {{ section.heading }}
            <span v-if="section.hasDiff" class="pill pill--warn">코드 수정 필요</span>
            <span class="collect__dim">{{ section.usedComponents.join(', ') }} · {{ section.fileCount }}파일</span>
          </p>
          <p v-if="section.excerpt" class="migration__excerpt">{{ section.excerpt }}</p>
          <p v-if="section.files.length" class="migration__files mono">{{ section.files.join(' · ') }}</p>
        </li>
      </ul>

      <!-- ABSENT: 결정론 확정 사실("이 옵션을 설정 안 했다") — 판정 불가가
           아니라 새 기본값을 그대로 적용받는다는 답이 이미 나온 것. -->
      <p v-if="absentSections(doc).length" class="migration__absent">
        프로젝트가 설정하지 않아 새 기본값을 그대로 적용받는 섹션 {{ absentSections(doc).length }}개 —
        <span class="collect__dim">
          <template v-for="(section, index) in absentSections(doc)" :key="section.heading">
            {{ section.heading }}<template v-if="section.config.absentKeys?.length"> ({{ section.config.absentKeys.join(', ') }})</template>{{ index < absentSections(doc).length - 1 ? ', ' : '' }}
          </template>
        </span>
      </p>
      <p v-if="undecidableSections(doc).length" class="migration__unknown">
        컴포넌트·설정 키를 지목하지 않아 사용 여부를 판정할 수 없는 섹션 {{ undecidableSections(doc).length }}개 —
        <span class="collect__dim">{{ undecidableSections(doc).map((section) => section.heading).join(', ') }}</span>
      </p>
      <p class="migration__note">
        본문은 요약하지 않습니다. 형식 편차가 커서 항목 단위로 쪼개면 신뢰할 수 없습니다 —
        해당 섹션을 원문에서 읽으세요.
      </p>
    </div>

    <p v-for="miss in migrationMisses" :key="miss.version" class="migration__miss">
      {{ miss.version }} 마이그레이션 가이드를 찾지 못했습니다
      ({{ REASON_LABEL[miss.reason] ?? miss.reason }}). 이 메이저의
      breaking change는 이 결과에 없습니다.
    </p>

    <div v-if="missingByReason.length" class="gap">
      <p class="section-title">수집하지 못한 버전</p>
      <p class="gap__lead">
        수집 실패는 「변경 없음」이 아닙니다. 아래 버전의 변경사항은 이 결과에 들어 있지 않습니다.
      </p>
      <ul class="gap__list">
        <li v-for="group in missingByReason" :key="group.reason">
          <span class="gap__reason">{{ group.label }}</span>
          <span class="gap__versions mono">{{ group.versions.join(', ') }}</span>
        </li>
      </ul>
      <p v-if="collection.needsFallback?.length" class="gap__next">
        다음 경로:
        <strong>{{ collection.needsFallback.map((key) => FALLBACK_LABEL[key] ?? key).join(' → ') }}</strong>
        <span class="collect__dim">— 미구현</span>
      </p>
      <p v-if="collection.manualReview?.required" class="gap__manual">
        {{ collection.manualReview.reason }}
      </p>
    </div>

    <div>
      <p class="section-title">버전별 수집 결과</p>
      <DataTable
        :columns="COLUMNS"
        :rows="rows"
        :row-key="(row) => row.version"
        empty-title="대상 버전이 없습니다."
        empty-body="설치 버전보다 높은 릴리즈가 없습니다."
      >
        <template #cell-covered="{ row }">
          <span class="pill" :class="row.covered ? 'pill--ok' : 'pill--bad'">
            {{ row.covered ? (row.noChanges ? '변경 없음' : '수집됨') : '미수집' }}
          </span>
        </template>
        <template #cell-tier="{ row }">
          <span v-if="row.tier" class="pill" :class="`pill--${(TIER_LABEL[row.tier] ?? {}).tone ?? 'idle'}`">
            {{ (TIER_LABEL[row.tier] ?? {}).text ?? row.tier }}
          </span>
          <span v-else>—</span>
        </template>
        <template #cell-itemCount="{ row }">{{ row.itemCount || '—' }}</template>
        <template #cell-publishedAt="{ row }">{{ shortDate(row.publishedAt) }}</template>
        <template #cell-reason="{ row }">
          {{ row.reason ? (REASON_LABEL[row.reason] ?? row.reason) : '—' }}
        </template>
        <template #cell-sourceUrl="{ row }">
          <a v-if="row.sourceUrl" :href="row.sourceUrl" target="_blank" rel="noreferrer" class="mono">
            {{ row.tagName }}
          </a>
          <span v-else>—</span>
        </template>
      </DataTable>
    </div>

    <details v-if="rejected.length" class="rejected">
      <summary>같은 피드에서 제외한 엔트리 {{ rejected.length }}개</summary>
      <ul>
        <li v-for="entry in rejected" :key="entry.tagName">
          <span class="mono">{{ entry.tagName }}</span>
          <span class="collect__dim">{{ REJECTED_LABEL[entry.reason] ?? entry.reason }}</span>
        </li>
      </ul>
      <p class="rejected__note">
        모노레포는 형제 패키지의 릴리즈가 같은 피드로 들어옵니다. 태그의 패키지명을 대조해
        걸러내지 않으면 남의 릴리즈를 우리 것으로 셉니다.
      </p>
    </details>
  </div>

  <EmptyState
    v-else
    title="수집 결과가 없습니다"
    body="라이브러리와 버전을 선택하고 분석을 실행하면 T1 수집 근거가 표시됩니다."
  />
</template>

<style scoped>
.migration {
  padding: var(--s-5);
  border: 1px solid var(--line);
  border-left: 3px solid var(--bad-fg);
  border-radius: var(--radius-inner);
  background: var(--soft-alt);
}

.migration__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
  flex-wrap: wrap;
}

.migration__path {
  font-size: var(--t-micro);
  color: var(--muted);
}

.migration__lead {
  margin: var(--s-2) 0 var(--s-3);
  font-size: var(--t-small);
  color: var(--text-2);
}

.migration__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.migration__heading {
  margin: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--s-2);
  font-size: var(--t-body);
  font-weight: 700;
  color: var(--text);
}

.migration__excerpt {
  margin: var(--s-1) 0 0;
  font-size: var(--t-small);
  color: var(--muted);
  line-height: 1.7;
}

.migration__files {
  margin: var(--s-1) 0 0;
  font-size: var(--t-micro);
  color: var(--muted-soft);
  word-break: break-all;
}

.migration__absent,
.migration__unknown,
.migration__note {
  margin: var(--s-3) 0 0;
  font-size: var(--t-micro);
  color: var(--muted-soft);
  line-height: 1.7;
}

.migration__miss {
  margin: 0;
  padding: var(--s-3) var(--s-5);
  border: 1px solid var(--line);
  border-left: 3px solid var(--warn-fg);
  border-radius: var(--radius-inner);
  background: var(--soft-alt);
  font-size: var(--t-small);
  color: var(--warn-fg);
}

.tiers {
  padding: var(--s-4) var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft-alt);
}

.tiers__list {
  margin: var(--s-3) 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.tiers__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--s-3);
  font-size: var(--t-small);
  color: var(--text-2);
}

.tiers__hint {
  color: var(--muted);
}

.tiers__note {
  margin: var(--s-3) 0 0;
  font-size: var(--t-micro);
  color: var(--muted-soft);
  line-height: 1.7;
}

.collect__fail {
  color: var(--bad-fg);
}

.collect {
  margin-top: var(--s-5);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.collect__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-5);
  padding: var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft-alt);
}

.collect__title {
  margin: 0;
  font-size: var(--t-section);
  font-weight: 700;
  color: var(--text);
}

.collect__source {
  margin: var(--s-2) 0 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
  font-size: var(--t-small);
  color: var(--muted);
}

.collect__dim {
  color: var(--muted-soft);
}

.collect__verdict {
  text-align: right;
  flex: none;
}

.collect__coverage {
  margin: var(--s-2) 0 0;
  font-size: var(--t-small);
  color: var(--muted);
  display: flex;
  gap: var(--s-2);
  justify-content: flex-end;
}

.gauge {
  position: relative;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--track);
  overflow: hidden;
}

.gauge__fill {
  display: block;
  height: 100%;
  background: var(--brand);
  transition: width var(--slow);
}

/* The grading threshold, so a bar can be read against it rather than guessed. */
.gauge__mark {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--muted-strong);
}

.collect__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--s-3);
}

.stat {
  padding: var(--s-4) var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft-stat);
}

.stat__label {
  margin: 0;
  font-size: var(--t-small);
  font-weight: 600;
  color: var(--muted);
}

.stat__value {
  margin: var(--s-2) 0 0;
  font-size: var(--t-display);
  font-weight: 700;
  color: var(--text);
}

.stat__value span {
  margin-left: 3px;
  font-size: var(--t-body);
  font-weight: 500;
  color: var(--muted);
}

.stat__hint {
  margin: var(--s-1) 0 0;
  font-size: var(--t-micro);
  color: var(--muted-soft);
  line-height: 1.5;
}

.gap {
  padding: var(--s-5);
  border: 1px solid var(--line);
  border-left: 3px solid var(--warn-fg);
  border-radius: var(--radius-inner);
  background: var(--soft-alt);
}

.gap__lead {
  margin: var(--s-2) 0 var(--s-3);
  font-size: var(--t-small);
  color: var(--muted);
}

.gap__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.gap__list li {
  display: flex;
  gap: var(--s-3);
  font-size: var(--t-small);
  align-items: baseline;
}

.gap__reason {
  flex: none;
  width: 230px;
  font-weight: 600;
  color: var(--text-2);
}

.gap__versions {
  color: var(--muted);
  word-break: break-all;
}

.gap__next,
.gap__manual {
  margin: var(--s-3) 0 0;
  font-size: var(--t-small);
  color: var(--text-2);
}

.gap__manual {
  color: var(--warn-fg);
}

.rejected {
  font-size: var(--t-small);
  color: var(--muted);
}

.rejected summary {
  cursor: pointer;
  color: var(--text-2);
}

.rejected ul {
  margin: var(--s-3) 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
}

.rejected li {
  display: flex;
  gap: var(--s-3);
}

.rejected__note {
  margin: var(--s-3) 0 0;
  font-size: var(--t-micro);
  color: var(--muted-soft);
  line-height: 1.7;
}

@media (max-width: 1180px) {
  .collect__stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.tab-intro {
  margin: 0 0 var(--s-4);
  padding: var(--s-2) var(--s-3);
  border-left: 3px solid var(--line-strong);
  background: var(--soft);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
</style>
