<script setup>
/*
 * 대응·테스트 — 실행 전체의 작업대. 이 탭이 1차 산출물이다.
 *
 * 목록(좌) + 상세(우)의 마스터-디테일이고, 목록에는 두 축이 있다:
 *
 *   작업 축(기본) — 행 = 판정(조치). 실제 업그레이드는 "플러그인 교체" 같은
 *     조치 목록으로 실행되고, 하나의 조치가 파일 여러 개를 한꺼번에 만진다.
 *     vite 골든 실행 실측에서 파일 축은 접혔다 — 설정 파일 2개가 지목 21건 중
 *     14건을 담았고, 수정·확인 필요 24건 중 3건은 파일 근거가 아예 없어
 *     파일 목록 어디에서도 보이지 않았다. 그 3건도 여기서는 행으로 선다.
 *   파일 축 — 행 = 판정이 지목한 파일. 같은 판정 집합을 files[]로 접은 것뿐
 *     이라 새 데이터가 아니다. 축을 직접 고르는 토글은 없앴다(2026-08-22) —
 *     상세의 파일명을 눌러 들어가고, 그 안의 판정 카드로 작업 축에 돌아온다.
 *
 * 상세(우)는 옛 '파일 상세' 탭이 하던 일 — 근거·조치·검증과 판정이 인용한
 * file:line의 실제 소스. 탭이었을 때는 클릭할 때마다 화면이 통째로 바뀌어
 * 목록에서의 위치를 잃었고, 다음 판정을 보려면 되돌아와야 했다.
 *
 * 여기 없는 것: 텍스트 매칭 후보 표. 그 단위는 "선택한 분류 항목 1건"이라
 * 실행 전체의 작업 목록과 축이 다르다 — 분류결과 탭으로 옮겼다.
 */
import { computed, ref, watch } from 'vue';
import InfoTooltip from '../../components/InfoTooltip.vue';
import { aggregateImpactFiles } from '../../lib/impactFiles.js';
import { groupJudgmentsByAction } from '../../lib/actionGroups.js';
import { foldSmokeGroups, workRowStats } from '../../lib/verifyProcedures.js';
import { formatAdvisory } from '../../lib/advisory.js';
import AgentDataNotice from '../../components/AgentDataNotice.vue';
import ConfirmDialog from '../../components/ConfirmDialog.vue';
import FixDiffPanel from '../../components/FixDiffPanel.vue';
import { diffBlock } from '../../lib/diffLines.js';
import { buildReportHtml, reportFileName } from '../../lib/resultReport.js';
// 판정 Q&A (optional feature; remove this import + its <JudgmentChatPanel/>
// block in the template to drop it — judgment-chat-design.md §6).
import JudgmentChatPanel from '../../components/JudgmentChatPanel.vue';

/*
 * 판정 Agent 전송 범위. 분류 단계와 달리 프로젝트 파일의 경로·발췌가 들어가는
 * 단계라 그 사실을 항목으로 밝힌다. 정본은 analysis.js의 runImpactJudgment
 * payload — 이 목록을 고칠 때 그쪽을 함께 확인한다.
 */
const JUDGMENT_NOTICE_ITEMS = [
  '분석 대상 패키지 이름과 버전(현재 버전 · 목표 버전)',
  '1단계에서 분류된 변경 사항 목록 — 공개된 릴리즈 노트에서 수집한 내용입니다.',
  '변경 사항과 관련된 프로젝트 파일의 경로 · 줄 번호와 해당 줄 한 줄 발췌(변경 사항당 최대 4개 파일)',
  'package.json에 선언된 실행 환경 요구 사항과 의존성 조건',
  '함께 설치된 관련 패키지의 이름과 버전',
  '마이그레이션 가이드 중 이 프로젝트가 사용하는 항목의 발췌 — 패키지 배포처가 공개한 문서입니다.',
];

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const l6 = computed(() => state.l6Execution?.result ?? null);
const l6Cost = computed(() => state.l6Execution?.meta?.costUsd ?? null);
/*
 * 수정안(diff) — 판정 단계가 함께 실어 온다(결정론 합성 + L7).
 * manifest:* 항목은 대상 패키지 자체의 package.json 상향이다.
 */
const fixes = computed(() => l6.value?.fixes ?? []);

// 목록 열 접기 — 상세 내용을 넓게 보려고 좌측 목록을 잠시 닫는다.
const listCollapsed = ref(false);

// 전제 조치 행 합성은 상태로 옮겼다 — 요약 KPI·탭 배지가 같은 목록을 센다.
const judgments = props.analysis.workJudgments;

/** 선택된 조치(대표 + 접힌 판정들)에 걸린 수정안. */
const selectedFix = computed(() => {
  const group = selectedGroup.value;
  if (!group) return null;
  const units = new Set([group.judgment.unit, ...group.members.map((member) => member.unit)]);
  return fixes.value.find((fix) => units.has(fix.unit)) ?? null;
});


/*
 * A parallel triad on the "what do I do" axis: 수정 / 확인 / 없음. The three
 * labels define each other at a glance — which the old mixed-axis set
 * (실행 필요 / 스모크 확인) did not: 실행 read as "run something" and hid
 * that the verdict's definition IS "must edit". 스모크 stays in the tooltip
 * and the 스모크 포인트 section, where the jargon has room to be explained;
 * HOW to verify is each row's 검증 field, not the label's job.
 */
const VERDICT_LABEL = {
  ACTION_REQUIRED: { text: '수정 필요', tone: 'bad' },
  SMOKE_TEST: { text: '확인 필요', tone: 'warn' },
  NOT_AFFECTED: { text: '무영향', tone: 'ok' },
};

const VERDICT_HINT = {
  ACTION_REQUIRED: '코드나 설정을 고쳐야 목표 버전에서 정상 동작하는 항목입니다.',
  SMOKE_TEST:
    '코드 수정은 필요 없지만 런타임 동작이 달라질 수 있어, 실제 화면·경로를 직접 눌러 확인해야 하는 항목입니다. (스모크 테스트: 핵심 동작이 정상인지 빠르게 훑는 검사)',
  NOT_AFFECTED: '이 프로젝트가 해당 기능을 쓰지 않거나 동작이 달라질 여지가 없음을 근거와 함께 확인한 항목입니다.',
};

const WORK_VERDICTS = ['ACTION_REQUIRED', 'SMOKE_TEST'];

/*
 * 작업 축의 행 단위는 판정이 아니라 조치다. 같은 조치를 요구하는 판정들
 * (L6가 문장에 남긴 유닛 id 참조로 결정론 병합 — actionGroups.js)은 대표
 * 하나로 접히고, 나머지 판정은 그 행의 근거가 된다. 접힌 판정도 사라지지
 * 않는다 — 상세의 「같은 조치」에서 개별 선택·열람이 된다.
 */
const actionGroups = computed(() => groupJudgmentsByAction(judgments.value));

const groupsByVerdict = computed(() => {
  const groups = { ACTION_REQUIRED: [], SMOKE_TEST: [], NOT_AFFECTED: [] };
  for (const group of actionGroups.value) {
    (groups[group.judgment.verdict] ?? groups.SMOKE_TEST).push(group);
  }
  return groups;
});

/*
 * 확인 필요의 행 단위는 검증 절차다 — 같은 절차(빌드 1회·dev 스모크 1회·
 * 타입체크 1회)로 확인되는 판정들은 절차 행 하나로 묶이고, 각 판정은 그
 * 행의 확인 포인트가 된다(verifyProcedures.js). 사전에 없는 확인은 개별 행.
 */
// 총평(smokePoints)도 같은 사전으로 절차에 귀속시킨다 — 하단 별도 섹션은
// 앵커 없는 재진술 사본이라 폐지, 사전 밖 문장만 '총평 단독' 행으로 승격.
const smokeFold = computed(() =>
  foldSmokeGroups(groupsByVerdict.value.SMOKE_TEST, l6.value?.smokePoints ?? [], judgments.value),
);

// 배지·KPI와 같은 정의의 행 통계 (행 = 수정 조치 + 확인 절차 + 개별 확인).
const rowStats = computed(() =>
  workRowStats(actionGroups.value, state.checklistProgress, l6.value?.smokePoints ?? []),
);

/*
 * 절차 행의 선택은 컴포넌트 로컬이다 — selectedUnit은 판정 유닛 계약이라
 * 합성 키를 흘리지 않는다. 판정을 고르면 절차 선택이 풀리고, 반대도 같다.
 */
const selectedProcedureKey = ref(null);
const selectedProcedure = computed(
  () => smokeFold.value.procedures.find((procedure) => procedure.key === selectedProcedureKey.value) ?? null,
);

function pickJudgment(unit) {
  selectedProcedureKey.value = null;
  props.analysis.selectJudgmentUnit(unit);
}

function pickProcedure(key) {
  selectedProcedureKey.value = key;
}

/*
 * 절차 행의 Q&A 맥락 — 절차는 판정이 아니지만, Q&A는 절차 행에도 있어야
 * 한다("이 절차에서 뭘 봐야 하나"가 자연스러운 질문이다). 서버는 judgment
 * 객체를 통째로 직렬화하므로, 절차 설명 + 확인 포인트 전체(원 판정의
 * verify + 총평 문장)를 판정 형태로 합성해 전달한다 — Agent가 묶음 전체를
 * 쥐고 답한다.
 */
const procedureAsJudgment = computed(() => {
  const procedure = selectedProcedure.value;
  if (!procedure) return null;
  return {
    unit: procedure.unit,
    verdict: 'SMOKE_TEST',
    reason: procedure.standalone
      ? '실행 총평(스모크 포인트)에만 언급된 확인 항목 — 개별 판정 근거는 없다.'
      : `같은 검증 절차 1회로 확인되는 판정 ${procedure.entries.length}건을 묶은 절차 행이다.`,
    action: null,
    verify: procedure.run,
    files: [],
    procedurePoints: [
      ...procedure.entries.map((entry) => ({
        unit: entry.judgment.unit,
        verify: entry.judgment.verify,
        reason: entry.judgment.reason,
      })),
      ...procedure.notes.map((note) => ({ unit: 'summary', verify: note })),
    ],
  };
});

