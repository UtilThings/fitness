import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { useDashboard } from '@/composables/useDashboard';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@/lib/pocketbase', () => ({ pb: { send } }));

let wrapper: ReturnType<typeof mount> | undefined;

function render() {
  let dashboard!: ReturnType<typeof useDashboard>;
  wrapper = mount(
    defineComponent({
      setup() {
        dashboard = useDashboard();
        return () => null;
      },
    }),
  );
  return dashboard;
}

beforeEach(() => send.mockReset());
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it('carga el resumen, evita solicitudes simultáneas y conserva el dato al fallar', async () => {
  const summary = { timezone: 'America/New_York' };
  send
    .mockResolvedValueOnce(summary)
    .mockRejectedValueOnce(new Error('offline'));
  const dashboard = render();
  expect(dashboard.loading.value).toBe(true);
  await dashboard.refresh();
  expect(send).toHaveBeenCalledTimes(1);
  await flushPromises();
  expect(dashboard.loading.value).toBe(false);
  expect(dashboard.data.value).toEqual(summary);

  await dashboard.refresh();
  expect(dashboard.error.value?.message).toBe('Sin conexión con el servidor');
  expect(dashboard.data.value).toEqual(summary);
  send.mockResolvedValueOnce({
    timezone: summary.timezone,
    generated_at: '2026-11-23T12:00:00Z',
  });
  await dashboard.refresh();
  expect(dashboard.error.value).toBeUndefined();
  expect(dashboard.data.value?.generated_at).toBe('2026-11-23T12:00:00Z');
});

it('refresca cada minuto visible y cancela el intervalo al desmontar', async () => {
  vi.useFakeTimers();
  const state = vi
    .spyOn(document, 'visibilityState', 'get')
    .mockReturnValue('hidden');
  send.mockResolvedValue({});
  render();
  await vi.advanceTimersByTimeAsync(60_000);
  expect(send).toHaveBeenCalledTimes(1);

  state.mockReturnValue('visible');
  await vi.advanceTimersByTimeAsync(120_000);
  expect(send).toHaveBeenCalledTimes(3);
  const signal: AbortSignal = send.mock.calls[0][1].signal;
  wrapper?.unmount();
  wrapper = undefined;
  expect(signal.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(send).toHaveBeenCalledTimes(3);
});
