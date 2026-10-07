<script setup>
/*
 * 판정 Q&A — 판정 상세 카드 최하단의 "Agent에게 질문하기".
 *
 * 설계 정본은 `judgment-chat-design.md`. 이 기능은 **로컬 Claude CLI가
 * 설치·인증된 환경에서만** 동작한다(서버가 `claude`를 자식 프로세스로
 * 띄우는 구조) — 그래서 마운트 시 /api/agent/chat/health를 먼저 물어보고,
 * 안 되면 버튼을 잠근 채 사유를 보여준다.
 *
 * 격리 원칙(설계 §6): 대화 상태는 전부 이 컴포넌트 안에만 있다. analysis.js
 * 전역 상태에 아무것도 넣지 않는다 — 이 파일과 부모의 마운트 한 블록만
 * 지우면 기능이 통째로 사라진다.
 *
 * 판정 데이터는 절대 바꾸지 않는다. 대화로 무슨 말이 나오든 judgments는
 * 불변이고, 이 패널은 순수 읽기 전용 부가 기능이다.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { api, AbortedError } from '../api/client.js';
import { renderMarkdown } from '../lib/markdown.js';
import AgentDataNotice from './AgentDataNotice.vue';

/*
 * 이 기능의 전송 범위는 파이프라인 두 단계보다 넓다 — 판정 하나의 맥락만
 * 보내지만, Agent가 프로젝트 폴더의 파일을 직접 열어볼 수 있어(읽기 전용)
 * 질문에 따라 목록 밖의 파일도 읽힐 수 있다. 그 사실을 AgentDataNotice의
 * readsProjectFiles로 별도 강조한다.
 */
const CHAT_NOTICE_ITEMS = [
  '지금 보고 있는 판정 1건의 내용 — 판정 결과 · 근거 · 조치 · 검증 방법 · 지목된 파일 경로',
  '그 판정의 출처 기록 — 해당 릴리즈 노트 항목, 또는 관련 패키지 정보',
  '분석 대상 패키지 이름과 버전(현재 버전 · 목표 버전), 프로젝트 폴더 경로',
  '화면의 「패키지 상태」와 같은 내용 — npm 지원 종료 안내 문구와 알려진 취약점 목록입니다. 공개된 레지스트리 조회 결과입니다.',
  '이 판정이 확정되지 못한 이유(무엇이 확인되면 확정되는지)와, 이 항목을 완료 처리하셨다면 그때 남긴 비고',
  '이번 업데이트 전체의 핵심 조치 · 공통 리스크 · 총평 스모크 포인트 — 요약 탭과 확인 절차 행에 표시되는 내용입니다.',
  '이 판정에 대해 지금까지 주고받은 질문과 답변(최근 20개까지), 그리고 이번에 입력한 질문',
];

const props = defineProps({
  judgment: { type: Object, required: true },
  // 판정 유닛의 출처 기록(분류 항목·peerAudit row·검토 영역). 없으면 판정문
  // 자체가 맥락 — guide: 유닛이 그 경우다.
  sourceItem: { type: Object, default: null },
  // 화면의 「패키지 상태」 원본(지원 종료 문구·취약점 목록). 화면에만 있고
  // 프롬프트에 없으면 Agent가 그 사실을 확인 못 한다고 답한다.
  advisory: { type: Object, default: null },
  // 이 판정이 확정되지 못한 이유(L6 evidenceGaps의 해당 유닛분).
  evidenceGap: { type: String, default: '' },
  // 사용자가 화면에서 이 항목을 완료 처리했는지 + 남긴 비고.
  checklistEntry: { type: Object, default: null },
  // 실행 전체 맥락 — 요약 탭의 핵심 조치·공통 리스크, 이 탭 하단의 스모크 포인트.
  runSummary: { type: Object, default: null },
  smokePoints: { type: Array, default: () => [] },
  projectPath: { type: String, default: '' },
  packageName: { type: String, default: '' },
  currentVersion: { type: String, default: '' },
  targetVersion: { type: String, default: '' },
  // 새 L6 결과가 도착했음을 알리는 신호. 바뀌면 유닛별 대화를 전부 버린다 —
  // 같은 unit id라도 다른 실행의 판정이면 이전 대화의 전제가 사라진다.
  resetToken: { type: [Object, String, Number], default: null },
});

