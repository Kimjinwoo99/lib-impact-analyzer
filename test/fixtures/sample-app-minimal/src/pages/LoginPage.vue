<template>
  <v-container class="login-page">
    <v-card max-width="420" variant="outlined">
      <v-card-title>Sign in</v-card-title>
      <v-card-text>
        <v-text-field v-model="email" label="Email" type="email" />
        <v-text-field v-model="password" label="Password" type="password" />
        <v-alert v-if="route.query.reason" type="warning" variant="tonal">
          Session expired.
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="submit">Login</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '../stores/session';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const email = ref('');
const password = ref('');

async function submit() {
  session.token = 'mock-token';
  await router.push({ name: 'dashboard' });
}
</script>