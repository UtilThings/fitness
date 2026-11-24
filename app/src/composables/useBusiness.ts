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
    (admin, _, onCleanup) => {
      let current = true;
      currentBusiness.value = null;
      loading.value = false;
      error.value = false;
      if (!admin) return;

      const expanded = admin.expand?.business;
      const businessId = admin.business;
      if (expanded && expanded.id === businessId)
        currentBusiness.value = expanded;

      let refreshing = false;
      async function refresh() {
        if (refreshing) return;
        refreshing = true;
        const previous = currentBusiness.value;
        if (!previous) loading.value = true;
        try {
          if (businessId) {
            const record = await pb
              .collection<Business>('businesses')
              .getOne(businessId, { requestKey: null });
            if (current && currentBusiness.value === previous) {
              currentBusiness.value = record;
              error.value = false;
            }
            return;
          }

          // A session saved before the business migration needs the new relation.
          const restored = await pb.send<RecordAuthResponse<Admin>>(
            '/api/collections/admins/auth-refresh',
            { method: 'POST', query: { expand: 'business' } },
          );
          if (current) pb.authStore.save(restored.token, restored.record);
        } catch {
          if (current && !currentBusiness.value) error.value = true;
        } finally {
          refreshing = false;
          if (current) loading.value = false;
        }
      }

      window.addEventListener('focus', refresh);
      onCleanup(() => {
        current = false;
        window.removeEventListener('focus', refresh);
      });
      void refresh();
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
