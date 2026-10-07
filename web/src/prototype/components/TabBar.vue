<script setup>
/** Segmented control for the result card. Counts ride along as badges. */
defineProps({
  tabs: { type: Array, required: true },
  active: { type: String, required: true },
});

defineEmits(['select']);
</script>

<template>
  <div class="tabbar" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      role="tab"
      class="tabbar__tab"
      :class="{ 'tabbar__tab--active': tab.key === active }"
      :aria-selected="tab.key === active"
      :disabled="tab.disabled"
      :title="tab.disabled && tab.key !== active ? tab.disabledReason : undefined"
      @click="!tab.disabled && $emit('select', tab.key)"
    >
      {{ tab.label }}
      <span v-if="tab.count != null" class="tabbar__count">{{ tab.count }}</span>
      <span v-if="tab.flag" class="tabbar__flag" :title="tab.flag">●</span>
    </button>
  </div>
</template>

<style scoped>
.tabbar {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--soft);
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}

.tabbar::-webkit-scrollbar {
  display: none;
}

.tabbar__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 var(--s-3);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--muted);
  font-size: var(--t-small);
  font-weight: 600;
  white-space: nowrap;
  transition:
    background var(--fast),
    color var(--fast),
    box-shadow var(--fast);
}

.tabbar__tab:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Entered via 관련 파일 row click: unclickable, but visibly the active tab. */
.tabbar__tab--active:disabled {
  opacity: 1;
  cursor: default;
}

.tabbar__tab:hover:not(.tabbar__tab--active) {
  background: var(--panel);
  color: var(--text-2);
}

.tabbar__tab--active {
  background: var(--panel);
  color: var(--text);
  box-shadow: var(--shadow-card);
}

.tabbar__count {
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  background: var(--line-soft);
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.tabbar__tab--active .tabbar__count {
  background: var(--accent-bg);
  color: var(--accent-alt);
}

.tabbar__flag {
  font-size: 7px;
  color: var(--warn-fg);
}
</style>
