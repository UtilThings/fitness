import { computed } from 'vue';
import { t } from '@/i18n';
import type { Role } from '@/types/pb';

export const ROLE_STATUS = computed(
  () =>
    ({
      owner: { label: t('Owner'), severity: 'info' },
      coach: { label: t('Coach'), severity: 'success' },
      reception: { label: t('Reception'), severity: 'secondary' },
    }) as const satisfies Record<Role, { label: string; severity: string }>,
);

export const ACTIVE_STATUS = computed(
  () =>
    ({
      true: { label: t('Active'), severity: 'success' },
      false: { label: t('Inactive'), severity: 'secondary' },
    }) as const,
);
