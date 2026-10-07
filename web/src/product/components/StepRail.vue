<script setup>
import { computed } from 'vue';
import { WIZARD_STEPS } from '../state/analysis.js';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const activeIndex = computed(() =>
  Math.max(0, WIZARD_STEPS.findIndex((step) => step.view === state.view)),
);

function stateOf(index) {
  if (index < activeIndex.value) return 'done';
  if (index === activeIndex.value) return 'current';
  return 'todo';
}

/*
 * The markers dropped their numbers, so state is carried by shape and colour
 * alone — neither of which a screen reader gets. These ride along as sr-only
 * text so the rail still announces where you are.
 */
const STATE_LABEL = { done: '완료', current: '현재 단계', todo: '예정' };
</script>

<template>
  <nav class="rail" aria-label="분석 단계">
    <ol class="rail__list">
      <li v-for="(step, index) in WIZARD_STEPS" :key="step.view" class="rail__item">
        <button
          type="button"
          class="rail__step"
          :class="[`rail__step--${stateOf(index)}`, { 'rail__step--link': analysis.canVisit(step.view) }]"
          :disabled="!analysis.canVisit(step.view)"
          :aria-current="stateOf(index) === 'current' ? 'step' : undefined"
          @click="analysis.goToStep(step.view)"
        >
          <span class="rail__marker" aria-hidden="true">
            <svg v-if="stateOf(index) === 'done'" viewBox="0 0 16 16" class="rail__check">
              <path
                d="M3.5 8.4l3 3 6-6.4"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span v-else class="rail__dot" />
          </span>
          <span class="rail__label">{{ step.label }}</span>
          <span class="sr-only">{{ STATE_LABEL[stateOf(index)] }}</span>
        </button>
        <span v-if="index < WIZARD_STEPS.length - 1" class="rail__line" :class="{ 'rail__line--done': index < activeIndex }" />
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.rail {
  overflow-x: auto;
  scrollbar-width: none;
}

.rail::-webkit-scrollbar {
  display: none;
}

.rail__list {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0;
  list-style: none;
  min-width: max-content;
}

/*
 * Steps size to their own content and connectors are a fixed width, so the
 * gap between every pair is identical. Letting either one flex made the gaps
 * track label length instead ("프로젝트" vs "버전") and the rhythm broke.
 */
.rail__item {
  display: flex;
  align-items: center;
  flex: none;
}

.rail__step {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--muted-soft);
  font-size: var(--t-small);
  font-weight: 600;
  white-space: nowrap;
  transition:
    background var(--fast),
    color var(--fast),
    border-color var(--fast);
}

.rail__step:disabled {
  cursor: default;
}

.rail__step--link:hover {
  background: var(--panel);
  border-color: var(--line);
  color: var(--text);
}

/*
 * No discs and no numbers. Each state gets its own shape — a check, a filled
 * dot, an open dot — so the three read apart even before colour registers,
 * and nothing in the header carries a filled block any more.
 */
.rail__marker {
  display: grid;
  place-items: center;
  width: 14px;
  height: 14px;
  flex: none;
}

.rail__check {
  width: 13px;
  height: 13px;
}

.rail__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1.5px solid var(--line-strong);
  transition:
    width var(--fast),
    height var(--fast),
    background var(--fast),
    border-color var(--fast),
    box-shadow var(--fast);
}

.rail__step--done {
  color: var(--muted);
}

.rail__step--done .rail__marker {
  color: var(--brand-mid);
}

.rail__step--current {
  color: var(--text);
  font-weight: 700;
}

/* The one solid mark in the rail, at the logo's own green. */
.rail__step--current .rail__dot {
  width: 8px;
  height: 8px;
  border: 0;
  background: var(--brand);
  box-shadow: 0 0 0 3px rgba(126, 193, 65, 0.22);
}

.rail__line {
  flex: none;
  width: 22px;
  height: 2px;
  margin: 0 2px;
  border-radius: 1px;
  background: var(--line);
  transition: background var(--slow);
}

/* Matches the done check, not the old mint — the two sit next to each other. */
.rail__line--done {
  background: #cfe0c2;
}

/* Narrow: keep the markers and only label where you are. */
@media (max-width: 900px) {
  .rail__label {
    display: none;
  }
  .rail__step {
    padding: 0 5px;
  }
  .rail__step--current .rail__label {
    display: inline;
  }
  .rail__line {
    width: 14px;
  }
}
</style>
