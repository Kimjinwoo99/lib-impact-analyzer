<template>
  <v-expansion-panels v-model="opened" multiple variant="accordion">
    <v-expansion-panel value="account">
      <v-expansion-panel-title>
        <v-icon icon="mdi-account" start />
        Account defaults
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-text-field v-model="account.name" label="Name" center-affix />
        <v-select v-model="account.role" :items="roles" label="Role" />
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel value="security">
      <v-expansion-panel-title expand-icon="mdi-shield-key">
        Security inherited props
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-switch v-model="account.locked" label="Locked" />
        <v-btn prepend-icon="mdi-content-save" @click="emitSave">Save panel</v-btn>
      </v-expansion-panel-text>
    </v-expansion-panel>

    <v-expansion-panel value="audit">
      <v-expansion-panel-title collapse-icon="mdi-chevron-up">
        Audit VExpansionPanelTitle icon behavior
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <v-alert type="info" variant="tonal">Repeated VExpansionPanel usage for source matching.</v-alert>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup lang="ts">
import { reactive, ref, toRef } from 'vue';

const emit = defineEmits<{ save: [value: { name: string; role: string; locked: boolean }] }>();
const opened = ref(['account', 'audit']);
const roles = ['admin', 'manager', 'viewer'];
const account = reactive({ name: 'Kim', role: 'manager', locked: false });
const inheritedPanelProps = toRef(account, 'role');

function emitSave() {
  if (inheritedPanelProps.value) {
    emit('save', account);
  }
}
</script>