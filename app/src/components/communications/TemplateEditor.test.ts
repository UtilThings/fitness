import { flushPromises, mount } from '@vue/test-utils';
import { ClientResponseError } from 'pocketbase';
import PrimeVue from 'primevue/config';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TemplateEditor from './TemplateEditor.vue';
import type { MessageTemplate } from '@/lib/messages';

const mocks = vi.hoisted(() => ({ send: vi.fn(), update: vi.fn() }));
vi.mock('@/lib/pocketbase', () => ({
  pb: { send: mocks.send, collection: () => ({ update: mocks.update }) },
}));

const template: MessageTemplate = {
  id: 'template',
  key: 'booking_confirmed',
  locale: 'es',
  active: true,
  subject: 'Reserva',
  body: 'Hola Ana',
};
const render = (readOnly = false) =>
  mount(TemplateEditor, {
    global: { plugins: [PrimeVue] },
    props: { template, readOnly },
  });
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

it('inserta en el cursor y previsualiza después de 300 ms como texto', async () => {
  mocks.send.mockResolvedValue({
    subject: 'Reserva',
    body: '<script>Ana</script>',
    html: '<script>Ana</script>',
  });
  const wrapper = render();
  const body = wrapper.get('textarea');
  body.element.setSelectionRange(5, 5);
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'class_name')!
    .trigger('click');
  expect(body.element.value).toBe('Hola {{class_name}}Ana');
  await vi.advanceTimersByTimeAsync(299);
  expect(mocks.send).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(mocks.send).toHaveBeenCalledWith(
    '/api/admin/messages/preview',
    expect.objectContaining({
      body: expect.objectContaining({ body: 'Hola {{class_name}}Ana' }),
    }),
  );
  expect(wrapper.text()).toContain('<script>Ana</script>');
  expect(wrapper.find('script').exists()).toBe(false);
  wrapper.unmount();
});

it('bloquea variables desconocidas, muestra el 400 por campo y guarda una corrección', async () => {
  const wrapper = render();
  await wrapper.get('textarea').setValue('{{password}}');
  expect(wrapper.text()).toContain('Variable no permitida: {{password}}.');
  await wrapper.get('form').trigger('submit');
  expect(mocks.update).not.toHaveBeenCalled();
  await wrapper.get('textarea').setValue('Texto');
  mocks.update.mockRejectedValueOnce(
    new ClientResponseError({
      status: 400,
      response: { data: { body: { message: 'Otro error del servidor' } } },
    }),
  );
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(wrapper.text()).toContain('Otro error del servidor');
  mocks.update.mockResolvedValueOnce({ ...template, body: 'Texto' });
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(mocks.update).toHaveBeenLastCalledWith(
    template.id,
    expect.objectContaining({ body: 'Texto' }),
  );
  expect(wrapper.emitted('saved')).toHaveLength(1);
  wrapper.unmount();
});

it('cancela una vista previa anterior y mantiene lectura para otros roles', async () => {
  mocks.send.mockReturnValue(new Promise(() => {}));
  const wrapper = render();
  await vi.advanceTimersByTimeAsync(300);
  const signal = mocks.send.mock.calls[0]![1].signal as AbortSignal;
  await wrapper.get('textarea').setValue('Nuevo texto');
  expect(signal.aborted).toBe(true);
  await wrapper.setProps({ readOnly: true });
  expect(wrapper.get('textarea').attributes()).toHaveProperty('readonly');
  expect(wrapper.text()).not.toContain('Guardar plantilla');
  await wrapper.get('form').trigger('submit');
  expect(mocks.update).not.toHaveBeenCalled();
  wrapper.unmount();
});
