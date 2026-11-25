<script setup lang="ts">
import { computed } from 'vue';
import StatusTag from '@/components/StatusTag.vue';
import {
  membershipState,
  membershipStatusLabels,
  type Membership,
} from '@/lib/memberships';

defineProps<{
  membership: Pick<Membership, 'status' | 'current_period_end'>;
  today?: string;
}>();

const map = computed(
  () =>
    ({
      active: {
        label: membershipStatusLabels.value.active,
        severity: 'success',
      },
      paused: { label: membershipStatusLabels.value.paused, severity: 'info' },
      cancelled: {
        label: membershipStatusLabels.value.cancelled,
        severity: 'secondary',
      },
      expired: {
        label: membershipStatusLabels.value.expired,
        severity: 'danger',
      },
      renewal_pending: {
        label: membershipStatusLabels.value.renewal_pending,
        severity: 'warn',
      },
    }) as const,
);
</script>

<template>
  <StatusTag :value="membershipState(membership, today)" :map="map" />
</template>
