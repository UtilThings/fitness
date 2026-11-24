import { env } from './env';

const SERVICE_KINDS = ['group', 'personal', 'online'] as const;
const BILLING_UNITS = ['per_4_weeks', 'per_class', 'first_visit'] as const;
const AVAILABILITY = ['available', 'almost', 'full'] as const;

export interface PublicPlan {
  name: string;
  price_cents: number;
  billing_unit: (typeof BILLING_UNITS)[number];
  sessions: number;
  per_week: number;
  commitment_periods: number;
  is_first_class: boolean;
  partner: boolean;
  note: string;
}

export interface PublicService {
  slug: string;
  kind: (typeof SERVICE_KINDS)[number];
  name: string;
  plans: PublicPlan[];
  weekly_times: {
    weekday: number;
    time: string;
    coach_name: string;
    capacity: number;
  }[];
}

export interface PublicBusiness {
  name: string;
  city: string;
  logo_url: string;
  currency: string;
  timezone: string;
}

export interface PublicCatalog {
  version: 2;
  business: PublicBusiness;
  currency: string;
  services: PublicService[];
}

export interface PublicSession {
  local_date: string;
  local_time: string;
  service: { slug: string; name: string };
  coach_name: string;
  capacity: number;
  spots_left: number;
  status: (typeof AVAILABILITY)[number];
}

export interface PublicSchedule {
  version: 2;
  business: PublicBusiness;
  timezone: string;
  week_start: string;
  week_end: string;
  sessions: PublicSession[];
}

function hasFields<T extends object>(
  value: unknown,
  fields: Record<keyof T, (value: unknown) => boolean>,
): value is T {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const entries = Object.entries<(value: unknown) => boolean>(fields);
  return (
    Object.keys(value).length === entries.length &&
    entries.every(
      ([key, check]) =>
        Object.hasOwn(value, key) &&
        check((value as Record<string, unknown>)[key]),
    )
  );
}

const text = (value: unknown) => typeof value === 'string';
const boolean = (value: unknown) => typeof value === 'boolean';
const count = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const weekday = (value: unknown) =>
  typeof value === 'number' && count(value) && value <= 6;
const time = (value: unknown) =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const date = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const oneOf = (options: readonly string[]) => (value: unknown) =>
  typeof value === 'string' && options.includes(value);
const arrayOf = (check: (item: unknown) => boolean) => (value: unknown) =>
  Array.isArray(value) && value.every(check);
const version = (value: unknown) => value === 2;
const currency = oneOf(['USD', 'EUR', 'MXN', 'COP', 'CRC', 'GBP']);
function timezone(value: unknown) {
  if (typeof value !== 'string' || !value) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
const isPublicBusiness = (value: unknown) =>
  hasFields<PublicBusiness>(value, {
    name: (name) => typeof name === 'string' && name.trim().length > 0,
    city: text,
    logo_url: (url) =>
      typeof url === 'string' &&
      (url === '' || (/^https?:\/\//.test(url) && URL.canParse(url))),
    timezone,
    currency,
  });
const serviceIdentity = { slug: text, name: text };
const planFields = {
  name: text,
  price_cents: count,
  billing_unit: oneOf(BILLING_UNITS),
  sessions: count,
  per_week: count,
  commitment_periods: count,
  is_first_class: boolean,
  partner: boolean,
  note: text,
};
const weeklyTimeFields = { weekday, time, coach_name: text, capacity: count };

export function isPublicCatalog(value: unknown): value is PublicCatalog {
  return (
    hasFields<PublicCatalog>(value, {
      version,
      business: isPublicBusiness,
      currency,
      services: arrayOf((service) =>
        hasFields<PublicService>(service, {
          ...serviceIdentity,
          kind: oneOf(SERVICE_KINDS),
          plans: arrayOf((plan) => hasFields<PublicPlan>(plan, planFields)),
          weekly_times: arrayOf((slot) =>
            hasFields<PublicService['weekly_times'][number]>(
              slot,
              weeklyTimeFields,
            ),
          ),
        }),
      ),
    }) && value.currency === value.business.currency
  );
}

export function isPublicSchedule(value: unknown): value is PublicSchedule {
  return (
    hasFields<PublicSchedule>(value, {
      version,
      business: isPublicBusiness,
      timezone,
      week_start: date,
      week_end: date,
      sessions: arrayOf((session) =>
        hasFields<PublicSession>(session, {
          local_date: date,
          local_time: time,
          service: (item) =>
            hasFields<PublicSession['service']>(item, serviceIdentity),
          coach_name: text,
          capacity: count,
          spots_left: count,
          status: oneOf(AVAILABILITY),
        }),
      ),
    }) && value.timezone === value.business.timezone
  );
}

export class ApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ApiError';
  }
}

async function fetchPublic<T>(
  path: string,
  validate: (value: unknown) => value is T,
  signal?: AbortSignal,
): Promise<{ payload: T; headers: Headers }> {
  if (!env.PUBLIC_API_URL || !env.PUBLIC_BUSINESS_KEY)
    throw new ApiError('Public API integration is not configured.');

  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new Error('Public API request timed out.')),
    env.PUBLIC_API_TIMEOUT_MS,
  );
  try {
    const response = await fetch(`${env.PUBLIC_API_URL}/api/public/${path}`, {
      credentials: 'omit',
      headers: { 'X-Business-Key': env.PUBLIC_BUSINESS_KEY },
      signal: controller.signal,
    });
    if (!response.ok)
      throw new ApiError(`Public API returned HTTP ${response.status}.`);
    const payload: unknown = await response.json();
    if (!validate(payload)) throw new ApiError('Invalid public API response.');
    return { payload, headers: response.headers };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Could not read the public API.', { cause: error });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export async function fetchCatalog(): Promise<PublicCatalog> {
  const { payload } = await fetchPublic('catalog', isPublicCatalog);
  return payload;
}

export async function fetchSchedule(week: string, signal?: AbortSignal) {
  const { payload, headers } = await fetchPublic(
    `schedule?${new URLSearchParams({ week })}`,
    isPublicSchedule,
    signal,
  );
  const limit = headers.get('X-Public-Schedule-Max-Weeks') ?? '';
  return {
    schedule: payload,
    maxWeeks: /^\d{1,3}$/.test(limit) ? Number(limit) : undefined,
  };
}
