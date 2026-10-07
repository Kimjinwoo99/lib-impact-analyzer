<script setup>
/*
 * ⚠️ DEV-ONLY — 실구현(운영) 배포에서 제거 대상.
 *
 * 개발 중 확인용 미리보기 패널. 두 탭:
 *   MD        Agent 응답 원문(L4/L6)이나 직접 입력한 markdown을 렌더 — 출력
 *             형태가 확정되기 전까지의 실험 공간
 *   사용 로그  현재 세션의 단계별 소요(수집 같은 코드 단계 포함)와, 서버가
 *             영속화한 Agent 실행 기록(대상·시각·소요·토큰·비용)
 *
 * - 기존 레이아웃에 영향 없음: position:fixed 오버레이로만 뜬다.
 * - `import.meta.env.DEV` 가드로 프로덕션 번들에서는 렌더되지 않는다.
 * - 렌더러는 외부 의존성 없는 소형 변환기이며, HTML을 먼저 이스케이프한 뒤
 *   markdown 요소만 되살리므로 응답에 섞인 태그가 실행되지 않는다.
 */
import { computed, ref, watch } from 'vue';
import { api } from '../api/client.js';
import { renderMarkdown } from '../lib/markdown.js';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const isDev = Boolean(import.meta.env?.DEV);
const open = ref(false);
const tab = ref('log'); // pipeline | model | md | log

/*
 * 파이프라인 실행 방식 — 실제 Agent 호출 vs 결정론 Mock.
 * 제품 화면에는 이 선택지가 없다(항상 실제 실행). 화면을 사용량 없이 돌려보는
 * 것은 개발 행위이므로 여기에만 둔다.
 */
const MODE_OPTIONS = [
  { value: 'real', label: '실제 실행' },
  { value: 'mock', label: 'Mock 실행' },
];

const running = computed(() => ({
  l4: state.l4Status === 'running',
  l6: state.l6Status === 'running',
}));
const anyRunning = computed(() => running.value.l4 || running.value.l6);
const interrupting = ref(false);

async function interrupt() {
  interrupting.value = true;
  try {
    await props.analysis.interruptAgents();
  } finally {
    interrupting.value = false;
  }
}

/*
 * Agent 모델 실험 — 여기서 고른 모델이 다음 L4/L6 실행에 그대로 쓰인다.
 * 빈 값 = 러너 기본(L4는 sonnet, L6는 CLI 기본 모델). 모델이 최종 고정되면
 * 이 탭과 state.agentModels는 함께 제거한다.
 */
/*
 * 이름+버전 명시 ID만 사용한다 — 실행기록의 모델 표기와 선택값이 1:1로
 * 대응되도록. 아래 목록은 2026-08-07에 이 구독의 CLI로 전수 실행 검증한
 * 것(각 ID로 1회 호출 → envelope.modelUsage 확인). 상단 3개 = 모델별 최신.
 */
