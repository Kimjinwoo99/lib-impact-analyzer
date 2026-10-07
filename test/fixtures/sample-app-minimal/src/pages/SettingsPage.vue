<template>
  <v-container fluid>
    <v-form @submit.prevent="save">
      <v-switch v-model="dark" color="primary" label="Dark mode" />
      <v-select v-model="density" :items="densities" label="Density" />
      <v-number-input v-model="pageSize" label="Page size" :min="10" :max="200" />
      <v-btn type="submit" color="primary">Save</v-btn>
      <field-input-affix-lab />
    </v-form>
  </v-container>
</template>

<script setup lang="ts">
import FieldInputAffixLab from '../components/widgets/FieldInputAffixLab.vue';
import { ref } from 'vue';
import { useGridPrefsStore } from '../stores/gridPrefs';

const prefs = useGridPrefsStore();
const dark = ref(false);
const density = ref(prefs.density);
const pageSize = ref(50);
const densities = ['compact', 'comfortable', 'default'];

function save() {
  prefs.setDensity(density.value);
}
</script>