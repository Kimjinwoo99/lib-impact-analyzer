<template>
  <section class="field-input-affix-lab">
    <v-input :model-value="amount" class="amount-input">
      <v-field :active="true" :focused="focused" variant="underlined" center-affix>
        <template #default>
          <input v-model="amount" @focus="focused = true" @blur="focused = false" />
        </template>
      </v-field>
    </v-input>

    <v-text-field
      v-model="amount"
      label="VField/VInput amount"
      variant="underlined"
      center-affix
      @update:model-value="emitFieldChange"
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { fieldProps } from '../../inspectionTerms/vuetifyFieldTerms';

const emit = defineEmits<{ change: [value: string] }>();
const amount = ref('1000');
const focused = ref(false);
const VField = 'VField';
const VInput = 'VInput';
const centerAffix = fieldProps.value.centerAffix;

function emitFieldChange(value: string) {
  if (centerAffix && VField && VInput) {
    emit('change', value);
  }
}
</script>