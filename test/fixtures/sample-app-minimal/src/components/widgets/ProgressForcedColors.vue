<template>
  <section class="progress-stack">
    <v-progress-linear :model-value="primaryProgress" color="primary" height="8" rounded />
    <v-progress-linear :model-value="secondaryProgress" color="secondary" stream />
    <v-progress-linear indeterminate color="warning" aria-label="forced-colors loading" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const completed = ref(38);
const total = ref(100);
const primaryProgress = computed(() => completed.value);
const secondaryProgress = computed(() => Math.min(100, total.value - completed.value));
</script>

<style scoped>
@media (forced-colors: active) {
  .progress-stack {
    forced-color-adjust: none;
  }
}
</style>