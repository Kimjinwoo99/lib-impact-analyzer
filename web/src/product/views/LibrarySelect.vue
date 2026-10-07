<script setup>
import { computed, ref } from 'vue';
import DataTable from '../components/DataTable.vue';
import InfoTooltip from '../components/InfoTooltip.vue';

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

/*
 * No 수집 경로 column. Which tier serves which version (T1→T3→T2) is only
 * knowable by actually collecting — a pre-announced path was a decision the
 * system had not made yet. The one pre-run fact that matters (no GitHub
 * repository → no collection path at all) is expressed where it acts: the
 * disabled run button and its tooltip.
 */
const COLUMNS = [
  { key: 'name', label: '라이브러리', width: 260, sortable: true },
  // 현재 버전 정렬은 의미가 없다(2026-08-22 피드백) — 제거.
  // 폭 재배분(2026-08-22): 버전 두 컬럼은 6자 숫자라 135면 충분하고, 거기서
  // 아낀 폭을 신호(배지 2개+ⓘ가 한 줄에 들어가야 함)와 버튼 열에 준다 —
  // 시연 배율에서 가로 스크롤·배지 줄바꿈이 같이 사라진다.
  { key: 'resolvedVersion', label: '현재 버전', width: 135, mono: true },
  { key: 'latestVersion', label: '최신 버전', width: 135, mono: true },
  // Vulnerabilities and deprecation for the INSTALLED version — from the
  // registry document and one OSV batch, so it costs nothing to always show.
  // 헤더 클릭으로 신호 우선순위 모드를 순환한다.
  { key: 'signals', label: '위험 신호', width: 185, headerClickable: true },
  { key: 'action', label: '' },
];

const enriched = computed(() =>
  props.analysis.directDependencies.value.map((dep) => {
    const probe = state.probeResults[dep.name] ?? null;
    // "supported" is a fact about this tool, not a judgment about the
    // package: a package with no GitHub repository has no atom feed, no REST
    // releases and no changelog, so no collection path exists at all.
    // 비표준 배포(설치 버전이 레지스트리에 없음)도 분석 불가다 — 버전 비교·
    // 목표 후보·취약점 판정의 기준이 전부 레지스트리인데 설치본이 그 밖에
    // 있다(xlsx: CDN 0.20.3 > registry latest 0.18.5, 2026-08-22 판단).
    const supported = Boolean(dep.resolvedVersion)
      && probe?.adapterRequired !== true
      && state.infoCards[dep.name]?.registry?.registryKnowsInstalled !== false;
    /*
     * 미사용은 supported와 성격이 다르다 — 도구는 계산할 수 있지만 올릴 이유가
     * 없다(정답은 업데이트가 아니라 제거 검토). 그래서 두 사실을 섞지 않고
     * analyzable로 합쳐 버튼만 공유한다. 2026-08-23 사용자 결정: 미사용
     * 패키지는 분석 경로를 비활성화한다.
     */
    const unusedSuspect = isUnusedSuspect(dep);
    return {
      ...dep,
      latestVersion: probe?.latestVersion ?? null,
      probe,
      info: state.infoCards[dep.name] ?? null,
      supported,
      unusedSuspect,
      analyzable: supported && !unusedSuspect,
    };
  }),
);

/*
 * 소스 참조 0건인 런타임 의존성. 신호(알약)와 분석 차단이 같은 술어를 써야
 * 화면이 자기 모순을 내지 않으므로 판정은 여기 한 곳이다.
 * refs가 아직 도착하지 않았거나 조회가 실패했으면(맵에 항목 없음) 막지 않는다
 * — 없는 근거로 잠그면 조용한 오차단이 된다. devDependencies는 애초에 실측
 * 대상이 아니다(도구 계층은 소스 import가 없는 게 정상).
 */
function isUnusedSuspect(row) {
  const refs = state.usageRefs[row.name];
  return Boolean(refs) && refs.sourceRefCount === 0 && row.dependencyType === 'dependencies';
}

