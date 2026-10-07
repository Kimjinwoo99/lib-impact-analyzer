<template>
  <section class="date-picker-controls-probe">
    <v-date-picker-controls
      :display-date="displayDate"
      next-icon="mdi-chevron-right"
      prev-icon="mdi-chevron-left"
      @click:next="goNext"
      @click:prev="goPrev"
    />
    <v-date-picker-controls
      :display-date="secondaryDisplayDate"
      next-icon="mdi-arrow-right"
      prev-icon="mdi-arrow-left"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const VDatePickerControls = 'VDatePickerControls';
const displayDate = ref('2026-07');
const secondaryDisplayDate = ref('2026-08');

function goNext() {
  displayDate.value = '2026-08';
}

function goPrev() {
  displayDate.value = '2026-06';
}
</script>