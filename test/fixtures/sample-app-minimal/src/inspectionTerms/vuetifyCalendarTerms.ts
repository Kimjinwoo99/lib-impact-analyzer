import { computed, ref } from 'vue';

export const firstDayOfWeek = ref(1);
export const emptyModelValue = ref<string | null>(null);
export const calendarPropertySupport = computed(() => ({
  calendar: true,
  firstDayOfWeek: firstDayOfWeek.value,
  showAdjacentMonths: true,
}));

export function normalizeCalendarModel(model: string | null) {
  if (model === '') return null;
  return model ?? emptyModelValue.value;
}

export function buildDatePickerProps() {
  return {
    'first-day-of-week': firstDayOfWeek.value,
    'show-adjacent-months': true,
    modelValue: emptyModelValue.value,
  };
}