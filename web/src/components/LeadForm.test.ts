import { mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import { createSSRApp, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';
import LeadForm from './LeadForm.vue';

const props = {
  title: 'Request a consultation',
  submitLabel: 'Apply',
  successMessage: 'Thanks!',
  fields: [
    { kind: 'text' as const, placeholder: 'Full name', required: true },
    { kind: 'email' as const, placeholder: 'Email', required: true },
    { kind: 'text' as const, placeholder: 'Phone' },
    { kind: 'select' as const, options: ['Training', 'Jump'] },
    { kind: 'textarea' as const, placeholder: 'Goals', rows: 4 },
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
