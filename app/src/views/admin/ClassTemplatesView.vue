<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import { useAuth } from '@/composables/useAuth';
import { useNotify } from '@/composables/useNotify';
import { useSchedule } from '@/composables/useSchedule';
import { useServices } from '@/composables/useServices';
import type { PbError } from '@/lib/pb-errors';
import {
  weekdayLabel,
  type ClassTemplate,
  type ClassTemplateInput,
} from '@/lib/schedule-week';

const route = useRoute();
const { isOwner } = useAuth();
const notify = useNotify();
const schedule = useSchedule();
const catalog = useServices();
const days = Array.from({ length: 7 }, (_, value) => ({
  value,
  label: weekdayLabel(value),
}));
const services = computed(() =>
  catalog.items.value.map(({ id, name, active }) => ({
    value: id,
    label: name,
    active,
  })),
);
const templates = computed(() => {
  const coach = route.query.coach;
  return typeof coach === 'string' && coach
    ? schedule.templates.value.filter((row) => row.coach === coach)
    : schedule.templates.value;
});
const hasUnassigned = computed(() => templates.value.some((row) => !row.coach));
const coachOptions = computed(() => [
  { label: 'Sin coach', value: '' },
  ...catalog.coachOptions.value,
]);
const applyToFuture = ref<Record<string, boolean>>({});
const busy = ref(false);
const editing = ref(false);
const editingId = ref('');
const fields = ref<Record<string, string>>({});
const emptyDraft = (): ClassTemplateInput => ({
  weekday: 0,
  service: '',
  start_time: '09:00',
  duration_min: 60,
  capacity: 1,
  active: true,
  coach: '',
});
const draft = ref(emptyDraft());

onMounted(() => {
  void schedule.loadTemplates();
  void catalog.load();
  if (isOwner.value) void catalog.loadCoaches();
});

function serviceLabel(row: ClassTemplate) {
  return (
    row.expand?.service?.name ??
    services.value.find((item) => item.value === row.service)?.label ??
    'Servicio'
  );
}

function coachLabel(row: ClassTemplate) {
  return (
    row.expand?.coach?.name ||
    row.expand?.coach?.email ||
    (row.coach ? 'Coach asignado' : 'Sin coach')
  );
}

function edit(row?: ClassTemplate) {
  editingId.value = row?.id ?? '';
  if (row) {
    const {
      weekday,
      service,
      start_time,
      duration_min,
      capacity,
      active,
      coach,
    } = row;
    draft.value = {
      weekday,
      service,
      start_time,
      duration_min,
      capacity,
      active,
      coach,
    };
  } else {
    draft.value = emptyDraft();
  }
  fields.value = {};
  editing.value = true;
}

async function run(operation: () => Promise<string>) {
  if (busy.value) return;
  busy.value = true;
  fields.value = {};
  try {
    notify.success(await operation());
  } catch (cause) {
    const error = cause as PbError;
    fields.value = error.fields;
    notify.error(error.message);
  } finally {
    busy.value = false;
  }
}

function save() {
  return run(async () => {
    if (editingId.value) {
      await schedule.updateTemplate(editingId.value, draft.value);
    } else {
      await schedule.createTemplate(draft.value);
    }
    editing.value = false;
    return 'Plantilla guardada';
  });
}

function toggle(row: ClassTemplate, active: boolean) {
  return run(async () => {
    await schedule.updateTemplate(row.id, { active });
    return active ? 'Plantilla activada' : 'Plantilla desactivada';
  });
}

function assign(row: ClassTemplate, coach: string) {
  return run(async () => {
    const { updated_sessions } = await schedule.assignCoach(
      row.id,
      coach,
      !!applyToFuture.value[row.id],
    );
    await schedule.loadTemplates();
    return `Asignación guardada · Sesiones actualizadas: ${updated_sessions}`;
  });
}
</script>

