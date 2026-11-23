import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import DataTable from 'primevue/datatable';
import Select from 'primevue/select';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { formatDateTime } from '@/lib/datetime';
import CommunicationsView from './CommunicationsView.vue';

const mocks = vi.hoisted(() => ({
  auth: { owner: true },
  filter: vi.fn(() => 'filtered'),
  send: vi.fn(),
  fullList: vi.fn(),
  list: vi.fn(),
}));

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    send: mocks.send,
    filter: mocks.filter,
    collection: (name: string) => ({
      getFullList: (...args: unknown[]) => mocks.fullList(name, ...args),
      getList: (...args: unknown[]) => mocks.list(name, ...args),
    }),
  },
}));

vi.mock('@/composables/useAuth', async () => {
  const { computed } = await import('vue');
  return { useAuth: () => ({ isOwner: computed(() => mocks.auth.owner) }) };
});

const start = '2026-11-02 14:00:00.000Z';
const client = {
  id: 'c1',
  first_name: 'Ana',
  last_name: 'Rojas',
  email: 'ana@example.test',
  status: 'active',
};
let wrapper: VueWrapper | undefined;

async function render() {
  wrapper = mount(CommunicationsView, {
    global: { plugins: [PrimeVue], stubs: { teleport: true } },
  });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.owner = true;
  mocks.fullList.mockImplementation(async (name: string) =>
    name === 'class_sessions'
      ? [{ id: 's1', title: 'Fuerza', starts_at: start }]
      : [
          {
            id: 't1',
            key: 'booking_confirmed',
            locale: 'es',
            active: true,
            subject: 'Confirmación',
            body: 'Hola',
          },
        ],
  );
  mocks.list.mockImplementation(async (name: string) =>
    name === 'bookings'
      ? {
          totalItems: 2,
          items: [
            { id: 'b1', expand: { client } },
            {
              id: 'b2',
              expand: {
                client: { ...client, first_name: 'Leo', status: 'inactive' },
              },
            },
          ],
        }
      : {
          totalItems: 41,
          items: [
            {
              id: 'm1',
              client: 'c1',
              expand: { client },
              created: start,
              template_key: 'class_reminder',
              status: 'failed',
              error: 'SMTP no disponible',
              attempts: 2,
            },
          ],
        },
  );
  mocks.send.mockImplementation(async (path: string) =>
    path.endsWith('/preview')
      ? {
          subject: 'Aviso',
          body: 'Hola',
          html: '<p>Hola</p>',
          unknown_variables: [],
        }
      : { sent: 1, failed: 0, skipped: 1 },
  );
});

afterEach(() => wrapper?.unmount());

it.each([true, false])(
  'muestra las tres pestañas y limita la edición al owner (%s)',
  async (owner) => {
    mocks.auth.owner = owner;
    const view = await render();
    expect(view.findAll('[role=tab]').map((tab) => tab.text())).toEqual([
      'Plantillas',
      'Historial',
      'Mensaje a clase',
    ]);
    expect(view.text().includes('Guardar plantilla')).toBe(owner);
    expect(view.get('textarea').attributes('readonly') !== undefined).toBe(
      !owner,
    );
  },
);

it('filtra por parámetros y fecha local con cambio de horario, y pagina en el servidor', async () => {
  const view = await render();
  await view.findAll('[role=tab]')[1]!.trigger('click');
  await flushPromises();
  expect(view.text()).toContain('Ana Rojas');
  expect(view.text()).toContain('SMTP no disponible');
  expect(view.text()).toContain(formatDateTime(start));
  const [status, key] = view.findAllComponents(Select);
  status!.vm.$emit('update:modelValue', 'failed');
  key!.vm.$emit('update:modelValue', 'class_reminder');
  const [from, to] = view.findAll('input[type=date]');
  await from!.setValue('2026-11-01');
  await to!.setValue('2026-11-01');
  expect(mocks.filter).toHaveBeenLastCalledWith(
    'status = {:status} && template_key = {:key} && created >= {:from} && created < {:to}',
    {
      status: 'failed',
      key: 'class_reminder',
      from: '2026-11-01 04:00:00.000Z',
      to: '2026-11-02 05:00:00.000Z',
    },
  );
  view.getComponent(DataTable).vm.$emit('page', { page: 1 });
  expect(mocks.list).toHaveBeenLastCalledWith(
    'message_logs',
    2,
    20,
    expect.objectContaining({ expand: 'client', filter: 'filtered' }),
  );
});

it('requiere contenido y confirmación, luego muestra el total real enviado', async () => {
  const view = await render();
  await view.findAll('[role=tab]')[2]!.trigger('click');
  await flushPromises();
  view.getComponent(Select).vm.$emit('update:modelValue', 's1');
  await flushPromises();
  expect(view.text()).toContain('1 recibirán el mensaje · 1 se omitirán');
  expect(view.get('button[type=submit]').attributes()).toHaveProperty(
    'disabled',
  );
  await view.get('form').trigger('submit');
  expect(view.find('[role=dialog]').exists()).toBe(false);
  await view.get('input[maxlength="150"]').setValue('Aviso');
  await view.get('textarea').setValue('Hola');
  await view.get('form').trigger('submit');
  expect(view.get('[role=dialog]').text()).toContain('Se omitirán 1');
  expect(mocks.send).not.toHaveBeenCalledWith(
    '/api/admin/messages/class/s1',
    expect.anything(),
  );
  await view
    .findAll('button')
    .find((button) => button.text() === 'Enviar mensaje')!
    .trigger('click');
  await flushPromises();
  expect(mocks.send).toHaveBeenCalledWith(
    '/api/admin/messages/class/s1',
    expect.objectContaining({ body: { subject: 'Aviso', body: 'Hola' } }),
  );
  expect(view.text()).toContain('Enviados: 1 · Fallidos: 0 · Omitidos: 1');
});
