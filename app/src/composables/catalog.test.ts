import { ClientResponseError } from 'pocketbase';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlans } from '@/composables/usePlans';
import { useServices } from '@/composables/useServices';

const { plans, services, admins, send, filter } = vi.hoisted(() => ({
  plans: {
    getFullList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  services: {
    getFullList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  admins: { getFullList: vi.fn() },
  send: vi.fn(),
  filter: vi.fn((expression: string) => expression),
}));

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: (name: 'plans' | 'services' | 'admins') =>
      ({ plans, services, admins })[name],
    filter,
    send,
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  plans.getFullList.mockResolvedValue([]);
  services.getFullList.mockResolvedValue([]);
  admins.getFullList.mockResolvedValue([]);
});

describe('composables del catálogo', () => {
  it('lista servicios con coach expandido y excluye coaches no asignables', async () => {
    admins.getFullList.mockResolvedValue([
      { id: 'ana', email: 'ana@example.test', name: 'Ana' },
    ]);
    const catalog = useServices();
    await Promise.all([catalog.load(), catalog.loadCoaches()]);
    expect(services.getFullList).toHaveBeenCalledWith(
      expect.objectContaining({
        expand: 'default_coach',
        sort: 'sort,name,id',
      }),
    );
    expect(filter).toHaveBeenCalledWith(
      'active = true && role != "reception"',
      undefined,
    );
    expect(catalog.coachOptions.value).toEqual([
      { label: 'Ana', value: 'ana' },
    ]);
  });

  it('filtra planes, expande el servicio y ordena dentro del mismo grupo', async () => {
    plans.getFullList.mockResolvedValue([
      { id: 'a', service: 'jump', sort: 0 },
      { id: 'b', service: 'strength', sort: 0 },
      { id: 'c', service: 'jump', sort: 1 },
    ]);
    const catalog = usePlans();
    await catalog.load('jump');
    expect(filter).toHaveBeenCalledWith('service = {:service}', {
      service: 'jump',
    });
    expect(plans.getFullList).toHaveBeenCalledWith(
      expect.objectContaining({ expand: 'service' }),
    );
    await catalog.move('a', 'down');
    expect(send).toHaveBeenCalledWith(
      '/api/catalog/plans/order',
      expect.objectContaining({
        body: {
          updates: [
            { id: 'c', sort: 0, previous: 1 },
            { id: 'a', sort: 1, previous: 0 },
          ],
        },
      }),
    );
    expect(plans.getFullList).toHaveBeenCalledTimes(2);
  });

  it('conserva los errores por campo de ambas colecciones', async () => {
    const badRequest = (data: Record<string, { message: string }>) =>
      new ClientResponseError({
        status: 400,
        response: { message: 'Revisa el formulario.', data },
      });
    services.create.mockRejectedValue(
      badRequest({ slug: { message: 'Slug duplicado.' } }),
    );
    plans.update.mockRejectedValue(
      badRequest({
        is_first_class: { message: 'Ya existe un plan de primera clase.' },
      }),
    );
    await expect(
      useServices().save({ slug: 'duplicado' }),
    ).rejects.toMatchObject({
      status: 400,
      fields: { slug: 'Slug duplicado.' },
    });
    await expect(
      usePlans().save({ is_first_class: true }, 'trial'),
    ).rejects.toMatchObject({
      status: 400,
      fields: { is_first_class: 'Ya existe un plan de primera clase.' },
    });
  });

  it('recarga el catálogo tras un intento de orden rechazado', async () => {
    services.getFullList.mockResolvedValue([
      { id: 'a', sort: 0 },
      { id: 'b', sort: 1 },
    ]);
    send.mockRejectedValue(
      new ClientResponseError({
        status: 409,
        response: { message: 'El orden cambió.' },
      }),
    );
    const catalog = useServices();
    await catalog.load();
    await expect(catalog.move('b', 'up')).rejects.toMatchObject({
      message: 'El orden cambió.',
    });
    expect(services.getFullList).toHaveBeenCalledTimes(2);
  });
});
