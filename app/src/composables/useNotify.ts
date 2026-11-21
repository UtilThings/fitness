import { useToast } from 'primevue/usetoast';

export function useNotify() {
  const toast = useToast();

  return {
    success(message: string, title = 'Éxito') {
      toast.add({
        severity: 'success',
        summary: title,
        detail: message,
        life: 3000,
      });
    },
    error(message: string, title = 'Error') {
      toast.add({
        severity: 'error',
        summary: title,
        detail: message,
        life: 6000,
      });
    },
    info(message: string, title = 'Información') {
      toast.add({
        severity: 'info',
        summary: title,
        detail: message,
        life: 3000,
      });
    },
  };
}
