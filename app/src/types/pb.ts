import type { ListResult } from 'pocketbase';

export const ROLES = ['owner', 'coach', 'reception'] as const;
export type Role = (typeof ROLES)[number];

export type PbList<T> = ListResult<T>;

// Una interfaz por colección. Los campos usan snake_case y las fechas son strings ISO UTC.
// Las relaciones contienen el ID como string. Tipar expand como opcional cuando se use.
export interface BaseRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated?: string; // Las colecciones de solo escritura inicial pueden omitirlo.
}

export interface Business extends BaseRecord {
  name: string;
  slug: string;
  logo: string;
  city: string;
  phone: string;
  email: string;
  currency: string;
  timezone: string;
  receipt_prefix: string;
  active: boolean;
  allowed_origins: string[] | null;
  public_key_prefix: string;
  public_key_rotated_at: string;
}

export interface Admin extends BaseRecord {
  business?: string;
  expand?: { business?: Business };
  name: string;
  avatar: string;
  email: string;
  role: Role;
  active: boolean;
  phone: string;
  bio: string;
}

export interface AuditLog extends BaseRecord {
  actor: string;
  action: 'create' | 'update' | 'delete' | 'custom';
  collection: string;
  record_id: string;
  summary: string;
  diff: unknown;
  expand?: { actor?: Admin };
}
