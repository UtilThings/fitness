<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { computed, onMounted, ref } from 'vue';
import CatalogActiveSwitch from '@/components/catalog/CatalogActiveSwitch.vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import CatalogRowActions from '@/components/catalog/CatalogRowActions.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusTag from '@/components/StatusTag.vue';
import { ACTIVE_STATUS } from '@/components/team/team-labels';
import { useCatalogActions } from '@/composables/useCatalogActions';
import { useNotify } from '@/composables/useNotify';
import { useServices } from '@/composables/useServices';
import {
  kindLabel,
  policyLabel,
  serviceSlug,
  validateServiceForm,
  type Service,
  type ServiceForm,
} from '@/lib/catalog';
import type { PbError } from '@/lib/pb-errors';

const services = useServices();
const { items, loading, error, coachOptions, coachesError } = services;
const actions = useCatalogActions<Service>(services);
const { canManage, busy } = actions;
const confirm = useConfirm();
const notify = useNotify();
const editing = ref<Service>();
const form = ref<ServiceForm>(blankService());
const fields = ref<Record<string, string>>({});
const formError = ref('');
const visible = ref(false);
const saving = ref(false);
const checkingPlans = ref(false);
const customSlug = ref(false);
const kindOptions = computed(() =>
  Object.entries(kindLabel.value).map(([value, label]) => ({
    value,
    label,
  })),
);
const availableCoaches = computed(() => {
  const current = editing.value?.default_coach;
  if (current && !coachOptions.value.some(({ value }) => value === current)) {
    const coach = editing.value?.expand?.default_coach;
    return [
      ...coachOptions.value,
      {
        value: current,
        label: coach?.name || coach?.email || t('Assigned coach'),
      },
    ];
  }
  return coachOptions.value;
});

onMounted(services.load);

function blankService(): ServiceForm {
  return {
    name: '',
    slug: '',
    kind: 'personal',
    description: '',
    capacity: 1,
    cancellation_hours: 24,
    default_coach: '',
  };
}

function openEditor(service?: Service) {
  editing.value = service;
  form.value = service
    ? {
        name: service.name,
        slug: service.slug,
        kind: service.kind,
        description: service.description,
        capacity: service.capacity,
        cancellation_hours: service.cancellation_hours,
        default_coach: service.default_coach,
      }
    : blankService();
  fields.value = {};
  formError.value = '';
  customSlug.value = false;
  visible.value = true;
  void services.loadCoaches();
}

function updateName(name: string | undefined) {
  form.value.name = name ?? '';
  if (!editing.value && !customSlug.value)
    form.value.slug = serviceSlug(form.value.name);
}

function updateSlug(slug: string | undefined) {
  customSlug.value = true;
  form.value.slug = slug ?? '';
}

function updateKind(kind: ServiceForm['kind']) {
  form.value.kind = kind;
  if (kind === 'online') form.value.capacity = 0;
  else if (!form.value.capacity) form.value.capacity = 1;
}

async function save() {
  if (!canManage.value || saving.value) return;
  const { slug, ...otherFields } = form.value;
  fields.value = validateServiceForm(form.value);
  formError.value = '';
  if (Object.keys(fields.value).length) return;
  saving.value = true;
  try {
    await services.save(
      {
        ...otherFields,
        name: otherFields.name.trim(),
        default_coach: otherFields.default_coach || '',
        ...(editing.value ? {} : { slug }),
      },
      editing.value?.id,
    );
    visible.value = false;
    notify.success(t('Service saved'));
  } catch (cause) {
    const error = cause as PbError;
    fields.value = error.fields;
    formError.value = error.message;
  } finally {
    saving.value = false;
  }
}

async function requestActive(service: Service, active: boolean) {
  if (busy.value || checkingPlans.value) return;
  if (active) return actions.changeActive(service, true);

  checkingPlans.value = true;
  try {
    const count = await services.countActivePlans(service.id);
    confirm.require({
      header: t('Deactivate service'),
      message: t(
        '1 plan for «{name}» will also be deactivated. | {count} plans for «{name}» will also be deactivated.',
        { name: service.name, count },
        count,
      ),
      acceptProps: { label: t('Deactivate'), severity: 'warn' },
      rejectProps: {
        label: t('Cancel'),
        severity: 'secondary',
        outlined: true,
      },
      defaultFocus: 'reject',
      accept: () => actions.changeActive(service, false),
    });
  } catch (cause) {
    notify.error((cause as PbError).message);
  } finally {
    checkingPlans.value = false;
  }
}
</script>

