<script setup lang="ts">
import { computed } from 'vue';
import StatusTag from '@/components/StatusTag.vue';
import {
  isOverdue,
  paymentStatuses,
  type Payment,
} from '@/composables/usePayments';

const props = defineProps<{
  payment: Pick<Payment, 'status' | 'due_on'>;
  today?: string;
}>();
const value = computed(() =>
  isOverdue(props.payment, props.today) ? 'overdue' : props.payment.status,
);
const map = {
  pending: { label: paymentStatuses.pending, severity: 'warn' },
  paid: { label: paymentStatuses.paid, severity: 'success' },
  void: { label: paymentStatuses.void, severity: 'secondary' },
  overdue: { label: 'Vencido', severity: 'danger' },
} as const;
</script>

<template>
  <StatusTag :value="value" :map="map" />
</template>
