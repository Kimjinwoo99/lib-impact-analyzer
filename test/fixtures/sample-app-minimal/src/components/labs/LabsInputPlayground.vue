<template>
  <v-card variant="outlined">
    <v-card-title>Labs Inputs</v-card-title>
    <v-card-text>
      <v-number-input v-model="count" label="Count" control-variant="split" />
      <v-date-input v-model="shipDate" label="Ship date" />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const count = ref(3);
const shipDate = ref<string | null>(null);
</script>