<template>
  <div class="grid gap-5">
    <PageHeader title="Plantillas de clases">
      <template v-if="isOwner" #actions>
        <Button label="Nueva plantilla" icon="pi pi-plus" @click="edit()" />
      </template>
    </PageHeader>
    <Message
      v-if="
        schedule.error.value ||
        catalog.error.value ||
        catalog.coachesError.value
      "
      severity="error"
      :closable="false"
    >
      {{
        (
          schedule.error.value ??
          catalog.error.value ??
          catalog.coachesError.value
        )?.message
      }}
    </Message>
    <Message v-if="hasUnassigned" severity="warn" :closable="false">
      Las plantillas sin coach asignado usan el coach predeterminado del
      servicio cuando está disponible.
    </Message>
    <DataTable
      :value="templates"
      :loading="schedule.loading.value"
      data-key="id"
      row-group-mode="subheader"
      group-rows-by="weekday"
      scrollable
    >
      <template #empty>Sin plantillas</template>
      <template #groupheader="{ data }">
        <span class="font-semibold">{{ weekdayLabel(data.weekday) }}</span>
      </template>
      <Column field="start_time" header="Hora" />
      <Column header="Servicio">
        <template #body="{ data }">{{ serviceLabel(data) }}</template>
      </Column>
      <Column header="Duración">
        <template #body="{ data }">{{ data.duration_min }} min</template>
      </Column>
      <Column field="capacity" header="Cupo" />
      <Column header="Coach">
        <template #body="{ data }">
          <div v-if="isOwner" class="grid min-w-44 gap-2">
            <Select
              :model-value="data.coach"
              :aria-label="
                'Coach de la plantilla ' +
                weekdayLabel(data.weekday) +
                ' ' +
                data.start_time
              "
              :options="coachOptions"
              option-label="label"
              option-value="value"
              :placeholder="coachLabel(data)"
              :disabled="busy"
              @update:model-value="assign(data, $event)"
            />
            <label class="flex items-center gap-2 text-sm">
              <input
                v-model="applyToFuture[data.id]"
                type="checkbox"
                :disabled="busy"
              />
              Aplicar también a sesiones futuras
            </label>
            <Button
              v-if="applyToFuture[data.id] && data.coach"
              label="Aplicar coach actual"
              size="small"
              severity="secondary"
              text
              :disabled="busy"
              @click="assign(data, data.coach)"
            />
          </div>
          <span v-else>{{ coachLabel(data) }}</span>
        </template>
      </Column>
      <Column header="Estado">
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <ToggleSwitch
              v-if="isOwner"
              :model-value="data.active"
              :disabled="busy"
              :aria-label="
                'Activar plantilla de ' +
                weekdayLabel(data.weekday) +
                ' ' +
                data.start_time
              "
              @update:model-value="toggle(data, $event)"
            />
            <span>{{ data.active ? 'Activa' : 'Inactiva' }}</span>
          </div>
        </template>
      </Column>
      <Column v-if="isOwner" header="Acciones">
        <template #body="{ data }">
          <Button
            label="Editar"
            severity="secondary"
            text
            :disabled="busy"
            @click="edit(data)"
          />
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="editing"
      modal
      class="w-full max-w-lg"
      :header="editingId ? 'Editar plantilla' : 'Nueva plantilla'"
    >
      <form class="grid gap-4" @submit.prevent="save">
        <CatalogField
          id="template-service"
          label="Servicio"
          :error="fields.service"
        >
          <Select
            v-model="draft.service"
            input-id="template-service"
            :options="
              services.filter(
                (item) => item.active || item.value === draft.service,
              )
            "
            option-label="label"
            option-value="value"
          />
        </CatalogField>
        <div class="grid grid-cols-2 gap-3">
          <CatalogField
            id="template-weekday"
            label="Día"
            :error="fields.weekday"
          >
            <Select
              v-model="draft.weekday"
              input-id="template-weekday"
              :options="days"
              option-label="label"
              option-value="value"
            />
          </CatalogField>
          <CatalogField
            id="template-time"
            label="Hora en Miramar"
            :error="fields.start_time"
          >
            <InputText
              id="template-time"
              v-model="draft.start_time"
              type="time"
              required
            />
          </CatalogField>
          <CatalogField
            id="template-duration"
            label="Duración (minutos)"
            :error="fields.duration_min"
          >
            <InputNumber
              v-model="draft.duration_min"
              input-id="template-duration"
              :min="15"
              :max="240"
              fluid
            />
          </CatalogField>
          <CatalogField
            id="template-capacity"
            label="Cupo"
            :error="fields.capacity"
          >
            <InputNumber
              v-model="draft.capacity"
              input-id="template-capacity"
              :min="1"
              fluid
            />
          </CatalogField>
        </div>
        <CatalogField
          v-if="!editingId"
          id="template-coach"
          label="Coach"
          :error="fields.coach"
        >
          <Select
            v-model="draft.coach"
            input-id="template-coach"
            :options="coachOptions"
            option-label="label"
            option-value="value"
          />
        </CatalogField>
        <label class="flex items-center gap-2">
          <ToggleSwitch v-model="draft.active" /> Activa
        </label>
        <div class="flex justify-end gap-2">
          <Button
            label="Cerrar"
            severity="secondary"
            outlined
            :disabled="busy"
            @click="editing = false"
          />
          <Button type="submit" label="Guardar plantilla" :loading="busy" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
