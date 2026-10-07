<template>
  <section class="component-registry-panel">
    <component :is="resolveDirectVuetifyComponent('VProgressLinear')" model-value="64" color="primary" />
    <component :is="resolveDirectVuetifyComponent('VOverlay')" v-model="overlayOpen" :attach="attachTarget">
      <v-card>
        <v-card-title>Dynamic VOverlay</v-card-title>
        <v-card-text>Dynamic component registry path with attach and teleport terms.</v-card-text>
      </v-card>
    </component>
    <component :is="resolveDirectVuetifyComponent('VDatePicker')" v-model="date" />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { resolveDirectVuetifyComponent } from '../../inspectionTerms/vuetifyDirectImports';
import { attach } from '../../inspectionTerms/vuetifyOverlayTerms';

const overlayOpen = ref(false);
const date = ref<string | null>(null);
const attachTarget = attach;
</script>