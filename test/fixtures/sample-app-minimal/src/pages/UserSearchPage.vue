<template>
  <v-container fluid>
    <user-search-form v-model="filters" @submit="runSearch" />

    <v-data-table
      :headers="headers"
      :items="users"
      item-value="id"
      density="compact"
      show-select
      @click:row="openRow"
    >
      <template #item.status="{ item }">
        <v-chip :color="item.status === 'active' ? 'success' : 'warning'" size="small">
          {{ item.status }}
        </v-chip>
      </template>
    </v-data-table>

    <footer-reuse-panel />
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import UserSearchForm from '../components/forms/UserSearchForm.vue';
import FooterReusePanel from '../components/tables/FooterReusePanel.vue';
import { searchUsers } from '../services/userApi';
import { useUserNavigation } from '../composables/useUserNavigation';

const { openUser } = useUserNavigation();
const filters = ref({ keyword: '', status: 'active', joinedFrom: null });
const users = ref<any[]>([]);
const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Status', key: 'status' },
  { title: 'Joined', key: 'joinedAt' },
];

async function runSearch() {
  users.value = await searchUsers(filters.value);
}

function openRow(_event: MouseEvent, row: any) {
  openUser(row.item.id);
}
</script>