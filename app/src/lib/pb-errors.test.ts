import { ClientResponseError } from 'pocketbase';
import { expect, it } from 'vitest';
import { parsePbError } from './pb-errors';

it.each([
  [0, 'Sin conexión con el servidor'],
  [403, 'No tienes permiso'],
  [404, 'No se encontró el registro'],
  [409, 'Hay registros relacionados'],
  [500, 'Hay registros relacionados'],
])('translates status %i', (status, message) => {
  const error = new ClientResponseError({
    status,
    response: { message: 'Hay registros relacionados' },
  });
  expect(parsePbError(error)).toEqual({ message, fields: {}, status });
});
