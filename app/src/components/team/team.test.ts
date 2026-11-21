import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { expect, it } from 'vitest';
import { PERMISSIONS } from '@/lib/permissions';
import { ROLES } from '@/types/pb';
import MemberAvatar from './MemberAvatar.vue';
import MemberForm from './MemberForm.vue';
import RolePermissions from './RolePermissions.vue';

const global = { plugins: [PrimeVue] };

it('muestra la matriz completa y destaca el rol de la ficha', () => {
  const wrapper = mount(RolePermissions, { props: { highlight: 'coach' } });
  expect(wrapper.findAll('[data-permission]')).toHaveLength(
    Object.keys(PERMISSIONS).length,
  );
  for (const [permission, roles] of Object.entries(PERMISSIONS)) {
    for (const role of ROLES) {
      expect(
        wrapper
          .get(`[data-permission="${permission}"] [data-role="${role}"]`)
          .text(),
      ).toBe(roles.includes(role) ? 'Sí' : '—');
    }
  }
  expect(wrapper.get('[data-highlighted="true"]').attributes('data-role')).toBe(
    'coach',
  );
});

it('valida los campos del alta, muestra errores de API y permite generar la contraseña', async () => {
  const values = {
    name: '',
    email: 'correo',
    role: 'coach' as const,
    phone: '',
    bio: '',
    password: 'corta',
  };
  const wrapper = mount(MemberForm, {
    global,
    props: {
      mode: 'create' as const,
      modelValue: values,
      errors: { phone: 'Error de teléfono del servidor' },
      'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }),
    },
  });
  await wrapper.get('form').trigger('submit');
  expect(wrapper.text()).toContain('Ingresa un nombre');
  expect(wrapper.text()).toContain('Ingresa un correo válido');
  expect(wrapper.text()).toContain('Usa al menos 8 caracteres');
  expect(wrapper.text()).toContain('Error de teléfono del servidor');
  expect(wrapper.emitted('submit')).toBeUndefined();

  await wrapper.get('input[id$="-name"]').setValue(' Ana ');
  await wrapper.get('input[type=email]').setValue('ana@example.test');
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Generar')!
    .trigger('click');
  await wrapper.get('form').trigger('submit');
  expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
    name: 'Ana',
    email: 'ana@example.test',
    password: expect.stringMatching(/^.{12}$/),
  });
});

it('muestra iniciales y solo emite archivos de imagen compatibles de hasta 2 MB', async () => {
  const wrapper = mount(MemberAvatar, {
    props: {
      member: {
        id: 'ana',
        collectionId: 'admins',
        collectionName: 'admins',
        avatar: '',
        name: 'Ana Pérez',
        email: 'ana@example.test',
      },
      editable: true,
    },
  });
  expect(wrapper.text()).toContain('AP');
  const input = wrapper.get('input');
  async function choose(file: File) {
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    });
    await input.trigger('change');
  }
  await choose(new File(['text'], 'note.txt', { type: 'text/plain' }));
  expect(wrapper.get('[role=alert]').text()).toContain('Selecciona una imagen');
  await choose(
    new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', {
      type: 'image/png',
    }),
  );
  expect(wrapper.get('[role=alert]').text()).toContain('2 MB');
  expect(wrapper.emitted('upload')).toBeUndefined();
  const valid = new File(['png'], 'a.png', { type: 'image/png' });
  await choose(valid);
  expect(wrapper.find('[role=alert]').exists()).toBe(false);
  expect(wrapper.emitted('upload')).toEqual([[valid]]);
  await wrapper.setProps({
    member: { ...wrapper.props('member')!, avatar: 'ana.png' },
  });
  expect(wrapper.get('img').attributes('src')).toContain('ana.png?thumb=64x64');
});
