<template>
  <v-dialog v-model="open" max-width="480">
    <v-card>
      <v-card-title>Change status</v-card-title>
      <v-card-text>
        <v-select v-model="status" :items="statuses" label="Status" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Apply</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { saveUserStatus } from '../../services/userApi';

const open = defineModel<boolean>({ required: true });
const props = defineProps<{ userId: string }>();
const status = ref('active');
const saving = ref(false);
const statuses = ['active', 'paused', 'locked'];

async function save() {
  saving.value = true;
  await saveUserStatus(props.userId, status.value);
  saving.value = false;
  open.value = false;
}
</script>