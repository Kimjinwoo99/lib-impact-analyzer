import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { http } from '../plugins/http';

export const useSessionStore = defineStore('session', () => {
  const token = ref<string | null>(null);
  const profile = ref<{ id: string; name: string } | null>(null);
  const isSignedIn = computed(() => Boolean(token.value));

  async function loadProfile() {
    const { data } = await http.get('/me');
    profile.value = data;
  }

  function signOut() {
    token.value = null;
    profile.value = null;
  }

  return { token, profile, isSignedIn, loadProfile, signOut };
});