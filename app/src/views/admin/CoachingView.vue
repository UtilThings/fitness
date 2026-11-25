<script setup lang="ts">
import { t } from '@/i18n';
import { collator } from '@/i18n/formats';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import AdherenceBadge from '@/components/coaching/AdherenceBadge.vue';
import CheckinDialog from '@/components/coaching/CheckinDialog.vue';
import CheckinTimeline from '@/components/coaching/CheckinTimeline.vue';
import ProgramFormDialog from '@/components/coaching/ProgramFormDialog.vue';
import ProgramStatusTag from '@/components/coaching/ProgramStatusTag.vue';
import ProgramSummary from '@/components/coaching/ProgramSummary.vue';
import { useAuth } from '@/composables/useAuth';
import { useCoaching } from '@/composables/useCoaching';
import { fullName } from '@/lib/clients';
import {
  canManageProgram,
  canRegisterCheckin,
  matchesProgramAlert,
  programAlerts,
  programStatuses,
  type CoachingProgram,
  type ProgramAlert,
  type ProgramOverview,
  type ProgramStatus,
} from '@/lib/coaching';
import { formatCivilDate } from '@/lib/datetime';
import type { PbError } from '@/lib/pb-errors';

const api = useCoaching();
const { user } = useAuth();
const confirm = useConfirm();
const rows = shallowRef<ProgramOverview[]>([]);
const coaches = shallowRef<{ id: string; name: string }[]>([]);
const coach = ref<string | null>(
  user.value?.role === 'coach' ? user.value.id : null,
);
const status = ref<ProgramStatus | null>(null);
const alert = ref<ProgramAlert | 'renewal' | null>(null);
const search = ref('');
const first = ref(0);
watch([coach, status, alert, search], () => {
  first.value = 0;
});
const loading = ref(true);
const error = ref('');
const detailId = ref('');
const detailVisible = ref(false);
const detail = shallowRef<Awaited<ReturnType<typeof api.getProgram>>>();
const detailLoading = ref(false);
const detailError = ref('');
const actionPending = ref(false);
const formVisible = ref(false);
const editTarget = shallowRef<CoachingProgram>();
const checkinVisible = ref(false);
let latest = 0;
let latestDetail = 0;

const statusOptions = computed(() =>
  Object.entries(programStatuses.value).map(([value, label]) => ({
    value,
    label,
  })),
);
const alertOptions = computed(() => [
  { value: 'renewal', label: t('All renewal alerts') },
  ...Object.entries(programAlerts.value).map(([value, label]) => ({
    value,
    label,
  })),
]);
const scope = computed(() =>
  rows.value.filter((program) => !coach.value || program.coach === coach.value),
);
const metrics = computed(() => [
  {
    label: t('Active programs'),
    count: scope.value.filter(({ status }) => status === 'active').length,
  },
  {
    label: t('Renewal alerts'),
    count: scope.value.filter(({ flags }) =>
      matchesProgramAlert(flags.alerts, 'renewal'),
    ).length,
  },
  {
    label: t('Pending check-ins'),
    count: scope.value.filter(({ flags }) =>
      flags.alerts.includes('checkin_due'),
    ).length,
  },
  {
    label: t('At risk'),
    count: scope.value.filter(({ flags }) => flags.alerts.includes('at_risk'))
      .length,
  },
]);

function clientLabel(program: CoachingProgram) {
  return program.expand?.client
    ? fullName(program.expand.client)
    : program.client;
}

function searchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es');
}

const filtered = computed(() => {
  const terms = searchText(search.value.trim()).split(/\s+/).filter(Boolean);
  return scope.value.filter(
    (program) =>
      (!status.value || status.value === program.status) &&
      matchesProgramAlert(program.flags.alerts, alert.value ?? undefined) &&
      terms.every((term) => searchText(clientLabel(program)).includes(term)),
  );
});

async function load() {
  const version = ++latest;
  error.value = '';
  loading.value = true;
  try {
    const result = await api.listPrograms();
    if (version === latest) rows.value = result;
  } catch (cause) {
    if (version === latest) error.value = (cause as PbError).message;
  } finally {
    if (version === latest) loading.value = false;
  }
}

