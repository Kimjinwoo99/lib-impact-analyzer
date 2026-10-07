<script setup>
import { nextTick, ref, watch } from 'vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  points: { type: Array, default: () => [] },
  confirmLabel: { type: String, default: '확인' },
  cancelLabel: { type: String, default: '취소' },
  /*
   * 확인 버튼의 성격. 기본은 danger(빨강) — 이 컴포넌트가 처음 쓰인 곳이
   * "분석을 중단하고 초기화"라 되돌릴 수 없는 파괴적 동작이었다.
   *
   * 완료·저장처럼 일을 끝내는 확인에는 primary를 쓴다. 빨강은 "잘못됐다"로
   * 읽혀서, 정상적으로 마무리하는 자리에 두면 실패한 것처럼 보인다
   * (2026-08-22 사용자 지적).
   */
  tone: { type: String, default: 'danger' },
});

const emit = defineEmits(['confirm', 'cancel']);

// Cancel takes focus so Enter never confirms a destructive action by accident.
const cancelRef = ref(null);

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    await nextTick();
    cancelRef.value?.focus();
  },
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="dialog__backdrop"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
      @click.self="emit('cancel')"
      @keydown.esc="emit('cancel')"
    >
      <div class="dialog">
        <h2 class="dialog__title">{{ title }}</h2>
        <p v-if="body" class="dialog__body">{{ body }}</p>

        <ul v-if="points.length" class="dialog__points">
          <li v-for="point in points" :key="point">{{ point }}</li>
        </ul>

        <div class="dialog__actions">
          <button ref="cancelRef" type="button" class="btn" @click="emit('cancel')">
            {{ cancelLabel }}
          </button>
          <button
            type="button"
            class="btn"
            :class="tone === 'primary' ? 'btn--primary' : 'dialog__confirm'"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog__backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(20, 31, 51, 0.42);
  animation: dialog-fade 0.15s ease-out;
}

.dialog {
  width: min(460px, 100%);
  padding: 26px 28px 22px;
  border-radius: var(--radius-card);
  background: var(--panel);
  box-shadow: var(--shadow-overlay);
  animation: dialog-rise 0.18s cubic-bezier(0.2, 0, 0.2, 1);
}

.dialog__title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
}

.dialog__body {
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--muted);
}

.dialog__points {
  margin: 14px 0 0;
  padding: 13px 16px 13px 30px;
  border-radius: var(--radius-inner);
  background: var(--soft);
  font-size: 12px;
  line-height: 1.7;
  color: var(--text);
}

.dialog__actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.dialog__confirm {
  border-color: var(--bad-fg);
  background: var(--bad-fg);
  color: #fff;
}

.dialog__confirm:hover:not(:disabled) {
  background: #a92730;
  border-color: #a92730;
}

@keyframes dialog-fade {
  from {
    opacity: 0;
  }
}

@keyframes dialog-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dialog__backdrop,
  .dialog {
    animation: none;
  }
}
</style>
