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

export const MESSAGE_LABELS = {
  booking_confirmed: 'Confirmación de reserva',
  class_reminder: 'Recordatorio de clase',
  class_cancelled: 'Cancelación o cambio de clase',
  waitlist_promoted: 'Cupo desde la lista de espera',
  payment_due: 'Aviso de cobro',
  membership_renewal: 'Aviso de renovación',
  manual: 'Mensaje manual',
} as const;

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
