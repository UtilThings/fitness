<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import ToggleSwitch from 'primevue/toggleswitch';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CatalogActiveSwitch from '@/components/catalog/CatalogActiveSwitch.vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import CatalogRowActions from '@/components/catalog/CatalogRowActions.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusTag from '@/components/StatusTag.vue';
import { ACTIVE_STATUS } from '@/components/team/team-labels';
import { useCatalogActions } from '@/composables/useCatalogActions';
import { useNotify } from '@/composables/useNotify';
import { usePlans } from '@/composables/usePlans';
import { useServices } from '@/composables/useServices';
import {
  billingUnitLabel,
  formatCents,
  validatePlanForm,
  type Plan,
  type PlanForm,
} from '@/lib/catalog';
import { businessCurrency } from '@/lib/business-session';
import { centsToDecimal, parseUsdToCents } from '@/lib/money';
import type { PbError } from '@/lib/pb-errors';

const route = useRoute();
const router = useRouter();
const plans = usePlans();
const services = useServices();
const { items, loading, error } = plans;
const actions = useCatalogActions<Plan>(plans);
const { canManage, busy } = actions;
const notify = useNotify();

const serviceFilter = computed(() =>
  typeof route.query.service === 'string' ? route.query.service : undefined,
);
const serviceById = computed(
  () => new Map(services.items.value.map((service) => [service.id, service])),
);
const serviceOptions = computed(() =>
  services.items.value.map(({ id, name }) => ({ value: id, label: name })),
);
const unitOptions = computed(() =>
  Object.entries(billingUnitLabel.value).map(([value, label]) => ({
    value,
    label,
  })),
);

const groups = computed(() => {
  const grouped = new Map(
    services.items.value.map(({ id }) => [id, [] as Plan[]]),
  );
  for (const plan of items.value) {
    const group = grouped.get(plan.service);
    if (group) group.push(plan);
    else grouped.set(plan.service, [plan]);
  }
  return grouped;
});
const rows = computed(() => [...groups.value.values()].flat());
const positions = computed(
  () =>
    new Map(
      [...groups.value.values()].flatMap((group) =>
        group.map(
          (plan, index) => [plan.id, { index, count: group.length }] as const,
        ),
      ),
    ),
);

const editing = ref<Plan>();
const form = ref<Omit<PlanForm, 'price_cents'>>(blankPlan());
const price = ref('');
const fields = ref<Record<string, string>>({});
const formError = ref('');
const visible = ref(false);
const saving = ref(false);
const selectedService = computed(() =>
  serviceById.value.get(form.value.service),
);

onMounted(services.load);
watch(serviceFilter, (id) => plans.load(id), { immediate: true });

function filterByService(service: string | null) {
  return router.replace({
    query: { ...route.query, service: service || undefined },
  });
}

function blankPlan(service = ''): Omit<PlanForm, 'price_cents'> {
  return {
    service,
    name: '',
    billing_unit: 'per_4_weeks',
    sessions: 0,
    per_week: 0,
    commitment_periods: 0,
    is_first_class: false,
    partner: false,
    note: '',
    active: !service || serviceById.value.get(service)?.active === true,
  };
}

function openEditor(plan?: Plan) {
  editing.value = plan;
  form.value = plan
    ? {
        service: plan.service,
        name: plan.name,
        billing_unit: plan.billing_unit,
        sessions: plan.sessions,
        per_week: plan.per_week,
        commitment_periods: plan.commitment_periods,
        is_first_class: plan.is_first_class,
        partner: plan.partner,
        note: plan.note,
        active: plan.active,
      }
    : blankPlan(serviceFilter.value);
  price.value = plan ? centsToDecimal(plan.price_cents) : '';
  fields.value = {};
  formError.value = '';
  visible.value = true;
}

function setFirstClass(firstClass: boolean) {
  form.value.is_first_class = firstClass;
  price.value = firstClass ? '0.00' : '';
  form.value.billing_unit = firstClass ? 'first_visit' : 'per_4_weeks';
}

function setService(id: string) {
  form.value.service = id;
  if (!selectedService.value?.active) form.value.active = false;
}

function serviceIsActive(plan: Plan) {
  return (
    (serviceById.value.get(plan.service) ?? plan.expand?.service)?.active ===
    true
  );
}

