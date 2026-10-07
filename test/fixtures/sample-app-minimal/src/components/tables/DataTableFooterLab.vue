<template>
  <v-data-table
    :headers="headers"
    :items="rows"
    :items-per-page="itemsPerPage"
    density="compact"
  >
    <template #bottom>
      <v-data-table-footer
        v-model:items-per-page="itemsPerPage"
        :items-per-page-options="pageOptions"
        show-current-page
        first-icon="mdi-page-first"
        last-icon="mdi-page-last"
      />
    </template>
  </v-data-table>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const itemsPerPage = ref(25);
const pageOptions = [10, 25, 50, 100];
const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Status', key: 'status' },
];
const rows = [
  { name: 'Kim', status: 'active' },
  { name: 'Lee', status: 'paused' },
];
</script>