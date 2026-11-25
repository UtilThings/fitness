<script setup lang="ts">
import { t } from '@/i18n';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import { computed } from 'vue';
import { formatDateTime } from '@/lib/datetime';
import {
  membershipBalanceLabel,
  type CreditMovement,
  type Membership,
} from '@/lib/memberships';

const props = defineProps<{
  membership: Membership;
  movements: CreditMovement[];
  loading?: boolean;
}>();
const reasons = computed<Record<CreditMovement['reason'], string>>(() => ({
  grant: t('Grant'),
  attend: t('Attendance'),
  late_cancel: t('Late cancellation or no-show'),
  adjust: t('Adjustment'),
  expire: t('Expiration'),
}));
const ordered = computed(() =>
  [...props.movements].sort(
    (a, b) => b.created.localeCompare(a.created) || b.id.localeCompare(a.id),
  ),
);
</script>

<template>
  <section :aria-label="t('Credit history')" class="grid gap-3">
    <div>
      <span class="text-sm text-muted-color">{{ t('Current balance') }}</span>
      <p
        class="text-xl font-semibold"
        :class="{
          'text-red-600 dark:text-red-400': membership.credits_balance < 0,
        }"
      >
        {{ membershipBalanceLabel(membership) }}
        <span v-if="membership.credits_balance < 0" class="text-sm">
          {{ t('· credit debt') }}</span
        >
      </p>
    </div>
    <DataTable :value="ordered" :loading="loading" data-key="id" size="small">
      <template #empty>{{ t('No credit transactions.') }}</template>
      <Column :header="t('Date')">
        <template #body="{ data }">{{ formatDateTime(data.created) }}</template>
      </Column>
      <Column :header="t('Credits')">
        <template #body="{ data }"
          >{{ data.delta > 0 ? '+' : '' }}{{ data.delta }}</template
        >
      </Column>
      <Column :header="t('Reason')">
        <template #body="{ data }">{{
          reasons[(data as CreditMovement).reason]
        }}</template>
      </Column>
      <Column field="note" :header="t('Note')" />
      <Column :header="t('Booking')">
        <template #body="{ data }">
          <span v-if="data.booking" :title="data.booking">
            {{
              data.expand?.booking?.expand?.session
                ? formatDateTime(data.expand.booking.expand.session.starts_at)
                : data.booking
            }}
          </span>
          <span v-else>—</span>
        </template>
      </Column>
    </DataTable>
  </section>
</template>
