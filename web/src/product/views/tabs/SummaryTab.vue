<script setup>
import { computed, ref } from 'vue';
import InfoTooltip from '../../components/InfoTooltip.vue';
import {
  formatAdvisory,
  vulnerabilitySeverityTone,
  vulnerabilityDisplayId,
  compareVulnerabilities,
} from '../../lib/advisory.js';
import { groupJudgmentsByAction } from '../../lib/actionGroups.js';
import { workRowStats } from '../../lib/verifyProcedures.js';
// 취약점 요약의 한글 문안 — 원문(OSV 영문 한 줄)은 title에 함께 남는다.
import { vulnSummaryText, vulnSummaryTitle } from '../../lib/vulnSummaryKo.js';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const parse = computed(() => state.parseResult);
const l4Summary = computed(() => state.l4Execution?.result?.summary ?? null);

/*
 * 판정(L6)의 총평 — 대응·테스트 탭에 있던 것을 여기로 옮겼다. 그 탭은
 * 이제 실행 목록(judgments) 자체에 집중하고, "무엇을 왜 해야 하는가"의
 * 결론은 다른 증거 탭들과 함께 여기 요약 탭에 모은다.
 *
 * summary의 현재 계약은 { keyActions, commonRisks } — 건수 집계 없이 이번
 * 업그레이드의 뼈대가 되는 조치와, 그 조치들을 관통하는 원인만 짧은 명사구
 * 리스트로 받는다(l6-prompt.js 참조). 문자열 형태는 이 스키마 이전에 기록된
 * 재생 데이터(data/recordings/*.json)를 위한 호환 경로일 뿐이다.
 */
const l6 = computed(() => state.l6Execution?.result ?? null);
const summaryText = computed(() => (typeof l6.value?.summary === 'string' ? l6.value.summary : null));
const summaryKeyActions = computed(() =>
  l6.value?.summary && typeof l6.value.summary === 'object' ? l6.value.summary.keyActions ?? [] : [],
);
const summaryCommonRisks = computed(() =>
  l6.value?.summary && typeof l6.value.summary === 'object' ? l6.value.summary.commonRisks ?? [] : [],
);

const SUMMARY_HINT = {
  핵심조치: '이번 업데이트의 뼈대가 되는 조치만 추린 것입니다. 전체 작업 목록은 대응·테스트 탭에 있습니다.',
  공통리스크: '여러 판정에 걸쳐 반복되는 공통 원인입니다. 비어 있으면 조치들이 서로 독립적이라는 뜻입니다.',
};

/*
 * 라이브러리 선택 화면에서 뜬 취약점/deprecated 배지가 여기서부터는 다루는
 * 데가 없어서 "그거 처리된 거 맞나" 찝찝해지는 문제 — analysis.packageAdvisories
 * (분석 대상 + peerAudit이 건 동반 패키지에 한해 코드로 확정한 사실)를 그대로
 * 목록으로 편다. 개수·해결 여부는 analysis.js가 이미 코드로 확정했고, 여기는
 * CVE/GHSA id·요약·링크까지 전부 보여준다 — "알려진 취약점 N건"으로 뭉개지
 * 않는다.
 */
const packageAdvisories = props.analysis.packageAdvisories;

const advisoryEntries = computed(() =>
  Object.entries(packageAdvisories.value).map(([name, advisory]) => ({
    name,
    // 이 패키지가 왜 이 목록에 있는지 — 사용자가 직접 고른 분석 대상인지,
    // 그 패키지 때문에 함께 다뤄야 하는 동반 패키지인지.
    isPrimary: name === state.selectedDependency?.name,
    advisory: {
      ...advisory,
      vulnerabilities: [...advisory.vulnerabilities].sort(compareVulnerabilities),
    },
    formatted: formatAdvisory(advisory),
  })),
);

// Reverse peer audit — registry facts about which installed packages the
// chosen target breaks. Deterministic, so it belongs on the summary, not
// behind the judgment.
const PEER_VERDICT = {
  DEAD_END: { text: '교체 필요', tone: 'bad', hint: '이 패키지의 어떤 발행 버전도 목표 버전을 지원하지 않습니다 — 대체 패키지로 교체하거나 제거해야 설치가 됩니다.' },
  UPGRADE_REQUIRED: { text: '동반 상향', tone: 'warn', hint: '설치 버전의 peer 선언이 목표 버전을 거부합니다 — 함께 올려야 설치가 됩니다.' },
  OK: { text: '호환', tone: 'ok', hint: '설치 버전의 peer 선언이 목표 버전을 허용합니다.' },
};
const peerRows = computed(() => state.peerAudit?.rows ?? []);
const peerBlocked = computed(() => peerRows.value.filter((row) => row.verdict !== 'OK'));

/*
 * Companions the peer scan cannot rule on — related to the target (config
 * reference, name, peer history) but peer-silent. The registry still knows
 * their latest version and whether they stopped moving, which is what an
 * upgrade plan needs about them.
 */
const COMPANION_BADGE = {
  DORMANT: { text: '정체', tone: 'bad', hint: '2년 이상 새 발행이 없는 패키지입니다 — 목표 버전 대응을 기대하기 어려워, 상향이 아니라 대체·제거를 검토할 대상입니다.' },
  UNKNOWN: { text: '판정 불가', tone: 'warn', hint: '설치 버전이 peer를 선언하지 않아 registry만으로는 호환을 판정할 수 없습니다 — 최신 버전 릴리즈 노트에서 목표 버전 지원 여부를 확인해야 합니다.' },
};
const companionRows = computed(() =>
  (state.peerAudit?.companions ?? []).filter(
    // Same rule as the L6 payload: peer-silent AND structurally wired
    // (config reference / name). Peer-history-only rows are the vue-router
    // shape — a relationship newer versions grew, not one this project has.
    (row) => row.peerVerdict === null && (row.discoveredBy ?? []).some((rule) => rule !== 'PEER_HISTORY'),
  ),
);

