import { t } from '@/i18n';
import { useToast } from 'primevue/usetoast';

export function useNotify() {
  const toast = useToast();

  return {
    success(message: string, title = t('Success')) {
      toast.add({
        severity: 'success',
        summary: title,
        detail: message,
        life: 3000,
      });
    },
    error(message: string, title = t('Error')) {
      toast.add({
        severity: 'error',
        summary: title,
        detail: message,
        life: 6000,
      });
    },
    info(message: string, title = t('Information')) {
      toast.add({
        severity: 'info',
        summary: title,
        detail: message,
        life: 3000,
      });
    },
  };
}
