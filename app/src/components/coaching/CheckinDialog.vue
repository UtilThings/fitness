<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import { reactive, ref, useId, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import { useCoaching } from '@/composables/useCoaching';
import {
  validateCheckin,
  type CheckinInput,
  type CoachingProgram,
} from '@/lib/coaching';
import { todayLocal } from '@/lib/datetime';
import type { PbError } from '@/lib/pb-errors';

const props = defineProps<{ program: CoachingProgram }>();
const visible = defineModel<boolean>('visible', { required: true });
const emit = defineEmits<{ saved: [] }>();
const api = useCoaching();
const id = useId();
const form = reactive<CheckinInput>({
  checked_at: '',
  adherence: 0,
  notes: '',
});
const maxDate = ref('');
const fields = ref<Record<string, string>>({});
const message = ref('');
const saving = ref(false);

watch(
  visible,
  (open) => {
    if (!open) return;
    maxDate.value = todayLocal();
    Object.assign(form, { checked_at: maxDate.value, adherence: 0, notes: '' });
    fields.value = {};
    message.value = '';
  },
  { immediate: true },
);

async function submit() {
  if (saving.value) return;
  fields.value = validateCheckin(form, props.program, todayLocal());
  message.value = fields.value.program ?? '';
  if (Object.keys(fields.value).length) return;
  saving.value = true;
  try {
    await api.createCheckin(props.program.id, { ...form });
    visible.value = false;
    emit('saved');
  } catch (cause) {
    const error = cause as PbError;
    fields.value = error.fields;
    message.value = error.fields.program ?? error.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="t('Record check-in')"
    :closable="!saving"
    :close-on-escape="!saving"
    class="w-full max-w-lg"
  >
    <form class="grid gap-4" novalidate @submit.prevent="submit">
      <Message v-if="message" severity="error" :closable="false">{{
        message
      }}</Message>
      <CatalogField
        :id="id + '-date'"
        v-slot="{ describedBy }"
        :label="t('Date')"
        :error="fields.checked_at"
      >
        <input
          :id="id + '-date'"
          v-model="form.checked_at"
          type="date"
          :max="maxDate"
          :aria-describedby="describedBy"
          :aria-invalid="!!fields.checked_at"
          class="p-inputtext"
        />
      </CatalogField>
      <fieldset
        class="grid gap-2"
        :aria-describedby="
          fields.adherence ? id + '-adherence-error' : undefined
        "
      >
        <legend class="text-sm font-medium">{{ t('Adherence') }}</legend>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="value in 5"
            :key="value"
            type="button"
            :label="String(value)"
            :aria-pressed="form.adherence === value"
            :outlined="form.adherence !== value"
            @click="form.adherence = value"
          />
        </div>
        <small
          v-if="fields.adherence"
          :id="id + '-adherence-error'"
          class="text-red-600 dark:text-red-400"
          role="alert"
          >{{ fields.adherence }}</small
        >
      </fieldset>
      <CatalogField :id="id + '-notes'" :label="t('Notes{\'\'}')">
        <Textarea :id="id + '-notes'" v-model="form.notes" rows="4" fluid />
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
        <Button type="submit" :label="t('Save check-in')" :loading="saving" />
      </div>
    </form>
  </Dialog>
</template>
