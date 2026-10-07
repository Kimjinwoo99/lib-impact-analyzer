<script setup>
import { computed } from 'vue';
import DataTable from '../components/DataTable.vue';
import InfoTooltip from '../components/InfoTooltip.vue';
import { mockLatestVersion } from '../mock/notImplemented.js';

/**
 * What each package.json section means, plus the caveat that matters for this
 * tool: the declared section is not proof of where the package is actually
 * used. A real project declares pinia and vue-router under devDependencies but imports
 * them at runtime in 95 source files.
 */
const DEPENDENCY_TYPES = {
  dependencies: {
    body: '런타임에 필요한 의존성입니다. 빌드 산출물에 포함되어 실제 서비스에서 동작합니다.',
    caution: '선언 위치가 실제 사용처를 보장하지는 않습니다. 빌드 전용 플러그인이 여기에 선언된 경우도 있습니다.',
  },
  devDependencies: {
    body: '개발·빌드 시점에만 쓰는 의존성입니다. 원칙적으로 빌드 산출물에 포함되지 않습니다.',
    caution: '실제로는 런타임에 쓰이는데 여기에 선언된 경우가 있습니다. 이 경우 영향 범위가 선언보다 넓습니다.',
  },
  peerDependencies: {
    body: '이 패키지를 사용하는 쪽이 직접 설치해야 하는 의존성입니다. 버전 호환 범위를 알리는 용도입니다.',
    caution: '',
  },
  optionalDependencies: {
    body: '설치에 실패해도 무시되는 선택적 의존성입니다. 없을 수도 있다는 전제로 코드가 동작해야 합니다.',
    caution: '',
  },
};

function typeInfo(type) {
  return DEPENDENCY_TYPES[type] ?? { body: '알 수 없는 선언 위치입니다.', caution: '' };
}

/*
 * A package installed at several versions still gets exactly one row.
 *
 * The row's unit is a declaration in package.json, and there is only one
 * realgrid declaration (^2.8.9 -> 2.9.7). The extra copy exists because some
 * other package required realgrid@*, so it is not a target the user can pick:
 * we neither declare it nor control its version. Splitting it into a second
 * row would offer an analysis that cannot be acted on.
 *
 * The same package declared in both dependencies and devDependencies does
 * produce two rows — the row key is `type:name` — because those are two real
 * declarations.
 */
function versionInfo(dep) {
  const others = (dep.installedVersions ?? []).filter((v) => v !== dep.resolvedVersion);
  return {
    heading: `설치된 버전 ${dep.installedVersions.length}개`,
    body:
      `이 선언(${dep.declaredRange})은 ${dep.resolvedVersion}로 해석됩니다. ` +
      `lockfile에는 ${others.join(', ')}도 함께 설치되어 있으며, 다른 패키지가 요구한 전이 의존성입니다.`,
    caution: '실행 시점에 번들러가 어느 사본을 로드하는지는 별도 확인이 필요합니다.',
  };
}

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const COLUMNS = [
  { key: 'name', label: '라이브러리', width: 230, sortable: true },
  { key: 'declaredRange', label: '선언 버전', width: 150, mono: true },
  { key: 'resolvedVersion', label: '현재 버전', width: 190, mono: true, sortable: true },
  // The header carries the "구현 예정" marker so the cells stay plain numbers.
  { key: 'latestVersion', label: '최신 버전 (구현 예정)', width: 175, mono: true },
  { key: 'dependencyType', label: '유형', width: 175, sortable: true },
  { key: 'action', label: '' },
];

const enriched = computed(() =>
  props.analysis.directDependencies.value.map((dep) => ({
    ...dep,
    latestVersion: mockLatestVersion(dep.name),
    // "supported" is a fact about this tool, not a judgment about the package:
    // the server reports which packages have collected release data.
    supported: state.supportedPackages.includes(dep.name) && Boolean(dep.resolvedVersion),
  })),
);

const rows = computed(() => {
  const search = state.librarySearch.trim().toLowerCase();
  let list = enriched.value;

  if (search) list = list.filter((dep) => dep.name.toLowerCase().includes(search));
  if (state.libraryTypeFilter !== 'ALL') {
    list = list.filter((dep) => dep.dependencyType === state.libraryTypeFilter);
  }

  if (state.librarySort === 'TYPE') {
    return [...list].sort(
      (a, b) => a.dependencyType.localeCompare(b.dependencyType) || a.name.localeCompare(b.name),
    );
  }
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
});

const filtered = computed(() => rows.value.length !== enriched.value.length);
</script>

