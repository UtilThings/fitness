import { t } from '@/i18n';
import { useConfirm } from 'primevue/useconfirm';

interface DeleteConfirmation {
  message: string;
  header?: string;
  onConfirm: () => void | Promise<void>;
}

export function useConfirmDelete() {
  const confirm = useConfirm();

  function confirmDelete({
    message,
    header = t('Confirm deletion'),
    onConfirm,
  }: DeleteConfirmation) {
    confirm.require({
      header,
      message,
      icon: 'pi pi-exclamation-triangle',
      acceptProps: { label: t('Delete'), severity: 'danger' },
      rejectProps: {
        label: t('Cancel'),
        severity: 'secondary',
        outlined: true,
      },
      defaultFocus: 'reject',
      accept: onConfirm,
    });
  }

  return { confirmDelete };
}