const isHealthcheck = computed(() => parse.value?.mode === 'CURRENT_VERSION_HEALTHCHECK');
const patchesAhead = computed(() => parse.value?.patchesAhead ?? 0);

/*
 * 상단 KPI 3장 — 전부 화면 어딘가의 배지와 1:1로 정합하는 수만 싣는다:
 * 작업 항목 = 대응·테스트 탭 배지, 추가 확인 = 추가 확인 탭 배지,
 * 취약점 해소 = 아래 취약점 목록의 집계. 출처를 화면에서 대조할 수 없는
 * 수(검토 필요 합계)와 증거 탭이 이미 보여주는 수(변경항목)는 뺐다.
 */
const manualCheckRows = props.analysis.manualCheckRows;

const vulnTotals = computed(() => {
  const totals = { total: 0, resolved: 0, unresolved: 0, pending: 0 };
  for (const advisory of Object.values(packageAdvisories.value)) {
    for (const item of advisory.vulnerabilities) {
      totals.total += 1;
      if (item.resolved === true) totals.resolved += 1;
      else if (item.resolved === false) totals.unresolved += 1;
      else totals.pending += 1;
    }
  }
  return totals;
});

const kpiCards = computed(() => {
  // 대응·테스트 탭 배지와 같은 정의 — 행 = 수정 조치(같은 조치 판정은 접힘)
  // + 확인 절차(같은 검증으로 확인되는 판정은 절차 행 하나) + 개별 확인.
  const stats = workRowStats(
    // 전제 조치 행까지 포함한 목록 — 대응 탭·탭 배지와 같은 수를 말한다.
    groupJudgmentsByAction(props.analysis.workJudgments.value),
    state.checklistProgress,
    l6.value?.smokePoints ?? [],
  );
  const workCard = l6.value
    ? {
        label: '작업 항목',
        value: `${stats.total}건`,
        hint: `수정 필요 ${stats.action} · 확인 필요 ${stats.smoke} · 완료 ${stats.done}`,
        tone: stats.total ? 'accent' : 'ok',
      }
    : { label: '작업 항목', value: '—', hint: '영향 판정(L6) 미실행', tone: 'idle' };

  // 추가 확인 탭 배지와 같은 수 — 자동 분석이 못 본 영역.
  const manualCount = manualCheckRows.value.length;
  const manualCard = {
    label: '추가 확인',
    value: `${manualCount}건`,
    hint: manualCount ? '자동 분석 범위 밖 — 추가 확인 탭' : '자동 분석 범위 밖 항목 없음',
    tone: manualCount ? 'warn' : 'ok',
  };

  // "취약점 0건 확인"과 "조회 실패"를 가른다 — vulnerabilities.ok가 OSV
  // 요청의 성패다. 실패를 0건처럼 말하면 빈 결과가 안심으로 둔갑한다.
  const probe = state.selectedDependency
    ? (state.infoCards[state.selectedDependency.name]?.vulnerabilities ?? null)
    : null;
  const totals = vulnTotals.value;
  let vulnCard;
  if (totals.total) {
    if (totals.pending) {
      vulnCard = { label: '취약점', value: `${totals.total}건`, hint: '비교할 목표 버전 없음', tone: 'warn' };
    } else if (totals.unresolved) {
      vulnCard = {
        label: '취약점 해소',
        value: `${totals.resolved}/${totals.total}건`,
        hint: `미해소 ${totals.unresolved}건 — 동반 포함`,
        tone: 'bad',
      };
    } else {
      vulnCard = {
        label: '취약점 해소',
        value: `${totals.resolved}/${totals.total}건`,
        hint: '목표 기준 전부 해소 — 동반 포함',
        tone: 'ok',
      };
    }
  } else if (probe && probe.ok === false) {
    vulnCard = { label: '취약점', value: '확인 불가', hint: 'OSV 조회 실패 — 없음이 아닙니다', tone: 'warn' };
  } else if (probe) {
    vulnCard = { label: '취약점', value: '0건', hint: 'OSV 조회 완료 · 알려진 취약점 없음', tone: 'ok' };
  } else {
    vulnCard = { label: '취약점', value: '—', hint: '정보 카드 미수집', tone: 'idle' };
  }

  return [workCard, manualCard, vulnCard];
});

/*
 * 최근 12개월 월별 릴리즈 건수 — 막대 하나가 한 달의 정식 발행 건수.
 *
 * 취약점 해소 경로를 걷어내고 그 자리에 넣은 그림이다(2026-08-23 결정).
 * 이유는 적용 범위: 취약점은 있는 라이브러리에만 있어서 대부분의 요약 탭이
 * 빈 자리로 남았는데, 발행 이력은 45개 전부에 있다. 그리고 이 그림이 답하는
 * 질문 — "이 라이브러리는 얼마나 자주 움직이는가" — 은 업데이트 주기를
 * 정할 때 실제로 쓰는 값이다. 월 5~9회 발행하는 vuetify와 4년째 무발행인
 * jszip은 같은 주기로 볼 대상이 아니다.
 *
 * 값은 정보 카드가 registry packument의 time 맵에서 계산한 releaseCadence를
 * 그대로 쓴다(src/collect/package-info.js). 추가 수집이 없다 — T1 프로브가
 * 이미 받아둔 문서를 한 번 더 읽을 뿐이라 시연 fixture에서도 그대로 나온다.
 */
const releaseCadence = computed(() => {
  const name = state.selectedDependency?.name;
  return (name ? state.infoCards[name]?.releaseCadence : null) ?? null;
});

/*
 * 라인(점+선)으로 그린다. 막대는 "그 달에 몇 건"을 세는 그림이고, 여기서
 * 묻는 것은 "이 라이브러리가 얼마나 자주 움직이는가"라는 리듬이라 추세가
 * 보이는 라인이 맞다.
 *
 * 0건인 달에도 반드시 점을 찍는다 — 선만 이으면 바닥을 지나는 구간이
 * "발행 없음"인지 "데이터 없음"인지 구분되지 않는다. 이 화면의 원칙(빈 값은
 * 「변경 없음」이 아니다)과 직접 충돌하는 지점이라 점으로 못 박는다.
 *
 * 세로 축은 이 라이브러리 안에서의 상대값이다(0 ~ 최다인 달). 절대 축을
 * 공유하지 않는 이유는 발행량이 라이브러리마다 자릿수로 다르기 때문이고,
 * 대신 최다치를 축 위에, 총계를 헤더에, 마지막 달 값을 끝점에 직접 적는다.
 */
