<script setup>
import { computed } from 'vue';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const dependency = computed(() => state.selectedDependency);
const options = computed(() => props.analysis.targetVersionOptions());

const lockSource = computed(() => {
  const source = dependency.value?.resolutionSource ?? '';
  if (source.includes('yarn')) return 'yarn.lock';
  if (source.includes('package-lock')) return 'package-lock.json';
  return source || 'lockfile';
});

const latestKnown = computed(() => options.value[options.value.length - 1] ?? '—');
const isHealthcheck = computed(() => !state.targetVersion);

// Healthcheck reads forward through the rest of the current minor line, so the
// option label has to name that range rather than just the installed version.
const patchLine = computed(() => {
  const current = dependency.value?.resolvedVersion;
  if (!current) return null;
  const [major, minor] = String(current).split('.');
  const ahead = options.value.filter((v) => {
    const parts = v.split('.');
    return parts[0] === major && parts[1] === minor;
  });
  return { line: `${major}.${minor}`, ahead, latest: ahead[ahead.length - 1] ?? null };
});

const patchLineLabel = computed(() => {
  const info = patchLine.value;
  if (!info) return '현재 버전 점검';
  if (!info.latest) return `${dependency.value?.resolvedVersion} · ${info.line} 라인 최신`;
  return `${info.line} 라인 ${info.latest}까지 미적용 수정 ${info.ahead.length}개 확인`;
});

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
      <div><dt>선언 버전</dt><dd class="mono">{{ dependency?.declaredRange }}</dd></div>
      <div><dt>설치 버전</dt><dd class="mono">{{ dependency?.resolvedVersion ?? '—' }}</dd></div>
      <div><dt>카탈로그 최신</dt><dd class="mono">{{ latestKnown }}</dd></div>
      <div><dt>출처</dt><dd class="mono">{{ lockSource }}</dd></div>
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
          <option value="">
            헬스체크 — {{ patchLineLabel }}
          </option>
          <option v-for="version in options" :key="version" :value="version">{{ version }}</option>
        </select>
      </div>

      <span v-if="jump === 'MAJOR'" class="pill pill--bad">메이저 업그레이드</span>
      <span v-else-if="jump === 'MINOR'" class="pill pill--warn">마이너 업그레이드</span>
      <span v-else class="pill pill--idle">헬스체크</span>
    </div>

    <p class="hint">
      <template v-if="isHealthcheck">
        {{ patchLine?.line }} 라인에서 현재 버전 이후에 나온 패치를 확인합니다.
      </template>
      <template v-else>
        현재 버전부터 {{ state.targetVersion }}까지의 중간 릴리즈를 모두 포함해 수집합니다.
      </template>
    </p>

    <div class="actions">
      <button type="button" class="btn" @click="analysis.backToLibrary()">이전</button>

      <div class="actions__run">
        <p class="actions__hint">Agent 실행에는 수 분이 걸립니다.</p>
        <button
          type="button"
          class="btn btn--dashed"
          :disabled="state.busy"
          title="Agent 분류를 건너뛰고 바로 다음 단계로 진행합니다."
          @click="analysis.runAnalysis({ useMock: true })"
        >
          Mock으로 실행
        </button>
        <button
          type="button"
          class="btn btn--primary btn--lg"
          :disabled="state.busy"
          @click="analysis.runAnalysis()"
        >
          다음 단계 실행
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.meta {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
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
  font-size: var(--t-micro);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted-soft);
}

.meta dd {
  margin: var(--s-1) 0 0;
  font-size: var(--t-body);
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
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
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  line-height: 42px;
}

.pick__select {
  margin-top: var(--s-2);
}

.pick__arrow {
  font-size: 20px;
  color: var(--line-strong);
  line-height: 42px;
}

.pick .pill {
  margin-bottom: 10px;
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
