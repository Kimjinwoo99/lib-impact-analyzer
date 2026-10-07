<template>
  <v-file-input v-model="files" accept=".xlsx,.csv" label="Upload sheet" prepend-icon="mdi-paperclip" />
  <v-btn prepend-icon="mdi-file-download" variant="outlined" @click="makeTemplate">Template</v-btn>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import * as XLSX from 'xlsx';

const files = ref<File[]>([]);

function makeTemplate() {
  const sheet = XLSX.utils.aoa_to_sheet([['name', 'status'], ['Kim', 'active']]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Template');
}
</script>