<template>
  <section class="page-shell">
    <v-container fluid>
      <v-row>
        <v-col cols="12" md="4" v-for="card in cards" :key="card.label">
          <v-card variant="outlined">
            <v-card-title>{{ card.label }}</v-card-title>
            <v-card-text class="metric">{{ card.value }}</v-card-text>
            <v-card-actions>
              <v-btn color="primary" variant="tonal" :prepend-icon="card.icon">Inspect</v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <v-alert class="mt-4" type="info" variant="tonal">
        Dashboard uses auto-imported Vuetify components in template only.
      </v-alert>

      <component-registry-panel class="mt-4" />
      <progress-forced-colors class="mt-4" />
    </v-container>
  </section>
</template>

<script setup lang="ts">
import ComponentRegistryPanel from '../components/widgets/ComponentRegistryPanel.vue';
import ProgressForcedColors from '../components/widgets/ProgressForcedColors.vue';
const cards = [
  { label: 'Active users', value: '128', icon: 'mdi-account-group' },
  { label: 'Exports', value: '34', icon: 'mdi-file-excel' },
  { label: 'Errors', value: '2', icon: 'mdi-alert-circle' },
];
</script>