async function loadCoaches() {
  try {
    coaches.value = await api.listCoaches(false);
  } catch {
    // The expanded coaches remain available as filters if the team list fails.
  }
}

const coachOptions = computed(() => {
  const options = new Map(coaches.value.map(({ id, name }) => [id, name]));
  for (const { coach, expand } of rows.value) {
    if (!options.has(coach)) options.set(coach, expand?.coach?.name ?? coach);
  }
  return [...options]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => collator().compare(a.name, b.name));
});

onMounted(() => {
  void load();
  void loadCoaches();
});

async function loadDetail(id: string) {
  const version = ++latestDetail;
  detailError.value = '';
  detailLoading.value = true;
  try {
    const result = await api.getProgram(id);
    if (version === latestDetail && detailId.value === id)
      detail.value = result;
  } catch (cause) {
    if (version === latestDetail && detailId.value === id)
      detailError.value = (cause as PbError).message;
  } finally {
    if (version === latestDetail) detailLoading.value = false;
  }
}

function open(program: CoachingProgram) {
  detail.value = undefined;
  detailId.value = program.id;
  detailVisible.value = true;
  void loadDetail(program.id);
}

function openForm(program?: CoachingProgram) {
  editTarget.value = program;
  formVisible.value = true;
}

async function refresh() {
  await Promise.all([
    load(),
    detailVisible.value && loadDetail(detailId.value),
  ]);
}

function changeStatus(program: CoachingProgram, target: ProgramStatus) {
  const apply = async () => {
    if (actionPending.value || !canManageProgram(user.value, program)) return;
    detailError.value = '';
    actionPending.value = true;
    try {
      await api.setStatus(program.id, target);
      await refresh();
    } catch (cause) {
      const error = cause as PbError;
      detailError.value =
        Object.values(error.fields).join(' ') || error.message;
    } finally {
      actionPending.value = false;
    }
  };

  if (target === 'ended') {
    confirm.require({
      header: t('End program'),
      message: t('End this program? Its history will remain available.'),
      acceptProps: { label: t('End'), severity: 'danger' },
      rejectProps: {
        label: t('Cancel'),
        severity: 'secondary',
        outlined: true,
      },
      defaultFocus: 'reject',
      accept: apply,
    });
  } else void apply();
}
</script>

