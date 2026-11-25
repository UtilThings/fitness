import { computed } from 'vue';
import { t, translateMessage } from '@/i18n';
import { validateTemplate as templateProblems } from '../../../api/src/lib/message-render';
import type {
  Locale,
  ServiceKey,
  Template,
} from '../../../api/src/lib/message-render';

export { ALLOWED_VARIABLES } from '../../../api/src/lib/message-render';
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

export function translateTemplateProblem(problem: {
  message: string;
  variable?: string;
}) {
  if (problem.variable) {
    const variable = `{{${problem.variable}}}`;
    return t('Variable not allowed: {variable}.', { variable });
  }
  return translateMessage(problem.message);
}

export function validateTemplate(template: Template) {
  return templateProblems(template).map((problem) => ({
    ...problem,
    message: translateTemplateProblem(problem),
  }));
}
