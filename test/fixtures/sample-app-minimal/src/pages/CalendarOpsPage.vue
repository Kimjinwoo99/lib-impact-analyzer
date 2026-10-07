<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" md="6">
        <v-date-picker
          v-model="selected"
          :first-day-of-week="firstDayOfWeek"
          show-adjacent-months
          @update:model-value="onDateUpdate"
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-date-input v-model="rangeStart" label="Range start" :first-day-of-week="firstDayOfWeek" />
        <v-date-input v-model="rangeEnd" label="Range end" :first-day-of-week="firstDayOfWeek" />
        <v-btn @click="clearEmptyModel">Clear empty model</v-btn>
        <date-picker-controls-probe />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import DatePickerControlsProbe from '../components/widgets/DatePickerControlsProbe.vue';
import { ref } from 'vue';
import { normalizeCalendarModel } from '../inspectionTerms/vuetifyCalendarTerms';

const selected = ref<string | null>(null);
const rangeStart = ref<string | null>(null);
const rangeEnd = ref<string | null>(null);
const firstDayOfWeek = 1;

function onDateUpdate(value: string | null) {
  selected.value = normalizeCalendarModel(value);
}

function clearEmptyModel() {
  selected.value = normalizeCalendarModel('');
}
</script>