<template>
  <div class="grid gap-5">
    <PageHeader :title="t('Services')">
      <template v-if="canManage" #actions>
        <Button
          :label="t('New service')"
          icon="pi pi-plus"
          :disabled="busy"
          @click="openEditor()"
        />
      </template>
    </PageHeader>

    <div v-if="error" class="flex flex-wrap items-center gap-3" role="alert">
      <span>{{ error.message }}</span>
      <Button
        :label="t('Retry')"
        severity="secondary"
        outlined
        @click="services.load()"
      />
    </div>
    <EmptyState
      v-else-if="!loading && !items.length"
      icon="pi pi-briefcase"
      :title="t('No services')"
    />
    <DataTable v-else :value="items" data-key="id" :loading="loading">
      <Column field="name" :header="t('Name')" />
      <Column :header="t('Type')">
        <template #body="{ data }"
          ><Tag :value="kindLabel[(data as Service).kind]" severity="secondary"
        /></template>
      </Column>
      <Column field="capacity" :header="t('Capacity')" />
      <Column :header="t('Cancellation policy')">
        <template #body="{ data }">{{
          policyLabel(data.cancellation_hours)
        }}</template>
      </Column>
      <Column :header="t('Default coach')">
        <template #body="{ data }">{{
          data.expand?.default_coach?.name ||
          data.expand?.default_coach?.email ||
          '—'
        }}</template>
      </Column>
      <Column :header="t('Status')">
        <template #body="{ data }">
          <CatalogActiveSwitch
            v-if="canManage"
            :name="data.name"
            :active="data.active"
            :disabled="busy || checkingPlans"
            @change="requestActive(data, $event)"
          />
          <StatusTag v-else :value="String(data.active)" :map="ACTIVE_STATUS" />
        </template>
      </Column>
      <Column :header="t('Order')">
        <template #body="{ index }">{{ index + 1 }}</template>
      </Column>
      <Column v-if="canManage" :header="t('Actions')">
        <template #body="{ data, index }">
          <CatalogRowActions
            :name="data.name"
            :busy="busy || checkingPlans"
            :can-move-up="index > 0"
            :can-move-down="index < items.length - 1"
            @move="actions.move(data, $event)"
            @edit="openEditor(data)"
            @remove="actions.remove(data, (row) => requestActive(row, false))"
          />
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-if="canManage"
      v-model:visible="visible"
      :header="editing ? t('Edit service') : t('New service')"
      modal
      :closable="!saving"
      :close-on-escape="!saving"
      class="w-[min(34rem,calc(100%-2rem))]"
    >
      <form class="grid gap-4" @submit.prevent="save">
        <p v-if="formError" role="alert" class="text-red-600 dark:text-red-400">
          {{ formError }}
        </p>
        <CatalogField
          id="service-name"
          v-slot="{ describedBy }"
          :label="t('Name')"
          :error="fields.name"
        >
          <InputText
            id="service-name"
            :model-value="form.name"
            :invalid="!!fields.name"
            :aria-describedby="describedBy"
            maxlength="80"
            @update:model-value="updateName"
          />
        </CatalogField>
        <CatalogField
          id="service-slug"
          v-slot="{ describedBy }"
          :label="t('Slug')"
          :error="fields.slug"
        >
          <InputText
            id="service-slug"
            :model-value="form.slug"
            :readonly="!!editing"
            :invalid="!!fields.slug"
            :aria-describedby="describedBy"
            @update:model-value="updateSlug"
          />
        </CatalogField>
        <CatalogField id="service-kind" :label="t('Type')" :error="fields.kind">
          <Select
            input-id="service-kind"
            :model-value="form.kind"
            :options="kindOptions"
            option-label="label"
            option-value="value"
            :invalid="!!fields.kind"
            @update:model-value="updateKind"
          />
        </CatalogField>
        <CatalogField
          id="service-description"
          v-slot="{ describedBy }"
          :label="t('Description')"
          :error="fields.description"
        >
          <Textarea
            id="service-description"
            v-model="form.description"
            :invalid="!!fields.description"
            :aria-describedby="describedBy"
            maxlength="500"
            rows="2"
          />
        </CatalogField>
        <div class="grid gap-4 sm:grid-cols-2">
          <CatalogField
            id="service-capacity"
            :label="t('Capacity')"
            :error="fields.capacity"
          >
            <InputNumber
              v-model="form.capacity"
              input-id="service-capacity"
              :disabled="form.kind === 'online'"
              :invalid="!!fields.capacity"
              :use-grouping="false"
              class="min-w-0"
            />
          </CatalogField>
          <CatalogField
            id="service-cancellation"
            :label="t('Minimum notice (h)')"
            help="Personal 24 h, grupal 12 h."
            :error="fields.cancellation_hours"
          >
            <InputNumber
              v-model="form.cancellation_hours"
              input-id="service-cancellation"
              :invalid="!!fields.cancellation_hours"
              :use-grouping="false"
              class="min-w-0"
            />
          </CatalogField>
        </div>
        <CatalogField
          id="service-coach"
          :label="t('Default coach')"
          :error="fields.default_coach || coachesError?.message"
        >
          <Select
            v-model="form.default_coach"
            input-id="service-coach"
            :options="availableCoaches"
            option-label="label"
            option-value="value"
            :placeholder="t('No coach assigned')"
            show-clear
            :invalid="!!fields.default_coach"
          />
        </CatalogField>
        <div class="flex justify-end gap-2">
          <Button
            type="button"
            :label="t('Cancel')"
            severity="secondary"
            text
            :disabled="saving"
            @click="visible = false"
          />
          <Button type="submit" :label="t('Save')" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
