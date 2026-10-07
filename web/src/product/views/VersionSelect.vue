<script setup>
import { computed } from 'vue';
import AgentDataNotice from '../components/AgentDataNotice.vue';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

/*
 * 이 버튼 하나가 Agent를 두 번 호출한다(분류 → 판정). 전송 범위가 서로
 * 다르므로 항목도 단계를 밝혀 나눠 적는다 — 실제 전송 내용은
 * analysis.js의 runL4Job / runImpactJudgment payload가 정본이다.
 *
 * 분류 단계에 프로젝트 소스가 들어가지 않는 근거: runL4Job이 projectPath를
 * 함께 보내지만 그것은 서버가 우선순위를 계산하는 데만 쓰이고 Agent
 * 프롬프트에는 실리지 않는다(l4-prompt.js의 사전 스캔은 selection-only).
 */
const analysisNoticeItems = [
  '[공통] 분석 대상 패키지 이름과 버전(현재 버전 · 목표 버전)',
  '[1단계 분류] 공개된 릴리즈 노트와 변경 이력 본문 — 패키지 배포처가 공개한 문서입니다. 이 단계에서는 프로젝트 소스 코드가 전송되지 않습니다.',
  '[2단계 판정] 변경 사항과 관련된 프로젝트 파일의 경로 · 줄 번호와 해당 줄 한 줄 발췌(변경 사항당 최대 4개 파일)',
  '[2단계 판정] package.json에 선언된 실행 환경 요구 사항과 의존성 조건',
  '[2단계 판정] 함께 설치된 관련 패키지의 이름과 버전',
  '[2단계 판정] 마이그레이션 가이드 중 이 프로젝트가 사용하는 항목의 발췌 — 패키지 배포처가 공개한 문서입니다.',
];

const dependency = computed(() => state.selectedDependency);
const options = computed(() => props.analysis.targetVersionOptions());

const lockSource = computed(() => {
  const source = dependency.value?.resolutionSource ?? '';
  if (source.includes('yarn')) return 'yarn.lock';
  if (source.includes('package-lock')) return 'package-lock.json';
  return source || 'lockfile';
});

// From the npm registry, so it is the real latest — not the newest version
// that happens to sit in a collected data file.
const registryLatest = computed(() => state.collectSource?.latest ?? '—');

const adapterRequired = computed(() => Boolean(state.collectSource?.adapterRequired));

// Which repository the chain will read, or the fact that there is none. HOW
// it reads (which tier served which version) is a collection result, and the
// 수집 tab reports it after the run — not a choice to make here.
const collectPath = computed(() => {
  if (!state.collectSource) return '확인 중';
  return adapterRequired.value ? '없음 — 어댑터 필요' : state.collectSource.repository;
});

// Healthcheck reads forward through the rest of the current minor line, so the
// option label has to name that range rather than just the installed version.
const jump = computed(() => {
  const current = dependency.value?.resolvedVersion;
  if (!current || !state.targetVersion) return null;
  const major = (v) => Number(String(v).split('.')[0]) || 0;
  return major(state.targetVersion) > major(current) ? 'MAJOR' : 'MINOR';
});
</script>

