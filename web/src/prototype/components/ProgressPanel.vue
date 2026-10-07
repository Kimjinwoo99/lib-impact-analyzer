<script setup>
defineProps({
  percent: { type: Number, required: true },
  message: { type: String, default: '' },
  tone: { type: String, default: 'muted' },
  active: { type: Boolean, default: false },
});
</script>

<template>
  <section class="progress" :class="{ 'progress--active': active }">
    <!--
      The bar tracks the wizard step. The number is intentionally not printed:
      it would read as "how much analysis is done", which it is not.
      aria-valuenow keeps the value available to assistive tech.
    -->
    <div
      class="progress__track"
      role="progressbar"
      aria-label="분석 단계 진행률"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="progress__fill" :class="{ 'progress__fill--active': active }" :style="{ width: `${percent}%` }" />
    </div>

    <div class="progress__row">
      <p class="progress__message" :class="`progress__message--${tone}`" aria-live="polite">
        <span v-if="active" class="progress__spinner" aria-hidden="true" />
        {{ message }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.progress {
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-inner);
  background: var(--panel);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.progress__track {
  position: relative;
  height: 5px;
  background: var(--track);
}

.progress__fill {
  height: 100%;
  background: var(--brand);
  transition: width 0.45s var(--ease);
}

/* Moving stripe while a run is in flight, so a long step never reads as frozen. */
.progress__fill--active {
  background-image: linear-gradient(
    115deg,
    rgba(255, 255, 255, 0) 25%,
    rgba(255, 255, 255, 0.38) 50%,
    rgba(255, 255, 255, 0) 75%
  );
  background-size: 220px 100%;
  background-repeat: repeat-x;
  animation: progress-stripe 1.4s linear infinite;
}

@keyframes progress-stripe {
  to {
    background-position: 220px 0;
  }
}

.progress__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-3) var(--s-5);
}

.progress__message {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  margin: 0;
  min-width: 0;
  font-size: var(--t-small);
  color: var(--muted);
}

.progress__message--ok {
  color: var(--ok-fg);
}
.progress__message--warn {
  color: var(--warn-fg);
}
.progress__message--bad {
  color: var(--bad-fg);
}

.progress__spinner {
  width: 12px;
  height: 12px;
  flex: none;
  border-radius: 50%;
  border: 2px solid var(--accent-bg);
  border-top-color: var(--accent);
  animation: progress-spin 0.7s linear infinite;
}

@keyframes progress-spin {
  to {
    transform: rotate(360deg);
  }
}

</style>