const PLOT = { w: 580, h: 124, x0: 18, x1: 550, yTop: 24, yBase: 100 };

const cadencePlot = computed(() => {
  const cadence = releaseCadence.value;
  const months = cadence?.months ?? [];
  if (!months.length) return null;

  const peak = cadence.peak || 1;
  const step = months.length > 1 ? (PLOT.x1 - PLOT.x0) / (months.length - 1) : 0;
  const span = PLOT.yBase - PLOT.yTop;
  const round = (n) => Math.round(n * 10) / 10;

  let lastYear = null;
  const points = months.map((bucket, i) => {
    const [year, month] = bucket.month.split('-');
    const monthIndex = Number(month) - 1;
    // 연도는 바뀌는 지점에만 — 12칸 전부에 붙이면 축이 글자로 막힌다.
    const showYear = year !== lastYear;
    lastYear = year;
    return {
      key: bucket.month,
      x: round(PLOT.x0 + i * step),
      y: round(PLOT.yBase - (bucket.count / peak) * span),
      count: bucket.count,
      last: i === months.length - 1,
      tick: showYear ? `'${year.slice(2)}.${monthIndex + 1}` : String(monthIndex + 1),
      monthLabel: `${year}년 ${monthIndex + 1}월`,
    };
  });

  const last = points[points.length - 1];
  return {
    points,
    last,
    peak,
    // 히트 영역 반폭 — 점이 3px 라 점만 노리면 못 맞춘다. 열 전체를 잡는다.
    hitHalf: round((step || PLOT.x1 - PLOT.x0) / 2),
    line: points.map((p) => `${p.x},${p.y}`).join(' '),
    area:
      `M${points[0].x},${PLOT.yBase} `
      + points.map((p) => `L${p.x},${p.y}`).join(' ')
      + ` L${last.x},${PLOT.yBase} Z`,
  };
});

/*
 * 호버는 브라우저 기본 툴팁(<title>) 대신 직접 그린다. 기본 툴팁은 뜨는 데
 * 1초 가까이 걸리고 OS 스타일이라 이 화면과 따로 논다. 여기서는 열 전체를
 * 히트 영역으로 잡아 점을 정확히 겨누지 않아도 잡히게 하고, 세로 가이드선과
 * 커진 점으로 어느 달을 보고 있는지 그림에서도 표시한다.
 */
const cadenceHover = ref(null);

const cadenceHoverPoint = computed(() => {
  if (!cadenceHover.value) return null;
  return (cadencePlot.value?.points ?? []).find((p) => p.key === cadenceHover.value) ?? null;
});

/* 툴팁은 SVG 좌표를 %로 환산해 얹는다 — 카드 폭이 바뀌어도 점에 붙어 있다.
   양 끝에서는 카드 밖으로 새지 않게 6~94% 로 가둔다. */
const cadenceTipStyle = computed(() => {
  const p = cadenceHoverPoint.value;
  if (!p) return null;
  const left = Math.min(94, Math.max(6, (p.x / PLOT.w) * 100));
  // 꼭대기 근처 점은 툴팁이 카드 위로 넘쳐 부제 줄을 덮는다 — 아래로 뒤집는다.
  const below = p.y < PLOT.yTop + 20;
  return {
    left: `${left}%`,
    top: `${(p.y / PLOT.h) * 100}%`,
    transform: below ? 'translate(-50%, 14px)' : 'translate(-50%, calc(-100% - 14px))',
  };
});

/* 숫자로 끝나는 버전에 '은/는'을 붙인다 — 5.3.2는 / 5.2.11은 처럼 마지막
   자릿수의 읽는 소리에 받침이 있는지로 갈린다(영·일·삼·육·칠·팔은 있음). */
const DIGIT_HAS_TAIL = [true, true, false, true, false, false, true, true, true, false];

function topicParticle(text) {
  const last = String(text).trim().slice(-1);
  if (/[0-9]/.test(last)) return DIGIT_HAS_TAIL[Number(last)] ? '은' : '는';
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 ? '은' : '는';
  return '은';
}

/*
 * 차트 아래 사실 한 줄. 값이 어디서 왔는지(npm registry 배포일)와, 지금 쓰는
 * 버전이 이 12개월 창 안에 있는지 밖에 있는지를 적는다. 창 밖이면 그림에
 * 점이 없다는 뜻이라 — 그림만 보고 "이 버전은 언제 나왔나"를 찾다 헤매지
 * 않도록 여기서 못 박는다.
 */
/* 제목에 패키지 이름을 붙인다 — 이 탭에는 동반 의존성 카드도 함께 있어
   어느 라이브러리의 발행 이력인지가 제목에서 끊겨야 한다. */
const cadencePackage = computed(() => state.selectedDependency?.name ?? null);

const cadenceSub = computed(() => {
  const cadence = releaseCadence.value;
  if (!cadence) return null;

  const parts = ['npm registry 배포일 기준'];
  const dependency = state.selectedDependency;
  const publishedAt = dependency ? state.infoCards[dependency.name]?.registry?.installedPublishedAt : null;
  const version = dependency?.resolvedVersion;

  if (publishedAt && version) {
    const ym = String(publishedAt).slice(0, 7);
    parts.push(
      `현재 버전 ${version}${topicParticle(version)} ${Number(ym.slice(0, 4))}년 ${Number(ym.slice(5, 7))}월에 배포됨`,
    );
  }
  return parts.join(' · ');
});

const cadenceMeta = computed(() => {
  const cadence = releaseCadence.value;
  if (!cadence) return null;
  const parts = [`12개월 ${cadence.total}건`];
  if (cadence.total) parts.push(`최다 ${cadence.peak}건/월`);
  if (cadence.quietMonths) parts.push(`무발행 ${cadence.quietMonths}개월`);
  return parts.join(' · ');
});

