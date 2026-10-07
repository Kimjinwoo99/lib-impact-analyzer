<script setup>
import { computed } from 'vue';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const STATUS_LABEL = { pending: '대기', running: '진행 중', done: '완료', error: '중단' };

const isAgentTimeout = computed(() => /cancel|timed out/i.test(state.error ?? '') && state.l4Status === 'error');

const doneCount = computed(() => state.steps.filter((step) => step.status === 'done').length);

const lastLog = computed(() => {
  for (let i = state.l4Logs.length - 1; i >= 0; i -= 1) {
    const line = state.l4Logs[i]?.message?.trim();
    if (line) return line.split('\n').pop().slice(0, 110);
  }
  return '';
});

function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Elapsed for a running step, final duration for a finished one. */
function stepTime(step) {
  // Touch the ticker so running timers re-render every second.
  void state.tick;
  if (!step.startedAt) return '';
  if (step.status === 'running') return formatDuration(Date.now() - step.startedAt);
  if (step.endedAt) return formatDuration(step.endedAt - step.startedAt);
  return '';
}

/** One line of live substance per step, so the UI is never just a spinner. */
function stepDetail(step) {
  if (step.status === 'pending') return '';

  if (step.key === 'collect') {
    return state.parseResult
      ? `릴리즈 ${state.parseResult.releaseCount}개 · 변경항목 ${state.parseResult.changeItemCount}개 수집`
      : '공식 릴리즈 문서를 가져오는 중';
  }

  if (step.key === 'classify') {
    if (step.status === 'running') {
      return lastLog.value || (state.useMock ? 'Mock 분류 생성 중' : 'Agent 응답 대기 중');
    }
    const input = state.l4Execution?.inputSummary;
    return input ? `분류 ${input.includedItemCount}개 · 보류 ${input.deferredItemCount}개` : '';
  }

  if (step.key === 'search') {
    const summary = state.sourceMatch?.summary;
    return summary
      ? `${summary.scannedFiles}개 파일 스캔 · 후보 ${summary.candidateFiles}개`
      : '프로젝트 소스에서 검사 용어를 탐색하는 중';
  }

  if (step.key === 'evidence') return '영향 판단 구현 예정';
  if (step.key === 'finalize') return '결과 집계';
  return '';
}

const counts = computed(() => {
  const parts = [];
  if (state.parseResult) {
    parts.push(`릴리즈 ${state.parseResult.releaseCount}개`);
    parts.push(`파싱 항목 ${state.parseResult.changeItemCount}개`);
  }
  const classified = props.analysis.classificationItems.value.length;
  if (classified) parts.push(`분류 대상 ${classified}개`);
  return parts.join(' · ');
});
</script>

<template>
  <section class="card running">
    <header class="card-head">
      <div>
        <h2 class="card-title">{{ state.selectedDependency?.name }} 영향 분석</h2>
        <p class="card-sub">
          현재 버전, 타겟 버전, 중간 릴리즈 순으로 변경사항을 정리하고 있습니다.
        </p>
      </div>
      <div class="running__head-right">
        <span v-if="state.useMock" class="pill pill--warn">Mock 모드</span>
        <span class="running__stepcount">{{ doneCount }} / {{ state.steps.length }} 단계</span>
      </div>
    </header>

    <ol class="stepper">
      <li
        v-for="(step, index) in state.steps"
        :key="step.key"
        class="stepper__item"
        :class="`stepper__item--${step.status}`"
        :aria-current="step.status === 'running' ? 'step' : undefined"
      >
        <div class="stepper__rail">
          <span class="stepper__node">
            <svg v-if="step.status === 'done'" viewBox="0 0 16 16" class="stepper__check">
              <path
                d="M3.5 8.4l3 3 6-6.4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span v-else-if="step.status === 'error'">!</span>
            <span v-else>{{ index + 1 }}</span>
          </span>
          <span v-if="index < state.steps.length - 1" class="stepper__connector" />
        </div>

        <div class="stepper__body">
          <div class="stepper__headline">
            <span class="stepper__label">{{ step.label }}</span>
            <span v-if="stepTime(step)" class="stepper__time">{{ stepTime(step) }}</span>
            <span class="stepper__status">{{ STATUS_LABEL[step.status] }}</span>
          </div>

          <p v-if="stepDetail(step)" class="stepper__detail">{{ stepDetail(step) }}</p>

          <!-- Substep progress is unknowable, so the running bar is indeterminate. -->
          <div v-if="step.status === 'running'" class="stepper__bar" aria-hidden="true">
            <span class="stepper__bar-fill" />
          </div>
        </div>
      </li>
    </ol>

    <div v-if="state.error" class="callout callout--bad running__error">
      <div>
        <p class="callout__title">분석이 중단되었습니다</p>
        <p class="running__error-body mono">{{ state.error }}</p>
        <p v-if="isAgentTimeout" class="running__error-hint">
          Agent 실행이 제한 시간을 넘겼습니다. 목표 버전 범위를 좁히거나
          <strong>Mock으로 실행</strong>을 사용하세요.
        </p>
      </div>
    </div>

    <div class="running__foot">
      <p class="running__counts">{{ counts }}</p>
      <button v-if="state.error" type="button" class="btn" @click="analysis.backToVersion()">
        버전 다시 선택
      </button>
      <button v-else type="button" class="btn" @click="analysis.cancelAnalysis()">분석 취소</button>
    </div>

    <details v-if="state.l4Logs.length" class="running__logs">
      <summary>Agent 실행 로그 ({{ state.l4Logs.length }})</summary>
      <pre>{{ state.l4Logs.map((entry) => `[${entry.stream}] ${entry.message}`).join('\n') }}</pre>
    </details>
  </section>
