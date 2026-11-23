<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import { ref, useId, watch } from 'vue';
import { usePayments, type Payment } from '@/composables/usePayments';
import type { PbError } from '@/lib/pb-errors';

const props = defineProps<{ payment: Payment }>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ saved: [payment: Payment] }>();
const payments = usePayments();
const id = useId();
const reason = ref('');
const error = ref('');
const saving = ref(false);

watch(open, (visible) => {
  if (visible) {
    reason.value = '';
    error.value = '';
  }
});

async function submit() {
  if (saving.value) return;
  if (!reason.value.trim()) {
    error.value = 'Indica el motivo de la anulación.';
    return;
  }
  error.value = '';
  saving.value = true;
  try {
    const payment = await payments.void(props.payment.id, reason.value.trim());
    emit('saved', payment);
    open.value = false;
  } catch (cause) {
    error.value = (cause as PbError).message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:visible="open"
    header="Anular pago"
    modal
    class="w-full max-w-lg"
    :closable="!saving"
    :close-on-escape="!saving"
  >
    <form class="grid gap-4" @submit.prevent="submit">
      <div class="grid gap-1.5">
        <label :for="id">Motivo de la anulación</label>
        <Textarea
          :id="id"
          v-model="reason"
          rows="3"
          aria-required="true"
          :disabled="saving"
        />
      </div>
      <Message v-if="error" severity="error" :closable="false">{{
        error
      }}</Message>
      <div class="flex justify-end gap-2">
        <Button
          label="Cerrar"
          severity="secondary"
          outlined
          :disabled="saving"
          @click="open = false"
        />
        <Button
          label="Anular pago"
          severity="danger"
          type="submit"
          :loading="saving"
        />
      </div>
    </form>
  </Dialog>
</template>
