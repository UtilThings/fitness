import type { RecordAuthResponse } from 'pocketbase';
import { computed, effectScope, readonly, ref, watch } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { currentBusiness } from '@/lib/business-session';
import { pb } from '@/lib/pocketbase';
import type { Admin, Business } from '@/types/pb';

const loading = ref(false);
const error = ref(false);
const logoUrl = computed(() => {
  const record = currentBusiness.value;
  return record?.logo ? pb.files.getURL(record, record.logo) : undefined;
});
const scope = effectScope(true);
let watching = false;

function watchSession() {
  const { isAuthenticated, user } = useAuth();
  watch(
    () => (isAuthenticated?.value ? user?.value : null),
    async (admin, _, onCleanup) => {
      let current = true;
      onCleanup(() => {
        current = false;
      });
      currentBusiness.value = null;
      loading.value = false;
      error.value = false;
      if (!admin) return;

      const expanded = admin.expand?.business;
      if (expanded && expanded.id === admin.business) {
        currentBusiness.value = expanded;
        return;
      }
      loading.value = true;
      try {
        if (!admin.business) {
          // A session saved before the business migration needs the new relation.
          const restored = await pb.send<RecordAuthResponse<Admin>>(
            '/api/collections/admins/auth-refresh',
            { method: 'POST', query: { expand: 'business' } },
          );
          if (current) pb.authStore.save(restored.token, restored.record);
          return;
        }
        const record = await pb
          .collection<Business>('businesses')
          .getOne(admin.business, { requestKey: null });
        if (current) currentBusiness.value = record;
      } catch {
        if (current) error.value = true;
      } finally {
        if (current) loading.value = false;
      }
    },
    { immediate: true, flush: 'sync' },
  );
}

function updateBusiness(record: Business) {
  if (currentBusiness.value?.id !== record.id) return;
  currentBusiness.value = record;
  const admin = pb.authStore?.record as Admin | null | undefined;
  if (admin?.business === record.id) {
    pb.authStore.save(pb.authStore.token, {
      ...admin,
      expand: { ...admin.expand, business: record },
    });
  }
}

export function useBusiness() {
  if (!watching) {
    watching = true;
    scope.run(watchSession);
  }
  return {
    business: readonly(currentBusiness),
    loading: readonly(loading),
    error: readonly(error),
    logoUrl,
    updateBusiness,
  };
}
