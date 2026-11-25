import { mount } from '@vue/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { createSSRApp, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { setLocale, tl } from '@/i18n';
import LeadForm from './LeadForm.vue';

const props = {
  title: tl('Request a consultation'),
  submitLabel: tl('Apply'),
  successMessage: tl('Thanks!'),
  fields: [
    { kind: 'text' as const, placeholder: tl('Full name'), required: true },
    { kind: 'email' as const, placeholder: tl('Email'), required: true },
    { kind: 'text' as const, placeholder: tl('Phone') },
    { kind: 'select' as const, options: [tl('Training'), tl('Jump')] },
    { kind: 'textarea' as const, placeholder: tl('Goals'), rows: 4 },
  ],
};

it('renders the five accessible controls and only marks name and email required', () => {
  const wrapper = mount(LeadForm, { props });
  expect(wrapper.findAll('input, select, textarea')).toHaveLength(5);
  expect(
    wrapper
      .findAll('[required]')
      .map((control) => control.attributes('aria-label')),
  ).toEqual(['Full name', 'Email']);
  expect(wrapper.get('select').attributes('aria-label')).toBe('Training');
  expect(wrapper.get('textarea').attributes('rows')).toBe('4');
  wrapper.unmount();
});

it('submits valid values locally and keeps the title', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  const wrapper = mount(LeadForm, { props, attachTo: document.body });
  try {
    await wrapper.get('[type="email"]').setValue('athlete@example.test');
    await wrapper.get('[aria-label="Full name"]').setValue('An Athlete');
    wrapper.get('form').element.requestSubmit();
    await nextTick();
    expect(wrapper.findAll('input, select, textarea')).toHaveLength(0);
    expect(wrapper.get('[role="status"]').text()).toBe('Thanks!');
    expect(wrapper.get('h2').text()).toBe(props.title);
    expect(wrapper.emitted('submitted')).toEqual([[]]);
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    wrapper.unmount();
    fetch.mockRestore();
  }
});

it('renders the form on the server', async () => {
  const html = await renderToString(createSSRApp(LeadForm, props));
  expect(html).toContain('<form');
  expect(html).toContain('placeholder="Full name"');
  expect(html).toContain('type="email"');
  expect(html).toContain('<textarea');
});

afterEach(async () => {
  await setLocale('en');
  localStorage.clear();
});

it('translates form controls and confirmation without losing the selected option', async () => {
  const wrapper = mount(LeadForm, {
    props: {
      ...props,
      fields: [
        props.fields[0],
        {
          kind: 'select',
          placeholder: tl('Program'),
          options: [tl('Personal Training'), tl('Other')],
        },
      ],
      submitLabel: tl('Send message'),
      successMessage: tl("Thanks! We'll get back to you shortly."),
    },
  });
  await wrapper.get('select').setValue('Other');
  await setLocale('es');
  expect(wrapper.get('input').attributes('placeholder')).toBe(
    'Nombre completo',
  );
  expect(wrapper.get('select').element.value).toBe('Other');
  expect(wrapper.get('select').attributes('aria-label')).toBe('Programa');
  expect(wrapper.findAll('option').map((option) => option.text())).toEqual([
    'Entrenamiento Personal',
    'Otro',
  ]);
  expect(wrapper.get('button').text()).toBe('Enviar mensaje');
  await wrapper.get('form').trigger('submit');
  expect(wrapper.get('[role="status"]').text()).toBe(
    '¡Gracias! Te responderemos pronto.',
  );
  wrapper.unmount();
});