// 상단 배지 숫자 — 확인 필요는 판정 수가 아니라 행 수(절차 + 개별)다.
const pillCounts = computed(() => ({
  ACTION_REQUIRED: rowStats.value.action,
  SMOKE_TEST: rowStats.value.smoke,
  NOT_AFFECTED: groupsByVerdict.value.NOT_AFFECTED.length,
}));

// 판정 유닛 → 대표 조치 유닛. 접힌 판정을 상세에서 열어도 목록에서는
// 대표 행이 계속 현재 위치로 표시되게 한다.
const repUnitOf = computed(() => {
  const map = new Map();
  for (const group of actionGroups.value) {
    map.set(group.judgment.unit, group.judgment.unit);
    for (const member of group.members) map.set(member.unit, group.judgment.unit);
  }
  return map;
});

/*
 * The unit id splits into provenance (chip) and a readable title. Raw ids
 * like `item:7.0.0:breaking-changes:9` made every row look like a log line —
 * the chip carries WHERE the finding came from, so the title only has to say
 * WHAT it is.
 *
 * `chain`(peer/engines가 강제하는 동반 상향)과 `companion`(peer 미선언이라
 * registry로만 판단하는 관련 패키지)은 메커니즘은 다르지만 사용자에게는 같은
 * 질문("이 패키지 자체가 아니라 동반 패키지 얘기")에 답하므로 칩은 하나로
 * 묶는다 — 구분은 각 행의 근거 문장이 한다.
 */
const UNIT_SOURCE = {
  manifest: '전제',
  guide: '가이드',
  item: '릴리즈',
  group: '영역',
  chain: '동반 의존성',
  companion: '동반 의존성',
};

const UNIT_SOURCE_HINT = {
  전제: '분석 대상 패키지 자체의 버전 선언을 올리는, 이번 업데이트의 전제가 되는 조치입니다.',
  가이드: '마이그레이션 가이드 문서에서 이 프로젝트가 실제로 쓰는 컴포넌트·설정과 매칭된 섹션에 대한 판정입니다.',
  릴리즈: '릴리즈 노트의 개별 변경 항목 하나를 이 프로젝트 기준으로 판정한 것입니다.',
  영역: 'Agent 분류 예산에 들지 못한 항목들을 같은 영역(scope)으로 묶어 판정한 것입니다.',
  '동반 의존성': '함께 설치된 다른 패키지(플러그인 등)에 대한 판정입니다.',
};

function unitSource(unit) {
  const prefix = String(unit ?? '').split(':', 1)[0];
  return UNIT_SOURCE[prefix] ?? null;
}

function unitSourceHint(source) {
  return UNIT_SOURCE_HINT[source] ?? '';
}

function unitTitle(unit) {
  const rest = String(unit ?? '').replace(/^(group|item|guide|chain|companion|manifest):/, '');
  // `7.0.0:breaking-changes:9` → `7.0.0 · breaking-changes #9`
  const parts = rest.split(':');
  if (String(unit ?? '').startsWith('item:') && parts.length === 3) {
    return `${parts[0]} · ${parts[1]} #${parts[2]}`;
  }
  return rest;
}

// --- 파일 축 -------------------------------------------------------------

const impactFiles = computed(() => aggregateImpactFiles(judgments.value));

const selectedFileEntry = computed(() => {
  const files = impactFiles.value;
  return files.find((entry) => entry.path === state.selectedImpactPath) ?? files[0] ?? null;
});

// --- 상세 패널 -----------------------------------------------------------

const selectedJudgment = computed(() => {
  const all = judgments.value;
  if (!all.length) return null;
  const found = all.find((judgment) => judgment.unit === state.selectedUnit);
  if (found) return found;
  // 판정을 아직 고르지 않았으면 가장 심각한 첫 조치를 편다 — 빈 패널로 시작해
  // 한 번 더 클릭하게 만들 이유가 없다.
  for (const verdict of WORK_VERDICTS) {
    const first = groupsByVerdict.value[verdict][0];
    if (first) return first.judgment;
  }
  return all[0] ?? null;
});

// 현재 선택이 속한 조치 그룹. 접힌 판정(member)을 열었을 때 목록 강조와
// 「대표 조치」 역링크, 완료 처리 위치 안내에 쓴다.
const selectedGroup = computed(() => {
  const rep = repUnitOf.value.get(selectedJudgment.value?.unit);
  return actionGroups.value.find((group) => group.judgment.unit === rep) ?? null;
});

const isMemberSelected = computed(
  () => Boolean(selectedGroup.value) && selectedGroup.value.judgment.unit !== selectedJudgment.value?.unit,
);

function unitShort(unit) {
  return String(unit ?? '').replace(/^(group|item|guide|chain|companion|manifest):/, '');
}

/*
 * 취약점/deprecated 개요 자체는 요약 탭으로 옮겼다 — 여기서는 지금 보고
 * 있는 판정 하나가 그 사실과 관련 있는지만, 판정 유닛의 패키지명
 * (unitShort와 같은 키)으로 대조해 한 줄로 보여준다.
 */
const packageAdvisories = props.analysis.packageAdvisories;

const selectedJudgmentAdvisory = computed(() => {
  if (!selectedJudgment.value) return null;
  return formatAdvisory(packageAdvisories.value[unitShort(selectedJudgment.value.unit)] ?? null);
});

/* ---- 판정 Q&A (optional feature; remove this block to drop it) ----------
 *
 * 판정 유닛이 만들어진 원본 기록을 유닛 접두사별로 찾아 채팅 패널에
 * 넘긴다 — Agent가 판정문만 보고 답하는 것과, 그 판정을 만든 릴리즈 노트
 * 원문·동반 패키지 정보까지 보고 답하는 것의 차이다. guide: 유닛은 원본이
 * 곧 판정문이라 null이 정답.
 */
const classificationItems = props.analysis.classificationItems;

/*
 * 채팅에는 `formatAdvisory`로 문장이 된 값이 아니라 **원본**을 넘긴다 —
 * Agent가 지원 종료 문구 원문과 취약점 항목을 직접 인용해야 하기 때문이다.
 */
const selectedJudgmentAdvisorySource = computed(() => {
  const unit = selectedJudgment.value?.unit;
  return unit ? (packageAdvisories.value[unitShort(unit)] ?? null) : null;
});

/*
 * L6가 유닛별로 남기는 "무엇이 확인되면 판정이 확정되는지"(evidenceGaps).
 * 화면에는 아직 표시하는 자리가 없지만 Agent에게는 준다 — "왜 확인 필요로
 * 남았나"는 사용자가 가장 자주 묻는 것이다.
 */
const selectedJudgmentGap = computed(() => {
  const unit = selectedJudgment.value?.unit;
  if (!unit) return '';
  const gaps = l6.value?.evidenceGaps ?? [];
  return gaps.find((entry) => entry?.unit === unit)?.gap ?? '';
});

/*
 * 판정이 다루는 원본 항목 전부.
 *
 * 판정문은 LLM이 쓰므로 "3건이 빌드 산출물 관련 내부 변경(preload marker 등)"
 * 처럼 `등`으로 줄여 쓴다. 대응·테스트는 "무엇을 해야 하나"를 답하는 화면이라
 * 항목 생략이 곧 그 목적의 훼손이다 — 생략된 항목이 무엇인지 Agent에게 물어야
 * 알 수 있으면 화면이 제 역할을 못 한 것이다. 그래서 판정문에 의존하지 않고
 * 원본 목록을 그대로 세운다.
 *
 *   group: → 그 scope로 묶인 검토 항목 전부(reviewGroups[].items)
 *   item:  → 그 분류 항목 하나(판정문의 요약이 아니라 릴리즈 노트 원문)
 *
 * 두 경로 모두 Mock 재생에서도 동작한다 — deferredTriage는 stage3Result에서
 * 결정론으로 계산되어 재생·합성 경로에서도 inputSummary에 실리고,
 * classificationItems는 recording의 result.items다.
 */
const selectedJudgmentItems = computed(() => {
  const unit = String(selectedJudgment.value?.unit ?? '');
  const rest = unitShort(unit);
  if (unit.startsWith('group:')) {
    const groups = state.l4Execution?.inputSummary?.deferredTriage?.reviewGroups ?? [];
    return groups.find((group) => group.scope === rest)?.items ?? [];
  }
  if (unit.startsWith('item:')) {
    const item = classificationItems.value.find((entry) => entry.itemId === rest);
    return item ? [item] : [];
  }
  return [];
});

/*
 * GitHub 마크다운 제목 앵커 규칙 — 소문자로 내리고, 낱말·공백·하이픈이
 * 아닌 글자를 지운 뒤 공백을 하이픈으로 바꾼다.
 * 'VSelect/VCombobox/VAutocomplete' → 'vselectvcomboboxvautocomplete'
 */