<template>
  <section class="card">
    <div class="card-head">
      <div>
        <h2 class="card-title">{{ dependency?.name }} 분석 설정</h2>
        <p class="card-sub">현재 버전과 목표 버전을 확인한 뒤 다음 단계로 진행하세요.</p>
      </div>
      <button type="button" class="btn btn--ghost btn--sm" @click="analysis.backToLibrary()">
        ← 라이브러리 목록
      </button>
    </div>

    <dl class="meta">
      <div><dt>패키지</dt><dd class="mono">{{ dependency?.name }}</dd></div>
      <div><dt>설치 버전</dt><dd class="mono">{{ dependency?.resolvedVersion ?? '—' }}</dd></div>
      <div><dt>최신 버전</dt><dd class="mono">{{ registryLatest }}</dd></div>
      <div><dt>수집 경로</dt><dd class="mono">{{ collectPath }}</dd></div>
    </dl>

    <div class="pick">
      <div class="pick__side">
        <span class="eyebrow">현재</span>
        <p class="pick__version">{{ dependency?.resolvedVersion ?? '—' }}</p>
      </div>

      <div class="pick__arrow" aria-hidden="true">→</div>

      <div class="pick__side pick__side--target">
        <label class="eyebrow" for="target-version">목표</label>
        <select id="target-version" v-model="state.targetVersion" class="field pick__select">
          <!-- 목표는 권장 버전으로 자동 설정되어 도착한다(2026-08-22) — 빈 값은
               계산이 끝나기 전의 순간뿐이라 선택지가 아니다. -->
          <option value="" disabled hidden>권장 버전 계산 중…</option>
          <option v-for="version in options" :key="version" :value="version">{{ version }}</option>
        </select>
      </div>

      <span v-if="jump === 'MAJOR'" class="pill pill--bad">메이저 업데이트</span>
      <span v-else-if="jump === 'MINOR'" class="pill pill--warn">마이너 업데이트</span>

    </div>

    <!-- 목표가 어떻게 정해졌는지 — 계산 중에는 로딩, 권장값 그대로면 사유,
         사람이 바꿨으면 아무 말 없음(직접 선택은 설명이 필요 없다). -->
    <p v-if="!state.targetVersion" class="pick__reco pick__reco--loading">
      <span class="pick__spinner" aria-hidden="true"></span>
      권장 목표 버전을 계산하는 중입니다 — 최신 버전부터 취약점·지원 종료 여부를 확인합니다.
    </p>
    <p v-else-if="state.targetRecommendation && state.targetVersion === state.targetRecommendation.version" class="pick__reco">
      권장 버전으로 자동 설정되었습니다 — {{ state.targetRecommendation.reason }}.
    </p>

    <p v-if="adapterRequired" class="hint hint--warn">
      GitHub 저장소를 찾지 못했습니다. atom · REST · CHANGELOG 세 경로가 모두 없어
      이 패키지는 수집할 수 없습니다. 개별 어댑터가 필요합니다 — 미구현입니다.
    </p>

      <p class="hint">
        설치 버전 출처는 {{ lockSource }}입니다.
      </p>

      <p class="hint">
        현재 버전부터 {{ state.targetVersion }}까지의 중간 릴리즈를 모두 포함해 수집합니다.
      </p>

      <AgentDataNotice
        action="다음 단계 실행"
        :items="analysisNoticeItems"
        usage-equivalent="$1~4"
        class="agentnotice"
      />

    <div class="actions">
      <button type="button" class="btn" @click="analysis.backToLibrary()">이전</button>

      <div class="actions__run">
        <button
          type="button"
          class="btn btn--primary btn--lg"
          :disabled="state.busy || adapterRequired || !state.targetVersion"
          @click="analysis.runAnalysis()"
        >
          다음 단계 실행
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hint--warn {
  color: var(--warn-fg);
}

.meta {
  display: grid;
  /* 항목 수와 같아야 한다 — 선언 버전을 뺀 뒤 4개다(2026-08-20). */
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  margin: var(--s-5) 0 0;
  padding: var(--s-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft);
}

.meta > div {
  padding: 0 var(--s-4);
  border-left: 1px solid var(--line);
  min-width: 0;
}

.meta > div:first-child {
  border-left: 0;
  padding-left: 0;
}

.meta dt {
  font-size: var(--t-small);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted-soft);
}

.meta dd {
  margin: var(--s-1) 0 0;
  font-size: var(--t-section);
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
}

.pick__reco {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  margin: var(--s-3) 0 0;
  font-size: var(--t-body);
  color: var(--text-2);
}

.pick__spinner {
  width: 14px;
  height: 14px;
  flex: none;
  border: 2px solid var(--line-strong);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: pick-spin 0.8s linear infinite;
}

@keyframes pick-spin {
  to { transform: rotate(360deg); }
}

.pick {
  display: flex;
  align-items: flex-end;
  gap: var(--s-4);
  margin-top: var(--s-6);
  padding: var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--panel);
}

.pick__side {
  min-width: 0;
}

.pick__side--target {
  flex: 1;
  max-width: 420px;
}

.pick__version {
  margin: var(--s-2) 0 0;
  font-family: 'D2Coding', Consolas, monospace;
  font-size: var(--t-version);
  font-weight: 700;
  color: var(--text);
  line-height: 42px;
}

.pick__select {
  margin-top: var(--s-2);
}

.pick__arrow {
  font-size: var(--t-version-arrow);
  color: var(--line-strong);
  line-height: 42px;
}

.pick .pill {
  margin-bottom: 10px;
}

/*
 * 툴팁 앵커가 필을 감쌀 때: 아래 여백을 필이 아니라 앵커가 갖는다. 필에 두면
 * 필만 위로 밀려 옆의 ⓘ 표시가 아래로 내려가 보인다(실측).
 */
.pick__term {
  align-self: flex-end;
  margin-bottom: 10px;
}

.pick__term .pill {
  margin-bottom: 0;
}

.agentnotice {
  margin-top: var(--s-5);
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  margin-top: var(--s-6);
  padding-top: var(--s-5);
  border-top: 1px solid var(--line-soft);
}

.actions__run {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.actions__hint {
  margin: 0;
  font-size: var(--t-small);
  color: var(--muted);
}

@media (max-width: 1100px) {
  .meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--s-3);
  }
  .meta > div {
    border-left: 0;
    padding: 0;
  }
  .actions,
  .actions__run {
    flex-direction: column;
    align-items: stretch;
  }
  .pick {
    flex-wrap: wrap;
  }
}
</style>
