<template>
  <v-menu :close-on-content-click="false">
    <template #activator="{ props }">
      <v-btn v-bind="props" prepend-icon="mdi-calendar" variant="tonal">{{ label }}</v-btn>
    </template>
    <v-date-picker v-model="date" show-adjacent-months @update:model-value="emitDate" />
  </v-menu>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const emit = defineEmits<{ change: [value: string | null] }>();
const date = ref<string | null>(null);
const label = computed(() => date.value ?? 'Pick date');
const emitDate = () => emit('change', date.value);
</script>