const unitKey = computed(() => String(props.judgment?.unit ?? ''));

/*
 * unit → turns[]. 판정을 오가도 유닛별 대화가 보존되게 유닛으로 키를 잡는다.
 * Map 대신 평범한 객체 + 재할당인 이유는 Vue 반응성이 그쪽이 단순해서다.
 */
const conversations = ref({});
const openUnits = ref({});

const turns = computed(() => conversations.value[unitKey.value] ?? []);

// 대화가 이미 있으면 자동으로 펼친다 — 질문했던 판정으로 돌아왔을 때 다시
// 열게 만들 이유가 없다. 반대로 처음 보는 판정은 접힌 채로 둔다(목록을
// 훑는 동안 빈 채팅창이 계속 따라다니지 않게).
const isOpen = computed(() => Boolean(openUnits.value[unitKey.value]) || turns.value.length > 0);

const draft = ref('');
const busy = ref(false);
const errorText = ref('');
const health = ref(null); // null = 확인 중
let controller = null;

const hasProject = computed(() => Boolean(props.projectPath?.trim()));

const disabledReason = computed(() => {
  if (health.value === null) return '실행 가능 여부를 확인하는 중입니다.';
  if (!health.value.available) return health.value.reason || '로컬 Claude CLI를 사용할 수 없습니다.';
  if (!hasProject.value) return '분석 대상 프로젝트 경로가 없어 질문할 수 없습니다.';
  return '';
});

onMounted(async () => {
  try {
    health.value = await api.chatHealth();
  } catch (error) {
    health.value = { available: false, reason: error instanceof Error ? error.message : String(error) };
  }
});

// 새 L6 실행 → 이전 실행 기준의 대화는 전부 폐기.
watch(
  () => props.resetToken,
  () => {
    conversations.value = {};
    openUnits.value = {};
    draft.value = '';
    errorText.value = '';
  },
);

// 판정을 바꾸면 그 판정에 대한 입력·에러는 초기화한다(대화 이력은 유지).
watch(unitKey, () => {
  draft.value = '';
  errorText.value = '';
});

function open() {
  openUnits.value = { ...openUnits.value, [unitKey.value]: true };
}

function appendTurn(unit, turn) {
  const existing = conversations.value[unit] ?? [];
  conversations.value = { ...conversations.value, [unit]: [...existing, turn] };
}

function replaceTurns(unit, next) {
  conversations.value = { ...conversations.value, [unit]: next };
}

/*
 * Enter 전송의 한글(IME) 가드.
 *
 * 한글은 마지막 음절이 조합(composition) 중 상태로 남고, Vue의 v-model은
 * 조합 중에는 값을 갱신하지 않는다(의도된 동작). 그 상태에서 Enter를 누르면
 * keydown이 조합 확정보다 먼저 도착해 `draft`에 마지막 글자가 아직 없다 —
 * "이 설정 뭐야요"가 "이 설정 뭐야"로 전송되던 버그가 이것이었다. 영문은
 * 조합 과정이 없어 재현되지 않는다.
 *
 * isComposing이면 이 Enter는 조합 확정용이므로 전송하지 않는다. 사용자는
 * 확정 후 한 번 더 누르면 되고, 이는 브라우저·에디터의 표준 동작과 같다.
 */
function submitFromKey(event) {
  if (event?.isComposing || event?.keyCode === 229) return;
  send();
}

