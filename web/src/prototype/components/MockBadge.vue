<script setup>
/**
 * Marks a value the backend cannot produce yet.
 *
 * The badge is the only on-screen signal: the long-form explanation belongs in
 * README, not in the dashboard. `reason` is a tooltip, so keep it to one line.
 */
defineProps({
  reason: { type: String, required: true },
  label: { type: String, default: '구현 예정' },
});
</script>

<template>
  <span class="mock" :title="reason">
    <svg class="mock__icon" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M6 1.4L11 10.2H1z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
      <path d="M6 5v2.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
      <circle cx="6" cy="8.8" r="0.7" fill="currentColor" />
    </svg>
    {{ label }}
  </span>
</template>

<style scoped>
.mock {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 8px;
  border: 1px dashed currentColor;
  border-radius: var(--radius-pill);
  background: var(--warn-bg);
  color: var(--warn-fg);
  font-size: var(--t-micro);
  font-weight: 700;
  white-space: nowrap;
  cursor: help;
  vertical-align: middle;
}

.mock__icon {
  width: 11px;
  height: 11px;
  flex: none;
}
</style>