function githubAnchor(heading) {
  return String(heading)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/*
 * guide: 판정의 원문 — 마이그레이션 가이드 문서의 그 섹션.
 *
 * item:/group: 판정은 릴리즈 노트 항목의 sourceUrl 로 원문에 닿는데, 가이드
 * 섹션에서 나온 판정은 그 자리가 비어 있었다. 판정을 만든 근거가 있는데
 * 화면에서 그리로 갈 길이 없으면 "왜 이 조치인가"를 확인할 수 없다.
 */
const selectedJudgmentGuide = computed(() => {
  const unit = String(selectedJudgment.value?.unit ?? '');
  if (!unit.startsWith('guide:')) return null;

  const heading = unitShort(unit);
  for (const doc of state.migration?.docs ?? []) {
    if (!doc.found || !doc.url) continue;
    if (!(doc.used ?? []).some((section) => section.heading === heading)) continue;
    return { heading, url: `${doc.url}#${githubAnchor(heading)}`, version: doc.version ?? null };
  }
  return null;
});

/*
 * chain:/companion: 판정의 출처.
 *
 * 이 판정들은 릴리즈 노트도 가이드도 아니라 registry 가 들고 있는 peer
 * 선언에서 나온다 — 읽을 수 있는 문서가 아니라 패키지 메타데이터다. 그래서
 * 링크 대신 어디서 온 값인지를 글로 밝힌다. 근거 없이 조치만 서 있는 줄이
 * 하나도 없어야 한다는 것이 이 화면의 규칙이다.
 */
const selectedJudgmentRegistry = computed(() => {
  const unit = String(selectedJudgment.value?.unit ?? '');
  if (!unit.startsWith('chain:') && !unit.startsWith('companion:')) return null;

  const row = selectedJudgmentSource.value;
  if (!row?.name) return null;

  const parts = [`npm registry — ${row.name}`];
  if (row.installedVersion) parts.push(row.installedVersion);
  const range = row.installedPeerRange ?? null;
  return {
    text: `${parts.join(' ')}의 peer 선언`,
    range: range ? `peer ${range}` : 'peer 미선언',
  };
});

const selectedJudgmentSource = computed(() => {
  const unit = String(selectedJudgment.value?.unit ?? '');
  const rest = unitShort(unit);
  if (unit.startsWith('item:')) {
    return classificationItems.value.find((item) => item.itemId === rest) ?? null;
  }
  if (unit.startsWith('chain:') || unit.startsWith('companion:')) {
    const audit = state.peerAudit;
    return (
      (audit?.blocked ?? []).find((row) => row.name === rest) ??
      (audit?.companions ?? []).find((row) => row.name === rest) ??
      null
    );
  }
  if (unit.startsWith('group:')) {
    const groups = state.l4Execution?.inputSummary?.deferredTriage?.reviewGroups ?? [];
    return groups.find((group) => group.scope === rest) ?? null;
  }
  return null;
});
/* ---- /판정 Q&A ---------------------------------------------------------- */

/*
 * 체크리스트 — 확인함 체크와 비고 둘 다 채워야 완료 처리 버튼이 풀린다.
 * 이 초안(draftChecked/draftNote)은 선택된 판정 하나에만 붙는 임시 입력칸이라
 * analysis.state에 안 넣는다 — 판정을 바꾸면 다음 워처가 비운다.
 */
const draftChecked = ref(false);
const draftNote = ref('');

function isDone(unit) {
  return Boolean(state.checklistProgress[unit]?.checked);
}

function submitChecklist() {
  // 절차 행이 선택돼 있으면 완료는 절차 단위 — 빌드를 실제로 한 번 돌리면
  // 그 절차의 확인 포인트 전부가 함께 완료되는 게 실제 작업 방식이다.
  const unit = selectedProcedure.value?.unit ?? selectedJudgment.value?.unit;
  if (!unit || !draftChecked.value || !draftNote.value.trim()) return;
  props.analysis.completeChecklistItem(unit, draftNote.value);
  draftChecked.value = false;
  draftNote.value = '';
}

function formatCompletedAt(iso) {
  return String(iso ?? '').slice(0, 16).replace('T', ' ');
}

watch([selectedJudgment, selectedProcedureKey], () => {
  draftChecked.value = false;
  draftNote.value = '';
});

/* ---- 업데이트 완료 · 결과지 ---------------------------------------------- */

/*
 * 작업 행(수정 조치 + 확인 절차 + 개별 확인)을 전부 완료하면 업데이트를
 * 마무리할 수 있다. 무영향은 할 일이 없으므로 분모에 넣지 않는다 —
 * rowStats가 이미 그 정의로 total/done을 센다(배지·KPI와 같은 정의).
 */
const allWorkDone = computed(() => rowStats.value.total > 0 && rowStats.value.done >= rowStats.value.total);

const completionStage = ref('idle'); // idle | confirm | ready
const reportSaved = ref(false);

function openCompletion() {
  if (!allWorkDone.value) return;
  completionStage.value = 'confirm';
}

const completionPoints = computed(() => {
  const points = [`완료 처리한 작업 ${rowStats.value.done}건 (수정 ${rowStats.value.action}건 · 확인 ${rowStats.value.smoke}건)`];
  const unaffected = groupsByVerdict.value.NOT_AFFECTED.length;
  if (unaffected) points.push(`무영향으로 판정해 작업하지 않은 항목 ${unaffected}건`);
  points.push('확인을 누르면 결과지를 내려받을 수 있습니다.');
  return points;
});

/*
 * 결과지에 담을 행 — 화면이 이미 만든 목록/상세를 그대로 직렬화한다.
 * 결과지가 판정을 다시 해석하면 화면과 갈라지므로, 해석은 여기서 끝낸다.
 */
const reportRows = computed(() => {
  const rows = [];
  const doneOf = (unit) => {
    const entry = state.checklistProgress[unit];
    return entry?.checked ? { note: entry.note ?? '', at: formatCompletedAt(entry.completedAt) } : null;
  };
  const fixOf = (units) => {
    const fix = fixes.value.find((candidate) => units.has(candidate.unit));
    if (!fix) return null;
    return {
      command: fix.command ?? null,
      files: (fix.files ?? []).map((file) => ({
        path: file.path,
        blocks: (file.blocks ?? []).filter((block) => block.verified !== false).map((block) => diffBlock(block)),
      })).filter((file) => file.blocks.length),
    };
  };

  // 수정 필요 — 대표 조치 행. 묶인 판정은 상세에 목록으로 남긴다.
  for (const group of groupsByVerdict.value.ACTION_REQUIRED) {
    const units = new Set([group.judgment.unit, ...group.members.map((member) => member.unit)]);
    const fix = fixOf(units);
    rows.push({
      verdict: 'ACTION_REQUIRED',
      title: unitTitle(group.judgment.unit),
      badge: group.members.length ? `같은 조치 ${group.members.length + 1}건` : null,
      summary: group.judgment.action || group.judgment.reason,
      reason: group.judgment.reason,
      action: group.judgment.action,
      verify: group.judgment.verify,
      files: group.judgment.files ?? [],
      members: group.members.map((member) => `${unitTitle(member.unit)} — ${member.reason ?? ''}`),
      fix: fix && fix.files.length ? fix : null,
      done: doneOf(group.judgment.unit),
    });
  }

  // 확인 필요 — 절차 행(묶음)과 개별 확인 행.
  for (const procedure of smokeFold.value.procedures) {
    rows.push({
      verdict: 'SMOKE_TEST',
      title: procedure.label ?? procedure.run,
      badge: procedure.entries.length > 1 ? `확인 포인트 ${procedure.entries.length}건` : null,
      summary: procedure.run,
      verify: procedure.run,
      points: [
        ...procedure.entries.map((entry) => entry.judgment.verify).filter(Boolean),
        ...(procedure.notes ?? []),
      ],
      done: doneOf(procedure.unit),
    });
  }
  for (const group of smokeFold.value.singles) {
    rows.push({
      verdict: 'SMOKE_TEST',
      title: unitTitle(group.judgment.unit),
      summary: group.judgment.verify || group.judgment.reason,
      reason: group.judgment.reason,
      verify: group.judgment.verify,
      files: group.judgment.files ?? [],
      done: doneOf(group.judgment.unit),
    });
  }

  // 무영향 — 왜 안 해도 되는지가 기록의 절반이다.
  for (const group of groupsByVerdict.value.NOT_AFFECTED) {
    rows.push({
      verdict: 'NOT_AFFECTED',
      title: unitTitle(group.judgment.unit),
      summary: group.judgment.reason,
      reason: group.judgment.reason,
      files: group.judgment.files ?? [],
    });
  }
  return rows;
});

function downloadReport() {
  const meta = {
    packageName: state.parseResult?.packageName ?? state.selectedPackage ?? '',
    currentVersion: state.parseResult?.currentVersion ?? state.currentVersion ?? '',
    targetVersion: state.parseResult?.targetVersion ?? state.targetVersion ?? '',
  };
  const html = buildReportHtml({
    ...meta,
    projectPath: state.projectPath ?? '',
    rows: reportRows.value,
    counts: {
      action: rowStats.value.action,
      smoke: rowStats.value.smoke,
      unaffected: groupsByVerdict.value.NOT_AFFECTED.length,
      done: rowStats.value.done,
      total: rowStats.value.total,
    },
  });

  // Blob + a[download] — 서버 왕복이 없어야 오프라인 시연에서도 내려받힌다.
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = reportFileName(meta);
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 브라우저가 저장을 시작한 뒤에 해제한다 — 즉시 revoke하면 저장이 취소된다.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  reportSaved.value = true;
  completionStage.value = 'idle';
  props.analysis.resetSession();
}

/*
 * 새 판정이 도착하면 이전 실행의 선택을 들고 있을 이유가 없다 — 같은 unit이
 * 새 결과에 없으면 상세가 조용히 첫 행으로 미끄러지는데, 그 전에 스니펫
 * 캐시까지 남아 있으면 예전 파일 내용이 새 판정 밑에 붙는다.
 */
watch(l6, () => {
  state.selectedUnit = null;
  state.selectedImpactPath = null;
});
</script>

<template>
  <div class="bench">
    <div class="bench__head">
      <h3 class="section-title">대응 · 테스트 작업 목록</h3>
      <span v-if="state.l6Status === 'success' && l6Cost !== null" class="bench__meta">
        Claude CLI · API 환산 ${{ l6Cost.toFixed(3) }}
      </span>
      <!--
        판정이 끝난 뒤에는 버튼을 두지 않는다 — 같은 입력으로 다시 판정하는 것은
        결과를 흔들 뿐이고(회차별 SMOKE 변동은 대장 §I·§K에 기록), 목록을 받은
        사용자가 다음에 할 일은 재판정이 아니라 작업 완료다.
        판정할 입력이 없어 건너뛴 경우(idle)와 실패(error)에만 실행 수단을 남긴다.
      -->
      <button
        v-if="state.l6Status === 'idle' || state.l6Status === 'error'"
        type="button"
        class="btn btn--sm btn--primary"
        :disabled="!state.l4Execution"
        @click="analysis.runImpactJudgment()"
      >
        영향 판정 실행
      </button>
      <button
        v-else-if="state.l6Status === 'running'"
        type="button"
        class="btn btn--sm"
        @click="analysis.cancelImpactJudgment()"
      >
        중단
      </button>
      <!--
        업데이트 마무리 — 작업 행을 전부 완료해야 풀린다. 목록의 끝이 아니라
        카드 머리에 두는 이유: 진행률(N/M)을 늘 보이는 자리에 두면 남은 일이
        몇 건인지 목록을 스크롤하지 않고 읽을 수 있다.
      -->
      <button
        v-if="state.l6Status === 'success' && rowStats.total"
        type="button"
        class="btn btn--sm btn--primary"
        :disabled="!allWorkDone"
        :title="allWorkDone ? '업데이트를 완료 처리하고 결과지를 만듭니다' : `작업 ${rowStats.done}/${rowStats.total}건 완료 — 전부 완료하면 열립니다`"
        @click="openCompletion()"
      >
        업데이트 완료 {{ rowStats.done }}/{{ rowStats.total }}
      </button>
    </div>

    <p v-if="state.l6Status === 'idle'" class="bench__hint">
      검토 영역·분류 결과·마이그레이션 가이드를 종합해 영역별로 수정 필요 / 확인 필요 / 무영향을 판정합니다.
    </p>
    <p v-else-if="state.l6Status === 'success' && state.l6Mock" class="bench__hint bench__hint--bad">
      개발도구의 Mock 실행 결과입니다 — 합성 데이터로, 실제 판정이 아닙니다.
    </p>
    <p v-else-if="state.l6Status === 'running'" class="bench__hint">판정 중입니다 — 수 분이 걸릴 수 있습니다.</p>
    <p v-else-if="state.l6Status === 'error'" class="bench__hint bench__hint--bad">실패: {{ state.l6Error }}</p>

    <!--
      상태 문구 v-if/v-else-if 체인 '뒤'에 둔다 — 체인 중간에 다른 엘리먼트가
      끼면 v-else-if가 앞의 v-if와 이어지지 못해 조건 분기가 통째로 깨진다
      (실측: 재생 안내 문구가 사라져 렌더 프로브가 잡아냈다).

      실행 버튼이 있을 때만 고지한다 — 판정이 끝나면(success) 버튼이 사라지므로
      고지할 대상 동작도 없다.
    -->
    <AgentDataNotice
      v-if="(state.l6Status === 'idle' || state.l6Status === 'error')"
      action="영향 판정 실행"
      :items="JUDGMENT_NOTICE_ITEMS"
      usage-equivalent="$1~2"
      class="bench__notice"
    />

    <template v-if="l6">
      <div class="bench__brief">
        <div class="bench__briefbody">
          <!-- 취약점 개요·핵심 조치·공통 리스크는 요약 탭으로 옮겼다 —
               여기는 실행 목록(judgments)에만 집중한다. -->
          <div class="bench__counts">
            <InfoTooltip
              v-for="verdict in ['ACTION_REQUIRED', 'SMOKE_TEST', 'NOT_AFFECTED']"
              :key="verdict"
              :heading="VERDICT_LABEL[verdict].text"
              :body="VERDICT_HINT[verdict]"
            >
              <span class="pill" :class="`pill--${VERDICT_LABEL[verdict].tone}`">
                {{ VERDICT_LABEL[verdict].text }} {{ pillCounts[verdict] }}건
              </span>
            </InfoTooltip>
            <InfoTooltip
              heading="지목 파일"
              body="수정·확인 필요 판정이 근거로 지목한 파일입니다. 무영향 판정의 파일은 「여기 없더라」는 부재의 증거라 집계에서 제외합니다."
            >
              <span class="pill pill--idle">지목 파일 {{ impactFiles.length }}개</span>
            </InfoTooltip>
          </div>
        </div>
      </div>

      <div class="bench__grid" :class="{ 'bench__grid--wide': listCollapsed }">
        <!-- 목록 (좌) -->
        <nav v-show="!listCollapsed" class="list" aria-label="판정 목록">
          <template v-if="state.impactAxis !== 'file'">
            <!--
              그룹마다 section으로 감싼다 — sticky의 유효 범위가 그 조상이라,
              헤더와 행이 형제로 나열되면 「수정 필요」 헤더가 「확인 필요」
              구간까지 따라 내려와 틀린 라벨을 붙인 채 붙어 있게 된다.
            -->
            <section v-show="groupsByVerdict.ACTION_REQUIRED.length" class="group">
              <p class="list__group">
                <span class="pill pill--bad">수정 필요</span>
                <span class="list__count">{{ groupsByVerdict.ACTION_REQUIRED.length }}건</span>
              </p>
              <button
                v-for="group in groupsByVerdict.ACTION_REQUIRED"
                :key="group.judgment.unit"
                type="button"
                class="item"
                :class="{ 'item--done': isDone(group.judgment.unit) }"
                :aria-current="String(!selectedProcedure && selectedGroup?.judgment.unit === group.judgment.unit)"
                @click="pickJudgment(group.judgment.unit)"
              >
                <span class="item__chip">{{ unitSource(group.judgment.unit) ?? '—' }}</span>
                <span class="item__body">
                  <span class="item__title">{{ unitTitle(group.judgment.unit) }}</span>
                  <span class="item__sub">{{ group.judgment.action || group.judgment.verify || group.judgment.reason }}</span>
                </span>
                <span
                  v-if="group.members.length"
                  class="item__merge"
                  :title="`같은 조치를 요구하는 판정 ${group.members.length + 1}건이 이 행 하나로 묶였습니다`"
                >같은 조치 {{ group.members.length + 1 }}건</span>
                <span v-if="isDone(group.judgment.unit)" class="item__done" title="완료 처리됨">✓</span>
                <span v-else class="item__dot item__dot--bad" title="수정 필요" />
              </button>
            </section>

            <!-- 확인 필요 — 행 = 검증 절차. 같은 절차로 확인되는 판정들이
                 절차 행 하나로 묶이고, 사전 밖의 확인만 개별 행으로 남는다. -->
            <section v-show="rowStats.smoke" class="group">
              <p class="list__group">
                <span class="pill pill--warn">확인 필요</span>
                <span class="list__count">{{ rowStats.smoke }}건</span>
              </p>
              <button
                v-for="procedure in smokeFold.procedures"
                :key="procedure.unit"
                type="button"
                class="item"
                :class="{ 'item--done': isDone(procedure.unit) }"
                :aria-current="String(selectedProcedureKey === procedure.key)"
                @click="pickProcedure(procedure.key)"
              >
                <span class="item__chip">{{ procedure.standalone ? '총평' : '절차' }}</span>
                <span class="item__body">
                  <span class="item__title">{{ procedure.label }}</span>
                  <span class="item__sub">{{ procedure.run }}</span>
                </span>
                <span
                  v-if="procedure.entries.length + procedure.notes.length"
                  class="item__merge"
                  :title="`이 절차 한 번으로 확인되는 포인트 ${procedure.entries.length + procedure.notes.length}건`"
                >포인트 {{ procedure.entries.length + procedure.notes.length }}건</span>
                <span v-if="isDone(procedure.unit)" class="item__done" title="완료 처리됨">✓</span>
                <span v-else class="item__dot item__dot--warn" title="확인 필요" />
              </button>
              <button
                v-for="group in smokeFold.singles"
                :key="group.judgment.unit"
                type="button"
                class="item"
                :class="{ 'item--done': isDone(group.judgment.unit) }"
                :aria-current="String(!selectedProcedure && selectedGroup?.judgment.unit === group.judgment.unit)"
                @click="pickJudgment(group.judgment.unit)"
              >
                <span class="item__chip">{{ unitSource(group.judgment.unit) ?? '—' }}</span>
                <span class="item__body">
                  <span class="item__title">{{ unitTitle(group.judgment.unit) }}</span>
                  <span class="item__sub">{{ group.judgment.verify || group.judgment.reason }}</span>
                </span>
                <span v-if="isDone(group.judgment.unit)" class="item__done" title="완료 처리됨">✓</span>
                <span v-else class="item__dot item__dot--warn" title="확인 필요" />
              </button>
            </section>

            <details v-if="groupsByVerdict.NOT_AFFECTED.length" class="cleared">
              <summary>
                <span class="pill pill--ok">무영향</span>
                <span class="list__count">
                  {{ groupsByVerdict.NOT_AFFECTED.length }}건 — 근거와 함께 제외됨
                </span>
              </summary>
              <button
                v-for="group in groupsByVerdict.NOT_AFFECTED"
                :key="group.judgment.unit"
                type="button"
                class="item"
                :aria-current="String(selectedGroup?.judgment.unit === group.judgment.unit)"
                @click="pickJudgment(group.judgment.unit)"
              >
                <span class="item__chip">{{ unitSource(group.judgment.unit) ?? '—' }}</span>
                <span class="item__body">
                  <span class="item__title">{{ unitTitle(group.judgment.unit) }}</span>
                  <span class="item__sub">{{ group.judgment.reason }}</span>
                </span>
                <span class="item__dot item__dot--ok" title="무영향" />
              </button>
            </details>
          </template>

          <template v-else>
            <!-- 파일 축은 그룹이 하나뿐이라 목록 전체가 sticky 범위로 맞다. -->
            <p class="list__group">
              <span>판정이 지목한 파일</span>
              <span class="list__count">{{ impactFiles.length }}개 · 무영향 제외</span>
            </p>
            <button
              v-for="entry in impactFiles"
              :key="entry.path"
              type="button"
              class="item"
              :aria-current="String(selectedFileEntry?.path === entry.path)"
              @click="analysis.selectImpactFile(entry.path)"
            >
              <span class="item__body">
                <span class="item__title mono">{{ entry.path }}</span>
                <span class="item__sub">
                  판정 {{ entry.judgments.length }}건 · 최고 심각도 {{ VERDICT_LABEL[entry.verdict].text }}
                </span>
              </span>
              <span
                class="item__dot"
                :class="`item__dot--${VERDICT_LABEL[entry.verdict].tone}`"
                :title="VERDICT_LABEL[entry.verdict].text"
              />
            </button>
          </template>
        </nav>

        <!-- 상세 (우) -->
        <section class="detail" aria-live="polite">
          <!-- 목록 열 접기/펴기 — 아이콘만, 카드 우상단에 겹쳐 둔다(줄을
               차지하지 않게). -->
          <button
            type="button"
            class="detail__collapse"
            :aria-pressed="String(listCollapsed)"
            :aria-label="listCollapsed ? '목록 다시 열기' : '목록 접고 넓게 보기'"
            :title="listCollapsed ? '목록 다시 열기' : '목록 접고 넓게 보기'"
            @click="listCollapsed = !listCollapsed"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect x="1.5" y="2.5" width="4" height="11" rx="1" fill="none" stroke="currentColor" stroke-width="1.4" />
              <path
                :d="listCollapsed ? 'M9 5.5l3 2.5-3 2.5' : 'M12.5 5.5l-3 2.5 3 2.5'"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <!-- 검증 절차 상세 — 절차 한 번으로 확인되는 포인트 목록과 절차 단위 완료 처리 -->
          <template v-if="state.impactAxis !== 'file' && selectedProcedure">
            <div class="detail__top">
              <InfoTooltip heading="확인 필요" :body="VERDICT_HINT.SMOKE_TEST">
                <span class="pill pill--warn">확인 필요</span>
              </InfoTooltip>
              <InfoTooltip
                :heading="selectedProcedure.standalone ? '총평 단독 확인' : '검증 절차'"
                :body="selectedProcedure.standalone
                  ? '실행 총평(스모크 포인트)에만 언급된 확인입니다 — 개별 판정 근거는 없지만 확인 대상에서 빠지지 않도록 행으로 승격했습니다.'
                  : '같은 실행(빌드·dev 서버·타입체크)으로 함께 확인되는 판정들을 한 절차로 묶은 행입니다. 완료 처리도 절차 단위입니다.'"
              >
                <span class="item__chip">
                  {{ selectedProcedure.standalone ? '총평 단독' : `절차 · 포인트 ${selectedProcedure.entries.length + selectedProcedure.notes.length}건` }}
                </span>
              </InfoTooltip>
            </div>
            <h4 class="detail__title">{{ selectedProcedure.label }}</h4>

            <dl class="facts">
              <div class="fact" :class="selectedProcedure.standalone ? '' : 'fact--action'">
                <dt>{{ selectedProcedure.standalone ? '내용' : '절차' }}</dt>
                <dd>{{ selectedProcedure.run }}</dd>
              </div>
              <!-- 총평 단독 행은 방법이 없는 지목이다 — 그 사실을 숨기지 않는다. -->
              <div v-if="selectedProcedure.standalone" class="fact fact--gap">
                <dt>확인 방법</dt>
                <dd>
                  실행 총평이 지목만 하고 방법을 제시하지 않은 항목입니다. 관련 판정도 없어
                  근거·검증 방법이 없습니다 — 릴리즈 원문이나 판정 Q&amp;A로 확인 방법을 정한 뒤
                  완료 처리하세요.
                </dd>
              </div>
              <div v-if="selectedProcedure.entries.length" class="fact fact--items">
                <dt>확인 포인트</dt>
                <dd>
                  <ul class="points">
                    <li v-for="entry in selectedProcedure.entries" :key="entry.judgment.unit" class="point">
                      <p class="point__verify">{{ entry.judgment.verify }}</p>
                      <button
                        type="button"
                        class="filepill point__unit"
                        :title="`${unitTitle(entry.judgment.unit)} — 눌러서 이 판정의 근거·원문 보기`"
                        @click="pickJudgment(entry.judgment.unit)"
                      >
                        {{ unitSource(entry.judgment.unit) }} · {{ unitTitle(entry.judgment.unit) }}
                      </button>
                    </li>
                  </ul>
                </dd>
              </div>
              <!-- 실행 총평이 이 절차에 대해 덧붙인 문장 — 개별 판정 귀속은
                   없지만(재진술 사본일 확률이 높음) 총평이 언급했다는 사실을
                   그대로 남긴다. -->
              <div v-if="selectedProcedure.notes.length" class="fact fact--items">
                <dt>총평 포인트</dt>
                <dd>
                  <ul class="points">
                    <li v-for="note in selectedProcedure.notes" :key="note" class="point">
                      <p class="point__verify">{{ note }}</p>
                    </li>
                  </ul>
                </dd>
              </div>
            </dl>

            <div class="checklist detail__section">
              <template v-if="!isDone(selectedProcedure.unit)">
                <p class="checklist__label detail__sectiontitle">완료 처리 — 절차 단위</p>
                <button
                  type="button"
                  class="checktoggle"
                  :class="{ 'checktoggle--active': draftChecked }"
                  role="checkbox"
                  :aria-checked="String(draftChecked)"
                  @click="draftChecked = !draftChecked"
                >
                  <span class="checktoggle__box">
                    <span v-if="draftChecked" class="checktoggle__mark">✓</span>
                  </span>
                  {{ selectedProcedure.standalone
                    ? '이 항목을 확인함'
                    : `절차를 실행해 포인트 ${selectedProcedure.entries.length + selectedProcedure.notes.length}건을 확인함` }}
                </button>
                <textarea
                  v-model="draftNote"
                  class="field checklist__note"
                  rows="2"
                  placeholder="확인 결과 비고 (예: 빌드 경고 0건, 산출물 정상)"
                />
                <button
                  type="button"
                  class="btn btn--sm"
                  :disabled="!draftChecked || !draftNote.trim()"
                  @click="submitChecklist"
                >
                  완료 처리
                </button>
              </template>
              <template v-else>
                <p class="checklist__donehead">
                  절차 완료 처리됨
                  <span class="checklist__donetime">{{ formatCompletedAt(state.checklistProgress[selectedProcedure.unit].completedAt) }}</span>
                </p>
                <p class="checklist__notetext">{{ state.checklistProgress[selectedProcedure.unit].note }}</p>
                <button type="button" class="btn btn--sm" @click="analysis.reopenChecklistItem(selectedProcedure.unit)">
                  완료 취소
                </button>
              </template>
            </div>
          </template>

          <!-- 작업 축 상세 -->
          <template v-else-if="state.impactAxis !== 'file' && selectedJudgment">
            <div class="detail__top">
              <InfoTooltip
                :heading="VERDICT_LABEL[selectedJudgment.verdict].text"
                :body="VERDICT_HINT[selectedJudgment.verdict]"
              >
                <span class="pill" :class="`pill--${VERDICT_LABEL[selectedJudgment.verdict].tone}`">
                  {{ VERDICT_LABEL[selectedJudgment.verdict].text }}
                </span>
              </InfoTooltip>
              <InfoTooltip
                v-if="unitSource(selectedJudgment.unit)"
                :heading="unitSource(selectedJudgment.unit)"
                :body="unitSourceHint(unitSource(selectedJudgment.unit))"
              >
                <span class="item__chip">{{ unitSource(selectedJudgment.unit) }}</span>
              </InfoTooltip>
            </div>
            <h4 class="detail__title">{{ unitTitle(selectedJudgment.unit) }}</h4>

            <!-- One labeled line per field, labels in a fixed column so the eye
                 can walk 근거→조치→검증 straight down. 조치 is the payload and
                 carries the visual weight. -->
            <dl class="facts">
              <div class="fact">
                <dt>근거</dt>
                <dd>{{ selectedJudgment.reason }}</dd>
              </div>
              <!--
                L6가 유닛별로 남기는 evidenceGaps — 여태 수집만 하고 화면에
                표시하는 자리가 없었다. "왜 확인 필요로 남았나"는 사용자가 가장
                자주 묻는 것이라 근거 바로 뒤에 둔다(근거의 불완전함에 대한 설명).
              -->
              <div v-if="selectedJudgmentGap" class="fact fact--gap">
                <dt>확정 조건</dt>
                <dd>{{ selectedJudgmentGap }}</dd>
              </div>
              <div v-if="selectedJudgmentAdvisory" class="fact">
                <dt>패키지 상태</dt>
                <dd>
                  <span class="pill" :class="`pill--${selectedJudgmentAdvisory.tone}`">
                    {{ selectedJudgmentAdvisory.text }}
                  </span>
                </dd>
              </div>
              <div v-if="selectedJudgment.action" class="fact fact--action">
                <dt>조치</dt>
                <dd>{{ selectedJudgment.action }}</dd>
              </div>
              <!--
                같은 조치로 접힌 판정들 — 행에서 사라진 게 아니라 이 조치의
                근거가 된 것. 눌러서 개별 판정의 근거·원문까지 내려갈 수 있다.
              -->
              <div v-if="!isMemberSelected && selectedGroup?.members.length" class="fact">
                <dt>같은 조치</dt>
                <dd class="filepills">
                  <button
                    v-for="member in selectedGroup.members"
                    :key="member.unit"
                    type="button"
                    class="filepill"
                    :title="`${member.reason} — 눌러서 이 판정의 근거·원문 보기`"
                    @click="pickJudgment(member.unit)"
                  >
                    {{ unitSource(member.unit) }} · {{ unitTitle(member.unit) }}
                  </button>
                </dd>
              </div>
              <div v-else-if="isMemberSelected" class="fact">
                <dt>대표 조치</dt>
                <dd class="filepills">
                  <button
                    type="button"
                    class="filepill"
                    title="이 판정은 같은 조치로 묶여 있습니다 — 완료 처리는 대표 행에서 합니다"
                    @click="pickJudgment(selectedGroup.judgment.unit)"
                  >
                    ↩ {{ unitSource(selectedGroup.judgment.unit) }} · {{ unitTitle(selectedGroup.judgment.unit) }}
                  </button>
                </dd>
              </div>
              <div v-if="selectedJudgment.verify" class="fact">
                <dt>검증</dt>
                <dd>{{ selectedJudgment.verify }}</dd>
              </div>
              <!--
                판정이 다루는 원본 항목 전부. 판정문이 `등`으로 줄여 쓴 것을
                여기서 빠짐없이 세운다 — 접어 두지 않는다(생략과 같아진다).
              -->
              <!-- registry 메타데이터에서 나온 판정 — 읽을 문서가 없어 출처만 밝힌다. -->
              <div v-if="selectedJudgmentRegistry" class="fact">
                <dt>출처</dt>
                <dd class="origin__registry">
                  {{ selectedJudgmentRegistry.text }}
                  <span class="mono origin__range">{{ selectedJudgmentRegistry.range }}</span>
                </dd>
              </div>
              <!-- 가이드 섹션에서 나온 판정 — 원문은 업그레이드 가이드의 그 항목이다. -->
              <div v-if="selectedJudgmentGuide" class="fact">
                <dt>원문</dt>
                <dd>
                  <a
                    class="origin__link"
                    :href="selectedJudgmentGuide.url"
                    target="_blank"
                    rel="noreferrer"
                    :title="'업그레이드 가이드 원문 열기 — ' + selectedJudgmentGuide.url"
                  >업그레이드 가이드 · {{ selectedJudgmentGuide.heading
                  }}<span class="origin__out" aria-hidden="true">↗</span></a>
                </dd>
              </div>
              <div v-if="selectedJudgmentItems.length" class="fact fact--items">
                <dt>{{ selectedJudgmentItems.length > 1 ? `대상 ${selectedJudgmentItems.length}건` : '원문' }}</dt>
                <dd>
                  <ul class="origins">
                    <li v-for="origin in selectedJudgmentItems" :key="origin.itemId" class="origin">
                      <span class="origin__ver mono">{{ origin.version }}</span>
                      <a
                        v-if="origin.sourceUrl"
                        class="origin__text origin__link"
                        :href="origin.sourceUrl"
                        target="_blank"
                        rel="noreferrer"
                        :title="`릴리즈 노트 원문 열기 — ` + origin.sourceUrl"
                      >{{ origin.summary }}<span class="origin__out" aria-hidden="true">↗</span></a>
                      <span v-else class="origin__text">{{ origin.summary }}</span>
                    </li>
                  </ul>
                </dd>
              </div>
              <div v-if="selectedJudgment.files?.length" class="fact">
                <dt>파일</dt>
                <dd class="filepills">
                  <button
                    v-for="path in selectedJudgment.files"
                    :key="path"
                    type="button"
                    class="filepill mono"
                    :title="`${path} — 이 파일을 지목한 판정 전체를 봅니다`"
                    @click="analysis.selectImpactFile(path)"
                  >
                    {{ path }}
                  </button>
                </dd>
              </div>
            </dl>

            <!-- 판정 Q&A는 상세의 최하단(refs 뒤)으로 옮겼다 — 아래 참고. -->
          </template>

          <!-- 파일 축 상세 -->
          <template v-else-if="state.impactAxis === 'file' && selectedFileEntry">
            <div class="detail__top">
              <span class="pill" :class="`pill--${VERDICT_LABEL[selectedFileEntry.verdict].tone}`">
                {{ VERDICT_LABEL[selectedFileEntry.verdict].text }}
              </span>
            </div>
            <h4 class="detail__title mono">{{ selectedFileEntry.path }}</h4>
            <p class="detail__origin">
              이 파일을 근거로 지목한 판정 {{ selectedFileEntry.judgments.length }}건 — 카드를 누르면 그 판정의 작업 축 상세로 이동합니다.
            </p>

            <div class="cards">
              <button
                v-for="judgment in selectedFileEntry.judgments"
                :key="judgment.unit"
                type="button"
                class="jcard"
                @click="pickJudgment(judgment.unit)"
              >
                <span class="jcard__head">
                  <span class="pill" :class="`pill--${VERDICT_LABEL[judgment.verdict].tone}`">
                    {{ VERDICT_LABEL[judgment.verdict].text }}
                  </span>
                  <span class="item__chip">{{ unitSource(judgment.unit) ?? '—' }}</span>
                  <span class="jcard__title">{{ unitTitle(judgment.unit) }}</span>
                  <span class="jcard__go">작업 축에서 보기 →</span>
                </span>
                <span class="jcard__line">{{ judgment.action || judgment.reason }}</span>
              </button>
            </div>
          </template>

          <!-- 수정 diff — 이 조치에 걸린 수정안(결정론 합성 또는 L7 생성).
               파일이 여러 개면 파일을 눌러 그 파일의 블록들을 본다. -->
          <div v-if="!selectedProcedure && selectedFix" class="detail__section">
            <p class="detail__sectiontitle">
              수정할 코드 위치
              <span class="refs__how">— 수정 전(−) / 수정 후(+)</span>
            </p>
            <FixDiffPanel :fix="selectedFix" />
          </div>

            <!-- 완료 처리는 조치(대표 행) 단위 — 접힌 판정에서 따로 완료하면
               한 작업에 체크박스가 여러 개 생겨 진행률이 거짓이 된다. -->
          <div
            v-if="state.impactAxis !== 'file' && !selectedProcedure && selectedJudgment && WORK_VERDICTS.includes(selectedJudgment.verdict) && !isMemberSelected"
            class="checklist detail__section"
          >
            <template v-if="!isDone(selectedJudgment.unit)">
              <p class="checklist__label detail__sectiontitle">완료 처리</p>
              <button
                type="button"
                class="checktoggle"
                :class="{ 'checktoggle--active': draftChecked }"
                role="checkbox"
                :aria-checked="String(draftChecked)"
                @click="draftChecked = !draftChecked"
              >
                <span class="checktoggle__box">
                  <span v-if="draftChecked" class="checktoggle__mark">✓</span>
                </span>
                작업 완료
              </button>
              <textarea
                v-model="draftNote"
                class="field checklist__note"
                rows="2"
                placeholder="비고 — 무엇을 어떻게 처리·확인했는지"
              />
              <button
                type="button"
                class="btn btn--sm btn--primary"
                :disabled="!draftChecked || !draftNote.trim()"
                @click="submitChecklist"
              >
                완료 처리
              </button>
            </template>
            <template v-else>
              <p class="checklist__donehead">
                <span class="pill pill--ok pill--nodot">완료</span>
                <span class="checklist__donetime">{{ formatCompletedAt(state.checklistProgress[selectedJudgment.unit].completedAt) }}</span>
              </p>
              <p class="checklist__notetext">{{ state.checklistProgress[selectedJudgment.unit].note }}</p>
              <button type="button" class="btn btn--sm btn--ghost" @click="analysis.reopenChecklistItem(selectedJudgment.unit)">
                다시 열기
              </button>
            </template>
          </div>


          <!--
            판정 Q&A (optional feature; remove this block + the import to drop it).
            상세의 최하단에 둔다 — 판정 내용·완료 처리·지목 위치를 다 본 뒤에
            묻는 순서가 자연스럽고, 부가 기능이 판정 정보를 밀어내지 않는다.
            무영향 판정에도 붙인다("왜 영향 없다고 봤나"는 물어볼 만한 질문).
            파일 축에는 넣지 않는다: 그 축의 단위는 파일이라 "이 판정의 맥락"
            이라는 전제가 성립하지 않는다.
          -->
          <!-- 절차 행에서도 Q&A는 뜬다 — 맥락만 다르다: 절차 선택 중에는
               합성된 절차 판정(설명·확인 포인트 전체·총평)을 전달하고, 판정
               선택 중에는 그 판정을 전달한다. 완료 상태는 절차/대표 조치
               유닛 것을 준다: 접힌 판정의 완료는 대표 행에 기록되므로 자기
               유닛만 보면 "미완료"라는 틀린 전제가 프롬프트에 들어간다. -->
          <JudgmentChatPanel
            v-if="state.impactAxis !== 'file' && (selectedProcedure || selectedJudgment)"
            class="detail__section"
            :judgment="procedureAsJudgment ?? selectedJudgment"
            :source-item="selectedProcedure ? null : selectedJudgmentSource"
            :advisory="selectedProcedure ? null : selectedJudgmentAdvisorySource"
            :evidence-gap="selectedProcedure ? '' : selectedJudgmentGap"
            :checklist-entry="selectedProcedure
              ? (state.checklistProgress[selectedProcedure.unit] ?? null)
              : (state.checklistProgress[repUnitOf.get(selectedJudgment.unit) ?? selectedJudgment.unit] ?? null)"
            :run-summary="typeof l6?.summary === 'object' ? l6.summary : null"
            :smoke-points="l6?.smokePoints ?? []"
            :project-path="state.projectPath"
            :package-name="state.parseResult?.packageName ?? state.selectedDependency?.name ?? ''"
            :current-version="state.parseResult?.currentVersion ?? ''"
            :target-version="state.parseResult?.targetVersion ?? ''"
            :reset-token="l6"
          />
        </section>
      </div>

      <!-- 스모크 포인트 하단 섹션 폐지 (2026-08-20) — 실측에서 전 항목이
           판정 verify의 재진술이었다. 이제 같은 절차 사전으로 확인 필요의
           절차 행에 귀속되고(총평 포인트), 사전 밖 문장만 '총평 단독' 행으로
           승격된다. 같은 사실이 두 곳에 다른 형태로 있으면 안 된다. -->
    </template>

    <!--
      1단계: 완료 확인. 2단계: 결과지 저장.
      두 단계로 나눈 이유 — 완료 처리와 결과지 저장은 되돌림이 다르다. 완료는
      기록이고, 결과지는 파일이 나가는 행동이라 확인을 따로 받는다.
    -->
    <ConfirmDialog
      :open="completionStage === 'confirm'"
      title="이 업데이트를 완료 처리할까요?"
      body="목록의 작업을 모두 완료했는지 확인하세요."
      :points="completionPoints"
      confirm-label="완료 처리"
      cancel-label="취소"
      tone="primary"
      @confirm="completionStage = 'ready'"
      @cancel="completionStage = 'idle'"
    />

    <ConfirmDialog
      :open="completionStage === 'ready'"
      title="업데이트를 완료 처리했습니다"
      body="작업 목록을 결과지(HTML) 한 장으로 내려받을 수 있습니다. 항목을 누르면 판정 근거와 조치가 그대로 보이고, 인터넷 없이도 열립니다."
      :points="['내려받으면 이 분석을 마치고 처음 화면으로 돌아갑니다.']"
      confirm-label="결과지 다운로드"
      cancel-label="나중에"
      tone="primary"
      @confirm="downloadReport()"
      @cancel="completionStage = 'idle'"
    />
  </div>
</template>

<style scoped>
.bench {
  margin-top: var(--s-5);
  padding: var(--s-4) var(--s-5) var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft);
}

