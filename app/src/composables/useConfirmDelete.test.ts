import type { ConfirmationOptions } from 'primevue/confirmationoptions';
import { expect, it, vi } from 'vitest';
import { withLocale } from '@/test/i18n';
import { useConfirmDelete } from './useConfirmDelete';

const { requireConfirmation } = vi.hoisted(() => ({
  requireConfirmation: vi.fn<(options: ConfirmationOptions) => void>(),
}));
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: requireConfirmation }),
}));

it('opens a Spanish danger dialog and runs the deletion only on acceptance', () => {
  const onConfirm = vi.fn();
  useConfirmDelete().confirmDelete({
    message: '¿Eliminar este registro?',
    onConfirm,
  });

  const [[options]] = requireConfirmation.mock.calls;
  expect(options).toMatchObject({
    header: 'Confirmar eliminación',
    message: '¿Eliminar este registro?',
    acceptProps: { label: 'Eliminar', severity: 'danger' },
    rejectProps: { label: 'Cancelar' },
    defaultFocus: 'reject',
  });
  expect(onConfirm).not.toHaveBeenCalled();
  options.reject?.();
  expect(onConfirm).not.toHaveBeenCalled();
  options.accept?.();
  expect(onConfirm).toHaveBeenCalledOnce();
});

it('uses the active locale when opening an existing confirmation handler', async () => {
  const { confirmDelete } = useConfirmDelete();
  await withLocale('en', () =>
    confirmDelete({ message: 'Delete item?', onConfirm: vi.fn() }),
  );
  expect(requireConfirmation).toHaveBeenLastCalledWith(
    expect.objectContaining({
      header: 'Confirm deletion',
      acceptProps: { label: 'Delete', severity: 'danger' },
    }),
  );
});
