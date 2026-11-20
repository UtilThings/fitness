import PocketBase from 'pocketbase';
import { env } from '@/lib/env';

/** Instancia única del SDK de PocketBase para toda la aplicación. */
export const pb = new PocketBase(env.pocketbaseUrl);
