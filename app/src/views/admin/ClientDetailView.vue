<script setup lang="ts">
import Button from 'primevue/button';
import Message from 'primevue/message';
import ProgressSpinner from 'primevue/progressspinner';
import Select from 'primevue/select';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import Tabs from 'primevue/tabs';
import Textarea from 'primevue/textarea';
import ToggleSwitch from 'primevue/toggleswitch';
import { useConfirm } from 'primevue/useconfirm';
import { computed, ref, shallowRef, useId, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import AssessmentForm from '@/components/clients/AssessmentForm.vue';
import ClientForm from '@/components/clients/ClientForm.vue';
import ClientHistoryTab from '@/components/clients/ClientHistoryTab.vue';
import ClientStatusTag from '@/components/clients/ClientStatusTag.vue';
import ClientCoaching from '@/components/coaching/ClientCoaching.vue';
import ClientMemberships from '@/components/memberships/ClientMemberships.vue';
import ClientPayments from '@/components/payments/ClientPayments.vue';
import { useAuth } from '@/composables/useAuth';
import { useClients } from '@/composables/useClients';
import { useCoaching } from '@/composables/useCoaching';
import { useConfirmDelete } from '@/composables/useConfirmDelete';
import { useNotify } from '@/composables/useNotify';
import {
  CLIENT_STATUS,
  CLIENT_STATUSES,
  formatPhone,
  fullName,
  type Client,
  type ClientDetails,
  type ClientStatus,
} from '@/lib/clients';
import { localToUtcIso, utcToLocalParts } from '@/lib/datetime';
import type { ProgramOverview } from '@/lib/coaching';
import type { Membership } from '@/lib/memberships';
import type { PbError } from '@/lib/pb-errors';

const route = useRoute();
const router = useRouter();
const { user, isOwner, can } = useAuth();
const canManagePayments = computed(() => can('payments.manage'));
const clients = useClients();
const notify = useNotify();
const confirm = useConfirm();
const { confirmDelete } = useConfirmDelete();
const id = useId();
const client = shallowRef<Client>();
const loading = ref(false);
const loadError = shallowRef<PbError | null>(null);
const details = ref<ClientDetails>();
const goals = ref('');
const notes = ref('');
const assessment = shallowRef<unknown>(null);
const status = ref<ClientStatus>('active');
const classUsed = ref(false);
const historyConflict = ref(false);
const tab = ref('details');
const coaching = useCoaching();
const coachingPrograms = shallowRef<ProgramOverview[]>([]);
const coachingMemberships = shallowRef<Membership[]>([]);
const coachingRevision = ref(0);
const coachingError = ref('');
const showCoaching = computed(
  () =>
    coachingPrograms.value.length > 0 || coachingMemberships.value.length > 0,
);
const hasActiveOnlineMembership = computed(() =>
  coachingMemberships.value.some(({ status }) => status === 'active'),
);

watch(
  [() => client.value?.id, coachingRevision],
  async ([clientId], [previousId], onCleanup) => {
    let current = true;
    onCleanup(() => {
      current = false;
    });
    if (clientId !== previousId) {
      coachingPrograms.value = [];
      coachingMemberships.value = [];
    }
    coachingError.value = '';
    if (!clientId) return;
    try {
      const [programs, memberships] = await Promise.all([
        coaching.listPrograms({ client: clientId }),
        coaching.listOnlineMemberships({ client: clientId, activeOnly: false }),
      ]);
      if (!current) return;
      coachingPrograms.value = programs;
      coachingMemberships.value = memberships;
      if (!showCoaching.value && tab.value === 'coaching')
        tab.value = 'details';
    } catch (cause) {
      if (current) coachingError.value = (cause as PbError).message;
    }
  },
);

type Section = 'details' | 'notes' | 'assessment' | 'actions';
const errors = ref<Partial<Record<Section, PbError>>>({});
const saving = ref(false);
let latestLoad = 0;

const statusOptions = computed(() =>
  CLIENT_STATUSES.map((value) => ({
    value,
    label: CLIENT_STATUS[value].label,
    disabled: client.value?.status === 'inactive' && value === 'paused',
  })),
);

watch(
  () => route.params.id,
  () => {
    if (typeof route.params.id === 'string') void load(route.params.id);
  },
  { immediate: true },
);

function editableDetails(record: Client): ClientDetails {
  return {
    first_name: record.first_name,
    last_name: record.last_name,
    email: record.email,
    phone: formatPhone(record.phone),
    emergency_contact: record.emergency_contact,
    locale: record.locale === 'en' ? 'en' : 'es',
    joined_on: record.joined_on ? utcToLocalParts(record.joined_on).date : '',
  };
}

async function load(clientId: string) {
  const version = ++latestLoad;
  loading.value = true;
  saving.value = false;
  client.value = undefined;
  loadError.value = null;
  errors.value = {};
  historyConflict.value = false;
  tab.value = 'details';
  try {
    const record = await clients.get(clientId);
    if (version !== latestLoad) return;
    client.value = record;
    details.value = editableDetails(record);
    status.value = record.status;
    classUsed.value = record.free_class_used;
    goals.value = record.goals;
    notes.value = record.notes;
    assessment.value = record.assessment;
  } catch (cause) {
    if (version === latestLoad) loadError.value = cause as PbError;
  } finally {
    if (version === latestLoad) loading.value = false;
  }
}

async function persist(
  section: Section,
  operation: () => Promise<Client>,
  message: string,
) {
  if (!client.value || saving.value) return;
  const version = latestLoad;
  saving.value = true;
  delete errors.value[section];
  try {
    const record = await operation();
    if (version !== latestLoad) return;
    client.value = record;
    status.value = record.status;
    classUsed.value = record.free_class_used;
    notify.success(message);
    return record;
  } catch (cause) {
    if (version === latestLoad) {
      errors.value[section] =
        cause instanceof RangeError
          ? {
              fields: { joined_on: 'Ingresa una fecha válida.' },
              message: 'Revisa los datos del cliente.',
              status: 400,
            }
          : (cause as PbError);
      status.value = client.value.status;
      classUsed.value = client.value.free_class_used;
    }
  } finally {
    if (version === latestLoad) saving.value = false;
  }
}

async function saveDetails(values: ClientDetails) {
  const clientId = client.value?.id;
  if (!clientId) return;
  const record = await persist(
    'details',
    () => {
      const joined_on = values.joined_on
        ? localToUtcIso(values.joined_on, '00:00')
        : '';
      return clients.update(clientId, { ...values, joined_on });
    },
    'Datos guardados',
  );
  if (record) details.value = editableDetails(record);
}

async function saveNotes() {
  const clientId = client.value?.id;
  if (!clientId) return;
  const record = await persist(
    'notes',
    () => clients.update(clientId, { goals: goals.value, notes: notes.value }),
    'Objetivos y notas guardados',
  );
  if (record) {
    goals.value = record.goals;
    notes.value = record.notes;
  }
}

async function saveAssessment(value: Record<string, unknown>) {
  const clientId = client.value?.id;
  if (!clientId) return;
  const record = await persist(
    'assessment',
    () => clients.update(clientId, { assessment: value }),
    'Evaluación guardada',
  );
  if (record) assessment.value = record.assessment;
}

function changeStatus(value: ClientStatus) {
  const current = client.value;
  if (!current || saving.value || current.status === value) return;

  const apply = async () => {
    if (current.id !== client.value?.id) return;
    await persist(
      'actions',
      () => clients.setStatus(current.id, value),
      'Estado actualizado',
    );
  };

  if (value === 'inactive') {
    const restore = () => {
      if (!saving.value && current.id === client.value?.id)
        status.value = client.value.status;
    };
    confirm.require({
      header: 'Inactivar cliente',
      message: `¿Inactivar a ${fullName(current)}? Su historial seguirá disponible.`,
      acceptProps: { label: 'Inactivar', severity: 'warn' },
      rejectProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
      defaultFocus: 'reject',
      onHide: restore,
      reject: restore,
      accept: apply,
    });
  } else void apply();
}

async function refreshClassUsed() {
  const id = client.value?.id;
  if (!id) return;
  try {
    const updated = await clients.get(id);
    if (client.value?.id !== id) return;
    client.value = {
      ...client.value,
      free_class_used: updated.free_class_used,
    };
    classUsed.value = updated.free_class_used;
  } catch (cause) {
    if (client.value?.id === id) notify.error((cause as PbError).message);
  }
}

function changeClassUsed(value: boolean) {
  const clientId = client.value?.id;
  if (!clientId || !isOwner.value || saving.value) return;
  classUsed.value = value;
  void persist(
    'actions',
    () => clients.update(clientId, { free_class_used: value }),
    'Primera clase gratis actualizada',
  );
}

function requestDelete() {
  const current = client.value;
  if (!current || !isOwner.value || saving.value) return;

  confirmDelete({
    message: `¿Eliminar a ${fullName(current)}?`,
    onConfirm: async () => {
      if (current.id !== client.value?.id || !isOwner.value || saving.value)
        return;
      const version = latestLoad;
      saving.value = true;
      delete errors.value.actions;
      try {
        await clients.remove(current.id);
        if (version !== latestLoad) return;
        notify.success('Cliente eliminado');
        await router.push({ name: 'clients' });
      } catch (cause) {
        if (version !== latestLoad) return;
        const error = cause as PbError;
        if (error.status === 409) historyConflict.value = true;
        else errors.value.actions = error;
      } finally {
        if (version === latestLoad) saving.value = false;
      }
    },
  });
}
</script>

<template>
  <section class="grid gap-5">
    <RouterLink
      :to="{ name: 'clients' }"
      class="w-fit text-sm font-medium text-primary hover:underline"
    >
      <i class="pi pi-arrow-left mr-1" aria-hidden="true" /> Volver a Clientes
    </RouterLink>

    <div
      v-if="loading"
      role="status"
      aria-label="Cargando cliente"
      class="grid place-items-center py-10"
    >
      <ProgressSpinner style="width: 2rem; height: 2rem" />
    </div>
    <Message v-else-if="loadError" severity="error" :closable="false">{{
      loadError.message
    }}</Message>
    <template v-else-if="client && details">
      <PageHeader :title="fullName(client)">
        <template #actions>
          <Button
            v-if="client.status !== 'inactive'"
            label="Inactivar"
            severity="secondary"
            outlined
            :disabled="saving"
            @click="changeStatus('inactive')"
          />
          <Button
            v-if="isOwner"
            label="Eliminar"
            severity="danger"
            outlined
            :disabled="saving"
            @click="requestDelete"
          />
        </template>
      </PageHeader>

      <div
        class="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-lg border border-surface-200 p-4 dark:border-surface-700"
      >
        <CatalogField :id="id + '-status'" label="Estado">
          <Select
            v-model="status"
            :input-id="id + '-status'"
            aria-label="Estado"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            option-disabled="disabled"
            :disabled="saving"
            class="min-w-32"
            @update:model-value="changeStatus"
          />
        </CatalogField>
        <div class="self-end pb-2">
          <ClientStatusTag :status="client.status" />
        </div>
        <div class="flex flex-wrap items-center gap-2 self-end pb-2">
          <label :for="id + '-free-class'" class="text-sm font-medium">
            Primera clase gratis
            {{ client.free_class_used ? 'usada' : 'disponible' }}
          </label>
          <ToggleSwitch
            :input-id="id + '-free-class'"
            :model-value="classUsed"
            :disabled="!isOwner || saving"
            @update:model-value="changeClassUsed"
          />
        </div>
      </div>

      <Message v-if="errors.actions" severity="error" :closable="false">
        {{
          Object.values(errors.actions.fields).join(' ') ||
          errors.actions.message
        }}
      </Message>
      <Message v-if="historyConflict" severity="warn" :closable="false">
        Tiene historial y debe conservarse.
        <Button
          v-if="client.status !== 'inactive'"
          label="Inactivar cliente"
          severity="warn"
          size="small"
          text
          :disabled="saving"
          @click="changeStatus('inactive')"
        />
      </Message>

      <Message v-if="coachingError" severity="error" :closable="false">
        No se pudo consultar Coaching. {{ coachingError }}
        <Button
          label="Reintentar"
          size="small"
          text
          @click="coachingRevision++"
        />
      </Message>
      <Tabs v-model:value="tab" scrollable>
        <TabList>
          <Tab value="details">Datos</Tab>
          <Tab value="notes">Objetivos y notas</Tab>
          <Tab value="assessment">Evaluación inicial</Tab>
          <Tab value="memberships">Membresías</Tab>
          <Tab v-if="showCoaching" value="coaching">Coaching</Tab>
          <Tab v-if="canManagePayments" value="payments">Pagos</Tab>
          <Tab value="history">Historial</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="details" class="grid gap-4">
            <Message
              v-if="
                errors.details && !Object.keys(errors.details.fields).length
              "
              severity="error"
              :closable="false"
              >{{ errors.details.message }}</Message
            >
            <ClientForm
              v-model="details"
              :client-id="client.id"
              mode="edit"
              :errors="errors.details?.fields"
              :busy="saving"
              @submit="saveDetails"
            />
          </TabPanel>
          <TabPanel value="notes">
            <form class="grid gap-4" @submit.prevent="saveNotes">
              <Message
                v-if="errors.notes && !Object.keys(errors.notes.fields).length"
                severity="error"
                :closable="false"
                >{{ errors.notes.message }}</Message
              >
              <CatalogField
                :id="id + '-goals'"
                label="Objetivos"
                :error="errors.notes?.fields.goals"
              >
                <template #default="{ describedBy }">
                  <Textarea
                    :id="id + '-goals'"
                    v-model="goals"
                    :aria-describedby="describedBy"
                    :invalid="!!errors.notes?.fields.goals"
                    :maxlength="2000"
                    :disabled="saving"
                    rows="4"
                    fluid
                  />
                </template>
              </CatalogField>
              <CatalogField
                :id="id + '-notes'"
                label="Notas internas"
                :error="errors.notes?.fields.notes"
              >
                <template #default="{ describedBy }">
                  <Textarea
                    :id="id + '-notes'"
                    v-model="notes"
                    :aria-describedby="describedBy"
                    :invalid="!!errors.notes?.fields.notes"
                    :maxlength="4000"
                    :disabled="saving"
                    rows="5"
                    fluid
                  />
                </template>
              </CatalogField>
              <div class="flex justify-end">
                <Button
                  type="submit"
                  label="Guardar objetivos y notas"
                  :loading="saving"
                />
              </div>
            </form>
          </TabPanel>
          <TabPanel value="assessment">
            <AssessmentForm
              :assessment="assessment"
              :assessor-id="user?.id ?? ''"
              :error="
                errors.assessment?.fields.assessment ??
                errors.assessment?.message
              "
              :busy="saving"
              @submit="saveAssessment"
            />
          </TabPanel>
          <TabPanel value="memberships">
            <ClientMemberships
              v-if="tab === 'memberships'"
              :key="client.id"
              :client="client.id"
              @changed="coachingRevision++"
            />
          </TabPanel>
          <TabPanel v-if="showCoaching" value="coaching">
            <ClientCoaching
              v-if="tab === 'coaching'"
              :key="client.id"
              :client="client.id"
              :programs="coachingPrograms"
              :has-active-membership="hasActiveOnlineMembership"
              @changed="coachingRevision++"
            />
          </TabPanel>
          <TabPanel v-if="canManagePayments" value="payments">
            <ClientPayments
              v-if="tab === 'payments'"
              :key="client.id"
              :client="client"
            />
          </TabPanel>
          <TabPanel value="history">
            <ClientHistoryTab
              v-if="tab === 'history'"
              :client-id="client.id"
              :client="client"
              @changed="refreshClassUsed"
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </section>
</template>
