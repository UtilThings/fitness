<script setup lang="ts">
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { onMounted, ref } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import { useAuth } from '@/composables/useAuth';
import { useConfirmDelete } from '@/composables/useConfirmDelete';
import { useNotify } from '@/composables/useNotify';
import { useSchedule } from '@/composables/useSchedule';
import { todayLocal } from '@/lib/datetime';
import type { PbError } from '@/lib/pb-errors';
import type { ScheduleBlock, ScheduleBlockInput } from '@/lib/schedule-week';

const { isOwner } = useAuth();
const schedule = useSchedule();
const notify = useNotify();
const confirm = useConfirm();
const { confirmDelete } = useConfirmDelete();
const editing = ref(false);
const editingId = ref('');
const busy = ref(false);
const fields = ref<Record<string, string>>({});
const draft = ref({
  title: '',
  from: null as Date | null,
  to: null as Date | null,
  reason: '',
});

onMounted(() => void schedule.loadBlocks());

function edit(block?: ScheduleBlock) {
  editingId.value = block?.id ?? '';
  // DatePicker works with civil values in the browser. The time zone is applied only
  // when useSchedule queries the affected sessions in Miramar.
  const from = new Date((block?.date_from ?? todayLocal()) + 'T12:00:00');
  const to = new Date((block?.date_to ?? todayLocal()) + 'T12:00:00');
  draft.value = {
    title: block?.title ?? '',
    from,
    to,
    reason: block?.reason ?? '',
  };
  fields.value = {};
  editing.value = true;
}

function pickerDate(value: Date | null) {
  if (!value || !Number.isFinite(value.getTime())) return '';
  return [
    String(value.getFullYear()).padStart(4, '0'),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

async function run(operation: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  fields.value = {};
  try {
    await operation();
  } catch (cause) {
    const error = cause as PbError;
    fields.value = error.fields;
    notify.error(error.message);
  } finally {
    busy.value = false;
  }
}

function preview() {
  const id = editingId.value;
  const input: ScheduleBlockInput = {
    title: draft.value.title.trim(),
    reason: draft.value.reason.trim(),
    date_from: pickerDate(draft.value.from),
    date_to: pickerDate(draft.value.to),
  };
  fields.value = {};
  if (!input.date_from) fields.value.date_from = 'Indica la fecha inicial.';
  if (!input.date_to || input.date_to < input.date_from) {
    fields.value.date_to = 'Indica una fecha igual o posterior a la inicial.';
  }
  if (!input.title) fields.value.title = 'Escribe un título.';
  if (Object.keys(fields.value).length) return;

  return run(async () => {
    const count = await schedule.countBlockSessions(
      input.date_from,
      input.date_to,
    );
    if (!editing.value || editingId.value !== id) return;
    confirm.require({
      header: 'Confirmar bloqueo',
      message:
        count === 1
          ? 'Se cancelará 1 sesión.'
          : `Se cancelarán ${count} sesiones.`,
      acceptProps: { label: 'Guardar bloqueo' },
      rejectProps: { label: 'Volver', severity: 'secondary', outlined: true },
      defaultFocus: 'reject',
      accept: () =>
        void run(async () => {
          if (id) await schedule.updateBlock(id, input);
          else await schedule.createBlock(input);
          editing.value = false;
          notify.success('Bloqueo guardado');
        }),
    });
  });
}

function remove(block: ScheduleBlock) {
  confirmDelete({
    message: `¿Eliminar «${block.title}»? Las sesiones ya canceladas seguirán canceladas.`,
    onConfirm: () =>
      run(async () => {
        await schedule.deleteBlock(block.id);
        notify.success('Bloqueo eliminado');
      }),
  });
}
</script>

<template>
  <div class="grid gap-5">
    <PageHeader title="Bloqueos de horario">
      <template v-if="isOwner" #actions>
        <Button label="Nuevo bloqueo" icon="pi pi-plus" @click="edit()" />
      </template>
    </PageHeader>
    <Message v-if="schedule.error.value" severity="error" :closable="false">
      {{ schedule.error.value.message }}
    </Message>
    <DataTable
      :value="schedule.blocks.value"
      :loading="schedule.loading.value"
      data-key="id"
      scrollable
    >
      <template #empty>Sin bloqueos</template>
      <Column field="title" header="Título" />
      <Column field="date_from" header="Desde" />
      <Column field="date_to" header="Hasta (inclusive)" />
      <Column field="reason" header="Motivo" />
      <Column v-if="isOwner" header="Acciones">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              label="Editar"
              severity="secondary"
              text
              :disabled="busy"
              @click="edit(data)"
            />
            <Button
              label="Eliminar"
              severity="danger"
              text
              :disabled="busy"
              @click="remove(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="editing"
      modal
      class="w-full max-w-lg"
      :header="editingId ? 'Editar bloqueo' : 'Nuevo bloqueo'"
    >
      <form class="grid gap-4" @submit.prevent="preview">
        <CatalogField id="block-title" label="Título" :error="fields.title">
          <InputText
            id="block-title"
            v-model="draft.title"
            maxlength="80"
            :disabled="busy"
          />
        </CatalogField>
        <div class="grid grid-cols-2 gap-3">
          <CatalogField
            id="block-from"
            label="Fecha inicial en Miramar"
            :error="fields.date_from"
          >
            <DatePicker
              v-model="draft.from"
              input-id="block-from"
              date-format="yy-mm-dd"
              :disabled="busy"
              fluid
            />
          </CatalogField>
          <CatalogField
            id="block-to"
            label="Fecha final en Miramar"
            :error="fields.date_to"
          >
            <DatePicker
              v-model="draft.to"
              input-id="block-to"
              date-format="yy-mm-dd"
              :disabled="busy"
              fluid
            />
          </CatalogField>
        </div>
        <CatalogField id="block-reason" label="Motivo" :error="fields.reason">
          <Textarea
            id="block-reason"
            v-model="draft.reason"
            maxlength="200"
            :disabled="busy"
          />
        </CatalogField>
        <div class="flex justify-end gap-2">
          <Button
            label="Cerrar"
            severity="secondary"
            outlined
            :disabled="busy"
            @click="editing = false"
          />
          <Button type="submit" label="Revisar bloqueo" :loading="busy" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