/*
 * 신호 툴팁은 그 신호가 '무엇인지'를 설명한다. 행별 세부값(어떤 취약점인지,
 * 어떤 사유의 deprecated인지)은 개념을 모르는 사람에게는 맥락 없이 읽히지
 * 않으므로, 개념 설명이 본문이고 이 행의 세부 사실은 caution 줄에 부기한다.
 */
const SIGNAL_EXPLAINERS = {
  vulns: {
    heading: '취약점',
    body: '설치된 버전에 공개된 보안 취약점이 있습니다(OSV 기준). 공격 표면이 되므로 해소 버전으로의 업데이트 대상입니다.',
  },
  deprecated: {
    heading: 'DEPRECATED (지원 종료)',
    body: '제작자가 사용 중단을 선언한 패키지입니다. 버그·보안 패치가 더 이상 나오지 않습니다.',
  },
  nonstandard: {
    heading: '비표준 배포',
    body: '설치본이 npm 레지스트리에 없습니다(CDN 등). 최신 비교·취약점 판정이 실제 설치물과 다를 수 있습니다.',
  },
  lookupFailed: {
    heading: '조회 실패',
    body: '취약점 조회(OSV)가 실패했습니다. 취약점이 없다는 뜻이 아닙니다.',
  },
  unusedSuspect: {
    heading: '미사용',
    body: '소스 전체에서 참조 0건 — 선언만 남아 취약점 표면과 설치 비용만 차지합니다. 올릴 대상이 아니라 제거 검토 대상이므로 영향 분석을 진행하지 않습니다.',
  },
  majorsBehind: {
    heading: '메이저 뒤처짐',
    body: '최신 메이저보다 N단계 뒤입니다. 보안 패치가 이 라인으로 오지 않을 수 있고, 건너야 할 변경 폭이 계속 커집니다.',
  },
};

/**
 * Signals worth a pill: the installed version has known vulnerabilities, is
 * deprecated, or was never published to npm (CDN tarball — registry facts
 * and the OSV verdict then describe a different distribution channel).
 */
function signalsOf(row) {
  const card = row.info;
  if (!card) return [];
  const signals = [];
  const vulns = card.vulnerabilities ?? {};
  /*
   * "확인해서 0건"과 "확인 실패"는 다른 사실이다 — 후자를 빈 칸으로 두면 조회
   * 장애가 조용히 "위험 신호 없음"으로 둔갑한다(진단 탭이 이미 같은 이유로
   * 두 경우를 가른다). 실패는 실패로 말하고, 정렬에서도 깨끗한 행보다 위에 둔다.
   */
  if (vulns.ok === false) {
    signals.push({ key: 'lookupFailed', label: '조회 실패', tone: 'warn', caution: vulns.error ?? '' });
  }
  if (vulns.count > 0) {
    const severities = (vulns.items ?? []).map((item) => item.severity).filter(Boolean);
    const highCount = severities.filter((severity) => /HIGH|CRITICAL/i.test(severity)).length;
    signals.push({
      key: 'vulns',
      label: `취약점 ${vulns.count}`,
      tone: highCount ? 'bad' : 'warn',
      caution: [
        highCount ? `이 패키지는 심각도 HIGH/CRITICAL ${highCount}건을 포함합니다.` : null,
        vulns.caveat ?? null,
      ].filter(Boolean).join('\n'),
    });
  }
  if (card.requirements?.deprecated?.installed) {
    signals.push({
      key: 'deprecated',
      label: 'DEPRECATED',
      tone: 'bad',
      caution: card.requirements.deprecated.installed,
    });
  }
  // 시연에서도 보인다(2026-08-22 재결정) — '분석 불가' 버튼의 근거가 이
  // 신호라서, 숨기면 왜 잠겼는지 화면이 설명하지 못한다.
  if (card.registry?.registryKnowsInstalled === false) {
    signals.push({
      key: 'nonstandard',
      label: '비표준 배포',
      tone: 'warn',
      caution: '',
    });
  }
  /*
   * 미사용 의심 — 소스 참조 실측(usage-refs)이 0건인 런타임 의존성.
   * devDependencies는 소스에 import가 없는 게 정상(도구 계층)이라 대상이
   * 아니다 — 실제 프로젝트에서도 husky·commitlint류는 참조 0이지만 실사용
   * 이었다. '확정'이 아니라 '의심'인 이유: 폴리필·peer 간접
   * 사용은 import 없이도 쓰일 수 있다.
   */
  if (isUnusedSuspect(row)) {
    signals.push({
      key: 'unusedSuspect',
      label: '미사용',
      tone: 'warn',
      caution: '소스 전체에서 import·설정 등록·타입 참조 0건. 폴리필이나 다른 패키지의 간접 사용 가능성은 별도 확인이 필요합니다.',
    });
  }
  /*
   * 메이저 뒤처짐 — 사고(취약점·DEPRECATED)가 아니라 노후 신호라 목록의 마지막.
   * 계산은 companion-audit의 majorsBetween과 같은 의미(선두 정수 차이)로,
   * 화면에 이미 있는 두 값(설치·최신)의 산수라 추가 조회가 없다. 비표준 배포는
   * 레지스트리 latest가 실제 설치 채널과 다른 세계라 계산하지 않는다.
   */
  const majors = majorsBehindOf(row);
  if (majors > 0 && card.registry?.registryKnowsInstalled !== false) {
    signals.push({
      key: 'majorsBehind',
      label: `메이저 +${majors}`,
      tone: 'warn',
      caution: `설치 ${row.resolvedVersion} → 최신 ${row.latestVersion}. 메이저 ${majors}단계 차이입니다.`,
    });
  }
  return signals;
}

