import { env } from '@/lib/env';

export const business = {
  name: 'JQ Fitness',
  city: 'Miramar, FL',
  contact: env.businessContact ?? '',
};