.bench__head {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.bench__meta {
  font-size: var(--t-small);
  color: var(--muted);
}

.bench__head .btn {
  margin-left: auto;
}


.bench__hint {
  margin: var(--s-2) 0 0;
  font-size: var(--t-small);
  color: var(--muted);
}

.bench__hint--bad {
  color: var(--bad-fg);
}

.bench__notice {
  margin-top: var(--s-3);
}

/* ---- 요약 + 축 토글 --------------------------------------------------- */

.bench__brief {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-5);
  margin-top: var(--s-4);
  flex-wrap: wrap;
}

.bench__briefbody {
  min-width: 0;
  flex: 1 1 420px;
}

.bench__counts {
  display: flex;
  gap: var(--s-2);
  flex-wrap: wrap;
  margin-top: var(--s-3);
}






/* ---- 작업대 ----------------------------------------------------------- */

.bench__grid {
  display: grid;
  grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
  gap: var(--s-4);
  margin-top: var(--s-4);
  align-items: start;
}

/*
 * 목록은 페이지 흐름에 맡긴다 — 내부 스크롤을 두면 페이지도 스크롤되는 중첩이
 * 되고, macOS 오버레이 스크롤바에서는 잘렸다는 단서조차 없다. 실측(vite 5→8):
 * max-height 640px에 1704px가 들어가 63%가 보이지 않았고, 「확인 필요 14건」과
 * 「무영향 47건」 그룹이 통째로 도달 불가였다.
 */
