<script setup>
/**
 * Marks a region the backend cannot produce yet.
 *
 * The difference from the prototype's badge is what sits behind it: there,
 * placeholder values are rendered and the badge admits they are placeholders.
 * Here the region is genuinely empty. This workspace never puts a value on
 * screen that was not measured.
 */
import InfoTooltip from './InfoTooltip.vue';

defineProps({
  reason: { type: String, required: true },
  label: { type: String, default: '미구현' },
});
</script>

<template>
  <InfoTooltip :heading="label" :body="reason" :mark="false">
    <span class="pending">
      <svg class="pending__icon" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="4.6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2.4 2" />
      </svg>
      {{ label }}
    </span>
  </InfoTooltip>
</template>

<style scoped>
.pending {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 8px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-pill);
  background: var(--idle-bg);
  color: var(--idle-fg);
  font-size: var(--t-micro);
  font-weight: 700;
  white-space: nowrap;
  cursor: help;
  vertical-align: middle;
}

.pending__icon {
  width: 11px;
  height: 11px;
  flex: none;
}
</style>
