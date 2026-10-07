<script setup>
defineProps({ analysis: { type: Object, required: true } });
defineEmits(['home']);
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <button
        type="button"
        class="app-header__home"
        title="처음으로 — 진행 중인 분석을 중단하고 초기화합니다"
        aria-label="처음으로"
        @click="$emit('home')"
      >
        <span class="app-header__logo">LIA</span>
      </button>

      <div class="app-header__titles">
        <h1 class="app-header__title">라이브러리 업데이트 영향 분석 시스템</h1>
      </div>

      <div class="app-header__rail">
        <slot name="rail" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: saturate(1.6) blur(10px);
  border-bottom: 1px solid var(--line);
}

.app-header__inner {
  height: var(--header-h);
  max-width: var(--page-w);
  margin: 0 auto;
  padding: 0 var(--gutter);
  display: flex;
  align-items: center;
  gap: var(--s-5);
}

.app-header__home {
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  line-height: 0;
  flex: none;
}

.app-header__home:hover .app-header__logo {
  opacity: 0.7;
}

.app-header__logo {
  display: block;
  padding: 0 var(--s-2);
  font-size: var(--t-title);
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--accent);
  transition: opacity var(--fast);
}

.app-header__titles {
  min-width: 0;
  padding-left: var(--s-4);
  border-left: 1px solid var(--line);
}

.app-header__title {
  margin: 0;
  font-size: var(--t-appname);
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text);
  white-space: nowrap;
}

.app-header__rail {
  margin-left: auto;
  min-width: 0;
}

@media (max-width: 900px) {
  .app-header__titles {
    display: none;
  }
}
</style>
