import { computed } from 'vue';
import { t } from '@/i18n';
import type {
  Locale,
  ServiceKey,
  Template,
} from '../../../api/src/lib/message-render';

export {
  ALLOWED_VARIABLES,
  validateTemplate,
} from '../../../api/src/lib/message-render';
export { isEligible } from '../../../api/src/lib/message-policy';
export type { Locale, ServiceKey, Template };

export const MESSAGE_LABELS = computed(
  () =>
    ({
      booking_confirmed: t('Booking confirmation'),
      class_reminder: t('Class reminder'),
      class_cancelled: t('Class cancellation or change'),
      waitlist_promoted: t('Waitlist promotion'),
      payment_due: t('Payment reminder'),
      membership_renewal: t('Renewal reminder'),
      manual: t('Manual message'),
    }) as const,
);

export const LOCALES: { value: Locale; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

export type PreviewDraft = Template & { locale?: Locale };
export type MessageDraft = PreviewDraft & {
  id?: string;
  key: ServiceKey;
  locale: Locale;
  active: boolean;
};
export type MessageTemplate = MessageDraft & { id: string };
