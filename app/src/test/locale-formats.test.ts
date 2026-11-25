import { expect, it } from 'vitest';
import { currentBusiness } from '@/lib/business-session';
import { formatDate, formatTime, localToUtcIso } from '@/lib/datetime';
import { formatMoney } from '@/lib/money';
import { withLocale } from './i18n';

it('uses the active language and keeps the business currency and time zone', async () => {
  const previous = currentBusiness.value;
  currentBusiness.value = {
    id: 'business',
    collectionId: 'businesses',
    collectionName: 'businesses',
    created: '',
    name: 'West Coast Fitness',
    slug: 'west-coast',
    logo: '',
    city: 'Vancouver',
    phone: '',
    email: '',
    currency: 'CAD',
    timezone: 'America/Vancouver',
    active: true,
    receipt_prefix: 'WEST',
    allowed_origins: null,
    public_key_prefix: '',
    public_key_rotated_at: '',
  };

  try {
    const instant = '2026-03-08T00:20:00.000Z';
    await withLocale('en', () => {
      expect(formatDate(instant)).toBe('Mar 7, 2026');
      expect(formatTime(instant)).toBe('4:20 PM');
      expect(formatMoney(123456)).toBe('CA$1,234.56');
      expect(localToUtcIso('2026-03-07', '16:20')).toBe(instant);
    });
    await withLocale('es', () => {
      expect(formatDate(instant)).toMatch(/7.*mar.*2026/i);
      expect(formatTime(instant)).toMatch(/4:20\s*p\.\s*m\./);
      expect(formatMoney(123456)).toMatch(/CAD\s+1,234.56/);
      expect(localToUtcIso('2026-03-07', '16:20')).toBe(instant);
    });
  } finally {
    currentBusiness.value = previous;
  }
});