async function send() {
  const question = draft.value.trim();
  if (!question || busy.value || disabledReason.value) return;

  const unit = unitKey.value;
  // 이번 질문 이전까지가 history — 질문 자체는 별 필드로 따로 보낸다.
  const history = turns.value.map((turn) => ({ role: turn.role, text: turn.text }));

  appendTurn(unit, { role: 'user', text: question });
  draft.value = '';
  errorText.value = '';
  busy.value = true;
  controller = new AbortController();

  try {
    const result = await api.askJudgment(
      {
        projectPath: props.projectPath,
        packageName: props.packageName,
        currentVersion: props.currentVersion,
        targetVersion: props.targetVersion,
        unit,
        judgment: props.judgment,
        sourceItem: props.sourceItem,
        advisory: props.advisory,
        evidenceGap: props.evidenceGap,
        checklistEntry: props.checklistEntry,
        runSummary: props.runSummary,
        smokePoints: props.smokePoints,
        history,
        question,
      },
      controller.signal,
    );
    appendTurn(unit, {
      role: 'assistant',
      text: result.answer,
      meta: {
        model: result.model,
        costUsd: result.costUsd,
        durationMs: result.durationMs,
        toolCount: result.toolTrace?.length ?? 0,
        droppedHistoryCount: result.droppedHistoryCount ?? 0,
      },
    });
  } catch (error) {
    /*
     * 실패·중단이면 방금 넣은 질문을 목록에서 빼고 입력창으로 되돌린다 —
     * 답 없는 질문만 이력에 남으면 다음 요청의 history가 이상해지고,
     * 사용자는 질문을 다시 타이핑해야 한다.
     */
    replaceTurns(unit, (conversations.value[unit] ?? []).slice(0, -1));
    draft.value = question;
    errorText.value =
      error instanceof AbortedError
        ? '질문을 중단했습니다.'
        : error instanceof Error
          ? error.message
          : String(error);
  } finally {
    busy.value = false;
    controller = null;
  }
}

function stop() {
  controller?.abort();
}

/*
 * CLI가 보고하는 total_cost_usd는 청구액이 아니라 API 환산 값이다(로그인된
 * 구독 계정의 사용량이 소비된다 — AgentDataNotice의 usageEquivalent 주석 참고).
 * 그래서 숫자만 두지 않고 '환산'을 붙여, 고지문과 읽히는 기준을 맞춘다.
 */
function formatCost(value) {
  return typeof value === 'number' ? `API 환산 $${value.toFixed(3)}` : null;
}

function formatDuration(ms) {
  return typeof ms === 'number' ? `${Math.round(ms / 1000)}초` : null;
}