/*
 * 12개월 내내 0건인 라이브러리(45개 중 11개)는 막대가 전부 비어서 그림만으로는
 * "수집 실패"와 구별되지 않는다. 마지막 발행 시점을 한 줄로 붙여 정체를
 * 사실로 말한다 — 이 값도 같은 packument에서 나온 것이라 근거가 있다.
 */
const cadenceDormant = computed(() => {
  const cadence = releaseCadence.value;
  if (!cadence || cadence.total) return null;
  if (!cadence.lastPublishedAt) return '이 창구(npm registry)에 정식 발행 기록이 없습니다.';
  const at = String(cadence.lastPublishedAt).slice(0, 10);
  const months = Math.max(
    0,
    Math.round((Date.now() - new Date(cadence.lastPublishedAt).getTime()) / (30.44 * 24 * 3600 * 1000)),
  );
  const span = months >= 12 ? `${Math.floor(months / 12)}년 ${months % 12}개월` : `${months}개월`;
  const version = cadence.lastVersion ? ` (${cadence.lastVersion})` : '';
  return `최근 12개월 발행 없음 — 마지막 정식 발행 ${at}${version}, ${span} 전.`;
});

// 위험 신호가 하나도 없을 때의 한 줄 상태. "0건 확인"과 "조회 실패"는 반드시
// 다른 문장이고, 목표 버전이 없는 헬스체크에서는 아무것도 덧붙이지 않는다.
// (예전에는 취약점 경로 차트의 빈 자리 문구였다 — 차트는 걷어냈지만 이
// 문장은 남긴다. 취약점 0건인 라이브러리에서 요약 탭이 취약점에 대해
// 아무 말도 안 하게 되는 것을 막는 유일한 자리다.)
const vulnQuiet = computed(() => {
  if (!state.targetVersion) return null;
  const card = state.selectedDependency ? state.infoCards[state.selectedDependency.name] : null;
  const probe = card?.vulnerabilities ?? null;
  if (!probe) return null;
  // 취약점이나 지원 종료가 하나라도 있으면 아래 목록이 그것을 다룬다.
  if (vulnTotals.value.total || card?.requirements?.deprecated?.installed) return null;
  if (probe.ok === false) {
    return { tone: 'warn', text: '취약점 확인 불가 — OSV 조회 실패. 없다는 뜻이 아닙니다.' };
  }
  if (!(probe.items ?? []).length) {
    // 신호 0인데 비표준 배포면 "없음"을 확신으로 말하지 않는다 — 판정 자체가
    // 설치 채널과 다를 수 있는 상태다.
    if (card?.registry?.registryKnowsInstalled === false) {
      return {
        tone: 'warn',
        text: '위험 신호 없음 — 단 비표준 배포(레지스트리 밖 설치)라 이 판정이 설치 채널과 다를 수 있습니다.',
      };
    }
    return { tone: 'ok', text: '위험 신호 없음 — 알려진 취약점 0건 · 지원 종료 아님 (OSV·registry 조회 완료)' };
  }
  return null;
});


const riskBars = computed(() => {
  const summary = l4Summary.value;
  if (!summary) return [];
  const total = (summary.high ?? 0) + (summary.medium ?? 0) + (summary.low ?? 0) + (summary.unknown ?? 0);
  if (!total) return [];
  return [
    { key: 'HIGH', label: 'HIGH', count: summary.high ?? 0, tone: 'bad' },
    { key: 'MEDIUM', label: 'MEDIUM', count: summary.medium ?? 0, tone: 'warn' },
    { key: 'LOW', label: 'LOW', count: summary.low ?? 0, tone: 'ok' },
    { key: 'UNKNOWN', label: 'UNKNOWN', count: summary.unknown ?? 0, tone: 'idle' },
  ]
    .filter((entry) => entry.count > 0)
    .map((entry) => ({ ...entry, percent: Math.round((entry.count / total) * 100) }));
});

const deferred = computed(() => state.l4Execution?.inputSummary?.deferredItemCount ?? 0);

function vulnStatusClass(resolved) {
  if (resolved === true) return 'advisory__vuln--resolved';
  if (resolved === false) return 'advisory__vuln--unresolved';
  return 'advisory__vuln--pending';
}

function vulnMark(resolved) {
  if (resolved === true) return '✓';
  if (resolved === false) return '✕';
  return '?';
}

function vulnFixLabel(item, targetVersion) {
  if (!item.firstFixed) return '해결 버전 없음';
  if (item.resolved === null) return `${item.firstFixed}에서 해결(목표 버전 미정)`;
  if (item.resolved === true) return `${item.firstFixed}에서 해결됨`;
  return `${item.firstFixed}에서 해결 — 목표 버전(${targetVersion}) 미달`;
}
</script>

