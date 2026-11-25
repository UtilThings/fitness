import { ClientResponseError } from 'pocketbase';
import { expect, it } from 'vitest';
import { collectApiMessages, readApiMessages } from '../../scripts/i18n-api';
import { auditSummary } from '@/lib/audit';
import { parsePbError } from '@/lib/pb-errors';
import spanish from '@/i18n/locales/es.json';
import { withLocale } from '@/test/i18n';

const forbidden = 'Your role does not allow this operation.';

it('covers the messages emitted by the API source', () => {
  const messages = readApiMessages();
  expect(messages.has(forbidden)).toBe(true);
  expect(
    [...messages.keys()].filter((key) => !Object.hasOwn(spanish, key)),
  ).toEqual([]);
});

it('extracts newly added API errors without a documentation entry', () => {
  const path = 'api/src/hooks/example.ts';
  const key = 'A new API error.';
  const messages = collectApiMessages({
    [path]: `throw new BadRequestError('${key}')`,
  });
  expect(Object.fromEntries(messages)).toEqual({ [key]: path });
  expect(Object.hasOwn(spanish, key)).toBe(false);
});

it.each([
  ['es', 'Tu rol no permite esta operación.', 'Reserva creada.'],
  ['en', forbidden, 'Booking created.'],
] as const)(
  'localizes a 403 and new audit summaries in %s',
  async (locale, error, summary) => {
    await withLocale(locale, () => {
      expect(
        parsePbError(
          new ClientResponseError({
            status: 403,
            response: { message: forbidden },
          }),
        ).message,
      ).toBe(error);
      expect(auditSummary('Booking created.')).toBe(summary);
      expect(auditSummary('Se actualizó el negocio.')).toBe(
        'Se actualizó el negocio.',
      );
    });
  },
);