/** 선두 정수(메이저) 차이 — 최신을 모르면 0 (신호는 사실에서만 나온다). */
function majorsBehindOf(row) {
  const installed = parseInt(String(row.resolvedVersion ?? ''), 10);
  const latest = parseInt(String(row.latestVersion ?? ''), 10);
  if (!Number.isFinite(installed) || !Number.isFinite(latest)) return 0;
  return Math.max(0, latest - installed);
}

/*
 * 잠긴 버튼의 라벨 — 사유에 따라 갈린다. xlsx류는 도구가 계산할 수 없어서
 * '분석 불가'이고, 미사용은 계산은 되지만 올릴 대상이 아니어서 '분석 불필요'다.
 * 두 사유를 한 라벨로 뭉치면 "이 도구가 못 하는 것"과 "할 필요가 없는 것"이
 * 구별되지 않는다.
 */
function blockedLabel(row) {
  return row.unusedSuspect && row.supported ? '분석 불필요' : '분석 불가';
}

/** Why the run button is locked — shown as its tooltip. */
function disabledReason(row) {
  if (row.probe?.adapterRequired) {
    return 'GitHub 저장소가 없어 수집 어댑터가 필요합니다 (미구현)';
  }
  if (!row.resolvedVersion) return '설치 버전을 해석하지 못해 분석할 수 없습니다.';
  if (row.info?.registry?.registryKnowsInstalled === false) {
    return '설치 버전이 npm 레지스트리에 없는 비표준 배포라 버전 비교·수집 기준이 없습니다.';
  }
  if (row.unusedSuspect) {
    return '소스 전체에서 참조 0건입니다. 업데이트가 아니라 제거 검토 대상이라 영향 분석을 진행하지 않습니다.';
  }
  return '';
}