<template>
  <div class="summary">
    <!-- KPI 스트립 — 카드 4장을 한 장으로 합치고 칸은 헤어라인으로만 나눈다.
         톤은 레이블 앞 6px 점 하나(.pill의 점과 같은 문법). -->
    <div class="kpis">
      <div v-for="card in kpiCards" :key="card.label" class="kpi">
        <p class="kpi__label">
          <span class="kpi__dot" :class="`kpi__dot--${card.tone}`" aria-hidden="true"></span>{{ card.label }}
        </p>
        <p class="kpi__value" :title="String(card.value)">{{ card.value }}</p>
        <p v-if="card.hint" class="kpi__hint" :title="card.hint">{{ card.hint }}</p>
      </div>
    </div>

    <!-- 최근 12개월 릴리즈 건수 — 정보 카드가 있으면 모든 라이브러리에서
         그린다. 취약점처럼 있는 데만 있는 신호가 아니라서 요약 탭이 빈
         자리로 남지 않는다. -->
    <section v-if="cadencePlot" class="cadence">
      <div class="risk__head">
        <p class="section-title">
          <span v-if="cadencePackage" class="mono cadence__pkg">{{ cadencePackage }}</span>
          최근 12개월 릴리즈
        </p>
        <span class="cadence__meta">{{ cadenceMeta }}</span>
      </div>
      <p v-if="cadenceSub" class="cadence__sub">{{ cadenceSub }}</p>
      <div class="cadence__stage" @pointerleave="cadenceHover = null">
        <svg
          class="cadence__chart"
          :viewBox="`0 0 ${PLOT.w} ${PLOT.h}`"
          role="img"
          :aria-label="`최근 12개월 월별 릴리즈 수 — ${cadenceMeta}`"
        >
          <!-- 바닥선(0건)만 긋는다. 위쪽 눈금값은 끝점 값·헤더와 겹쳐 읽히고,
               무발행 라이브러리에서는 없는 수(1건)를 적게 되어 뺐다. -->
          <line class="cadence__base" :x1="PLOT.x0 - 8" :y1="PLOT.yBase" :x2="PLOT.w - 8" :y2="PLOT.yBase" />

          <line
            v-if="cadenceHoverPoint"
            class="cadence__guide"
            :x1="cadenceHoverPoint.x"
            :y1="PLOT.yTop - 8"
            :x2="cadenceHoverPoint.x"
            :y2="PLOT.yBase"
          />

          <path class="cadence__area" :d="cadencePlot.area" />
          <polyline class="cadence__line" :points="cadencePlot.line" />

          <!-- 0건인 달에도 점을 찍는다 — 발행 없음과 데이터 없음을 가르는 표시다. -->
          <circle
            v-for="p in cadencePlot.points"
            :key="p.key"
            class="cadence__dot"
            :class="{ 'cadence__dot--last': p.last }"
            :cx="p.x"
            :cy="p.y"
            :r="p.last ? 6 : 4"
          />
          <circle
            v-if="cadenceHoverPoint"
            class="cadence__dot cadence__dot--hover"
            :cx="cadenceHoverPoint.x"
            :cy="cadenceHoverPoint.y"
            r="7"
          />

          <text
            v-if="!cadenceHoverPoint"
            class="cadence__endval"
            :x="cadencePlot.last.x + 8"
            :y="cadencePlot.last.y - 12"
            text-anchor="end"
          >{{ cadencePlot.last.count }}건</text>

          <text
            v-for="p in cadencePlot.points"
            :key="`t-${p.key}`"
            class="cadence__axis"
            :class="{ 'cadence__axis--on': cadenceHover === p.key }"
            :x="p.x"
            :y="PLOT.h - 5"
            text-anchor="middle"
          >{{ p.tick }}</text>

          <!-- 히트 영역은 맨 위에 둔다 — 점·선 위를 지나도 같은 열로 잡힌다. -->
          <rect
            v-for="p in cadencePlot.points"
            :key="`h-${p.key}`"
            class="cadence__hit"
            :x="p.x - cadencePlot.hitHalf"
            y="0"
            :width="cadencePlot.hitHalf * 2"
            :height="PLOT.h"
            @pointerenter="cadenceHover = p.key"
          />
        </svg>

        <div v-if="cadenceHoverPoint" class="cadence__tip" :style="cadenceTipStyle">
          <span class="cadence__tipmonth">{{ cadenceHoverPoint.monthLabel }}</span>
          <span class="cadence__tipcount">정식 발행 {{ cadenceHoverPoint.count }}건</span>
        </div>
      </div>
      <p v-if="cadenceDormant" class="cadence__dormant">{{ cadenceDormant }}</p>
    </section>

    <!-- 위험 신호 0건 확인 — 차트와 독립이다. 취약점이 없는 라이브러리에서
         "조회는 됐고 결과가 없다"를 말하는 유일한 자리라 항상 판정된다. -->
    <div v-if="vulnQuiet" class="vulnpath-quiet" :class="`vulnpath-quiet--${vulnQuiet.tone}`">
      <span class="vulnpath-quiet__dot" aria-hidden="true"></span>{{ vulnQuiet.text }}
    </div>

    <div v-if="l6" class="verdict">
      <!-- 취약점·지원 현황 — 라이브러리 선택 화면 배지가 여기서 끊기지
           않게. 개수·해결 여부는 코드로 확정한 사실이라 판정과 무관하게
           항상 뜬다. -->
      <section v-if="advisoryEntries.length" class="advisories">
        <p class="section-title">알려진 취약점 · 지원 현황</p>
        <p class="advisories__lead">
          분석 대상 패키지와, 이번 업데이트가 함께 처리하는 동반 패키지의 취약점·지원 종료 현황입니다.
        </p>
        <div v-for="entry in advisoryEntries" :id="`advisory-${entry.name}`" :key="entry.name" class="advisory">
          <div class="advisory__head">
            <span class="mono advisory__name">{{ entry.name }}</span>
            <InfoTooltip
              :heading="entry.isPrimary ? '분석 대상' : '동반 의존성'"
              :body="entry.isPrimary ? '지금 영향 분석 중인 패키지입니다.' : '이번 업데이트가 함께 처리해야 하는 패키지입니다.'"
            >
              <span class="pill pill--nodot" :class="entry.isPrimary ? 'pill--review' : 'pill--idle'">
                {{ entry.isPrimary ? '분석 대상' : '동반 의존성' }}
              </span>
            </InfoTooltip>
            <span class="pill" :class="`pill--${entry.formatted.tone}`">{{ entry.formatted.text }}</span>
          </div>
          <p v-if="entry.advisory.deprecated" class="advisory__deprecated">{{ entry.advisory.deprecated }}</p>
          <ul v-if="entry.advisory.vulnerabilities.length" class="advisory__vulns">
            <li
              v-for="item in entry.advisory.vulnerabilities"
              :id="`vuln-${item.id}`"
              :key="item.id"
              class="advisory__vuln"
              :class="vulnStatusClass(item.resolved)"
            >
              <span class="advisory__vulnmark" :class="vulnStatusClass(item.resolved)" aria-hidden="true">
                {{ vulnMark(item.resolved) }}
              </span>
              <span class="pill pill--nodot" :class="`pill--${vulnerabilitySeverityTone(item.severity)}`">
                {{ item.severity ?? '심각도 미상' }}
              </span>
              <a
                v-if="item.url"
                :href="item.url"
                target="_blank"
                rel="noopener"
                class="mono advisory__vulnid"
                :title="'OSV 상세 페이지로 이동 — ' + item.id"
              >
                {{ vulnerabilityDisplayId(item) }}
              </a>
              <span v-else class="mono advisory__vulnid">{{ vulnerabilityDisplayId(item) }}</span>
              <span class="advisory__vulnsummary" :title="vulnSummaryTitle(item)">
                {{ vulnSummaryText(item) || '설명 없음' }}
              </span>
              <span class="advisory__vulndate mono">{{ item.published ? item.published.slice(0, 10) : '—' }}</span>
              <span class="advisory__vulnfix mono">{{ vulnFixLabel(item, entry.advisory.targetVersion) }}</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- 핵심 조치 · 공통 리스크 — 대응·테스트 탭에서 옮겨온 총평. -->
      <div v-if="summaryKeyActions.length || summaryCommonRisks.length" class="headline-cards">
        <div v-if="summaryKeyActions.length" class="callout callout--accent headline-card">
          <div>
            <p class="callout__title">
              <InfoTooltip heading="핵심 조치" :body="SUMMARY_HINT.핵심조치">
                <span>핵심 조치</span>
              </InfoTooltip>
            </p>
            <ul class="headline-list">
              <li v-for="(action, index) in summaryKeyActions" :key="index">{{ action }}</li>
            </ul>
          </div>
        </div>
        <div v-if="summaryCommonRisks.length" class="callout callout--warn headline-card">
          <div>
            <p class="callout__title">
              <InfoTooltip heading="공통 리스크" :body="SUMMARY_HINT.공통리스크">
                <span>공통 리스크</span>
              </InfoTooltip>
            </p>
            <ul class="headline-list">
              <li v-for="(risk, index) in summaryCommonRisks" :key="index">{{ risk }}</li>
            </ul>
          </div>
        </div>
      </div>
      <!-- 기록 재생 호환 — 신규 스키마 이전에 저장된 문단형 요약. -->
      <p v-else-if="summaryText" class="verdict__text">{{ summaryText }}</p>
    </div>

    <div v-if="riskBars.length" class="risk">
      <div class="risk__head">
        <p class="section-title">예비 위험도 분포</p>
        <span v-if="deferred" class="risk__deferred">보류 {{ deferred.toLocaleString() }}건 제외</span>
      </div>
      <div class="risk__bar">
        <span
          v-for="entry in riskBars"
          :key="entry.key"
          class="risk__seg"
          :class="`risk__seg--${entry.tone}`"
          :style="{ width: `${entry.percent}%` }"
          :title="`${entry.label} ${entry.count}건`"
        />
      </div>
      <ul class="risk__legend">
        <li v-for="entry in riskBars" :key="entry.key">
          <span class="risk__dot" :class="`risk__seg--${entry.tone}`" />
          {{ entry.label }} <strong>{{ entry.count }}</strong>
        </li>
      </ul>
    </div>

    <div v-if="(peerRows.length || companionRows.length)" class="peers">
      <div class="risk__head">
        <p class="section-title">동반 의존성 호환 — peer 선언 실측</p>
        <span v-if="!peerBlocked.length" class="risk__deferred">전부 호환</span>
      </div>
      <p class="peers__lead">
        설치된 다른 패키지가 {{ state.peerAudit.packageName }}에 거는 peer 제약을 registry에서
        대조한 결과입니다. 목표 {{ state.peerAudit.targetVersion }} 기준.
      </p>
      <ul class="peers__list">
        <li v-for="row in peerRows" :key="row.name" class="peers__row">
          <InfoTooltip :heading="PEER_VERDICT[row.verdict].text" :body="PEER_VERDICT[row.verdict].hint">
            <span class="pill" :class="`pill--${PEER_VERDICT[row.verdict].tone}`">
              {{ PEER_VERDICT[row.verdict].text }}
            </span>
          </InfoTooltip>
          <span class="mono peers__name">{{ row.name }}</span>
          <span class="peers__meta mono">
            설치 {{ row.installedVersion }} · peer {{ row.installedPeerRange ?? '미선언' }}
            <template v-if="row.verdict === 'UPGRADE_REQUIRED'"> → {{ row.firstCompatible }}부터 호환</template>
            <template v-else-if="row.verdict === 'DEAD_END'"> → 호환 버전 없음</template>
          </span>
        </li>
        <li v-for="row in companionRows" :key="`companion-${row.name}`" class="peers__row">
          <InfoTooltip
            :heading="COMPANION_BADGE[row.dormant ? 'DORMANT' : 'UNKNOWN'].text"
            :body="COMPANION_BADGE[row.dormant ? 'DORMANT' : 'UNKNOWN'].hint"
          >
            <span class="pill" :class="`pill--${COMPANION_BADGE[row.dormant ? 'DORMANT' : 'UNKNOWN'].tone}`">
              {{ COMPANION_BADGE[row.dormant ? 'DORMANT' : 'UNKNOWN'].text }}
            </span>
          </InfoTooltip>
          <span class="mono peers__name">{{ row.name }}</span>
          <span class="peers__meta mono">
            설치 {{ row.installedVersion }} · latest {{ row.latestVersion }}
            <template v-if="row.latestPublishedAt"> ({{ String(row.latestPublishedAt).slice(0, 10) }})</template>
            <template v-if="row.dormant"> · 무발행 {{ Math.floor((row.dormantMonths ?? 0) / 12) }}년+</template>
            <template v-else-if="row.majorsBehind"> · {{ row.majorsBehind }}개 메이저 뒤처짐</template>
          </span>
        </li>
      </ul>
    </div>

  </div>