/*
 * overflow는 건드리지 않는다 — `hidden`조차 sticky의 스크롤 컨테이너를 만들어
 * 그룹 헤더가 제자리에 얼어붙은 채 첫 행 위에 겹쳐 그려진다.
 */
.list {
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft-alt);
}

/* sticky 헤더의 범위를 그 그룹으로 한정하는 래퍼. */
.group {
  display: block;
}

/*
 * 그룹 헤더는 앱 헤더(73px) 바로 아래에 붙는다 — 목록이 길어 페이지를 한참
 * 내려도 지금 보는 행이 「수정 필요」인지 「확인 필요」인지 계속 읽힌다.
 */
.list__group {
  position: sticky;
  top: var(--header-h);
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--s-2);
  margin: 0;
  padding: var(--s-3) var(--s-4) var(--s-2);
  background: var(--soft-alt);
  border-bottom: 1px solid var(--line-soft);
  font-size: var(--t-small);
  font-weight: 700;
}

.list__count {
  color: var(--muted);
  font-weight: 600;
}

.item {
  display: flex;
  align-items: flex-start;
  gap: var(--s-2);
  width: 100%;
  text-align: left;
  border: 0;
  border-left: 3px solid transparent;
  border-bottom: 1px solid var(--line-soft);
  background: transparent;
  padding: var(--s-3) var(--s-4) var(--s-3) 13px;
  transition: background var(--fast);
}

