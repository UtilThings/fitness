import { computed, shallowRef } from 'vue';
import type { AuthRecord } from 'pocketbase';
import { pb } from '@/lib/pocketbase';

const user = shallowRef<AuthRecord>(pb.authStore.record);
const valid = shallowRef(pb.authStore.isValid);

pb.authStore.onChange(() => {
  user.value = pb.authStore.record;
  valid.value = pb.authStore.isValid;
});

export function useAuth() {
  const isAuthenticated = computed(() => valid.value);

  async function login(email: string, password: string) {
    await pb.collection('admins').authWithPassword(email, password);
  }

  async function requestPasswordReset(email: string) {
    await pb.collection('admins').requestPasswordReset(email);
  }

  function logout() {
    pb.authStore.clear();
  }

  return { user, isAuthenticated, login, logout, requestPasswordReset };
}
