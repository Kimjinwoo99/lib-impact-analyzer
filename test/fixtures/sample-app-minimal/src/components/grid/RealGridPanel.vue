<template>
  <section class="realgrid-panel">
    <div ref="container" class="realgrid-container" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { GridView, LocalDataProvider } from 'realgrid';

const container = ref<HTMLElement | null>(null);

onMounted(() => {
  if (!container.value) return;
  const provider = new LocalDataProvider(true);
  const grid = new GridView(container.value);
  grid.setDataSource(provider);
});
</script>