<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import { ref, useId, watch } from 'vue';

const props = defineProps<{
  message: string;
  saving?: boolean;
  error?: string;
}>();
const emit = defineEmits<{ confirmed: [note: string] }>();
const open = defineModel<boolean>({ required: true });
const id = useId();
const note = ref('');
const validation = ref('');

watch(open, (visible) => {
  if (!visible) return;
  note.value = '';
  validation.value = '';
});

function submit() {
  if (props.saving) return;
  const reason = note.value.trim();
  if (!reason) {
    validation.value = t('Enter a reason for the override.');
    return;
  }
  validation.value = '';
  emit('confirmed', reason);
}
</script>

<template>
  <Dialog
    v-model:visible="open"
    :header="t('Credit override')"
    modal
    class="w-full max-w-lg"
    :closable="!saving"
    :close-on-escape="!saving"
  >
    <form class="grid gap-4" @submit.prevent="submit">
      <Message severity="warn" :closable="false">{{ message }}</Message>
      <div class="grid gap-1">
        <label :for="id">{{ t('Reason for override') }}</label>
        <Textarea
          :id="id"
          v-model="note"
          rows="3"
          maxlength="500"
          aria-required="true"
          :disabled="saving"
        />
      </div>
      <Message v-if="validation || error" severity="error" :closable="false">{{
        validation || error
      }}</Message>
      <div class="flex justify-end gap-2">
        <Button
          :label="t('Close')"
          severity="secondary"
          outlined
          :disabled="saving"
          @click="open = false"
        />
        <Button
          :label="t('Book with an override')"
          type="submit"
          :loading="saving"
        />
      </div>
    </form>
  </Dialog>
</template>
