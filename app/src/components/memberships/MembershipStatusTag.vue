<script setup lang="ts">
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

const map = {
  active: { label: membershipStatusLabels.active, severity: 'success' },
  paused: { label: membershipStatusLabels.paused, severity: 'info' },
  cancelled: { label: membershipStatusLabels.cancelled, severity: 'secondary' },
  expired: { label: membershipStatusLabels.expired, severity: 'danger' },
  renewal_pending: {
    label: membershipStatusLabels.renewal_pending,
    severity: 'warn',
  },
} as const;
</script>

<template>
  <StatusTag :value="membershipState(membership, today)" :map="map" />
</template>
