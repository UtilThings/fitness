import { ClientResponseError } from 'pocketbase';

export interface PbError {
  message: string;
  fields: Record<string, string>;
  status: number;
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
      fields.push([name, field.message]);
    }
  }
  return Object.fromEntries(fields);
}

export function parsePbError(error: unknown): PbError {
  if (error instanceof ClientResponseError && error.isAbort) {
    return {
      message: 'Petición cancelada',
      fields: {},
      status: error.status,
      aborted: true,
    };
  }

  const status = error instanceof ClientResponseError ? error.status : 0;
  switch (status) {
    case 0:
      return { message: 'Sin conexión con el servidor', fields: {}, status };
    case 403:
      return { message: 'No tienes permiso', fields: {}, status };
    case 404:
      return { message: 'No se encontró el registro', fields: {}, status };
    default: {
      const response =
        error instanceof ClientResponseError ? error.response : {};
      const message =
        typeof response.message === 'string' && response.message.trim()
          ? response.message
          : 'No se pudo completar la operación';
      return {
        message,
        fields: status === 400 ? fieldMessages(response.data) : {},
        status,
      };
    }
  }
}