.item:hover {
  background: var(--row-alt);
}

.item[aria-current='true'] {
  background: var(--accent-bg);
  border-left-color: var(--accent);
}

.item--done {
  background: var(--ok-bg);
}

.item__chip {
  flex: none;
  margin-top: 1px;
  padding: 2px 6px;
  border-radius: 5px;
  background: var(--idle-bg);
  color: var(--muted);
  font-size: var(--t-micro);
  font-weight: 700;
  white-space: nowrap;
}

.item__body {
  flex: 1;
  min-width: 0;
}

/*
 * 두 줄에서 자른다 — 가이드 섹션 제목은 문장 하나만큼 길어서(예: "Removed
 * object form build.rollupOptions.output.manualChunks and deprecate function
 * form one") 한 행만 100px로 부풀고 나머지 63px과 리듬이 깨졌다. 전문은 상세
 * 패널이 제목으로 온전히 보여준다.
 */
.item__title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: var(--t-small);
  font-weight: 600;
  color: var(--text);
  overflow-wrap: anywhere;
}

.item__sub {
  display: block;
  margin-top: 2px;
  font-size: var(--t-micro);
  color: var(--muted-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 같은 조치로 접힌 행의 표식 — 개수는 "판정 n건이 이 작업 하나"라는 뜻. */
.item__merge {
  flex: none;
  align-self: center;
  padding: 1px 7px;
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-pill);
  background: var(--accent-bg);
  color: var(--accent-alt);
  font-size: var(--t-micro);
  font-weight: 600;
  white-space: nowrap;
}

/* 색만으로 뜻을 싣지 않도록 라벨은 툴팁·그룹 헤더가 진다. */
.item__dot {
  flex: none;
  align-self: center;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.item__dot--bad {
  background: var(--bad-fg);
}
.item__dot--warn {
  background: var(--warn-fg);
}
.item__dot--ok {
  background: var(--ok-fg);
}

.item__done {
  flex: none;
  align-self: center;
  width: 16px;
  text-align: center;
  color: var(--ok-fg);
  font-weight: 700;
  font-size: var(--t-small);
}

/* 펼쳐 놓고 47건을 훑을 때도 이 줄이 「무영향 목록을 보는 중」임을 유지한다. */
.cleared summary {
  position: sticky;
  top: var(--header-h);
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-3) var(--s-4);
  background: var(--soft-alt);
  border-bottom: 1px solid var(--line-soft);
  font-size: var(--t-small);
  cursor: pointer;
  user-select: none;
}

/* ---- 상세 패널 --------------------------------------------------------- */

/*
 * 상세는 sticky — 목록이 길어 페이지를 내리는 동안에도 고른 판정의 근거·조치가
 * 시야에 남아야 마스터-디테일이 성립한다. 자기 높이가 뷰포트를 넘으면 그때만
 * 자기 안에서 스크롤한다(그 경우엔 페이지 스크롤과 겹칠 여지가 없다).
 */
.bench__grid--wide {
  grid-template-columns: minmax(0, 1fr);
}

/*
 * 목록 접기 버튼 — 카드 좌상단. 별도 줄을 차지하지 않고, 첫 줄(배지들)을
 * 버튼 폭만큼 오른쪽으로 밀어 그 공백에 들어간다(2026-08-22 피드백).
 */
.detail__collapse {
  position: absolute;
  top: var(--s-5);
  left: var(--s-5);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--panel);
  color: var(--muted-soft);
  cursor: pointer;
}

