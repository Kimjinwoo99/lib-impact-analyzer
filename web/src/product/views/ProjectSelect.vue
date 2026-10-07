<script setup>
import { computed } from 'vue';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

/*
 * 첫 화면은 "이 도구가 무엇을 하는가"를 스스로 설명해야 한다. 실행 전에 만들 수
 * 있는 실측 값이 없으므로, 이 카드는 값이 아니라 절차를 보여준다 — 각 단계의
 * 문구는 진행 화면 스텝퍼(AnalysisRunning)와 같은 어휘를 쓴다.
 */
const PIPELINE_STAGES = [
  {
    name: '수집',
    detail: '공식 릴리즈 노트에서 두 버전 사이의 변경사항을 가져옵니다',
  },
  {
    name: '분류',
    detail: 'Agent가 변경 항목별 영향 범주와 검사 단서를 판별합니다',
  },
  {
    name: '사용처 대조',
    detail: '프로젝트 소스를 스캔해 실제 사용 위치와 결정론적으로 대조합니다',
  },
  {
    name: '판정',
    detail: '근거가 확인된 항목만 대응·테스트 작업으로 정리합니다',
  },
];

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
    <div class="card-head">
      <div>
        <h2 class="section-title">분석 파이프라인</h2>
        <p class="card-sub">영향 분석 시작을 누르면 아래 단계가 순서대로 실행됩니다.</p>
      </div>
    </div>

    <ol class="pipeline">
      <li v-for="(stage, index) in PIPELINE_STAGES" :key="stage.name" class="pipeline__stage">
        <div class="pipeline__head">
          <span class="pipeline__num">{{ index + 1 }}</span>
          <h3 class="pipeline__name">{{ stage.name }}</h3>
        </div>
        <p class="pipeline__detail">{{ stage.detail }}</p>
      </li>
    </ol>
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

.pipeline {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  /* 화살표가 이 틈에 앉는다 — 글자 크기에 비례해야 카드 테두리에 안 겹친다. */
  gap: calc(var(--t-body) * 1.6);
  margin: var(--s-5) 0 0;
  padding: 0;
  list-style: none;
}

.pipeline__stage {
  position: relative;
  padding: var(--s-4) var(--s-4) var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft);
}

/* 단계 사이의 흐름 표시 — 카드 사이 틈의 세로 중앙. 마지막 단계 뒤에는 없다. */
.pipeline__stage:not(:last-child)::after {
  content: '→';
  position: absolute;
  top: 50%;
  right: calc(-1 * var(--t-body) * 0.8);
  transform: translate(50%, -50%);
  color: var(--muted-soft);
  /* 웹폰트의 화살표 글리프가 얇고 비뚤게 렌더된다 — 기호는 시스템 폰트로. */
  font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
  font-size: calc(var(--t-body) * 1.15);
  font-weight: 700;
  line-height: 1;
}

.pipeline__head {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.pipeline__num {
  display: grid;
  place-items: center;
  /* 글자에 비례 — 시연 스케일에서 번호 원만 작게 남지 않게. */
  width: 1.9em;
  height: 1.9em;
  flex: none;
  border-radius: 50%;
  background: var(--panel);
  border: 1px solid var(--line-strong);
  font-size: var(--t-small);
  font-weight: 700;
  color: var(--muted);
}

.pipeline__name {
  margin: 0;
  font-size: var(--t-body);
  font-weight: 700;
  color: var(--text);
}

.pipeline__detail {
  margin: var(--s-3) 0 0;
  font-size: var(--t-small);
  line-height: 1.6;
  color: var(--muted);
}

@media (max-width: 900px) {
  .path__row {
    grid-template-columns: 1fr;
  }
  .pipeline {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .pipeline__stage:not(:last-child)::after {
    content: none;
  }
}
</style>