</template>

<style scoped>
.summary {
  margin-top: var(--s-5);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.verdict {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

/* ---- 취약점 · 지원 현황 ------------------------------------------------ */

.advisories {
  padding: var(--s-4) var(--s-5) var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--panel);
}

.advisory {
  margin-top: var(--s-3);
  padding-top: var(--s-3);
  border-top: 1px solid var(--line-soft);
}

.advisory:first-of-type {
  margin-top: var(--s-4);
  padding-top: 0;
  border-top: 0;
}

.advisory__head {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  flex-wrap: wrap;
}

.advisory__name {
  font-size: var(--t-body);
  font-weight: 700;
  color: var(--text);
}

.advisories__lead {
  margin: var(--s-1) 0 0;
  font-size: var(--t-small);
  color: var(--muted);
}

.advisory__deprecated {
  margin: var(--s-2) 0 0;
  font-size: var(--t-small);
  color: var(--muted);
}

.advisory__vulns {
  margin: var(--s-2) 0 0;
  padding: 0;
  list-style: none;
  max-height: 280px;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.advisory__vulns::-webkit-scrollbar {
  width: 8px;
}

.advisory__vulns::-webkit-scrollbar-thumb {
  border: 2px solid var(--panel);
  border-radius: var(--radius-pill);
  background: var(--line-strong);
}

/*
 * 해결/미해결/미정을 색+마크로 이중 표시한다(색만으로 의미를 나르지
 * 않는다는 원칙 — .pill::before의 점과 같은 이유). 왼쪽 강조선은 15건
 * 중 1~2건인 미해결 항목이 스크롤 중에도 색으로 먼저 눈에 띄게 한다.
 */
.advisory__vuln {
  display: flex;
  align-items: baseline;
  gap: var(--s-3);
  padding: 6px var(--s-2);
  border-top: 1px solid var(--line-soft);
  border-left: 3px solid transparent;
  font-size: var(--t-small);
}

.advisory__vuln:first-child {
  border-top: 0;
}

.advisory__vuln--resolved {
  border-left-color: var(--ok-fg);
  background: var(--ok-bg);
}

.advisory__vuln--unresolved {
  border-left-color: var(--bad-fg);
  background: var(--bad-bg);
}

.advisory__vuln--pending {
  border-left-color: var(--line-strong);
}

.advisory__vulnmark {
  flex: none;
  width: 14px;
  font-weight: 700;
  text-align: center;
}

.advisory__vulnmark.advisory__vuln--resolved {
  color: var(--ok-fg);
}

.advisory__vulnmark.advisory__vuln--unresolved {
  color: var(--bad-fg);
}

.advisory__vulnmark.advisory__vuln--pending {
  color: var(--muted-soft);
}

.advisory__vulnid {
  color: var(--text);
  white-space: nowrap;
}

a.advisory__vulnid {
  text-decoration: none;
  border-bottom: 1px dotted var(--muted-soft);
}

a.advisory__vulnid:hover {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.advisory__vulnsummary {
  flex: 1;
  min-width: 0;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.advisory__vulndate {
  flex: none;
  color: var(--muted-soft);
  font-size: var(--t-micro);
  white-space: nowrap;
}

.advisory__vulnfix {
  flex: none;
  max-width: 240px;
  color: var(--muted-soft);
  font-size: var(--t-micro);
  text-align: right;
  white-space: normal;
}

.advisory__vuln--resolved .advisory__vulnfix {
  color: var(--ok-fg);
}

.advisory__vuln--unresolved .advisory__vulnfix {
  color: var(--bad-fg);
}

/* ---- 핵심 조치 · 공통 리스크 -------------------------------------------
 * .callout 톤(accent=조치/warn=리스크)을 그대로 쓴다 — DiagnosisTab이 이미
 * 쓰는 언어라 새 시각 언어를 안 만든다. 리스트 글자를 본문급 크기·진한
 * 색·커스텀 마커로 올려서, 위로 뽑아 카드까지 만든 내용이 그만한 무게로
 * 보이게 한다(작은 회색 글자에 기본 점 마커면 카드가 무색해진다).
 */
.headline-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--s-4);
}

.headline-card {
  align-items: flex-start;
}

.headline-card .callout__title {
  margin: 0 0 var(--s-3);
  font-size: var(--t-section);
}

.headline-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  font-size: var(--t-body);
  font-weight: 500;
  color: var(--text);
  line-height: 1.5;
}

.headline-list li {
  position: relative;
  padding-left: 1.3em;
}

.headline-list li::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 0.55em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--muted);
}