.detail__collapse svg {
  width: 16px;
  height: 16px;
}

.detail__collapse:hover {
  color: var(--text);
  border-color: var(--line-strong);
}

.detail {
  position: sticky;
  top: calc(var(--header-h) + var(--s-3));
  max-height: calc(100vh - var(--header-h) - var(--s-6));
  overflow-y: auto;
  scrollbar-gutter: stable;
  min-height: 360px;
  padding: var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--panel);
}

/*
 * 스크롤바를 항상 그린다. macOS 오버레이 스크롤바는 멈춰 있으면 사라져서, 판정
 * 14건이 붙은 파일처럼 내용이 뷰포트를 넘을 때 "여기서 끝"으로 읽힌다 — 목록
 * 쪽에서 63%가 잘린 채 아무 단서가 없던 것과 같은 결함이다.
 */
.detail::-webkit-scrollbar {
  width: 10px;
}

.detail::-webkit-scrollbar-thumb {
  border: 3px solid var(--panel);
  border-radius: var(--radius-pill);
  background: var(--line-strong);
}

.detail::-webkit-scrollbar-thumb:hover {
  background: var(--muted-soft);
}

.detail__top {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  flex-wrap: wrap;
  /* 좌상단 접기 버튼 자리만큼 첫 줄을 오른쪽으로 민다 */
  padding-left: 40px;
}

