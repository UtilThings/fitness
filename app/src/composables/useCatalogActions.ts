import { t } from '@/i18n';
import { useConfirm } from 'primevue/useconfirm';
import { computed, ref } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { useConfirmDelete } from '@/composables/useConfirmDelete';
import { useNotify } from '@/composables/useNotify';
import type { Direction } from '@/lib/catalog';
import type { PbError } from '@/lib/pb-errors';

interface CatalogRow {
  id: string;
  name: string;
  active: boolean;
}

export function useCatalogActions<T extends CatalogRow>(catalog: {
  setActive: (id: string, active: boolean) => Promise<unknown>;
  move: (id: string, direction: Direction) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
}) {
  const { can } = useAuth();
  const canManage = computed(() => can('catalog.manage'));
  const confirm = useConfirm();
  const { confirmDelete } = useConfirmDelete();
  const notify = useNotify();
  const busy = ref(false);

  async function run(operation: () => Promise<unknown>, success?: string) {
    if (!canManage.value || busy.value) return;
    busy.value = true;
    try {
      await operation();
      if (success) notify.success(success);
    } catch (cause) {
      notify.error((cause as PbError).message);
    } finally {
      busy.value = false;
    }
  }

  function changeActive(row: T, active: boolean) {
    return run(
      () => catalog.setActive(row.id, active),
      active ? t('Record activated') : t('Record deactivated'),
    );
  }

  function move(row: T, direction: Direction) {
    return run(() => catalog.move(row.id, direction));
  }

  function remove(row: T, askDeactivate: (row: T) => unknown) {
    confirmDelete({
      message: t('Delete «{name}»?', { name: row.name }),
      onConfirm: () =>
        run(async () => {
          try {
            await catalog.remove(row.id);
            notify.success(t('Record deleted'));
          } catch (cause) {
            const error = cause as PbError;
            if (
              error.status === 400 &&
              row.active &&
              (error.message ===
                'This record has related records. Deactivate it instead.' ||
                error.message.includes('Desactívalo en su lugar'))
            ) {
              confirm.require({
                header: t('Keep record'),
                message: error.message,
                acceptProps: { label: t('Deactivate'), severity: 'warn' },
                rejectProps: {
                  label: t('Cancel'),
                  severity: 'secondary',
                  outlined: true,
                },
                defaultFocus: 'reject',
                accept: () => askDeactivate(row),
              });
            } else {
              throw cause;
            }
          }
        }),
    });
  }

  return { canManage, busy, changeActive, move, remove };
}
