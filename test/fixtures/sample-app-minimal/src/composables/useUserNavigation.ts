import { useRoute, useRouter } from 'vue-router';

export function useUserNavigation() {
  const route = useRoute();
  const router = useRouter();

  function openUser(userId: string) {
    router.push({ name: 'users', query: { ...route.query, selected: userId } });
  }

  return { route, router, openUser };
}