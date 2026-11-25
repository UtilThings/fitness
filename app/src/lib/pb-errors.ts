import { t, translateMessage } from '@/i18n';
import { ClientResponseError } from 'pocketbase';

export interface PbError {
  message: string;
  fields: Record<string, string>;
  status: number;
  code?: string;
  aborted?: true;
}

function fieldMessages(data: unknown): Record<string, string> {
  if (!data || typeof data !== 'object') return {};

  const fields: [string, string][] = [];
  for (const [name, field] of Object.entries(data)) {
    if (
      field &&
      typeof field === 'object' &&
      'message' in field &&
      typeof field.message === 'string'
    ) {
      fields.push([name, translateMessage(field.message)]);
    }
  }
  return Object.fromEntries(fields);
}

export function parsePbError(error: unknown): PbError {
  if (error instanceof ClientResponseError && error.isAbort) {
    return {
      message: t('Request canceled'),
      fields: {},
      status: error.status,
      aborted: true,
    };
  }

  const response = error instanceof ClientResponseError ? error.response : {};
  const status = error instanceof ClientResponseError ? error.status : 0;
  if (!status)
    return {
      message: t('Could not connect to the server'),
      fields: {},
      status,
    };

  const message =
    typeof response.message === 'string' && response.message.trim()
      ? translateMessage(response.message)
      : fallbackMessage(status);
  const code = response.data?.code?.code;
  return {
    message,
    ...(typeof code === 'string' ? { code } : {}),
    fields: status === 400 ? fieldMessages(response.data) : {},
    status,
  };
}

function fallbackMessage(status: number): string {
  switch (status) {
    case 403:
      return t('You do not have permission');
    case 404:
      return t('Record not found');
    default:
      return t('Could not complete the operation');
  }
}
