import { computed, ref } from 'vue';

export function useDateRange() {
  const startDate = ref<string | null>(null);
  const endDate = ref<string | null>(null);
  const hasRange = computed(() => Boolean(startDate.value && endDate.value));

  return { startDate, endDate, hasRange };
}