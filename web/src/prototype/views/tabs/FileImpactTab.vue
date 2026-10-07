<script setup>
import { computed } from 'vue';
import EmptyState from '../../components/EmptyState.vue';
import MockBadge from '../../components/MockBadge.vue';

const props = defineProps({ analysis: { type: Object, required: true } });

const file = props.analysis.selectedFile;
const item = props.analysis.selectedItem;
const judgment = props.analysis.impactJudgment;

const STATUS_TONE = {
  AFFECTED: 'bad',
  REVIEW_REQUIRED: 'warn',
  LIKELY_NOT_AFFECTED: 'ok',
  NOT_APPLICABLE: 'idle',
  UNKNOWN: 'idle',
};

// Step 5 returns one line per match, not a window of surrounding source, so
// the code panel shows exactly the matched lines and nothing invented.
const matchLines = computed(() => {
  const matches = file.value?.matches ?? [];
  return [...matches].sort((a, b) => a.line - b.line).slice(0, 12);
});

const hiddenMatches = computed(() =>
  Math.max(0, (file.value?.matches?.length ?? 0) - matchLines.value.length),
);

const headline = computed(() => {
  if (!item.value) return '';
  const scope = item.value.scope || item.value.agentCategory;
  return `변경항목: ${scope} · ${item.value.summary}`;
});
</script>

<template>
  <div v-if="file" class="impact">
    <div class="impact__grid">
      <section class="panel">
        <div class="panel__head">
          <h3 class="section-title">영향 받는 코드 위치</h3>
          <span class="panel__meta">{{ file.matches?.length ?? 0 }}건 증거</span>
        </div>
        <p class="impact__meta truncate" :title="headline">{{ headline }}</p>

        <div class="code">
          <div v-for="match in matchLines" :key="`${match.line}-${match.term}`" class="code__line">
            <span class="code__no">{{ match.line }}</span>
            <code class="code__src">{{ match.snippet }}</code>
            <span class="code__tag">{{ match.term }}</span>
          </div>
          <p v-if="!matchLines.length" class="code__none">이 파일에서 라인 단위 증거가 없습니다.</p>
        </div>
        <p v-if="hiddenMatches" class="hint">
          동일 파일의 나머지 {{ hiddenMatches }}건은 생략했습니다.
        </p>

        <h3 class="section-title impact__gap">영향 분석 결과</h3>
        <div class="callout" :class="`callout--${STATUS_TONE[judgment?.status] ?? 'warn'}`">
          <div>
            <p class="verdict">
              <span class="verdict__status">{{ judgment?.status }}</span>
              <MockBadge reason="영향 판단 기능은 구현 예정입니다." />
            </p>
            <p class="verdict__line">{{ judgment?.headline }}</p>
            <p class="verdict__line">{{ judgment?.detail }}</p>
          </div>
        </div>
      </section>

      <aside class="impact__side">
        <div class="panel">
          <div class="panel__head">
            <h3 class="section-title">대응 권장안</h3>
            <MockBadge reason="대응 권장안은 구현 예정입니다." />
          </div>
          <ol class="ordered">
            <li v-for="line in judgment?.recommendations ?? []" :key="line">{{ line }}</li>
          </ol>
        </div>

        <div class="panel panel--accent">
          <div class="panel__head">
            <h3 class="section-title panel__title-accent">테스트 방법</h3>
            <MockBadge reason="테스트 방법은 구현 예정입니다." />
          </div>
          <ul class="bullets">
            <li v-for="line in judgment?.testSteps ?? []" :key="line">{{ line }}</li>
          </ul>
        </div>
      </aside>
    </div>
  </div>

  <EmptyState
    v-else
    title="선택된 파일이 없습니다"
    body="영향 파일 탭에서 파일을 선택하면 영향 상세가 표시됩니다."
  />
</template>

<style scoped>
.impact {
  margin-top: var(--s-5);
}

.impact__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: var(--s-4);
  align-items: start;
}

.panel {
  padding: var(--s-5);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft-alt);
  min-width: 0;
}

/*
 * Emphasis without a tint. This panel is a card inside a card inside a card;
 * a coloured fill at that depth reads as clutter, so the weight comes from the
 * heading and a single edge instead.
 */
.panel--accent {
  border-color: var(--line);
  background: var(--soft-alt);
  border-left: 3px solid var(--brand);
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-2);
  margin-bottom: var(--s-2);
  flex-wrap: wrap;
}

.panel__title-accent {
  color: var(--accent);
}

.panel__meta {
  font-size: var(--t-small);
  color: var(--muted);
}

.impact__meta {
  margin: 0;
  font-size: var(--t-small);
  color: var(--muted);
}

.impact__gap {
  margin-top: var(--s-6);
}

.code {
  margin-top: var(--s-3);
  padding: var(--s-3) 0;
  border-radius: var(--radius-control);
  background: #0f172a;
  overflow-x: auto;
}

.code__line {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: var(--s-3);
  align-items: center;
  padding: 3px var(--s-4);
  transition: background var(--fast);
}

.code__line:hover {
  background: rgba(255, 255, 255, 0.05);
}

.code__no {
  color: #64748b;
  font-family: 'D2Coding', Consolas, monospace;
  font-size: var(--t-small);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.code__src {
  color: #e2e8f0;
  font-size: var(--t-small);
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
}

.code__tag {
  padding: 1px 8px;
  border-radius: var(--radius-pill);
  background: rgba(196, 42, 52, 0.9);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.code__none {
  margin: 0;
  padding: var(--s-2) var(--s-4);
  color: #94a3b8;
  font-size: var(--t-small);
}

.verdict {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  margin: 0;
  flex-wrap: wrap;
}

.verdict__status {
  font-size: var(--t-body);
  font-weight: 700;
  letter-spacing: 0.02em;
}

.verdict__line {
  margin: var(--s-2) 0 0;
  font-size: var(--t-small);
  color: var(--text-2);
  line-height: 1.7;
}

.impact__side {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.ordered,
.bullets {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  font-size: var(--t-small);
  color: var(--text-2);
  line-height: 1.6;
}

@media (max-width: 1180px) {
  .impact__grid {
    grid-template-columns: 1fr;
  }
}
</style>
