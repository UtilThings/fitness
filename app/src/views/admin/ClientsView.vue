<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable, {
  type DataTablePageEvent,
  type DataTableRowClickEvent,
} from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import Select from 'primevue/select';
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import DataToolbar from '@/components/DataToolbar.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import ClientForm from '@/components/clients/ClientForm.vue';
import ClientStatusTag from '@/components/clients/ClientStatusTag.vue';
import {
  useClients,
  type ClientWithMemberships,
} from '@/composables/useClients';
import { usePlans } from '@/composables/usePlans';
import {
  CLIENT_STATUS,
  CLIENT_STATUSES,
  formatPhone,
  fullName,
  type ClientDetails,
  type ClientStatus,
} from '@/lib/clients';
import { formatDate, localToUtcIso } from '@/lib/datetime';
import type { PbError } from '@/lib/pb-errors';

const clients = useClients();
const plans = usePlans();
const route = useRoute();
const router = useRouter();
const q = computed(() =>
  typeof route.query.q === 'string' ? route.query.q : '',
);
const status = computed<ClientStatus | 'all'>(() => {
  const value = route.query.status;
  if (value === 'all') return value;
  return CLIENT_STATUSES.find((item) => item === value) ?? 'active';
});
const statusOptions = computed(() => [
  { value: 'all', label: t('All') },
  ...CLIENT_STATUSES.map((value) => ({
    value,
    label: CLIENT_STATUS.value[value].label,
  })),
]);
const plan = computed(() =>
  typeof route.query.plan === 'string' ? route.query.plan : null,
);
const activeMembership = computed(() => {
  if (route.query.membership === 'with') return true;
  if (route.query.membership === 'without') return false;
  return undefined;
});
const planOptions = computed(() =>
  plans.items.value.map((plan) => ({
    id: plan.id,
    label: [plan.expand?.service?.name, plan.name].filter(Boolean).join(' · '),
  })),
);
const membershipOptions = computed(() => [
  { value: 'with', label: t('With an active membership') },
  { value: 'without', label: t('Without an active membership') },
]);
const membershipFilter = computed(() =>
  activeMembership.value === undefined
    ? null
    : activeMembership.value
      ? 'with'
      : 'without',
);
const page = ref(1);
const perPage = ref(20);
const rows = shallowRef<ClientWithMemberships[]>([]);
const total = ref(0);
const loading = ref(false);
const listError = shallowRef<PbError | null>(null);
let latestLoad = 0;

const visible = ref(false);
const saving = ref(false);
const creationError = shallowRef<PbError | null>(null);
const draft = ref<ClientDetails>(blankClient());

function blankClient(): ClientDetails {
  return {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    joined_on: '',
    emergency_contact: '',
    locale: 'es',
  };
}

watch(
  [q, status, plan, activeMembership],
  () => {
    page.value = 1;
    void load();
  },
  { immediate: true },
);

function search(value: string) {
  return router.replace({ query: { ...route.query, q: value || undefined } });
}

function filterStatus(value: ClientStatus | 'all') {
  return router.replace({
    query: { ...route.query, status: value === 'active' ? undefined : value },
  });
}

onMounted(() => void plans.load());

function filterPlan(value: string | null) {
  return router.replace({
    query: {
      ...route.query,
      plan: value || undefined,
      membership:
        value && activeMembership.value === false
          ? undefined
          : route.query.membership,
    },
  });
}

function filterMembership(value: string | null) {
  return router.replace({
    query: {
      ...route.query,
      membership: value || undefined,
      plan: value === 'without' ? undefined : route.query.plan,
    },
  });
}

function activePlans(client: ClientWithMemberships) {
  return client.expand?.memberships_via_client
    ?.filter(({ status }) => status === 'active')
    .map(({ plan, expand }) => expand?.plan?.name ?? plan)
    .join(', ');
}

async function load() {
  const version = ++latestLoad;
  loading.value = true;
  listError.value = null;
  try {
    const result = await clients.list({
      q: q.value,
      status: status.value === 'all' ? null : status.value,
      activePlan: plan.value,
      activeMembership: plan.value ? undefined : activeMembership.value,
      includeMemberships: true,
      page: page.value,
      perPage: perPage.value,
    });
    if (version !== latestLoad) return;
    rows.value = result.items;
    total.value = result.totalItems;
  } catch (cause) {
    if (version !== latestLoad) return;
    rows.value = [];
    total.value = 0;
    listError.value = cause as PbError;
  } finally {
    if (version === latestLoad) loading.value = false;
  }
}

function changePage(event: DataTablePageEvent) {
  page.value = event.page + 1;
  perPage.value = event.rows;
  return load();
}

