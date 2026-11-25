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

export function validateTemplate(template: Template) {
  return templateProblems(template).map((problem) => {
    let message = problem.message;
    const limit = /^Máximo de (\d+) caracteres\.$/.exec(message)?.[1];
    if (problem.variable) {
      const variable = `{{${problem.variable}}}`;
      message = t('Variable not allowed: {variable}.', { variable });
    } else if (limit) {
      message = t('Maximum of {max} characters.', { max: limit });
    } else {
      switch (message) {
        case 'Clave de plantilla desconocida.':
          message = t('Unknown template key.');
          break;
        case 'Este campo es obligatorio.':
          message = t('This field is required.');
          break;
        case 'El asunto debe ocupar una sola línea.':
          message = t('The subject must fit on one line.');
          break;
        case 'Usa variables con la sintaxis {{nombre}}.':
          message = t('Use variables in the {syntax} format.', {
            syntax: '{{nombre}}',
          });
          break;
        default:
          message = translateMessage(message);
      }
    }
    return { ...problem, message };
  });
}
