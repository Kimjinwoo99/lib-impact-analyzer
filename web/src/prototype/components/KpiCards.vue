<script setup>
/**
 * The four metric tiles under the header. Every screen from 02 onward shows
 * them; only the label/value pairs change.
 */
defineProps({
  cards: { type: Array, required: true },
});

const TONES = ['accent', 'ok', 'bad', 'warn'];
</script>

<template>
  <div class="kpi-row">
    <div
      v-for="(card, index) in cards"
      :key="card.label"
      class="kpi"
      :class="`kpi--${card.tone ?? TONES[index % TONES.length]}`"
    >
      <p class="kpi__label">{{ card.label }}</p>
      <p class="kpi__value" :title="String(card.value)">{{ card.value }}</p>
      <p v-if="card.hint" class="kpi__hint">{{ card.hint }}</p>
    </div>
  </div>
</template>

<style scoped>
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--s-3);
}

.kpi {
  position: relative;
  padding: var(--s-4) var(--s-5);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-inner);
  background: var(--panel);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

/* Tone reads as an edge accent rather than a floating dot. */
.kpi::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
}

/*
 * Bright --brand rather than --accent: the accent tile sits next to the ok
 * tile, and at 3px a dark lime and a dark teal are the same stripe. Lightness
 * separates them where hue cannot.
 */
.kpi--accent::before {
  background: var(--brand);
}
.kpi--ok::before {
  background: var(--ok-fg);
}
.kpi--bad::before {
  background: var(--bad-fg);
}
.kpi--warn::before {
  background: var(--warn-fg);
}

.kpi__label {
  margin: 0;
  font-size: var(--t-small);
  font-weight: 600;
  color: var(--muted);
}

.kpi__value {
  margin: var(--s-1) 0 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi__hint {
  margin: var(--s-1) 0 0;
  font-size: var(--t-micro);
  color: var(--muted-soft);
}

@media (max-width: 1000px) {
  .kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
