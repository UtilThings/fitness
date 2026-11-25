import { expect, it, vi } from 'vitest';
import { withLocale } from '@/test/i18n';
import { useNotify } from './useNotify';

const { add } = vi.hoisted(() => ({ add: vi.fn() }));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add }) }));

it('configures each severity, with Spanish titles and an optional override', () => {
  const notify = useNotify();
  notify.success('Guardado');
  notify.error('Falló');
  notify.info('Pendiente');
  notify.info('En espera', 'Reserva');
  expect(add.mock.calls).toEqual([
    [{ severity: 'success', summary: 'Éxito', detail: 'Guardado', life: 3000 }],
    [{ severity: 'error', summary: 'Error', detail: 'Falló', life: 6000 }],
    [
      {
        severity: 'info',
        summary: 'Información',
        detail: 'Pendiente',
        life: 3000,
      },
    ],
    [{ severity: 'info', summary: 'Reserva', detail: 'En espera', life: 3000 }],
  ]);
});

it('updates the default toast title after a language change', async () => {
  const notify = useNotify();
  await withLocale('en', () => notify.success('Saved'));
  expect(add).toHaveBeenLastCalledWith(
    expect.objectContaining({ summary: 'Success' }),
  );
  notify.success('Guardado');
  expect(add).toHaveBeenLastCalledWith(
    expect.objectContaining({ summary: 'Éxito' }),
  );
});