async function save() {
  if (!canManage.value || saving.value) return;
  const data: PlanForm = {
    ...form.value,
    name: form.value.name.trim(),
    price_cents: parseUsdToCents(price.value),
  };
  fields.value = validatePlanForm(data, selectedService.value);
  formError.value = '';
  if (Object.keys(fields.value).length) return;
  saving.value = true;
  try {
    await plans.save({ ...data }, editing.value?.id);
    visible.value = false;
    notify.success('Plan guardado');
  } catch (cause) {
    const error = cause as PbError;
    fields.value = error.fields;
    formError.value = error.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="grid gap-5">
    <PageHeader title="Planes">
      <template v-if="canManage" #actions>
        <Button
          label="Nuevo plan"
          icon="pi pi-plus"
          :disabled="busy || !services.items.value.length"
          @click="openEditor()"
        />
      </template>
    </PageHeader>

    <Select
      :model-value="serviceFilter"
      :options="serviceOptions"
      option-label="label"
      option-value="value"
      aria-label="Filtrar por servicio"
      placeholder="Todos los servicios"
      class="w-full sm:w-72"
      show-clear
      @update:model-value="filterByService"
    />
    <div
      v-if="services.error.value"
      class="flex flex-wrap items-center gap-3"
      role="alert"
    >
      <span>{{ services.error.value.message }}</span>
      <Button
        label="Recargar servicios"
        severity="secondary"
        outlined
        @click="services.load()"
      />
    </div>
    <div v-if="error" class="flex flex-wrap items-center gap-3" role="alert">
      <span>{{ error.message }}</span>
      <Button
        label="Reintentar"
        severity="secondary"
        outlined
        @click="plans.load(serviceFilter)"
      />
    </div>
    <EmptyState
      v-else-if="!loading && !rows.length"
      icon="pi pi-tags"
      title="No hay planes para mostrar"
    />
    <DataTable v-else :value="rows" data-key="id" :loading="loading">
      <Column header="Servicio">
        <template #body="{ data }">{{
          serviceById.get(data.service)?.name ||
          data.expand?.service?.name ||
          '—'
        }}</template>
      </Column>
      <Column field="name" header="Nombre" />
      <Column header="Precio">
        <template #body="{ data }">{{
          formatCents(data.price_cents)
        }}</template>
      </Column>
      <Column header="Unidad">
        <template #body="{ data }">{{
          billingUnitLabel[(data as Plan).billing_unit]
        }}</template>
      </Column>
      <Column field="sessions" header="Sesiones" />
      <Column header="Frecuencia">
        <template #body="{ data }">{{
          data.per_week ? data.per_week + ' por semana' : '—'
        }}</template>
      </Column>
      <Column header="Compromiso">
        <template #body="{ data }">{{
          data.commitment_periods
            ? data.commitment_periods * 4 + ' semanas'
            : '—'
        }}</template>
      </Column>
      <Column header="Características">
        <template #body="{ data }">
          <div class="flex flex-wrap gap-1">
            <Tag
              v-if="data.is_first_class"
              value="Primera clase"
              severity="info"
            />
            <Tag v-if="data.partner" value="Partner" severity="secondary" />
            <span v-if="!data.is_first_class && !data.partner">—</span>
          </div>
        </template>
      </Column>
      <Column header="Estado">
        <template #body="{ data }">
          <template v-if="canManage">
            <CatalogActiveSwitch
              :name="data.name"
              :active="data.active"
              :disabled="busy || (!data.active && !serviceIsActive(data))"
              @change="actions.changeActive(data, $event)"
            />
            <small v-if="!serviceIsActive(data)" class="block text-muted-color"
              >Servicio inactivo</small
            >
          </template>
          <StatusTag v-else :value="String(data.active)" :map="ACTIVE_STATUS" />
        </template>
      </Column>
      <Column header="Orden">
        <template #body="{ data }">{{
          (positions.get(data.id)?.index ?? 0) + 1
        }}</template>
      </Column>
      <Column v-if="canManage" header="Acciones">
        <template #body="{ data }">
          <CatalogRowActions
            :name="data.name"
            :busy="busy"
            :can-move-up="(positions.get(data.id)?.index ?? 0) > 0"
            :can-move-down="
              (positions.get(data.id)?.index ?? 0) + 1 <
              (positions.get(data.id)?.count ?? 0)
            "
            @move="actions.move(data, $event)"
            @edit="openEditor(data)"
            @remove="
              actions.remove(data, (row) => actions.changeActive(row, false))
            "
          />
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-if="canManage"
      v-model:visible="visible"
      :header="editing ? 'Editar plan' : 'Nuevo plan'"
      modal
      :closable="!saving"
      :close-on-escape="!saving"
      class="w-[min(38rem,calc(100%-2rem))]"
    >
      <form class="grid gap-4" @submit.prevent="save">
        <p v-if="formError" role="alert" class="text-red-600 dark:text-red-400">
          {{ formError }}
        </p>
        <CatalogField
          id="plan-service"
          label="Servicio"
          :error="fields.service"
        >
          <Select
            input-id="plan-service"
            :model-value="form.service || undefined"
            :options="serviceOptions"
            option-label="label"
            option-value="value"
            placeholder="Selecciona un servicio"
            :invalid="!!fields.service"
            @update:model-value="setService"
          />
        </CatalogField>
        <CatalogField
          id="plan-name"
          v-slot="{ describedBy }"
          label="Nombre"
          :error="fields.name"
        >
          <InputText
            id="plan-name"
            v-model="form.name"
            :invalid="!!fields.name"
            :aria-describedby="describedBy"
            maxlength="80"
          />
        </CatalogField>
        <div class="grid gap-4 sm:grid-cols-2">
          <CatalogField
            id="plan-price"
            v-slot="{ describedBy }"
            :label="`Precio (${businessCurrency})`"
            :error="fields.price_cents"
          >
            <InputText
              id="plan-price"
              v-model="price"
              inputmode="decimal"
              placeholder="0.00"
              :disabled="form.is_first_class"
              :invalid="!!fields.price_cents"
              :aria-describedby="describedBy"
            />
          </CatalogField>
          <CatalogField
            id="plan-unit"
            label="Unidad de cobro"
            :error="fields.billing_unit"
          >
            <Select
              v-model="form.billing_unit"
              input-id="plan-unit"
              :options="unitOptions"
              option-label="label"
              option-value="value"
              :disabled="form.is_first_class"
              :invalid="!!fields.billing_unit"
            />
          </CatalogField>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <CatalogField
            id="plan-sessions"
            label="Sesiones"
            :error="fields.sessions"
          >
            <InputNumber
              v-model="form.sessions"
              input-id="plan-sessions"
              fluid
              input-class="min-w-0"
              :invalid="!!fields.sessions"
              :use-grouping="false"
              class="min-w-0"
            />
          </CatalogField>
          <CatalogField
            id="plan-frequency"
            v-slot="{ describedBy }"
            label="Frecuencia"
            help="Sesiones por semana"
            :error="fields.per_week"
          >
            <InputNumber
              v-model="form.per_week"
              input-id="plan-frequency"
              fluid
              input-class="min-w-0"
              :pt="{
                pcInputText: { root: { 'aria-describedby': describedBy } },
              }"
              :invalid="!!fields.per_week"
              :use-grouping="false"
              class="min-w-0"
            />
          </CatalogField>
          <CatalogField
            id="plan-commitment"
            v-slot="{ describedBy }"
            label="Compromiso"
            help="Periodos de 4 semanas"
            :error="fields.commitment_periods"
          >
            <InputNumber
              v-model="form.commitment_periods"
              input-id="plan-commitment"
              fluid
              input-class="min-w-0"
              :pt="{
                pcInputText: { root: { 'aria-describedby': describedBy } },
              }"
              :invalid="!!fields.commitment_periods"
              :use-grouping="false"
              class="min-w-0"
            />
          </CatalogField>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <CatalogField
            id="plan-first"
            label="Primera clase"
            :error="fields.is_first_class"
          >
            <ToggleSwitch
              input-id="plan-first"
              :model-value="form.is_first_class"
              :invalid="!!fields.is_first_class"
              @update:model-value="setFirstClass"
            />
          </CatalogField>
          <CatalogField
            id="plan-partner"
            label="Partner"
            :error="fields.partner"
          >
            <ToggleSwitch v-model="form.partner" input-id="plan-partner" />
          </CatalogField>
          <CatalogField
            id="plan-active"
            label="Activo"
            :error="fields.active"
            :help="
              selectedService?.active === false
                ? 'El servicio está inactivo.'
                : undefined
            "
          >
            <ToggleSwitch
              v-model="form.active"
              input-id="plan-active"
              :disabled="!selectedService?.active"
              :invalid="!!fields.active"
            />
          </CatalogField>
        </div>
        <CatalogField
          id="plan-note"
          v-slot="{ describedBy }"
          label="Nota"
          :error="fields.note"
        >
          <Textarea
            id="plan-note"
            v-model="form.note"
            :invalid="!!fields.note"
            :aria-describedby="describedBy"
            maxlength="300"
            rows="2"
          />
        </CatalogField>
        <div class="flex justify-end gap-2">
          <Button
            type="button"
            label="Cancelar"
            severity="secondary"
            text
            :disabled="saving"
            @click="visible = false"
          />
          <Button type="submit" label="Guardar" :loading="saving" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
