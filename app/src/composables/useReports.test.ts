import { ClientResponseError } from 'pocketbase';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useReports } from './useReports';

const { send, cancelRequest } = vi.hoisted(() => ({
  send: vi.fn(),
  cancelRequest: vi.fn(),
}));
vi.mock('@/lib/pocketbase', () => ({ pb: { send, cancelRequest } }));

beforeEach(() => {
  send.mockReset();
  cancelRequest.mockReset();
  vi.useFakeTimers();
  // In UTC this instant is already March; in New York it is still February.
  vi.setSystemTime(new Date('2026-03-01T02:00:00Z'));
});
afterEach(() => vi.useRealTimers());

it('calculates inclusive presets in New York and sends the revenue filters', async () => {
  const data = { totals: { paid_cents: 123 } };
  send.mockResolvedValue(data);
  const report = useReports('revenue');
  expect(report.range.value).toEqual({ from: '2026-01-30', to: '2026-02-28' });
  report.setPreset('last-month');
  expect(report.range.value).toEqual({ from: '2026-01-01', to: '2026-01-31' });
  report.setPreset('this-month');
  expect(report.range.value).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  report.setPreset('7d');
  report.service.value = 'strength';
  report.groupBy.value = 'week';
  await report.load();
  expect(send).toHaveBeenCalledWith('/api/admin/reports/revenue', {
    query: {
      from: '2026-02-22',
      to: '2026-02-28',
      service: 'strength',
      group_by: 'week',
    },
    requestKey: expect.any(String),
  });
  expect(report.data.value).toEqual(data);
  expect(report.loading.value).toBe(false);
});

it('reuses the cancellation key and discards a late response', async () => {
  let resolveOld!: (value: object) => void;
  const old = new Promise<object>((resolve) => {
    resolveOld = resolve;
  });
  send.mockReturnValueOnce(old).mockResolvedValueOnce({ latest: true });
  const report = useReports('attendance');
  const first = report.load();
  expect(report.loading.value).toBe(true);
  await report.load();
  resolveOld({ latest: false });
  await first;
  expect(send.mock.calls[0][1].requestKey).toBe(
    send.mock.calls[1][1].requestKey,
  );
  expect(send.mock.calls[1][1].query).not.toHaveProperty('group_by');
  expect(report.loading.value).toBe(false);
  expect(report.data.value).toEqual({ latest: true });
});

it('clears data on errors and shows the expected Spanish messages', async () => {
  const report = useReports('revenue');
  send.mockResolvedValueOnce({});
  await report.load();
  for (const [status, message] of [
    [403, 'No tienes permiso para ver este reporte'],
    [400, 'El rango admite hasta 366 días.'],
    [500, 'No se pudo cargar el reporte.'],
  ] as const) {
    send.mockRejectedValueOnce(
      new ClientResponseError({
        status,
        response: { message: status === 400 ? message : 'Detalle técnico' },
      }),
    );
    await report.load();
    expect(report.error.value).toBe(message);
    expect(report.data.value).toBeNull();
    expect(report.loading.value).toBe(false);
  }
});