</template>

<style scoped>
.running__head-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.running__stepcount {
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  white-space: nowrap;
}

/* ---- stepper -------------------------------------------------------- */

.stepper {
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}

.stepper__item {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 14px;
  min-height: 62px;
}

.stepper__rail {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stepper__node {
  position: relative;
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--panel);
  border: 1px solid var(--line);
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  transition:
    background 0.25s ease,
    border-color 0.25s ease,
    color 0.25s ease;
}

.stepper__check {
  width: 15px;
  height: 15px;
}

.stepper__connector {
  flex: 1;
  width: 2px;
  margin: 4px 0;
  border-radius: 1px;
  background: var(--line);
  transition: background 0.3s ease;
}

.stepper__item--done .stepper__node {
  background: var(--ok-bg);
  border-color: var(--ok-bg);
  color: var(--ok-fg);
}

.stepper__item--done .stepper__connector {
  background: var(--ok-fg);
  opacity: 0.35;
}

.stepper__item--error .stepper__node {
  background: var(--bad-bg);
  border-color: var(--bad-fg);
  color: var(--bad-fg);
}

.stepper__item--running .stepper__node {
  background: var(--accent-bg);
  border-color: transparent;
  color: var(--accent);
}

/* Rotating arc around the active node. */
.stepper__item--running .stepper__node::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0deg, var(--accent) 300deg, transparent 330deg);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px));
  animation: stepper-spin 1.1s linear infinite;
}

/* Soft halo so the eye lands on the active row immediately. */
.stepper__item--running .stepper__node::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 2px solid var(--accent);
  opacity: 0;
  animation: stepper-pulse 1.8s ease-out infinite;
}

@keyframes stepper-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes stepper-pulse {
  0% {
    transform: scale(1);
    opacity: 0.5;
  }
  70%,
  100% {
    transform: scale(1.7);
    opacity: 0;
  }
}

.stepper__body {
  padding-bottom: 16px;
  min-width: 0;
}

.stepper__headline {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-height: 28px;
}

.stepper__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--muted);
  transition: color 0.25s ease;
}

.stepper__item--running .stepper__label,
.stepper__item--done .stepper__label {
  color: var(--text);
}

.stepper__item--running .stepper__label {
  font-weight: 700;
}

.stepper__time {
  font-size: 12px;
  font-family: 'D2Coding', Consolas, monospace;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.stepper__status {
  margin-left: auto;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  white-space: nowrap;
}

.stepper__item--done .stepper__status {
  color: var(--ok-fg);
}
.stepper__item--running .stepper__status {
  color: var(--accent);
}
.stepper__item--error .stepper__status {
  color: var(--bad-fg);
}

.stepper__detail {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stepper__item--running .stepper__detail {
  font-family: 'D2Coding', Consolas, monospace;
  color: var(--muted-soft);
}

.stepper__bar {
  margin-top: 9px;
  height: 3px;
  border-radius: 2px;
  background: var(--track);
  overflow: hidden;
}

.stepper__bar-fill {
  display: block;
  width: 34%;
  height: 100%;
  border-radius: 2px;
  background: var(--accent);
  animation: stepper-slide 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}

@keyframes stepper-slide {
  0% {
    transform: translateX(-105%);
  }
  100% {
    transform: translateX(330%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .stepper__item--running .stepper__node::before,
  .stepper__item--running .stepper__node::after,
  .stepper__bar-fill {
    animation: none;
  }
  .stepper__bar-fill {
    width: 100%;
    opacity: 0.5;
  }
}

/* ---- error / foot --------------------------------------------------- */

.running__error {
  margin-top: var(--s-2);
}

.running__error-body {
  margin: var(--s-2) 0 0;
  font-size: var(--t-small);
  color: var(--text);
}

.running__error-hint {
  margin: var(--s-3) 0 0;
  font-size: var(--t-small);
  color: var(--muted);
  line-height: 1.65;
}

.running__foot {
  margin-top: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.running__counts {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.running__logs {
  margin-top: 18px;
  font-size: 12px;
  color: var(--muted);
}

.running__logs pre {
  margin: 10px 0 0;
  padding: 12px 14px;
  max-height: 180px;
  overflow: auto;
  border-radius: var(--radius-control);
  background: #111827;
  color: #d1d5db;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
}
</style>
