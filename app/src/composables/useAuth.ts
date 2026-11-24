import { computed, shallowRef } from 'vue';
import { useAdminAvatar } from '@/composables/useAdminAvatar';
import { roleCan, type Permission } from '@/lib/permissions';
import { pb } from '@/lib/pocketbase';
import { ROLES, type Admin } from '@/types/pb';

const session = shallowRef<{ user: Admin | null; valid: boolean }>({
  user: null,
  valid: false,
});

function logout() {
  pb.authStore.clear();
}

function syncSession() {
  const user = pb.authStore.record as Admin | null;
  const valid = pb.authStore.isValid;
  if (valid && user?.active === false) {
    logout();
    return;
  }
  session.value = { user, valid };
}

pb.authStore.onChange(syncSession);
syncSession();

const user = computed(() => session.value.user);
const isAuthenticated = computed(() => session.value.valid);
const role = computed(
  () => ROLES.find((value) => value === user.value?.role) ?? null,
);
const isOwner = computed(() => role.value === 'owner');
const isActive = computed(
  () => user.value !== null && user.value.active !== false,
);

const avatarUrl = useAdminAvatar(
  () => (isAuthenticated.value ? user.value : null),
  '100x100',
);

function can(permission: Permission) {
  return (
    isAuthenticated.value && isActive.value && roleCan(role.value, permission)
  );
}

async function login(email: string, password: string) {
  await pb
    .collection('admins')
    .authWithPassword(email, password, { expand: 'business' });
}

async function requestPasswordReset(email: string) {
  await pb.collection('admins').requestPasswordReset(email);
}

export function useAuth() {
  return {
    user,
    isAuthenticated,
    role,
    isOwner,
    isActive,
    avatarUrl,
    can,
    login,
    logout,
    requestPasswordReset,
  };
}
