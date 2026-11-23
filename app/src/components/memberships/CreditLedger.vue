<script setup lang="ts">
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
const reasons: Record<CreditMovement['reason'], string> = {
  grant: 'Otorgamiento',
  attend: 'Asistencia',
  late_cancel: 'Cancelación tardía o ausencia',
  adjust: 'Ajuste',
  expire: 'Vencimiento',
};
const ordered = computed(() =>
  [...props.movements].sort(
    (a, b) => b.created.localeCompare(a.created) || b.id.localeCompare(a.id),
  ),
);
</script>

<template>
  <section aria-label="Historial de créditos" class="grid gap-3">
    <div>
      <span class="text-sm text-muted-color">Saldo actual</span>
      <p
        class="text-xl font-semibold"
        :class="{
          'text-red-600 dark:text-red-400': membership.credits_balance < 0,
        }"
      >
        {{ membershipBalanceLabel(membership) }}
        <span v-if="membership.credits_balance < 0" class="text-sm">
          · deuda de créditos</span
        >
      </p>
    </div>
    <DataTable :value="ordered" :loading="loading" data-key="id" size="small">
      <template #empty>Sin movimientos de créditos.</template>
      <Column header="Fecha">
        <template #body="{ data }">{{ formatDateTime(data.created) }}</template>
      </Column>
      <Column header="Créditos">
        <template #body="{ data }"
          >{{ data.delta > 0 ? '+' : '' }}{{ data.delta }}</template
        >
      </Column>
      <Column header="Motivo">
        <template #body="{ data }">{{
          reasons[(data as CreditMovement).reason]
        }}</template>
      </Column>
      <Column field="note" header="Nota" />
      <Column header="Reserva">
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