/*
 * 위험 신호가 강한 패키지가 위로 — 이 화면의 결정("무엇부터 분석할까")과 정렬
 * 기준이 같아야 한다. 취약점 건수가 가장 무거운 신호이므로 1차 키, 신호 종류
 * 수(DEPRECATED·비표준 배포·메이저 뒤처짐 포함)가 2차 키, 메이저 뒤처짐 폭이
 * 3차 키(+32가 +1보다 위), 나머지는 이름순. 신호 데이터가 도착하기 전에는
 * 전부 0이라 이름순으로 보이다가 수집이 끝나면 재정렬된다.
 *
 * 위험 신호 헤더를 누르면 우선 배치가 순환한다(2026-08-22 피드백):
 *   0 기본(위) → 1 미사용·DEPRECATED 우선 → 2 메이저 뒤처짐(이름 역순 —
 *   vuetify가 최상위) → 다시 0.
 */
const signalSortMode = ref(0);

function cycleSignalSort(key) {
  if (key !== 'signals') return;
  signalSortMode.value = (signalSortMode.value + 1) % 3;
}

function defaultCompare(a, b) {
  return (
    (b.info?.vulnerabilities?.count ?? 0) - (a.info?.vulnerabilities?.count ?? 0) ||
    signalsOf(b).length - signalsOf(a).length ||
    majorsBehindOf(b) - majorsBehindOf(a) ||
    a.name.localeCompare(b.name)
  );
}

function hasSignalKey(row, key) {
  return signalsOf(row).some((signal) => signal.key === key);
}

const rows = computed(() => {
  const base = [...enriched.value];
  if (signalSortMode.value === 1) {
    // 미사용·DEPRECATED 우선 — 그 안에서는 기본 기준 유지
    const rank = (row) => (hasSignalKey(row, 'unusedSuspect') || hasSignalKey(row, 'deprecated') ? 0 : 1);
    return base.sort((a, b) => rank(a) - rank(b) || defaultCompare(a, b));
  }
  if (signalSortMode.value === 2) {
    // 메이저 뒤처짐 우선, 이름 역순(vuetify → vue-router → vite …)
    const rank = (row) => (majorsBehindOf(row) > 0 ? 0 : 1);
    return base.sort((a, b) => rank(a) - rank(b) || b.name.localeCompare(a.name));
  }
  return base.sort(defaultCompare);
});
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
      <span class="pill pill--idle">직접 의존성 {{ rows.length }}개</span>
    </div>

    <DataTable
      :columns="COLUMNS"
      :rows="rows"
      :row-key="(row) => `${row.dependencyType}:${row.name}`"
      :loading="state.busy && !enriched.length"
      size="md"
      :max-height="360"
      empty-title="직접 의존성이 없습니다."
      empty-body="프로젝트의 package.json에 선언된 의존성이 없습니다."
      @header-click="cycleSignalSort"
    >
      <template #cell-name="{ row }">
        <span class="lib">
          <strong>{{ row.name }}</strong>
          <InfoTooltip v-if="row.isUrlDependency" body="npm registry가 아니라 URL(CDN tarball 등)에서 설치된 의존성입니다. 릴리즈 수집·최신 비교·취약점 버전 매핑이 부정확할 수 있습니다.">
            <span class="flag flag--warn">URL</span>
          </InfoTooltip>
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

      <template #cell-latestVersion="{ row }">
        <template v-if="row.latestVersion">{{ row.latestVersion }}</template>
        <span v-else-if="state.probeStatus === 'loading'" class="signals__pending">조회 중…</span>
        <template v-else>—</template>
      </template>

      <template #cell-signals="{ row }">
        <span v-if="signalsOf(row).length" class="signals">
          <InfoTooltip
            v-for="signal in signalsOf(row)"
            :key="signal.key"
            :heading="SIGNAL_EXPLAINERS[signal.key].heading"
            :body="SIGNAL_EXPLAINERS[signal.key].body"
            :caution="signal.caution"
          >
            <span class="pill" :class="`pill--${signal.tone}`">{{ signal.label }}</span>
          </InfoTooltip>
        </span>
        <span v-else-if="!row.info && state.infoStatus === 'loading'" class="signals__pending">수집 중…</span>
        <span v-else>—</span>
      </template>

      <!--
        Every row gets the same control, so the table does not imply that
        blocked packages are somehow different or safer. The click is disabled
        for two different reasons — 수집 기준이 없어서(supported=false) 또는
        소스 참조 0건이라 올릴 이유가 없어서(unusedSuspect) — 그리고 어느
        쪽인지는 버튼 안 ⓘ 툴팁이 말한다.
      -->
      <template #cell-action="{ row }">
        <div class="action">
          <button
            v-if="row.analyzable"
            type="button"
            class="btn btn--sm btn--primary action__btn"
            @click.stop="analysis.selectDependency(row)"
          >
            분석하기
          </button>
          <!-- disabled 속성은 내부 툴팁 호버까지 막는다 — 잠금은 aria와
               클릭 무시로 표현하고, 사유는 버튼 안 ⓘ 툴팁으로(다른 화면과
               같은 문법). -->
          <span
            v-else
            class="btn btn--sm rowbtn--blocked action__btn"
            role="button"
            aria-disabled="true"
            @click.stop
          >
            {{ blockedLabel(row) }}
            <InfoTooltip :heading="blockedLabel(row)" :body="disabledReason(row)" />
          </span>
        </div>
      </template>
    </DataTable>
    <!-- 분석하기 → 버전 화면으로 넘어가기 전 작은 알림 팝업: 권장 목표
         버전(취약점·지원 종료 검사)이 확정되면 넘어간다. -->
    <div v-if="state.versionPrep" class="prep" role="status" aria-busy="true">
      <span class="prep__spinner" aria-hidden="true"></span>
      <span class="prep__text">
        <strong>{{ state.versionPrep }}</strong> 권장 목표 버전 계산 중…
      </span>
    </div>
  </section>