.headline-card.callout--accent .headline-list li::before {
  background: var(--brand-mid);
}

.headline-card.callout--warn .headline-list li::before {
  background: var(--warn-fg);
}

.verdict__text {
  margin: 0;
  max-width: 76ch;
  font-size: var(--t-body);
  color: var(--text-2);
}

/* ---- 상단 range + KPI 스트립 ------------------------------------------- */



.kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  background: var(--panel);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.kpi {
  min-width: 0;
  padding: var(--s-4) var(--s-5);
}

.kpi + .kpi {
  border-left: 1px solid var(--line-soft);
}

.kpi__label {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: var(--t-small);
  font-weight: 600;
  color: var(--muted);
}

.kpi__dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--line-strong);
}

.kpi__dot--accent {
  background: var(--brand);
}
.kpi__dot--ok {
  background: var(--ok-fg);
}
.kpi__dot--warn {
  background: var(--warn-fg);
}
.kpi__dot--bad {
  background: var(--bad-fg);
}

.kpi__value {
  margin: var(--s-1) 0 0;
  font-size: var(--t-kpi);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi__hint {
  margin: var(--s-1) 0 0;
  font-size: var(--t-small);
  color: var(--muted-soft);
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---- 최근 12개월 릴리즈 ------------------------------------------------ */

/* 제목·부제는 토큰보다 한 단계 위로 — 옆에 붙는 축 글자가 뷰박스 배율로
   커져 있어서, 기본 크기로 두면 머리글이 그림에 눌린다. */
.cadence .section-title { font-size: calc(var(--t-title) * 1.15); }

.cadence {
  padding: var(--s-4) var(--s-5) var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--panel);
}

.cadence__pkg { margin-right: 6px; }

.cadence__meta {
  font-size: var(--t-section);
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

/* 폭은 카드를 따라가고 높이는 viewBox 비율로 따라온다 — 시연 배율에서도
   글자·선 굵기가 같은 비율로 커진다. */
.cadence__sub {
  margin: var(--s-2) 0 0;
  font-size: var(--t-section);
  color: var(--muted-soft);
  font-variant-numeric: tabular-nums;
}

.cadence__stage { position: relative; margin-top: var(--s-2); }

.cadence__chart {
  display: block;
  width: 100%;
  height: auto;
}

/* 값은 커서를 따라오지 않고 점 위에 붙는다 — 커서를 쫓으면 읽는 동안 흔들린다. */
.cadence__tip {
  position: absolute;
  transform: translate(-50%, calc(-100% - 12px));
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--s-2) var(--s-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--panel);
  box-shadow: var(--shadow-raised);
  white-space: nowrap;
  pointer-events: none;
}
.cadence__tipmonth {
  font-size: var(--t-small);
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.cadence__tipcount {
  font-size: var(--t-body);
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.cadence__base { stroke: var(--line-strong); stroke-width: 1.4; }

/* 면적은 은은하게 — 선이 주인공이다. */
.cadence__area { fill: var(--accent); opacity: 0.08; }

.cadence__line {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2.6;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.cadence__dot { fill: var(--accent); }

/* 호버한 달 — 점을 키우고 세로선을 내려 어느 칸인지 그림에서도 잡히게 한다. */
.cadence__dot--hover { stroke: var(--panel); stroke-width: 2; }
.cadence__guide {
  stroke: var(--accent-border);
  stroke-width: 1.6;
  stroke-dasharray: 4 4;
}
.cadence__hit { fill: transparent; }

/* 마지막 달만 크게 — 지금 어디에 와 있는지가 이 그림의 결론이다. */
.cadence__dot--last { stroke: var(--panel); stroke-width: 2; }

.cadence__axis {
  font-size: 11px;
  fill: var(--muted-soft);
  font-variant-numeric: tabular-nums;
}

.cadence__axis--on { fill: var(--accent); font-weight: 700; }

.cadence__endval {
  font-size: 14px;
  font-weight: 700;
  fill: var(--accent);
  font-variant-numeric: tabular-nums;
}

.cadence__dormant {
  margin: var(--s-4) 0 0;
  padding-top: var(--s-3);
  border-top: 1px solid var(--line-soft);
  font-size: var(--t-small);
  color: var(--warn-fg);
}

.vulnpath-quiet {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: var(--s-3) var(--s-4);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-control);
  background: var(--soft);
  font-size: var(--t-small);
  color: var(--muted);
}

.vulnpath-quiet__dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--line-strong);
}

.vulnpath-quiet--ok .vulnpath-quiet__dot {
  background: var(--ok-fg);
}

.vulnpath-quiet--warn {
  border-color: #f3dfae;
  background: var(--warn-bg);
  color: var(--text-2);
}

.vulnpath-quiet--warn .vulnpath-quiet__dot {
  background: var(--warn-fg);
}

/* 밴드 호버 툴팁 — 커서를 따라다니는 카드. hover를 막지 않게 클릭 통과. */



/*
 * 밴드 클릭 착지 강조 — 두 번 깜빡이고, 시선이 도착할 때까지 유지한 뒤
 * 페이드아웃. 링은 행 "안쪽"에 그린다(inset): 바깥 링은 목록 스크롤
 * 컨테이너에 잘리고, 행마다 배경 틴트(연녹/연적)가 달라서 연한 색은
 * 묻힌다 — 진한 --accent-active는 세 배경 모두에서 보인다.
 */
.advisory__vuln--flash {
  animation: vuln-flash 2.4s var(--ease) both;
}

@keyframes vuln-flash {
  0% {
    box-shadow: inset 0 0 0 2px transparent;
  }
  10%,
  30%,
  75% {
    box-shadow: inset 0 0 0 2px var(--accent-active);
  }
  20% {
    box-shadow: inset 0 0 0 2px transparent;
  }
  100% {
    box-shadow: inset 0 0 0 2px transparent;
  }
}

.risk {
  padding: var(--s-4) var(--s-5) var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--panel);
}

