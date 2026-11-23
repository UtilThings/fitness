<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputNumber from 'primevue/inputnumber';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import { ref, useId, watch } from 'vue';
import { useMemberships } from '@/composables/useMemberships';
import type { Membership } from '@/lib/memberships';
import type { PbError } from '@/lib/pb-errors';

const props = defineProps<{ membership: Membership }>();
const emit = defineEmits<{ adjusted: [membership: Membership] }>();
const open = defineModel<boolean>({ required: true });
const id = useId();
const { adjust } = useMemberships();
const delta = ref<number | null>(null);
const note = ref('');
const error = ref('');
const saving = ref(false);

watch(open, (visible) => {
  if (!visible) return;
  delta.value = null;
  note.value = '';
  error.value = '';
});

async function submit() {
  if (saving.value) return;
  if (!note.value.trim()) {
    error.value = 'Indica el motivo del ajuste.';
    return;
  }
  if (
    delta.value === null ||
    !Number.isSafeInteger(delta.value) ||
    delta.value === 0
  ) {
    error.value = 'Indica un número entero distinto de cero.';
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    const { membership } = await adjust(
      props.membership.id,
      delta.value,
      note.value.trim(),
    );
    emit('adjusted', membership);
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
    header="Ajustar créditos"
    modal
    class="w-full max-w-lg"
    :closable="!saving"
    :close-on-escape="!saving"
  >
    <form class="grid gap-4" @submit.prevent="submit">
      <div class="grid gap-1">
        <label :for="id + '-delta'">Créditos a sumar o restar</label>
        <InputNumber
          v-model="delta"
          :input-id="id + '-delta'"
          :max-fraction-digits="0"
          :disabled="saving"
        />
      </div>
      <div class="grid gap-1">
        <label :for="id + '-note'">Motivo del ajuste</label>
        <Textarea
          :id="id + '-note'"
          v-model="note"
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
        <Button label="Guardar ajuste" type="submit" :loading="saving" />
      </div>
    </form>
  </Dialog>
</template>
