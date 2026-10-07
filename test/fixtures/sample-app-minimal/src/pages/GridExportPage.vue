<template>
  <v-container fluid>
    <v-toolbar density="compact" color="transparent">
      <v-toolbar-title>RealGrid Export</v-toolbar-title>
      <v-spacer />
      <v-btn prepend-icon="mdi-file-excel" color="primary" @click="downloadWorkbook">Export</v-btn>
    </v-toolbar>

    <div ref="gridEl" class="grid-host" />
  </v-container>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { createAuditGrid } from '../services/realgridLicense';
import { exportRowsToWorkbook } from '../services/exportWorkbook';

const gridEl = ref<HTMLElement | null>(null);
let gridApi: ReturnType<typeof createAuditGrid> | null = null;

onMounted(() => {
  if (gridEl.value) {
    gridApi = createAuditGrid(gridEl.value);
  }
});

onBeforeUnmount(() => {
  gridApi?.gridView.destroy();
});

function downloadWorkbook() {
  exportRowsToWorkbook([{ name: 'Kim', status: 'active', joinedAt: '2026-07-24' }]);
}
</script>