function metaLine(meta) {
  return [
    meta.model,
    formatCost(meta.costUsd),
    formatDuration(meta.durationMs),
    meta.toolCount ? `도구 ${meta.toolCount}회` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
</script>

<template>
  <section class="qa">
    <AgentDataNotice
      action="Agent에게 질문하기"
      :items="CHAT_NOTICE_ITEMS"
      usage-equivalent="$0.03~0.05"
      reads-project-files
      class="qa__notice"
    />

    <template v-if="!isOpen">
      <button type="button" class="btn btn--sm qa__open" :disabled="Boolean(disabledReason)" @click="open">
        Agent에게 질문하기
      </button>
      <p v-if="disabledReason" class="qa__reason">{{ disabledReason }}</p>
    </template>

    <template v-else>
      <div class="qa__head">
        <p class="qa__title">Agent에게 질문하기</p>
        <p class="qa__note">
          이 판정의 맥락을 그대로 가진 Agent와 대화합니다.
        </p>
      </div>

      <div v-if="turns.length" class="qa__log">
        <div v-for="(turn, index) in turns" :key="index" class="turn" :class="`turn--${turn.role}`">
          <p class="turn__who">{{ turn.role === 'user' ? '나' : 'Agent' }}</p>
          <div v-if="turn.role === 'assistant'" class="turn__body md" v-html="renderMarkdown(turn.text)" />
          <p v-else class="turn__body">{{ turn.text }}</p>
          <p v-if="turn.meta" class="turn__meta">
            {{ metaLine(turn.meta) }}
            <span v-if="turn.meta.droppedHistoryCount">
              · 앞선 {{ turn.meta.droppedHistoryCount }}개 메시지는 길이 제한으로 맥락에서 제외됨
            </span>
          </p>
        </div>
      </div>

      <p v-if="busy" class="qa__busy">답변을 생성하는 중입니다…</p>
      <p v-if="errorText" class="qa__error">{{ errorText }}</p>

      <div class="qa__compose">
        <textarea
          v-model="draft"
          class="field qa__input"
          rows="2"
          :disabled="busy || Boolean(disabledReason)"
          placeholder="이 판정에 대해 궁금한 점 — 예: 이 설정이 다른 파일에서도 쓰이나요?"
          @keydown.enter.exact.prevent="submitFromKey"
        />
        <div class="qa__actions">
          <button v-if="busy" type="button" class="btn btn--sm" @click="stop">중단</button>
          <button
            v-else
            type="button"
            class="btn btn--sm btn--primary"
            :disabled="!draft.trim() || Boolean(disabledReason)"
            @click="send"
          >
            질문
          </button>
        </div>
      </div>
      <p v-if="disabledReason" class="qa__reason">{{ disabledReason }}</p>
    </template>
  </section>
</template>

<style scoped>
/*
 * 여백·구분선은 부모(ActionChecklistTab)의 `.detail__section`이 담당한다.
 * 여기서도 그리면 선이 두 줄로 겹친다. 자식 컴포넌트의 루트 엘리먼트에는
 * 부모의 scoped 속성이 함께 붙으므로 부모 클래스가 그대로 적용된다.
 */
.qa {
  min-width: 0;
}

.qa__notice {
  margin-bottom: var(--s-3);
}

.qa__open {
  width: 100%;
}

.qa__reason {
  margin: var(--s-2) 0 0;
  font-size: var(--t-micro);
  color: var(--muted-soft);
  line-height: 1.6;
}

.qa__head {
  margin-bottom: var(--s-3);
}

.qa__title {
  margin: 0;
  font-size: var(--t-small);
  font-weight: 700;
  color: var(--muted);
}

.qa__note {
  margin: var(--s-1) 0 0;
  font-size: var(--t-micro);
  color: var(--muted-soft);
  line-height: 1.6;
}

.qa__log {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  margin-bottom: var(--s-3);
}

.turn__who {
  margin: 0 0 3px;
  font-size: var(--t-micro);
  font-weight: 700;
  color: var(--muted-soft);
}

.turn__body {
  margin: 0;
  padding: var(--s-3);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  font-size: var(--t-body);
  line-height: 1.7;
  color: var(--text-2);
  overflow-wrap: anywhere;
}

.turn--user .turn__body {
  background: var(--soft);
  border-left: 3px solid var(--line-strong);
}

.turn--assistant .turn__body {
  background: var(--panel);
  border-left: 3px solid var(--brand);
  color: var(--text);
}

.turn__meta {
  margin: var(--s-1) 0 0;
  font-size: var(--t-micro);
  color: var(--muted-soft);
}

/* 답변 안의 markdown — 문단·목록·코드가 카드 리듬을 깨지 않게만 손본다. */
.md :deep(p) {
  margin: 0 0 var(--s-2);
}

.md :deep(p:last-child) {
  margin-bottom: 0;
}

.md :deep(ul),
.md :deep(ol) {
  margin: 0 0 var(--s-2);
  padding-left: var(--s-5);
}

.md :deep(h3),
.md :deep(h4),
.md :deep(h5),
.md :deep(h6) {
  margin: var(--s-3) 0 var(--s-2);
  font-size: var(--t-section);
}

.md :deep(pre) {
  margin: 0 0 var(--s-2);
  padding: var(--s-3);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  background: var(--soft-alt);
  overflow-x: auto;
  font-size: var(--t-small);
}

.md :deep(code) {
  font-size: var(--t-small);
}

.md :deep(blockquote) {
  margin: 0 0 var(--s-2);
  padding-left: var(--s-3);
  border-left: 2px solid var(--line-strong);
  color: var(--muted);
}

.qa__busy,
.qa__error {
  margin: 0 0 var(--s-2);
  font-size: var(--t-small);
}

.qa__busy {
  color: var(--muted);
}

.qa__error {
  color: var(--bad-fg);
}

.qa__compose {
  display: flex;
  align-items: flex-end;
  gap: var(--s-2);
}

/*
 * .field는 전역에서 height 42px인 폼 입력이라 textarea에 그대로 쓰면 두 줄이
 * 갇힌다 — ActionChecklistTab의 비고 입력이 겪은 것과 같은 충돌.
 */
.qa__input {
  height: auto;
  min-height: 56px;
  padding: var(--s-2) var(--s-3);
  resize: vertical;
}

.qa__actions {
  flex: none;
}
</style>