const MODEL_GROUPS = [
  {
    label: '최신 버전',
    options: [
      { value: 'claude-haiku-4-5', label: 'Haiku 4.5 (최신)' },
      { value: 'claude-sonnet-5', label: 'Sonnet 5 (최신)' },
      { value: 'claude-opus-5', label: 'Opus 5 (최신)' },
    ],
  },
  {
    label: 'Opus — 이전 버전',
    options: [
      { value: 'claude-opus-4-8', label: 'Opus 4.8' },
      { value: 'claude-opus-4-7', label: 'Opus 4.7' },
      { value: 'claude-opus-4-6', label: 'Opus 4.6' },
      { value: 'claude-opus-4-5', label: 'Opus 4.5' },
    ],
  },
  {
    label: 'Sonnet — 이전 버전',
    options: [
      { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
      { value: 'claude-sonnet-4-5', label: 'Sonnet 4.5' },
    ],
  },
  {
    label: '기타',
    options: [{ value: 'claude-fable-5', label: 'Fable 5 (CLI 기본과 동일)' }],
  },
];
const source = ref('l6'); // l6 | l4 | manual
const manualText = ref('# 미리보기\n\n**볼드** · *이탤릭* · `code`\n\n- 목록 1\n- 목록 2');

// --- MD 탭 ---------------------------------------------------------------

const markdownText = computed(() => {
  if (source.value === 'manual') return manualText.value;
  if (source.value === 'l6') {
    const meta = state.l6Execution?.meta;
    const result = state.l6Execution?.result;
    if (!meta && !result) return '_L6 실행 결과가 아직 없습니다. 대응·테스트 탭에서 영향 판정을 실행하세요._';
    return [
      meta?.rawText ? meta.rawText : '_rawText 없음 (구버전 실행 결과)_',
      '',
      '---',
      '',
      '```json',
      JSON.stringify(result ?? null, null, 2),
      '```',
    ].join('\n');
  }
  const l4 = state.l4Execution;
  if (!l4) return '_L4 실행 결과가 아직 없습니다._';
  return ['```json', JSON.stringify({ result: l4.result, meta: l4.meta }, null, 2), '```'].join('\n');
});

const rendered = computed(() => renderMarkdown(markdownText.value));

// --- 사용 로그 탭 ----------------------------------------------------------

/** 현재 세션의 단계별 소요 — 코드 단계(수집·탐색)와 Agent 단계 모두. */
const stageRows = computed(() => {
  const rows = state.steps.map((step) => ({
    label: step.label,
    status: step.status,
    duration: step.startedAt && step.endedAt ? step.endedAt - step.startedAt : null,
  }));
  if (state.l4Execution?.meta?.durationMs != null) {
    const meta = state.l4Execution.meta;
    rows.push({
      label: `L4 Agent 호출 (분류${meta.model ? ` · ${shortModel(meta.model)}` : ''})`,
      status: meta.fallback ? 'fallback' : 'done',
      duration: meta.durationMs,
      cost: meta.costUsd ?? null,
      usage: meta.usage ?? null,
    });
  }
  if (state.l6Execution?.meta?.durationMs != null) {
    const meta = state.l6Execution.meta;
    rows.push({
      label: `L6 Agent 호출 (영향 판정${meta.model ? ` · ${shortModel(meta.model)}` : ''})`,
      status: 'done',
      duration: meta.durationMs,
      cost: meta.costUsd ?? null,
      usage: meta.usage ?? null,
    });
  }
  return rows;
});

const runs = ref([]);
// The real count on disk — may exceed runs.value.length if the server capped
// the response. Shown alongside pageLabel so a truncated list never reads as
// a complete one (it used to: "1–15 / 47" when the disk actually had 300+).
const totalOnDisk = ref(0);
const runsStatus = ref('idle');
const runFilter = ref('all'); // all | claude-cli
const dirFilter = ref('all'); // all | <projectPath>
const page = ref(1);
const RUNS_PER_PAGE = 10;

/*
 * 실행이 어느 디렉터리를 대상으로 했는지의 필터. 선택지는 기록 데이터에서
 * 유도한다 — 새 프로젝트로 처음 실행하면 그 경로가 자동으로 목록에 생기고,
 * 별도의 등록 절차는 없다. (projectPath 없는 기록 = 필드 도입 이전 실행)
 */
const runDirs = computed(() =>
  [...new Set(runs.value.map((run) => run.projectPath).filter(Boolean))].sort(),
);
watch(runDirs, (dirs) => {
  if (dirFilter.value !== 'all' && !dirs.includes(dirFilter.value)) dirFilter.value = 'all';
});

/** 좁은 드롭다운·칸을 위한 표시명 — 전체 경로는 title로. */
function dirLabel(path) {
  return String(path ?? '').split('/').filter(Boolean).pop() ?? path;
}

/*
 * 기록은 계속 쌓이므로 목적별로 좁혀 본다: 목업/폴백 실행은 비교 대상이
 * 아니라서 claude-cli만 보는 선택지를 두고, 디렉터리 필터로 프로젝트별
 * 이력을 가른다.
 */
const filteredRuns = computed(() =>
  runs.value
    .filter((run) => (runFilter.value === 'claude-cli' ? run.runner === 'claude-cli' : true))
    .filter((run) => (dirFilter.value === 'all' ? true : run.projectPath === dirFilter.value)),
);
const pageCount = computed(() => Math.max(1, Math.ceil(filteredRuns.value.length / RUNS_PER_PAGE)));
const pagedRuns = computed(() => {
  const start = (page.value - 1) * RUNS_PER_PAGE;
  return filteredRuns.value.slice(start, start + RUNS_PER_PAGE);
});
const pageLabel = computed(() => {
  const start = (page.value - 1) * RUNS_PER_PAGE + 1;
  const end = Math.min(page.value * RUNS_PER_PAGE, filteredRuns.value.length);
  const label = `${start}–${end} / ${filteredRuns.value.length}`;
  // The server may have capped what it returned — say so rather than let a
  // truncated count read as the complete history.
  const capped = runs.value.length < totalOnDisk.value;
  return capped ? `${label} (디스크 전체 ${totalOnDisk.value}건 중 최근 ${runs.value.length}건만 조회됨)` : label;
});

// 필터 변경이나 새 기록으로 페이지가 사라지면 유효 범위로 되돌린다.
watch([filteredRuns, runFilter, dirFilter], () => {
  if (page.value > pageCount.value) page.value = pageCount.value;
});

async function loadRuns() {
  runsStatus.value = 'loading';
  try {
    const response = await api.agentRuns();
    runs.value = response.runs ?? [];
    totalOnDisk.value = response.totalCount ?? runs.value.length;
    runsStatus.value = 'done';
  } catch {
    runsStatus.value = 'error';
  }
}

function openLogTab() {
  tab.value = 'log';
  loadRuns();
}

function fmtDuration(ms) {
  if (ms == null) return '—';
  return ms >= 60000 ? `${Math.floor(ms / 60000)}분 ${Math.round((ms % 60000) / 1000)}초` : `${(ms / 1000).toFixed(1)}초`;
}

function fmtTime(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function fmtTokens(usage) {
  if (!usage) return '—';
  const input = usage.input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  return `in ${(input + cacheRead).toLocaleString()} · out ${output.toLocaleString()}`;
}

/**
 * 실행기록 행의 모델 표기. 폴백/목업 실행은 모델을 쓰지 않으므로 '—',
 * claude-cli인데 값이 없으면 기록 기능 이전 실행이라 '미기록'.
 */
function fmtModel(run) {
  if (run.model) return shortModel(run.model);
  return run.runner === 'claude-cli' ? '미기록' : '—';
}

/** claude- 접두어와 날짜 스냅샷 접미어를 떼어 좁은 칸에 맞춘다. */
function shortModel(model) {
  return String(model).replace(/^claude-/, '').replace(/-\d{8}$/, '');
}

/** 실제 Agent 실행(claude-cli)만 결과 본문이 있고, 그때만 버튼을 보인다. */
function resultUrl(run) {
  return run.runner === 'claude-cli' ? `/api/agent/runs/${run.id}/result` : null;
}

function runTarget(run) {
  const range = run.targetVersion ? `${run.currentVersion} → ${run.targetVersion}` : `${run.currentVersion} 헬스체크`;
  return `${run.packageName} ${range}`;
}

</script>

<template>
  <template v-if="isDev">
    <button v-if="!open" type="button" class="mdp-toggle" title="개발도구 (실구현 제거 대상)" @click="open = true; loadRuns()">
      개발도구 <span class="mdp-toggle__dev">dev</span>
    </button>

    <aside v-else class="mdp" aria-label="개발도구">
      <div class="mdp__bar">
        <strong class="mdp__title">개발도구</strong>
        <span class="mdp__flag">개발용 임시 패널 — 실구현에서 제거</span>
        <button
          v-if="anyRunning"
          type="button"
          class="mdp__stop"
          :disabled="interrupting"
          :title="`실행 중인 Agent 중단 (${running.l4 ? 'L4' : ''}${running.l4 && running.l6 ? ' · ' : ''}${running.l6 ? 'L6' : ''})`"
          @click="interrupt()"
        >
          ■ {{ interrupting ? '중단 중…' : '중단' }}
        </button>
        <nav class="mdp__tabs">
          <button type="button" class="mdp__tab" :class="{ 'mdp__tab--on': tab === 'pipeline' }" @click="tab = 'pipeline'">파이프라인</button>
          <button type="button" class="mdp__tab" :class="{ 'mdp__tab--on': tab === 'model' }" @click="tab = 'model'">모델</button>
          <button type="button" class="mdp__tab" :class="{ 'mdp__tab--on': tab === 'md' }" @click="tab = 'md'">MD</button>
          <button type="button" class="mdp__tab" :class="{ 'mdp__tab--on': tab === 'log' }" @click="openLogTab()">사용 로그</button>
        </nav>
        <button type="button" class="mdp__close" aria-label="닫기" @click="open = false">✕</button>
      </div>

      <template v-if="tab === 'pipeline'">
        <div class="mdp__body">
          <p class="mdp__section">실행 방식 — 다음 실행부터 적용</p>
          <table class="mdp__grid">
            <tbody>
              <tr v-for="row in [
                { kind: 'l4', label: 'L4 (분류)', note: '실제 = Claude CLI 분류 · Mock = 결정론 분류 생성' },
                { kind: 'l6', label: 'L6 (영향 판정)', note: '실제 = 프로젝트 소스 읽고 판정 · Mock = 규칙 매핑' },
              ]" :key="row.kind">
                <td>{{ row.label }}</td>
                <td>
                  <select
                    class="mdp__select"
                    :value="state.agentModes[row.kind]"
                    @change="analysis.setAgentMode(row.kind, $event.target.value)"
                  >
                    <option v-for="option in MODE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </td>
                <td class="mdp__wrap mdp__dim">{{ row.note }}</td>
              </tr>
            </tbody>
          </table>
          <p class="mdp__dim" style="margin-top: 8px;">
            Mock은 화면을 사용량 없이 돌려보기 위한 것이며 결과에 [Mock] 표시가 붙습니다.
            제품 화면에는 이 선택지가 없고 항상 실제 실행입니다. L4·L6는 분석 실행 시
            파이프라인에서 이어서 돌아가며, 판정할 검토 대상이 없으면 L6는 건너뜁니다.
          </p>
        </div>
      </template>

      <template v-else-if="tab === 'model'">
        <div class="mdp__body">
          <p class="mdp__section">Agent 모델 실험 — 다음 실행부터 적용</p>
          <table class="mdp__grid">
            <tbody>
              <tr>
                <td>L4 (분류)</td>
                <td>
                  <select class="mdp__select" :value="state.agentModels.l4" @change="analysis.setAgentModel('l4', $event.target.value)">
                    <option value="">기본값 (sonnet 최신)</option>
                    <optgroup v-for="group in MODEL_GROUPS" :key="group.label" :label="group.label">
                      <option v-for="option in group.options" :key="option.value" :value="option.value">{{ option.label }}</option>
                    </optgroup>
                  </select>
                </td>
                <td class="mdp__dim">도구 없음 · 분류 전용</td>
              </tr>
              <tr>
                <td>L6 (영향 판정)</td>
                <td>
                  <select class="mdp__select" :value="state.agentModels.l6" @change="analysis.setAgentModel('l6', $event.target.value)">
                    <option value="">기본값 (CLI 기본 모델)</option>
                    <optgroup v-for="group in MODEL_GROUPS" :key="group.label" :label="group.label">
                      <option v-for="option in group.options" :key="option.value" :value="option.value">{{ option.label }}</option>
                    </optgroup>
                  </select>
                </td>
                <td class="mdp__dim">읽기 도구 · 프로젝트 검증</td>
              </tr>
            </tbody>
          </table>
          <p class="mdp__dim" style="margin-top: 8px;">
            설정은 이 브라우저에 저장되며 세션 초기화에도 유지됩니다. 실행 결과는 사용 로그 탭의
            기록으로 비교하세요 (scripts/compare-l4-results.js).
          </p>
        </div>
      </template>

      <template v-else-if="tab === 'md'">
        <div class="mdp__controls">
          <select v-model="source" class="mdp__select">
            <option value="l6">L6 응답 원문</option>
            <option value="l4">L4 결과 (JSON)</option>
            <option value="manual">직접 입력</option>
          </select>
        </div>
        <textarea
          v-if="source === 'manual'"
          v-model="manualText"
          class="mdp__input mono"
          spellcheck="false"
          placeholder="markdown을 입력하면 아래에 렌더됩니다"
        />
        <!-- eslint-disable-next-line vue/no-v-html — escaped-first renderer above -->
        <div class="mdp__body" v-html="rendered" />
      </template>

      <template v-else>
        <div class="mdp__body">
          <p class="mdp__section">현재 세션 · 단계별 소요</p>
          <table class="mdp__grid">
            <tbody>
              <tr v-for="row in stageRows" :key="row.label">
                <td class="mdp__wrap">{{ row.label }}</td>
                <td class="mono">{{ fmtDuration(row.duration) }}</td>
                <td class="mono mdp__dim">{{ row.status }}</td>
                <td class="mono mdp__dim">
                  <template v-if="row.cost != null">${{ row.cost.toFixed(3) }} · {{ fmtTokens(row.usage) }}</template>
                </td>
              </tr>
              <tr v-if="!stageRows.length">
                <td colspan="4" class="mdp__dim">아직 실행한 단계가 없습니다.</td>
              </tr>
            </tbody>
          </table>

          <p class="mdp__section">
            Agent 실행 기록 (서버 영속 · .cache/agent-runs)
            <select v-model="runFilter" class="mdp__select">
              <option value="all">전체</option>
              <option value="claude-cli">실제 Agent 호출만 (claude-cli)</option>
            </select>
            <!-- 대상 디렉터리 필터 — 선택지는 기록에서 유도되어 새 프로젝트
                 첫 실행 시 자동으로 늘어난다. -->
            <select v-model="dirFilter" class="mdp__select" :title="dirFilter === 'all' ? '' : dirFilter">
              <option value="all">모든 디렉터리</option>
              <option v-for="dir in runDirs" :key="dir" :value="dir" :title="dir">{{ dirLabel(dir) }}</option>
            </select>
            <button type="button" class="mdp__refresh" @click="loadRuns()">새로고침</button>
          </p>
          <p v-if="runsStatus === 'error'" class="mdp__dim">기록을 불러오지 못했습니다 — API 서버 확인.</p>
          <template v-else>
            <table class="mdp__grid">
              <tbody>
                <tr v-for="run in pagedRuns" :key="run.id">
                  <td class="mono">{{ run.kind }}</td>
                  <td class="mono" :class="{ mdp__dim: !run.model }">{{ fmtModel(run) }}</td>
                  <!-- runner는 모델 칸이 대신 말해준다 ('—' = 폴백·목업) -->
                  <td class="mdp__wrap" :title="run.runner ?? ''">
                    {{ runTarget(run) }}
                    <span v-if="run.status !== 'success'" class="mdp__dim">· {{ run.status }}</span>
                  </td>
                  <td class="mono mdp__dim" :title="run.projectPath ?? '기록 없음 (필드 도입 이전 실행)'">
                    {{ run.projectPath ? dirLabel(run.projectPath) : '—' }}
                  </td>
                  <td class="mono">{{ fmtTime(run.startedAt) }}</td>
                  <td class="mono">{{ fmtDuration(run.durationMs) }}</td>
                  <td class="mono mdp__dim">
                    <template v-if="run.costUsd != null">${{ run.costUsd.toFixed(3) }} · {{ fmtTokens(run.usage) }}</template>
                    <template v-else>—</template>
                  </td>
                  <td>
                    <a v-if="resultUrl(run)" class="mdp__json" :href="resultUrl(run)" target="_blank" rel="noreferrer">JSON</a>
                  </td>
                </tr>
                <tr v-if="!filteredRuns.length">
                  <td colspan="8" class="mdp__dim">{{ runsStatus === 'loading' ? '불러오는 중…' : '기록 없음 — Agent를 실행하면 여기에 쌓입니다.' }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="pageCount > 1" class="mdp__pager">
              <button type="button" class="mdp__refresh" :disabled="page === 1" @click="page -= 1">← 이전</button>
              <span class="mdp__dim mono">{{ pageLabel }}</span>
              <button type="button" class="mdp__refresh" :disabled="page === pageCount" @click="page += 1">다음 →</button>
            </div>
          </template>
        </div>
      </template>
    </aside>
  </template>
</template>

<style scoped>
/* Fixed overlay: occupies no layout space anywhere in the app. */
.mdp-toggle {
  position: fixed;
  right: 16px;
  /* 하단 워크스페이스 전환 바(고정)보다 위 — 바에 가리면 존재 자체가 안 보인다 */
  bottom: 96px;
  z-index: 60;
  padding: 6px 12px;
  border: 1px dashed var(--warn-fg);
  border-radius: var(--radius-pill);
  background: var(--panel);
  color: var(--text-2);
  font-size: 12px;
  cursor: pointer;
  opacity: 0.85;
}

.mdp-toggle:hover {
  opacity: 1;
}

.mdp-toggle__dev {
  color: var(--warn-fg);
  font-weight: 700;
}

.mdp {
  position: fixed;
  right: 16px;
  bottom: 96px;
  z-index: 60;
  width: min(760px, calc(100vw - 32px));
  max-height: min(70vh, 640px);
  display: flex;
  flex-direction: column;
  border: 1px dashed var(--warn-fg);
  border-radius: var(--radius-inner);
  background: var(--panel);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
}

.mdp__bar {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-3);
  border-bottom: 1px solid var(--line);
}

.mdp__title {
  font-size: 12px;
  color: var(--text-2);
}

.mdp__flag {
  flex: 1;
  font-size: 11px;
  color: var(--warn-fg);
}

.mdp__tabs {
  display: flex;
  gap: 2px;
}

.mdp__tab {
  padding: 3px 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  background: var(--soft);
  color: var(--muted);
  font-size: 11px;
  cursor: pointer;
}

.mdp__tab--on {
  background: var(--text);
  border-color: var(--text);
  color: var(--panel);
}

.mdp__select {
  font-size: 12px;
  padding: 2px 6px;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--soft);
  color: var(--text-2);
}