function profile(id: string) {
  return { name: 'client-detail', params: { id } };
}

function openRow({ data }: DataTableRowClickEvent) {
  void router.push(profile(data.id));
}

function openCreate() {
  draft.value = blankClient();
  creationError.value = null;
  visible.value = true;
}

async function create(values: ClientDetails) {
  if (saving.value) return;
  saving.value = true;
  creationError.value = null;
  try {
    const joined_on = values.joined_on
      ? localToUtcIso(values.joined_on, '00:00')
      : '';
    const client = await clients.create({ ...values, joined_on });
    visible.value = false;
    await router.push(profile(client.id));
  } catch (cause) {
    creationError.value =
      cause instanceof RangeError
        ? {
            fields: { joined_on: t('Enter a valid date.') },
            message: t('Check the client details.'),
            status: 400,
          }
        : (cause as PbError);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="grid grid-cols-1 gap-5">
    <PageHeader :title="t('Clients')">
      <template #actions>
        <Button
          icon="pi pi-plus"
          :label="t('New client')"
          @click="openCreate"
        />
      </template>
    </PageHeader>

    <DataToolbar
      :model-value="q"
      :placeholder="t('Name, email, or phone')"
      search-class="w-full min-w-0 self-start sm:w-64"
      @search="search"
    >
      <template #filters>
        <Select
          :model-value="status"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          :aria-label="t('Status')"
          class="min-w-32 self-start"
          @update:model-value="filterStatus"
        />
        <Select
          :model-value="plan"
          :options="planOptions"
          option-label="label"
          option-value="id"
          :aria-label="t('Active plan')"
          :placeholder="t('Active plan')"
          show-clear
          filter
          :loading="plans.loading.value"
          class="min-w-40"
          @update:model-value="filterPlan"
        />
        <Select
          :model-value="membershipFilter"
          :options="membershipOptions"
          option-label="label"
          option-value="value"
          :aria-label="t('Active membership')"
          :placeholder="t('Any membership')"
          show-clear
          class="min-w-44"
          @update:model-value="filterMembership"
        />
      </template>
    </DataToolbar>

    <Message v-if="plans.error.value" severity="error" :closable="false">
      {{ plans.error.value.message }}
      <Button
        :label="t('Retry loading plans')"
        size="small"
        text
        @click="plans.load()"
      />
    </Message>
    <Message v-if="listError" severity="error" :closable="false">
      {{ listError.message }}
      <Button
        :label="t('Retry')"
        size="small"
        severity="secondary"
        text
        @click="load"
      />
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
      table-style="min-width: 58rem"
      :pt="{ bodyRow: { class: 'cursor-pointer' } }"
      @page="changePage"
      @row-click="openRow"
    >
      <template #empty>
        <EmptyState
          v-if="!loading"
          icon="pi pi-users"
          :title="t('No clients to display')"
          :description="t('Try a different search or change the filters.')"
        />
      </template>
      <Column :header="t('Name')">
        <template #body="{ data }">
          <RouterLink
            :to="profile(data.id)"
            class="font-semibold text-primary hover:underline"
            @click.stop
          >
            {{ fullName(data) }}
          </RouterLink>
        </template>
      </Column>
      <Column :header="t('Email address')">
        <template #body="{ data }">{{ data.email || '—' }}</template>
      </Column>
      <Column :header="t('Phone')">
        <template #body="{ data }">{{
          formatPhone(data.phone) || '—'
        }}</template>
      </Column>
      <Column :header="t('Status')">
        <template #body="{ data }"
          ><ClientStatusTag :status="data.status"
        /></template>
      </Column>
      <Column :header="t('Free first class')">
        <template #body="{ data }">{{
          data.free_class_used ? t('Used') : t('Available')
        }}</template>
      </Column>
      <Column :header="t('Join date')">
        <template #body="{ data }">{{
          data.joined_on ? formatDate(data.joined_on) : '—'
        }}</template>
      </Column>
      <Column :header="t('Active plans')">
        <template #body="{ data }">{{ activePlans(data) || '—' }}</template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="visible"
      modal
      :header="t('New client')"
      class="w-[min(38rem,calc(100%-2rem))]"
      :closable="!saving"
      :close-on-escape="!saving"
    >
      <Message
        v-if="creationError && !Object.keys(creationError.fields).length"
        class="mb-4"
        severity="error"
        :closable="false"
      >
        {{ creationError.message }}
      </Message>
      <ClientForm
        v-model="draft"
        mode="create"
        :errors="creationError?.fields"
        :busy="saving"
        @cancel="visible = false"
        @submit="create"
      />
    </Dialog>
  </section>
</template>