</template>

<style scoped>
/* Child component root: replaces the gap the removed notice used to provide. */
.dt {
  margin-top: var(--s-5);
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

.signals {
  /* 신호가 여러 개면 세로로 쌓는다(원래 형태) — 행 높이가 늘어나는 것이
     가로로 밀려 스크롤을 만드는 것보다 낫다. */
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.signals__pending {
  color: var(--muted-soft);
}

.action {
  display: flex;
  justify-content: flex-end;
  /* 고정 폭 버튼이 셀 우측 패딩까지 밀면 가로 스크롤이 생긴다 — 살짝 안쪽으로. */
  padding-right: var(--s-4);
}

.prep {
  position: fixed;
  right: var(--s-6);
  bottom: var(--s-6);
  z-index: 40;
  display: inline-flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--panel);
  box-shadow: var(--shadow-raised);
}

.prep__spinner {
  width: 18px;
  height: 18px;
  flex: none;
  border: 2.5px solid var(--line-strong);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: prep-spin 0.8s linear infinite;
}

@keyframes prep-spin {
  to { transform: rotate(360deg); }
}

.prep__text {
  font-size: var(--t-body);
  color: var(--text-2);
  white-space: nowrap;
}

.rowbtn--blocked {
  border-color: var(--bad-fg);
  background: var(--bad-bg);
  color: var(--bad-fg);
  opacity: 1;
}

/*
 * 세 상태의 버튼 폭을 같게 — 내용이 달라도 열이 흔들리면 안 된다.
 * 가장 긴 라벨이 '분석 불필요'(6자 + 점 + ⓘ)인데, .btn 기본 좌우 패딩
 * 1.3em까지 더하면 시연 모드(표 안 24px)에서 9em을 넘겨 줄바꿈이 난다.
 * 폭은 9em으로 묶어두고 안쪽 여백만 줄인다 — 라벨이 길어도 열은 그대로다.
 */
.action__btn {
  width: 9em;
  padding-inline: var(--s-2);
  white-space: nowrap;
  justify-content: center;
  cursor: default;
}

.action__btn.btn--primary {
  cursor: pointer;
}

/* 분석하기의 초록 점과 같은 문법 — 불가는 빨간 점. 크기도 primary와 동일. */
.rowbtn--blocked::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--bad-fg);
  flex: none;
}

</style>