.risk__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
}

.risk__deferred {
  font-size: var(--t-small);
  color: var(--warn-fg);
}

.risk__bar {
  display: flex;
  height: 10px;
  margin-top: var(--s-3);
  border-radius: var(--radius-pill);
  overflow: hidden;
  background: var(--line-soft);
}

.risk__seg {
  height: 100%;
  transition: width var(--slow);
}

.risk__seg--bad {
  background: var(--bad-fg);
}
.risk__seg--warn {
  background: #e8a83a;
}
.risk__seg--ok {
  background: var(--ok-fg);
}
.risk__seg--idle {
  background: var(--line-strong);
}

.risk__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-4);
  margin: var(--s-3) 0 0;
  padding: 0;
  list-style: none;
  font-size: var(--t-small);
  color: var(--muted);
}

.risk__legend li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.risk__legend strong {
  color: var(--text);
}

.risk__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

@media (max-width: 900px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  /* 2×2로 접히면 첫 열의 왼쪽 헤어라인을 지우고 아랫줄에 윗선을 긋는다 */
  .kpi:nth-child(odd) {
    border-left: 0;
  }
  .kpi:nth-child(n + 3) {
    border-top: 1px solid var(--line-soft);
  }
}

.peers {
  padding: var(--s-4) var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft);
}

.peers__lead {
  margin: var(--s-2) 0 0;
  font-size: var(--t-small);
  color: var(--muted);
}

.peers__list {
  margin: var(--s-3) 0 0;
  padding: 0;
  list-style: none;
}

.peers__row {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: 5px 0;
  border-top: 1px solid var(--line-soft);
  font-size: var(--t-small);
}

.peers__name {
  color: var(--text);
}

.peers__meta {
  color: var(--muted);
  font-size: var(--t-micro);
}
</style>