<template>
  <section class="card">
    <div class="card-head">
      <div>
        <h2 class="card-title">분석할 라이브러리 선택</h2>
        <p class="card-sub">
          프로젝트에서 확인된 라이브러리 중 영향 분석을 진행할 대상을 선택하세요.
        </p>
      </div>
      <span class="pill pill--idle">{{ rows.length }} / {{ enriched.length }}개 표시</span>
    </div>

    <div class="filters">
      <div class="filters__search">
        <svg class="filters__icon" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.6" />
          <path d="M10.6 10.6L14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <input
          v-model="state.librarySearch"
          class="field"
          type="search"
          placeholder="라이브러리명 검색"
          aria-label="라이브러리명 검색"
        />
        <button
          v-if="state.librarySearch"
          type="button"
          class="filters__clear"
          aria-label="검색어 지우기"
          @click="state.librarySearch = ''"
        >
          ✕
        </button>
      </div>

      <span class="filters__divider" aria-hidden="true" />

      <div class="filters__group">
        <label class="filters__label" for="type-filter">유형</label>
        <select id="type-filter" v-model="state.libraryTypeFilter" class="field filters__select">
          <option value="ALL">전체 유형</option>
          <option value="dependencies">dependencies</option>
          <option value="devDependencies">devDependencies</option>
        </select>
      </div>

      <div class="filters__group">
        <label class="filters__label" for="sort-filter">정렬</label>
        <select id="sort-filter" v-model="state.librarySort" class="field filters__select">
          <option value="NAME">이름순</option>
          <option value="TYPE">유형순</option>
        </select>
      </div>
    </div>

    <DataTable
      :columns="COLUMNS"
      :rows="rows"
      :row-key="(row) => `${row.dependencyType}:${row.name}`"
      :loading="state.busy && !enriched.length"
      size="md"
      :max-height="360"
      :empty-title="filtered ? '조건에 맞는 라이브러리가 없습니다.' : '직접 의존성이 없습니다.'"
      empty-body="검색어나 유형 필터를 바꿔보세요."
    >
      <template #cell-name="{ row }">
        <span class="lib">
          <strong>{{ row.name }}</strong>
          <span v-if="row.isUrlDependency" class="flag flag--warn" title="lockfile 밖 URL 의존성">URL</span>
        </span>
      </template>

      <template #cell-resolvedVersion="{ row }">
        <InfoTooltip
          v-if="row.hasMultipleInstalledVersions"
          class="multi"
          v-bind="versionInfo(row)"
        >
          {{ row.resolvedVersion }}
          <span class="multi__extra">+{{ row.installedVersions.length - 1 }}</span>
        </InfoTooltip>
        <template v-else>{{ row.resolvedVersion ?? '—' }}</template>
      </template>

      <template #cell-latestVersion="{ row }">{{ row.latestVersion ?? '—' }}</template>

      <template #cell-dependencyType="{ row }">
        <InfoTooltip
          class="type"
          :heading="row.dependencyType"
          :body="typeInfo(row.dependencyType).body"
          :caution="typeInfo(row.dependencyType).caution"
        >
          {{ row.dependencyType }}
        </InfoTooltip>
      </template>

      <!--
        Every row gets the same control. Only the click is disabled where the
        pilot parser has no release data, so the table does not imply that
        unsupported packages are somehow different or safer.
      -->
      <template #cell-action="{ row }">
        <div class="action">
          <button
            type="button"
            class="btn btn--sm btn--primary"
            :disabled="!row.supported"
            :title="row.supported ? '' : '릴리즈 데이터가 없어 아직 분석할 수 없습니다.'"
            @click.stop="analysis.selectDependency(row)"
          >
            분석하기
          </button>
        </div>
      </template>
    </DataTable>
  </section>
</template>

<style scoped>
.filters {
  margin-top: var(--s-5);
  display: flex;
  align-items: center;
  gap: var(--s-5);
  padding: var(--s-3) var(--s-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft);
}

.filters__search {
  position: relative;
  flex: 1;
  min-width: 220px;
}

.filters__divider {
  width: 1px;
  height: 24px;
  background: var(--line);
  flex: none;
}

.filters__group {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  flex: none;
}

.filters__label {
  font-size: var(--t-small);
  font-weight: 600;
  color: var(--muted);
  white-space: nowrap;
}

.filters__select {
  width: 190px;
}

.filters__search .field {
  padding-left: 36px;
  padding-right: 34px;
}

.filters__search .field::-webkit-search-cancel-button {
  display: none;
}

.filters__icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  color: var(--muted-soft);
  pointer-events: none;
}

.filters__clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 50%;
  background: var(--line-soft);
  color: var(--muted);
  font-size: 10px;
  line-height: 1;
}

.filters__clear:hover {
  background: var(--line);
  color: var(--text);
}

/* Child component root: replaces the gap the removed notice used to provide. */
.dt {
  margin-top: var(--s-4);
}

.lib {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.lib strong {
  color: var(--text);
  font-weight: 600;
}

.flag {
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  font-size: 10px;
  font-weight: 700;
}

.flag--warn {
  background: var(--warn-bg);
  color: var(--warn-fg);
}

.multi__extra {
  padding: 1px 5px;
  border-radius: var(--radius-pill);
  background: var(--warn-bg);
  color: var(--warn-fg);
  font-size: 10px;
  font-weight: 700;
}

.type {
  color: var(--muted);
}

.action {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1100px) {
  .filters {
    flex-wrap: wrap;
    gap: var(--s-3);
  }
  .filters__search {
    flex: 1 1 100%;
  }
  .filters__divider {
    display: none;
  }
  .filters__select {
    width: 170px;
  }
}
</style>
