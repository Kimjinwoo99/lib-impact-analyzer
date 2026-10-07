<template>
  <v-form class="search-form" @submit.prevent="$emit('submit')">
    <v-row dense>
      <v-col cols="12" md="4">
        <v-text-field v-model="model.keyword" clearable label="Keyword" prepend-inner-icon="mdi-magnify" />
      </v-col>
      <v-col cols="12" md="3">
        <v-select v-model="model.status" :items="statuses" clearable label="Status" />
      </v-col>
      <v-col cols="12" md="3">
        <v-date-input v-model="model.joinedFrom" label="Joined from" />
      </v-col>
      <v-col cols="12" md="2" class="actions">
        <v-btn type="submit" color="primary" block>Search</v-btn>
      </v-col>
    </v-row>
  </v-form>
</template>

<script setup lang="ts">
const model = defineModel<any>({ required: true });
const statuses = ['active', 'paused', 'locked'];
defineEmits<{ submit: [] }>();
</script>