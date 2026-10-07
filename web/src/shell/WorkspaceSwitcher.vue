<script setup>
/*
 * ⚠ 사용 중지 (2026-08-13) — 화면은 실구현(product)으로 고정됐다.
 *
 * App.vue가 ProductApp을 직접 마운트하므로 이 레지스트리와 선택 바는 더 이상
 * 참조되지 않는다(번들에도 포함되지 않는다). 파일럿 시안을 다시 붙일 때를
 * 위해 지우지 않고 남겨 두었다 — 복원 방법은 App.vue 상단 주석 참고.
 */
/*
 * Bottom bar for choosing which implementation is on screen.
 *
 * It stays fixed to the viewport rather than sitting at the end of the page,
 * so which workspace produced what is on screen is never ambiguous. Mistaking
 * prototype output for measured output is the one failure this bar exists to
 * prevent.
 */
defineProps({
  workspaces: { type: Array, required: true },
  activeKey: { type: String, required: true },
});

defineEmits(['select']);
</script>

<template>
  <div class="switcher" role="group" aria-label="화면 선택">
    <div class="switcher__inner">
      <span class="switcher__caption">화면</span>

      <div class="switcher__options">
        <button
          v-for="workspace in workspaces"
          :key="workspace.key"
          type="button"
          class="switcher__option"
          :class="[`switcher__option--${workspace.tone}`, { 'is-active': workspace.key === activeKey }]"
          :aria-pressed="workspace.key === activeKey"
          @click="$emit('select', workspace.key)"
        >
          <span class="switcher__label">{{ workspace.label }}</span>
          <span class="switcher__summary">{{ workspace.summary }}</span>
        </button>
      </div>

      <p class="switcher__note">
        두 화면은 상태를 공유하지 않습니다. 전환하면 현재 화면의 작업은 정리됩니다.
      </p>
    </div>
  </div>
</template>

<style scoped>
.switcher {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  border-top: 1px solid var(--line);
  background: var(--panel);
  box-shadow: 0 -2px 12px rgba(20, 31, 51, 0.06);
}

.switcher__inner {
  max-width: var(--page-w);
  margin: 0 auto;
  padding: var(--s-3) var(--gutter);
  display: flex;
  align-items: center;
  gap: var(--s-4);
}

.switcher__caption {
  font-size: var(--t-micro);
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--muted-soft);
}

.switcher__options {
  display: flex;
  gap: var(--s-2);
}

.switcher__option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--s-2) var(--s-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
  background: var(--soft);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--fast), background var(--fast);
}

.switcher__option:hover {
  border-color: var(--line-strong);
}

.switcher__label {
  font-size: var(--t-body);
  font-weight: 700;
  color: var(--text-2);
}

.switcher__summary {
  font-size: var(--t-micro);
  color: var(--muted-soft);
}

.switcher__option.is-active {
  border-color: var(--accent-border);
  background: var(--accent-bg);
}

.switcher__option.is-active .switcher__label {
  color: var(--accent-alt);
}

/* The prototype is the one mode that can put unmeasured values on screen. */
.switcher__option--test.is-active {
  border-color: #e7c66a;
  background: var(--warn-bg);
}

.switcher__option--test.is-active .switcher__label {
  color: var(--warn-fg);
}

.switcher__note {
  margin: 0;
  font-size: var(--t-micro);
  color: var(--muted-soft);
}

@media (max-width: 900px) {
  .switcher__note {
    display: none;
  }
}
</style>