.mdp__controls {
  padding: var(--s-2) var(--s-3) 0;
}

.mdp__stop {
  padding: 3px 10px;
  border: 1px solid var(--bad-fg);
  border-radius: var(--radius-pill);
  background: var(--panel);
  color: var(--bad-fg);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.mdp__stop:disabled {
  opacity: 0.5;
  cursor: default;
}

.mdp__close {
  border: 0;
  background: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 12px;
}

.mdp__input {
  margin: var(--s-2) var(--s-3) 0;
  min-height: 96px;
  resize: vertical;
  font-size: 12px;
  padding: var(--s-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--soft);
  color: var(--text);
}

.mdp__body {
  overflow-y: auto;
  padding: var(--s-3) var(--s-4);
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-2);
}

.mdp__section {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  margin: var(--s-2) 0 var(--s-1);
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
}

.mdp__section:first-child {
  margin-top: 0;
}

.mdp__refresh {
  padding: 1px 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  background: var(--soft);
  color: var(--muted);
  font-size: 11px;
  cursor: pointer;
}

.mdp__refresh:disabled {
  opacity: 0.4;
  cursor: default;
}

.mdp__pager {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  margin-top: var(--s-2);
  font-size: 11px;
}

.mdp__grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.mdp__grid td {
  padding: 3px 8px 3px 0;
  border-bottom: 1px solid var(--line-soft);
  vertical-align: top;
  white-space: nowrap;
}

