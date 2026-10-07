<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" permanent>
      <v-list density="compact" nav>
        <v-list-item prepend-icon="mdi-view-dashboard" title="Dashboard" to="/" />
        <v-list-item prepend-icon="mdi-account-search" title="Users" to="/users" />
        <v-list-item prepend-icon="mdi-table" title="Grid" to="/grid" />
      </v-list>
    </v-navigation-drawer>

    <v-app-bar flat>
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>Mock Library Usage</v-toolbar-title>
      <v-spacer />
      <v-btn icon="mdi-refresh" variant="text" @click="reload" />
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const drawer = ref(true);
const router = useRouter();
const reload = () => router.go(0);
</script>