<script setup>
import { computed } from 'vue';
import EmptyState from '../components/EmptyState.vue';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const lastAnalyzedLabel = computed(() => {
  const at = state.lastAnalyzedAt;
  if (!at) return '없음';
  const pad = (n) => String(n).padStart(2, '0');
  return `${at.getFullYear()}.${pad(at.getMonth() + 1)}.${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`;
});

const canRun = computed(() => Boolean(state.projectPath.trim()) && !state.busy);
</script>

<template>
  <section class="card">
    <div class="card-head">
      <div>
        <h2 class="card-title">프로젝트 분석</h2>
        <p class="card-sub">분석할 프로젝트 경로를 확인한 뒤 실행하세요</p>
      </div>
      <p class="recent">최근 분석 <strong>{{ lastAnalyzedLabel }}</strong></p>
    </div>

    <div class="path">
      <label class="label" for="project-path">프로젝트 경로</label>
      <div class="path__row">
        <input
          id="project-path"
          v-model="state.projectPath"
          class="field mono"
          type="text"
          spellcheck="false"
          autocomplete="off"
          placeholder="예: C:\Users\me\projects\my-frontend-app"
          @keyup.enter="analysis.analyzeDependencies()"
        />
        <button type="button" class="btn" @click="analysis.pickDirectory()">폴더 선택</button>
        <button
          type="button"
          class="btn btn--primary"
          :disabled="!canRun"
          @click="analysis.analyzeDependencies()"
        >
          영향 분석 시작
        </button>
      </div>
      <p class="hint">절대 경로를 입력하세요.</p>
    </div>
  </section>

  <section class="card">
    <h2 class="section-title">분석 준비</h2>
    <p class="card-sub">프로젝트 분석이 완료되면 확인된 라이브러리 목록이 이 영역에 표시됩니다.</p>

    <div class="ready">
      <EmptyState
        title="분석할 프로젝트를 선택하세요"
        body="package.json과 lockfile을 읽어 직접 의존성과 실제 설치 버전을 확인합니다."
      />

      <ol class="ready__steps">
        <li><span>1</span> 의존성과 현재 버전 확인</li>
        <li><span>2</span> 분석할 라이브러리와 목표 버전 선택</li>
        <li><span>3</span> 공식 변경사항 수집 · 분류</li>
        <li><span>4</span> 프로젝트 소스에서 사용 위치 탐색</li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.recent {
  margin: 0;
  font-size: var(--t-small);
  color: var(--muted);
  white-space: nowrap;
}

.recent strong {
  color: var(--text-2);
  font-weight: 600;
}

.path {
  margin-top: var(--s-5);
}

.path__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: var(--s-2);
}

.path__row .field {
  font-size: var(--t-small);
}

.ready {
  margin-top: var(--s-4);
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-inner);
  background: var(--soft);
}

.ready__steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--s-3);
  margin: 0;
  padding: var(--s-5);
  border-top: 1px dashed var(--line);
  list-style: none;
}

.ready__steps li {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  font-size: var(--t-small);
  color: var(--muted);
}

.ready__steps span {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  flex: none;
  border-radius: 50%;
  background: var(--panel);
  border: 1px solid var(--line);
  font-size: var(--t-micro);
  font-weight: 700;
  color: var(--muted-soft);
}

@media (max-width: 900px) {
  .path__row {
    grid-template-columns: 1fr;
  }
  .ready__steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
