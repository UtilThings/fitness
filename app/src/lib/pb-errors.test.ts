import { ClientResponseError } from 'pocketbase';
import { expect, it } from 'vitest';
import { withLocale } from '@/test/i18n';
import { parsePbError } from './pb-errors';

it.each([
  [0, 'Sin conexión con el servidor'],
  [403, 'Hay registros relacionados'],
  [404, 'Hay registros relacionados'],
  [409, 'Hay registros relacionados'],
  [500, 'Hay registros relacionados'],
])('translates status %i', (status, message) => {
  const error = new ClientResponseError({
    status,
    response: { message: 'Hay registros relacionados' },
  });
  expect(parsePbError(error)).toEqual({ message, fields: {}, status });
});

it('localizes cataloged response and field messages while retaining unknown messages', async () => {
  const error = new ClientResponseError({
    status: 400,
    response: {
      message: 'Enter valid dates.',
      data: {
        from: { message: 'Enter valid dates.' },
        to: { message: 'Custom PocketBase validation.' },
        code: { code: 'invalid_dates' },
      },
    },
  });

  const spanish = parsePbError(error);
  expect(spanish).toEqual({
    message: 'Introduce fechas válidas.',
    status: 400,
    code: 'invalid_dates',
    fields: {
      from: 'Introduce fechas válidas.',
      to: 'Custom PocketBase validation.',
    },
  });

  await withLocale('en', () => {
    expect(parsePbError(error)).toMatchObject({
      message: 'Enter valid dates.',
      fields: {
        from: 'Enter valid dates.',
        to: 'Custom PocketBase validation.',
      },
    });
  });
});