<template>
  <section class="grid gap-5">
    <PageHeader :title="t('Online Coaching')">
      <template #actions>
        <Button
          v-if="canManageProgram(user)"
          :label="t('New program')"
          icon="pi pi-plus"
          @click="openForm()"
        />
      </template>
    </PageHeader>

    <dl class="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <div
        v-for="metric in metrics"
        :key="metric.label"
        class="rounded-lg border border-surface-200 p-4 dark:border-surface-700"
      >
        <dt class="text-sm text-muted-color">{{ metric.label }}</dt>
        <dd class="text-2xl font-semibold tabular-nums">
          {{ loading && !rows.length ? '—' : metric.count }}
        </dd>
      </div>
    </dl>

    <div class="flex flex-wrap gap-3">
      <InputText
        v-model="search"
        :placeholder="t('Search for a client')"
        :aria-label="t('Search for a client')"
        class="min-w-48"
      />
      <Select
        v-model="status"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        show-clear
        :placeholder="t('All statuses')"
        :aria-label="t('Program status')"
        class="min-w-44"
      />
      <Select
        v-model="coach"
        :options="coachOptions"
        option-label="name"
        option-value="id"
        show-clear
        filter
        :placeholder="t('All coaches')"
        :aria-label="t('Coach')"
        class="min-w-44"
      />
      <Select
        v-model="alert"
        :options="alertOptions"
        option-label="label"
        option-value="value"
        show-clear
        :placeholder="t('All alerts')"
        :aria-label="t('Alert')"
        class="min-w-44"
      />
    </div>

    <Message v-if="error" severity="error" :closable="false">
      {{ error }}
      <Button :label="t('Retry')" size="small" text @click="load" />
    </Message>
    <DataTable
      v-model:first="first"
      :value="filtered"
      :loading="loading"
      data-key="id"
      paginator
      :rows="15"
      :rows-per-page-options="[15, 30, 50]"
      :always-show-paginator="false"
      table-style="min-width: 62rem"
    >
      <template #empty
        ><span v-if="!loading && !error">{{
          t('No programs match these filters.')
        }}</span></template
      >
      <Column :header="t('Client')">
        <template #body="{ data }">
          <Button
            :label="clientLabel(data)"
            variant="link"
            class="p-0 text-left font-semibold"
            @click="open(data)"
          />
        </template>
      </Column>
      <Column :header="t('Coach')">
        <template #body="{ data }">{{
          data.expand?.coach?.name ?? data.coach
        }}</template>
      </Column>
      <Column :header="t('Status')">
        <template #body="{ data }"
          ><ProgramStatusTag :status="data.status"
        /></template>
      </Column>
      <Column :header="t('Progress')">
        <template #body="{ data }">{{
          t('Week {week} of {total}', {
            week: data.flags.week,
            total: data.flags.total,
          })
        }}</template>
      </Column>
      <Column :header="t('Average adherence')">
        <template #body="{ data }"
          ><AdherenceBadge
            :value="data.flags.adherence.average"
            :trend="data.flags.adherence.trend"
        /></template>
      </Column>
      <Column :header="t('Last check-in')">
        <template #body="{ data }">{{
          data.flags.lastCheckin ? formatCivilDate(data.flags.lastCheckin) : '—'
        }}</template>
      </Column>
      <Column :header="t('Renewal')">
        <template #body="{ data }">{{
          data.renews_on ? formatCivilDate(data.renews_on) : '—'
        }}</template>
      </Column>
      <Column :header="t('Alerts')">
        <template #body="{ data }">
          <div class="flex flex-wrap gap-1">
            <Tag
              v-for="key in data.flags.alerts as ProgramAlert[]"
              :key="key"
              :value="programAlerts[key]"
              :severity="key === 'at_risk' ? 'danger' : 'warn'"
            />
            <span v-if="!data.flags.alerts.length">—</span>
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="detailVisible"
      :closable="!actionPending"
      :close-on-escape="!actionPending"
      modal
      :header="detail ? clientLabel(detail.program) : t('Coaching program')"
      class="w-full max-w-2xl"
    >
      <div class="grid gap-4">
        <Message v-if="detailError" severity="error" :closable="false">
          {{ detailError }}
          <Button
            v-if="!detail"
            :label="t('Retry')"
            size="small"
            text
            @click="loadDetail(detailId)"
          />
        </Message>
        <p v-if="detailLoading && !detail" role="status">
          {{ t('Loading program…') }}
        </p>
        <template v-if="detail">
          <ProgramSummary :program="detail.program" />
          <div class="flex flex-wrap gap-2">
            <Button
              v-if="canRegisterCheckin(user, detail.program)"
              :label="t('Record check-in')"
              @click="checkinVisible = true"
            />
            <template v-if="canManageProgram(user, detail.program)">
              <Button
                :label="t('Edit')"
                severity="secondary"
                outlined
                @click="openForm(detail.program)"
              />
              <template v-if="detail.program.status !== 'ended'">
                <Button
                  :label="
                    detail.program.status === 'active'
                      ? t('Pause')
                      : t('Resume')
                  "
                  severity="secondary"
                  outlined
                  :disabled="
                    actionPending ||
                    (detail.program.status === 'paused' &&
                      detail.program.expand?.membership?.status !== 'active')
                  "
                  @click="
                    changeStatus(
                      detail.program,
                      detail.program.status === 'active' ? 'paused' : 'active',
                    )
                  "
                />
                <Button
                  :label="t('End')"
                  severity="danger"
                  outlined
                  :disabled="actionPending"
                  @click="changeStatus(detail.program, 'ended')"
                />
              </template>
            </template>
          </div>
          <h2 class="text-lg font-semibold">{{ t('Check-in history') }}</h2>
          <CheckinTimeline :checkins="detail.history" />
        </template>
      </div>
    </Dialog>

    <ProgramFormDialog
      v-if="formVisible"
      v-model:visible="formVisible"
      :program="editTarget"
      @saved="refresh"
    />
    <CheckinDialog
      v-if="checkinVisible && detail"
      v-model:visible="checkinVisible"
      :program="detail.program"
      @saved="refresh"
    />
  </section>
</template>
