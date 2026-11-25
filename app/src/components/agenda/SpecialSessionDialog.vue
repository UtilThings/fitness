<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { computed, ref, shallowRef, useId, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import { useCoachAgenda } from '@/composables/useCoachAgenda';
import { agendaError, sessionStart, type AgendaSession } from '@/lib/agenda';
import type { Service } from '@/lib/catalog';
import { todayLocal } from '@/lib/datetime';
import type { PbError } from '@/lib/pb-errors';
import SessionDateFields from './SessionDateFields.vue';

const props = defineProps<{
  coaches: { label: string; value: string }[];
  services: Service[];
  initialDate?: string;
  initialTime?: string;
  initialCoach?: string;
}>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ saved: [session: AgendaSession] }>();
const { createSpecial } = useCoachAgenda();
const id = useId();
const title = ref('');
const coach = ref('');
const service = ref('');
const date = ref('');
const time = ref('');
const duration = ref<number | null>(60);
const capacity = ref<number | null>(1);
const notes = ref('');
const saving = ref(false);
const error = shallowRef<PbError>();
const formError = ref('');
const options = computed(() => [
  { label: t('No coach'), value: '' },
  ...props.coaches,
]);
const activeServices = computed(() =>
  props.services.filter((item) => item.active),
);

watch(
  open,
  (visible) => {
    if (!visible) return;
    title.value = '';
    coach.value = props.initialCoach || '';
    service.value = '';
    date.value = props.initialDate || todayLocal();
    time.value = props.initialTime || '09:00';
    duration.value = 60;
    capacity.value = 1;
    notes.value = '';
    error.value = undefined;
    formError.value = '';
  },
  { immediate: true },
);

async function submit() {
  if (saving.value) return;
  error.value = undefined;
  formError.value = '';
  const startsAt = sessionStart(date.value, time.value);
  if (
    !title.value.trim() ||
    !service.value ||
    !startsAt ||
    !duration.value ||
    !capacity.value
  ) {
    formError.value = t(
      'Enter the title, service, date, duration, and capacity.',
    );
    return;
  }
  saving.value = true;
  try {
    const session = await createSpecial({
      title: title.value.trim(),
      coach: coach.value,
      service: service.value,
      starts_at: startsAt,
      duration_min: duration.value,
      capacity: capacity.value,
      notes: notes.value.trim(),
    });
    emit('saved', session);
    open.value = false;
  } catch (cause) {
    error.value = cause as PbError;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:visible="open"
    modal
    :header="t('New special class')"
    class="w-full max-w-lg"
    :closable="!saving"
    :close-on-escape="!saving"
  >
    <form class="grid gap-4" @submit.prevent="submit">
      <CatalogField
        :id="id + '-title'"
        :label="t('Title')"
        :error="error?.fields.title"
      >
        <InputText
          :id="id + '-title'"
          v-model="title"
          maxlength="120"
          required
          :disabled="saving"
          fluid
        />
      </CatalogField>
      <CatalogField
        :id="id + '-service'"
        :label="t('Service')"
        :error="error?.fields.service"
      >
        <Select
          v-model="service"
          :input-id="id + '-service'"
          :options="activeServices"
          option-label="name"
          option-value="id"
          :placeholder="t('Select a service')"
          :disabled="saving"
          fluid
        />
      </CatalogField>
      <SessionDateFields
        v-model:date="date"
        v-model:time="time"
        v-model:duration="duration"
        :fields="error?.fields"
        :disabled="saving"
      />
      <CatalogField
        :id="id + '-capacity'"
        :label="t('Capacity')"
        :error="error?.fields.capacity"
      >
        <InputNumber
          v-model="capacity"
          :input-id="id + '-capacity'"
          :min="1"
          :disabled="saving"
          fluid
        />
      </CatalogField>
      <CatalogField
        :id="id + '-coach'"
        :label="t('Coach')"
        :error="error?.fields.coach"
      >
        <Select
          v-model="coach"
          :input-id="id + '-coach'"
          :options="options"
          option-label="label"
          option-value="value"
          :disabled="saving"
          fluid
        />
      </CatalogField>
      <CatalogField
        :id="id + '-notes'"
        :label="t('Internal notes')"
        :error="error?.fields.notes"
      >
        <Textarea
          :id="id + '-notes'"
          v-model="notes"
          maxlength="500"
          rows="2"
          :disabled="saving"
          fluid
        />
      </CatalogField>
      <Message v-if="formError || error" severity="error" :closable="false">{{
        formError || (error && agendaError(error))
      }}</Message>
      <div class="flex justify-end gap-2">
        <Button
          :label="t('Close')"
          severity="secondary"
          outlined
          :disabled="saving"
          @click="open = false"
        />
        <Button type="submit" :label="t('Save class')" :loading="saving" />
      </div>
    </form>
  </Dialog>
</template>
