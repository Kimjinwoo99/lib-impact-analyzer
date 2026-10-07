<template>
  <div class="footer-reuse-panel">
    <v-data-table-footer
      v-model:items-per-page="primaryPageSize"
      :items-per-page-options="[10, 20, 50]"
      page-text="Primary footer"
    />
    <v-data-table-footer
      v-model:items-per-page="secondaryPageSize"
      :items-per-page-options="[25, 100]"
      page-text="Secondary footer"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { directVuetifyComponents } from '../../inspectionTerms/vuetifyDirectImports';

const VDataTableFooter = directVuetifyComponents.VDataTableFooter;
const primaryPageSize = ref(20);
const secondaryPageSize = ref(25);
</script>