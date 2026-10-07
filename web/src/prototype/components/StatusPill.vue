<script setup>
import { computed } from 'vue';

const props = defineProps({
  value: { type: String, default: '' },
  tone: { type: String, default: null },
  width: { type: Number, default: null },
});

const TONE_BY_VALUE = {
  HIGH: 'bad',
  MEDIUM: 'warn',
  LOW: 'ok',
  UNKNOWN: 'idle',
  REVIEW: 'review',
  SKIP: 'skip',
  완료: 'ok',
  '진행 중': 'accent',
  대기: 'idle',
  오류: 'bad',
};

const toneClass = computed(() => {
  const tone = props.tone ?? TONE_BY_VALUE[props.value] ?? 'accent';
  return tone === 'accent' ? '' : `pill--${tone}`;
});
</script>

<template>
  <span class="pill" :class="toneClass" :style="width ? { width: `${width}px` } : null">
    {{ value }}
  </span>
</template>