/* 줄바꿈은 명시한 칸에서만 — 한국어는 글자 단위로 끊기므로 좁은 칸에서
   normal이면 "미/기/록"처럼 세로로 쌓인다. */
.mdp__grid td.mdp__wrap {
  white-space: normal;
}

.mdp__dim {
  color: var(--muted-soft);
}

.mdp__json {
  padding: 1px 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  color: var(--accent);
  font-size: 11px;
  text-decoration: none;
}

.mdp__json:hover {
  border-color: var(--accent);
}

.mdp__body :deep(h3),
.mdp__body :deep(h4),
.mdp__body :deep(h5),
.mdp__body :deep(h6) {
  margin: var(--s-3) 0 var(--s-1);
  color: var(--text);
}

.mdp__body :deep(p) {
  margin: var(--s-1) 0;
}

.mdp__body :deep(ul),
.mdp__body :deep(ol) {
  margin: var(--s-1) 0;
  padding-left: 20px;
}

.mdp__body :deep(code) {
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--soft-alt);
  font-family: 'D2Coding', Consolas, monospace;
  font-size: 12px;
}

.mdp__body :deep(pre) {
  margin: var(--s-2) 0;
  padding: var(--s-3);
  border-radius: var(--radius-control);
  background: #0f172a;
  color: #e2e8f0;
  overflow-x: auto;
  white-space: pre;
}

.mdp__body :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

.mdp__body :deep(blockquote) {
  margin: var(--s-2) 0;
  padding: var(--s-1) var(--s-3);
  border-left: 3px solid var(--line-strong);
  color: var(--muted);
}

.mdp__body :deep(.md-table) {
  white-space: pre;
  overflow-x: auto;
  font-size: 12px;
}
</style>
