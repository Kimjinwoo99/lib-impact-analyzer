<script setup>
import { computed } from 'vue';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const parse = computed(() => state.parseResult);
const classified = computed(() => props.analysis.classificationItems.value.length);
const l4Summary = computed(() => state.l4Execution?.result?.summary ?? null);

const isHealthcheck = computed(() => parse.value?.mode === 'CURRENT_VERSION_HEALTHCHECK');
const patchesAhead = computed(() => parse.value?.patchesAhead ?? 0);

const rangePill = computed(() => {
  const current = parse.value?.currentVersion;
  const target = parse.value?.targetVersion;
  if (target) return `현재 ${current} → 목표 ${target}`;
  const latest = parse.value?.latestPatchInLine;
  return latest ? `${current} 헬스체크 · ${latest}까지 확인` : `${current} 헬스체크`;
});

/*
 * The same changelog entry means opposite things in the two modes.
 * Upgrade: a fix in a later release is something you will gain.
 * Healthcheck: a fix released after your version is a defect you still carry.
 */
const headline = computed(() => {
  const count = (parse.value?.changeItemCount ?? 0).toLocaleString();
  if (!isHealthcheck.value) return `릴리즈 문서에서 ${count}개의 변경항목을 구조화했습니다.`;
  if (!patchesAhead.value) {
    return `${parse.value?.currentVersion}는 ${parse.value?.range?.minorLine} 라인의 최신 패치입니다.`;
  }
  return `${parse.value?.currentVersion} 이후 패치 ${patchesAhead.value}개에서 ${count}개의 수정이 나왔습니다.`;
});

const detail = computed(() => {
  if (!isHealthcheck.value) {
    return 'Parsed Items와 Classification Items 탭에서 항목별로 확인하세요.';
  }
  if (!patchesAhead.value) {
    return '같은 minor 라인에 더 나온 패치가 없습니다.';
  }
  return (
    '이 항목들은 현재 버전에서 아직 해결되지 않은 결함입니다. ' +
    `${parse.value?.latestPatchInLine}로 패치하면 해소되는 범위입니다.`
  );
});

const stats = computed(() => [
  {
    label: '릴리즈 수',
    value: parse.value?.releaseCount ?? 0,
    hint: isHealthcheck.value ? '현재 버전 + 이후 패치' : '현재·타겟·중간 버전 포함',
  },
  {
    label: 'Parsed Items',
    value: parse.value?.changeItemCount ?? 0,
    hint: isHealthcheck.value ? '현재 버전에 미적용된 수정' : '파서가 구조화한 원문 항목',
  },
  {
    label: 'Classification Items',
    value: classified.value,
    hint: 'Agent 1차 분류 결과',
  },
]);

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
</script>

<template>
  <div class="summary">
    <div class="summary__hero">
      <div>
        <p class="summary__headline">{{ headline }}</p>
        <p class="summary__detail">{{ detail }}</p>
      </div>
      <span class="pill" :class="{ 'pill--warn': isHealthcheck && patchesAhead }">{{ rangePill }}</span>
    </div>

    <div class="summary__stats">
      <div v-for="stat in stats" :key="stat.label" class="stat">
        <p class="stat__label">{{ stat.label }}</p>
        <p class="stat__value">{{ stat.value.toLocaleString() }}<span>개</span></p>
        <p class="stat__hint">{{ stat.hint }}</p>
      </div>
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

  </div>
</template>

<style scoped>
.summary {
  margin-top: var(--s-5);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.summary__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-5);
  padding: var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft-alt);
}

.summary__headline {
  margin: 0;
  font-size: var(--t-section);
  font-weight: 700;
  color: var(--text);
}

.summary__detail {
  margin: var(--s-2) 0 0;
  font-size: var(--t-small);
  color: var(--muted);
}

.summary__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-3);
}

.stat {
  padding: var(--s-4) var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft-stat);
}

.stat__label {
  margin: 0;
  font-size: var(--t-small);
  font-weight: 600;
  color: var(--muted);
}

.stat__value {
  margin: var(--s-2) 0 0;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.stat__value span {
  margin-left: 2px;
  font-size: var(--t-body);
  font-weight: 600;
  color: var(--muted);
}

.stat__hint {
  margin: var(--s-2) 0 0;
  font-size: var(--t-small);
  color: var(--muted-soft);
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
  .summary__stats {
    grid-template-columns: 1fr;
  }
  .summary__hero {
    flex-direction: column;
  }
}
</style>
