<script setup>
import { ref } from 'vue';

/**
 * Hover/focus tooltip. Teleported to <body> because triggers live inside
 * scroll containers (DataTable) that would clip an absolutely positioned popup.
 *
 * The Teleport lives *inside* the anchor span so this component has a single
 * root element. With a fragment root Vue cannot forward a `class` from the call
 * site and drops it silently, which is easy to miss — the tooltip still works,
 * only its layout styles vanish. Teleported content renders elsewhere, so the
 * span stays empty apart from the trigger.
 */
defineProps({
  heading: { type: String, default: '' },
  body: { type: String, required: true },
  caution: { type: String, default: '' },
  // Badges that carry their own icon (미구현, Mock) suppress the ⓘ mark —
  // one glyph per pill, same popover.
  mark: { type: Boolean, default: true },
});

const WIDTH = 300;
const open = ref(false);
const pos = ref({ top: 0, left: 0 });
const anchor = ref(null);

function show() {
  const rect = anchor.value?.getBoundingClientRect();
  if (!rect) return;
  pos.value = {
    top: rect.bottom + 8,
    left: Math.max(12, Math.min(rect.left, window.innerWidth - WIDTH - 12)),
  };
  open.value = true;
}

function hide() {
  open.value = false;
}
</script>

<template>
  <span
    ref="anchor"
    class="tip__anchor"
    tabindex="0"
    role="button"
    :aria-label="`${heading || body} 설명`"
    @mouseenter="show"
    @mouseleave="hide"
    @focus="show"
    @blur="hide"
    @keydown.esc="hide"
  >
    <slot />
    <svg v-if="mark" class="tip__mark" viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.1" />
      <path d="M6 5.2v3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
      <circle cx="6" cy="3.5" r="0.65" fill="currentColor" />
    </svg>

    <Teleport to="body">
      <div
        v-if="open"
        class="tip"
        role="tooltip"
        :style="{ top: `${pos.top}px`, left: `${pos.left}px`, width: `${WIDTH}px` }"
      >
        <p v-if="heading" class="tip__heading mono">{{ heading }}</p>
        <p class="tip__body">{{ body }}</p>
        <p v-if="caution" class="tip__caution">{{ caution }}</p>
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.tip__anchor {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: help;
  border-radius: 4px;
}

.tip__mark {
  width: 12px;
  height: 12px;
  flex: none;
  color: var(--muted-soft);
  opacity: 0.7;
  transition: opacity var(--fast);
}

.tip__anchor:hover .tip__mark,
.tip__anchor:focus-visible .tip__mark {
  opacity: 1;
  color: var(--accent);
}

.tip {
  position: fixed;
  z-index: 200;
  padding: var(--s-3) var(--s-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--panel);
  box-shadow: var(--shadow-raised);
  pointer-events: none;
}

.tip__heading {
  margin: 0 0 var(--s-1);
  font-size: var(--t-small);
  font-weight: 700;
  color: var(--accent);
}

.tip__body {
  margin: 0;
  font-size: var(--t-small);
  line-height: 1.65;
  color: var(--text-2);
  /* Multi-line bodies (위험 신호 상세, 파일 목록) keep their line breaks. */
  white-space: pre-line;
}

.tip__caution {
  margin: var(--s-2) 0 0;
  padding-top: var(--s-2);
  border-top: 1px solid var(--line-soft);
  font-size: var(--t-micro);
  line-height: 1.6;
  color: var(--warn-fg);
}
</style>