.detail__title {
  margin: var(--s-2) 0 0;
  font-size: var(--t-section);
  font-weight: 700;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.detail__origin {
  margin: var(--s-1) 0 0;
  font-size: var(--t-micro);
  color: var(--muted-soft);
}

/*
 * 이름이 `.fact`·`.item`·`.cards`인 이유: tokens.css의 전역 `.field`·`.row`·
 * `.stack`과 부딪히지 않으려고. scoped 스타일은 [data-v-*]로 특이도가 높아
 * 내가 "선언한" 속성만 이기고, 선언하지 않은 속성은 전역 값이 그대로 남는다.
 * `.field`(전역: 폼 입력 — height 42px·border·background)를 쓰던 판정 상세는
 * 모든 행이 42px에 갇혀 근거·조치 텍스트가 다음 행 위로 31px씩 흘러넘쳤다.
 */
.facts {
  margin: var(--s-4) 0 0;
}

.fact {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: var(--s-3);
  padding: var(--s-3) 0;
  border-top: 1px solid var(--line-soft);
}

.fact dt {
  font-size: var(--t-small);
  font-weight: 700;
  color: var(--muted);
}

.fact dd {
  margin: 0;
  font-size: var(--t-body);
  color: var(--text-2);
}

/* '패키지 상태' 같은 문장형 값이 필에 담긴다 — 고정 높이 필은 한 줄용이라
   글자가 커지면 넘친다. 이 자리만 여러 줄 허용. */
.fact dd .pill {
  height: auto;
  min-height: var(--h-pill);
  padding-top: 0.3em;
  padding-bottom: 0.3em;
  white-space: normal;
  line-height: 1.4;
}

/*
 * 확정 조건(evidenceGaps) — "무엇이 확인되면 확정되는지". 조치(fact--action)와
 * 달리 지금 할 일이 아니라 판정의 유보 사유라, 강조는 하되 톤을 낮춘다.
 */
.fact--gap dd {
  padding: var(--s-2) var(--s-3);
  border-left: 3px solid var(--warn-fg);
  border-radius: var(--radius-sm);
  background: var(--warn-bg);
  color: var(--text-2);
}

.fact--action dd {
  padding: var(--s-3);
  border: 1px solid var(--line-soft);
  border-left: 3px solid var(--brand);
  border-radius: var(--radius-sm);
  background: var(--soft);
  color: var(--text);
  font-weight: 500;
}

/*
 * 대상 항목 목록 — 13건까지 나오므로 한 줄씩 촘촘히. 버전을 앞세워 어느
 * 릴리즈의 변경인지 바로 읽히게 하고, 링크가 있으면 원문으로 보낸다.
 */
.origins {
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 버전 칸은 내용에 맞춘다 — 52px 고정이면 3.10.10 같은 값이, 특히 시연
   배율에서 칸을 넘쳐 뒤 문장과 겹쳤다. */
.origin {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: var(--s-3);
  padding: 3px 0;
}

.origin + .origin {
  border-top: 1px dashed var(--line-soft);
}

.origin__ver {
  font-size: var(--t-micro);
  color: var(--muted-soft);
  padding-top: 2px;
  white-space: nowrap;
}

.origin__text {
  font-size: var(--t-small);
  color: var(--text-2);
  overflow-wrap: anywhere;
}

/* 원문에 출처 URL 이 있으면 링크로 보이게 한다 — 같은 회색 본문으로 두면
   눌러볼 수 있다는 것이 어디에도 드러나지 않는다. */
.origin__link {
  font-size: var(--t-small);
  color: var(--accent);
  text-decoration: none;
  overflow-wrap: anywhere;
}

.origin__link:hover {
  text-decoration: underline;
}

/* 새 탭으로 나간다는 표시. 문장 끝에 붙여 줄바꿈에서 혼자 떨어지지 않는다. */
.origin__out {
  margin-left: 4px;
  font-size: var(--t-micro);
  color: var(--muted-soft);
}

.origin__link:hover .origin__out { color: var(--accent); }

.origin__registry {
  font-size: var(--t-small);
  color: var(--text-2);
}

.origin__range {
  margin-left: 6px;
  color: var(--muted);
}

a.origin__text {
  color: var(--accent);
  text-decoration: none;
}

a.origin__text:hover {
  text-decoration: underline;
}

.filepills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/*
 * 검증 절차의 확인 포인트 — .origins(52px 버전 컬럼 그리드)를 재사용했다가
 * 유닛 pill이 그 컬럼에 눌려 깨졌다. 포인트는 "확인할 내용(주인공)" 위에
 * "출처 유닛(보조 링크)"을 세로로 쌓는 자기 레이아웃을 갖는다.
 */
.points {
  margin: 0;
  padding: 0;
  list-style: none;
}

.point {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  padding: 8px 0;
}

.point + .point {
  border-top: 1px dashed var(--line-soft);
}

.point__verify {
  margin: 0;
  font-size: var(--t-small);
  color: var(--text-2);
  overflow-wrap: anywhere;
}

.point__unit {
  font-size: var(--t-micro);
  color: var(--muted);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.filepill {
  padding: 3px 11px;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  background: var(--soft);
  font-size: var(--t-small);
  transition: border-color var(--fast), background var(--fast);
}

.filepill:hover {
  border-color: var(--accent-border);
  background: var(--accent-bg);
}

/* ---- 체크리스트(완료 처리) --------------------------------------------- */

/* ---- 섹션 구분 --------------------------------------------------------- */

/*
 * 상세 패널은 성격이 다른 네 덩어리다 — 판정 내용(근거~파일) · 완료 처리 ·
 * 판정 지목 위치 · Agent에게 질문하기. 그런데 섹션 경계와 섹션 '내부' 행
 * 경계를 둘 다 `1px var(--line-soft)`로 그려서 전부 한 덩어리로 읽혔다.
 *
 * 그래서 두 경계를 다르게 그린다: 섹션은 진한 선(--line-strong) + 넉넉한
 * 간격, 내부 행은 옅은 선(--line-soft) 그대로. 굵기만으로 부족할 때를 대비해
 * 섹션마다 제목(.detail__sectiontitle)도 같은 모양으로 세운다.
 */
.detail__section {
  margin-top: var(--s-6);
  padding-top: var(--s-5);
  border-top: 1px solid var(--line-strong);
}

.detail__sectiontitle {
  margin: 0 0 var(--s-3);
  font-size: var(--t-small);
  font-weight: 700;
  color: var(--text-2);
}

.checklist__label {
  margin: 0 0 var(--s-2);
  font-size: var(--t-small);
  font-weight: 700;
  color: var(--muted);
}

/*
 * 브라우저 기본 체크박스 대신 커스텀 토글 — 나머지 화면이 전부
 * pill·dot·버튼으로 상태를 표현하는데 여기만 OS 기본 체크박스가 튀었다.
 */
.checktoggle {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  margin-bottom: var(--s-3);
  border: 0;
  background: transparent;
  padding: 0;
  font-size: var(--t-body);
  font-weight: 500;
  color: var(--text);
}

.checktoggle__box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--line-strong);
  border-radius: 6px;
  background: var(--panel);
  transition: background var(--fast), border-color var(--fast);
}

.checktoggle:hover .checktoggle__box {
  border-color: var(--accent);
}

.checktoggle--active .checktoggle__box {
  border-color: var(--brand);
  background: var(--brand);
}

.checktoggle__mark {
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.checklist__note {
  height: auto;
  min-height: 64px;
  padding: var(--s-2) var(--s-3);
  resize: vertical;
}

.checklist__donehead {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  margin: 0;
}

.checklist__donetime {
  font-size: var(--t-micro);
  color: var(--muted-soft);
}

.checklist__notetext {
  margin: var(--s-2) 0 var(--s-3);
  padding: var(--s-3);
  border: 1px solid var(--line-soft);
  border-left: 3px solid var(--ok-fg);
  border-radius: var(--radius-sm);
  background: var(--soft);
  color: var(--text-2);
  font-size: var(--t-body);
}

/* ---- 파일 축의 판정 카드 ----------------------------------------------- */

.cards {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  margin-top: var(--s-4);
}

.jcard {
  width: 100%;
  text-align: left;
  padding: var(--s-3);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--soft-alt);
  transition: border-color var(--fast), background var(--fast);
}

.jcard:hover {
  border-color: var(--accent-border);
  background: var(--accent-bg);
}

.jcard__head {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  flex-wrap: wrap;
}

/*
 * 제목이 줄이고 「작업 축에서 보기」는 오른쪽 끝에 고정 — 가이드 섹션 제목은
 * 문장만큼 길어서(예: "Removed object form build.rollupOptions…") 줄바꿈에
 * 맡기면 카드마다 링크 위치가 달라진다.
 */
.jcard__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--t-small);
  font-weight: 700;
}

.jcard__go {
  flex: none;
  font-size: var(--t-micro);
  font-weight: 600;
  color: var(--accent);
}

/*
 * 두 줄까지만 — 파일 축은 "이 파일에 무엇이 걸려 있나"의 개관이고, 전문은
 * 작업 축이 진다. 14건이 붙은 vite.config.js에서 근거를 다 펼치니 상세가
 * 1902px가 되어 3분의 2가 스크롤 밖으로 나갔다.
 */
.jcard__line {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: var(--s-1);
  font-size: var(--t-small);
  color: var(--text-2);
}

/* ---- 코드 위치 --------------------------------------------------------- */


.refs__head {
  display: flex;
  align-items: baseline;
  gap: var(--s-2);
  margin: 0;
  font-size: var(--t-small);
  font-weight: 700;
  flex-wrap: wrap;
}

.refs__how {
  font-weight: 400;
  font-size: var(--t-micro);
  color: var(--muted-soft);
}

.refs__blocks {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  margin-top: var(--s-2);
}

.code {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--soft-alt);
  overflow-x: auto;
}

.code__file {
  margin: 0;
  padding: 5px var(--s-3);
  border-bottom: 1px solid var(--line-soft);
  background: var(--soft);
  font-size: var(--t-micro);
  font-weight: 600;
  color: var(--muted);
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
  background: var(--accent-bg);
  color: var(--accent-alt);
  font-size: var(--t-micro);
  font-weight: 700;
}

.refs__none {
  margin: var(--s-2) 0 0;
  padding: var(--s-3);
  border: 1px dashed var(--line);
  border-radius: var(--radius-sm);
  background: var(--soft);
  font-size: var(--t-small);
  color: var(--muted);
}

/* ---- 스모크 포인트 ------------------------------------------------------ */

.smoke {
  margin-top: var(--s-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--panel);
}

.smoke summary {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-3) var(--s-4);
  font-size: var(--t-body);
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  flex-wrap: wrap;
}

.smoke__sub {
  font-size: var(--t-micro);
  font-weight: 400;
  color: var(--muted);
}

.smoke ol {
  margin: 0;
  padding: 0 var(--s-4) var(--s-4) var(--s-7);
  font-size: var(--t-small);
  color: var(--text-2);
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
}

@media (max-width: 1100px) {
  .bench__grid {
    grid-template-columns: 1fr;
  }

  /*
   * 1열이 되면 상세가 목록 아래로 내려가므로 sticky는 의미가 없다 — 붙여 두면
   * 스크롤 중 목록 위를 덮는다.
   */
  .detail {
    position: static;
    max-height: none;
  }
}
</style>
