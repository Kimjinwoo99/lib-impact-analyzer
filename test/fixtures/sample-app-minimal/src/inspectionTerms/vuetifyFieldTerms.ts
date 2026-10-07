import { computed, ref } from 'vue';

const label = ref('Amount');
const variant = ref<'plain' | 'underlined' | 'outlined'>('underlined');
const centerAffix = ref(true);

export const fieldProps = computed(() => ({
  label: label.value,
  variant: variant.value,
  centerAffix: centerAffix.value,
  density: 'compact',
}));

export function emitFieldChange(emit: (event: 'update:modelValue', value: string) => void, value: string) {
  emit('update:modelValue', value);
}