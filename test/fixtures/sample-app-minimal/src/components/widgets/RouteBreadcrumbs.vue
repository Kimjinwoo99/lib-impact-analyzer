<template>
  <v-breadcrumbs :items="items">
    <template #prepend>
      <v-icon icon="mdi-home" size="small" />
    </template>
  </v-breadcrumbs>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const items = computed(() => route.path.split('/').filter(Boolean).map((part) => ({ title: part, disabled: false })));
</script>