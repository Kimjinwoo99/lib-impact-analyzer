<script setup>
defineProps({
  title: { type: String, required: true },
  body: { type: String, default: '' },
  tone: { type: String, default: 'muted' }, // muted | warn
});
</script>

<template>
  <div class="empty" :class="`empty--${tone}`">
    <span class="empty__mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" />
        <path d="M12 7.5v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        <circle cx="12" cy="16" r="1.1" fill="currentColor" />
      </svg>
    </span>
    <p class="empty__title">{{ title }}</p>
    <p v-if="body" class="empty__body">{{ body }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-8) var(--s-6);
  text-align: center;
}

.empty__mark {
  width: 34px;
  height: 34px;
  color: var(--line-strong);
}

.empty--warn .empty__mark {
  color: var(--warn-fg);
  opacity: 0.7;
}

.empty__mark svg {
  width: 100%;
  height: 100%;
}

.empty__title {
  margin: var(--s-1) 0 0;
  font-size: var(--t-body);
  font-weight: 600;
  color: var(--text-2);
}

.empty__body {
  margin: 0;
  max-width: 46ch;
  font-size: var(--t-small);
  color: var(--muted);
  line-height: 1.65;
}
</style>
