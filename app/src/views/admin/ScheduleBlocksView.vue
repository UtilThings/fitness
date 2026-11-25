<script setup lang="ts">
import { t } from '@/i18n';
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
  if (!input.date_from) fields.value.date_from = t('Enter the start date.');
  if (!input.date_to || input.date_to < input.date_from) {
    fields.value.date_to = t('Enter a date on or after the start date.');
  }
  if (!input.title) fields.value.title = t('Enter a title.');
  if (Object.keys(fields.value).length) return;

  return run(async () => {
    const count = await schedule.countBlockSessions(
      input.date_from,
      input.date_to,
    );
    if (!editing.value || editingId.value !== id) return;
    confirm.require({
      header: t('Confirm schedule block'),
      message: t(
        '1 session will be canceled. | {count} sessions will be canceled.',
        { count },
        count,
      ),
      acceptProps: { label: t('Save block') },
      rejectProps: { label: t('Back'), severity: 'secondary', outlined: true },
      defaultFocus: 'reject',
      accept: () =>
        void run(async () => {
          if (id) await schedule.updateBlock(id, input);
          else await schedule.createBlock(input);
          editing.value = false;
          notify.success(t('Schedule block saved'));
        }),
    });
  });
}

function remove(block: ScheduleBlock) {
  confirmDelete({
    message: t('Delete «{title}»? Canceled sessions will remain canceled.', {
      title: block.title,
    }),
    onConfirm: () =>
      run(async () => {
        await schedule.deleteBlock(block.id);
        notify.success(t('Schedule block deleted'));
      }),
  });
}
</script>

<template>
  <div class="grid gap-5">
    <PageHeader :title="t('Schedule blocks')">
      <template v-if="isOwner" #actions>
        <Button :label="t('New block')" icon="pi pi-plus" @click="edit()" />
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
      <template #empty>{{ t('No blocks') }}</template>
      <Column field="title" :header="t('Title')" />
      <Column field="date_from" :header="t('From')" />
      <Column field="date_to" :header="t('To (inclusive)')" />
      <Column field="reason" :header="t('Reason')" />
      <Column v-if="isOwner" :header="t('Actions')">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              :label="t('Edit')"
              severity="secondary"
              text
              :disabled="busy"
              @click="edit(data)"
            />
            <Button
              :label="t('Delete')"
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
      :header="editingId ? t('Edit block') : t('New block')"
    >
      <form class="grid gap-4" @submit.prevent="preview">
        <CatalogField
          id="block-title"
          :label="t('Title')"
          :error="fields.title"
        >
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
            :label="t('Start date in Miramar')"
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
            :label="t('End date in Miramar')"
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
        <CatalogField
          id="block-reason"
          :label="t('Reason')"
          :error="fields.reason"
        >
          <Textarea
            id="block-reason"
            v-model="draft.reason"
            maxlength="200"
            :disabled="busy"
          />
        </CatalogField>
        <div class="flex justify-end gap-2">
          <Button
            :label="t('Close')"
            severity="secondary"
            outlined
            :disabled="busy"
            @click="editing = false"
          />
          <Button type="submit" :label="t('Review block')" :loading="busy" />
        </div>
      </form>
    </Dialog>
  </div>
</template>
