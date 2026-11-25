<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable, { type DataTablePageEvent } from 'primevue/datatable';
import Message from 'primevue/message';
import Select from 'primevue/select';
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import MembershipActions from '@/components/memberships/MembershipActions.vue';
import MembershipStatusTag from '@/components/memberships/MembershipStatusTag.vue';
import { useAuth } from '@/composables/useAuth';
import { useMemberships } from '@/composables/useMemberships';
import { usePlans } from '@/composables/usePlans';
import { fullName } from '@/lib/clients';
import { addLocalDays } from '@/lib/datetime';
import {
  formatMembershipDate,
  membershipBalanceLabel,
  membershipStatusLabels,
  type Membership,
  type MembershipState,
} from '@/lib/memberships';
import type { PbError } from '@/lib/pb-errors';

const { can } = useAuth();
const api = useMemberships();
const plans = usePlans();
const canManage = computed(() => can('memberships.manage'));
const plan = ref<string | null>(null);
const status = ref<MembershipState | null>(null);
const page = ref(1);
const perPage = ref(20);
const rows = shallowRef<Membership[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref('');
let latest = 0;

const states = computed(() =>
  Object.entries(membershipStatusLabels.value).map(([value, label]) => ({
    value,
    label,
  })),
);
const planOptions = computed(() =>
  plans.items.value.map((plan) => ({
    id: plan.id,
    label: [plan.expand?.service?.name, plan.name].filter(Boolean).join(' · '),
  })),
);

async function load() {
  const version = ++latest;
  loading.value = true;
  error.value = '';
  try {
    const renewalPending = status.value === 'renewal_pending';
    const result = await api.list({
      page: page.value,
      perPage: perPage.value,
      plan: plan.value,
      status: status.value === 'renewal_pending' ? null : status.value,
      renewalPending,
    });
    if (latest !== version) return;
    const lastPage = Math.max(1, result.totalPages);
    if (page.value > lastPage) {
      page.value = lastPage;
      await load();
      return;
    }
    rows.value = result.items;
    total.value = result.totalItems;
  } catch (cause) {
    if (latest === version) error.value = (cause as PbError).message;
  } finally {
    if (latest === version) loading.value = false;
  }
}

function changePage(event: DataTablePageEvent) {
  page.value = event.page + 1;
  perPage.value = event.rows;
  void load();
}

function commitment(membership: Membership) {
  const periods = membership.commitment_periods_total;
  return periods > 0
    ? t('Until {date}', {
        date: formatMembershipDate(
          addLocalDays(membership.starts_on.slice(0, 10), periods * 28 - 1),
        ),
      })
    : t('No commitment');
}

watch(
  [plan, status],
  () => {
    page.value = 1;
    void load();
  },
  { immediate: true },
);

onMounted(() => void plans.load());
</script>

<template>
  <section class="grid gap-5">
    <PageHeader :title="t('Memberships')" />
    <div class="flex flex-wrap gap-3">
      <Select
        v-model="status"
        :options="states"
        option-label="label"
        option-value="value"
        show-clear
        :placeholder="t('All statuses')"
        :aria-label="t('Membership status')"
        class="min-w-48"
      />
      <Select
        v-model="plan"
        :options="planOptions"
        option-label="label"
        option-value="id"
        show-clear
        filter
        :placeholder="t('All plans')"
        :aria-label="t('Plan')"
        :loading="plans.loading.value"
        class="min-w-48"
      />
    </div>
    <Message v-if="plans.error.value" severity="error" :closable="false">
      {{ plans.error.value.message }}
      <Button :label="t('Retry')" size="small" text @click="plans.load()" />
    </Message>
    <Message v-if="error" severity="error" :closable="false">
      {{ error }}
      <Button :label="t('Retry')" size="small" text @click="load" />
    </Message>
    <DataTable
      v-else
      :value="rows"
      data-key="id"
      lazy
      paginator
      :loading="loading"
      :first="(page - 1) * perPage"
      :rows="perPage"
      :rows-per-page-options="[10, 20, 50]"
      :total-records="total"
      :always-show-paginator="false"
      table-style="min-width: 54rem"
      @page="changePage"
    >
      <template #empty
        ><span v-if="!loading">{{
          t('No memberships to display.')
        }}</span></template
      >
      <Column :header="t('Client')">
        <template #body="{ data }">
          <RouterLink
            :to="{ name: 'client-detail', params: { id: data.client } }"
            class="font-semibold text-primary hover:underline"
          >
            {{
              data.expand?.client ? fullName(data.expand.client) : data.client
            }}
          </RouterLink>
        </template>
      </Column>
      <Column :header="t('Plan')">
        <template #body="{ data }">{{
          data.expand?.plan?.name ?? data.plan
        }}</template>
      </Column>
      <Column :header="t('Status')">
        <template #body="{ data }"
          ><MembershipStatusTag :membership="data"
        /></template>
      </Column>
      <Column :header="t('Period')">
        <template #body="{ data }">
          {{ formatMembershipDate(data.current_period_start) }} –
          {{ formatMembershipDate(data.current_period_end) }}
        </template>
      </Column>
      <Column :header="t('Balance')">
        <template #body="{ data }">
          <span
            :class="{
              'text-red-600 dark:text-red-400': data.credits_balance < 0,
            }"
          >
            {{ membershipBalanceLabel(data) }}
          </span>
        </template>
      </Column>
      <Column :header="t('Commitment')"
        ><template #body="{ data }">{{ commitment(data) }}</template></Column
      >
      <Column v-if="canManage" :header="t('Actions')">
        <template #body="{ data }"
          ><MembershipActions :membership="data" @updated="load"
        /></template>
      </Column>
    </DataTable>
  </section>
</template>
