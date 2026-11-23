<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Menu from 'primevue/menu';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import { computed, ref, useId, useTemplateRef } from 'vue';
import CreditAdjustDialog from '@/components/memberships/CreditAdjustDialog.vue';
import { useMemberships } from '@/composables/useMemberships';
import type { Membership } from '@/lib/memberships';
import type { PbError } from '@/lib/pb-errors';

const props = defineProps<{ membership: Membership }>();
const emit = defineEmits<{ updated: [membership: Membership] }>();
const api = useMemberships();
const id = useId();
const menu = useTemplateRef('menu');
const labels = {
  renew: 'Renovar',
  pause: 'Pausar',
  resume: 'Reanudar',
  cancel: 'Cancelar membresía',
} as const;
type Action = keyof typeof labels;
const selected = ref<Action>();
const open = ref(false);
const adjustment = ref(false);
const saving = ref(false);
const note = ref('');
const error = ref('');
const noteRequired = computed(
  () => selected.value === 'pause' || selected.value === 'cancel',
);

function choose(action: Action) {
  selected.value = action;
  note.value = '';
  error.value = '';
  open.value = true;
}

const items = computed(() => {
  const status = props.membership.status;
  const plan = props.membership.expand?.plan;
  const actions: Action[] = [];
  if (
    (status === 'active' || status === 'expired') &&
    !plan?.is_first_class &&
    plan?.billing_unit !== 'first_visit'
  )
    actions.push('renew');
  if (status === 'active') actions.push('pause');
  if (status === 'paused') actions.push('resume');
  if (status !== 'cancelled') actions.push('cancel');
  return [
    ...actions.map((action) => ({
      label: labels[action],
      command: () => choose(action),
    })),
    {
      label: 'Ajustar créditos',
      command: () => {
        adjustment.value = true;
      },
    },
  ];
});

async function submit() {
  const action = selected.value;
  if (!action || saving.value) return;
  const reason = note.value.trim();
  if (noteRequired.value && !reason) {
    error.value = 'Indica el motivo de la acción.';
    return;
  }
  const membership = props.membership.id;
  saving.value = true;
  error.value = '';
  try {
    const result = await (action === 'renew'
      ? api.renew(membership, reason || undefined)
      : api[action](membership, reason));
    emit('updated', result.membership);
    open.value = false;
  } catch (cause) {
    error.value = (cause as PbError).message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Button
    label="Acciones"
    size="small"
    outlined
    :aria-controls="id + '-menu'"
    aria-haspopup="menu"
    @click="menu?.toggle($event)"
  />
  <Menu :id="id + '-menu'" ref="menu" :model="items" popup />
  <Dialog
    v-model:visible="open"
    :header="selected ? labels[selected] : ''"
    modal
    class="w-full max-w-lg"
    :closable="!saving"
    :close-on-escape="!saving"
  >
    <form class="grid gap-4" @submit.prevent="submit">
      <div v-if="selected !== 'resume'" class="grid gap-1">
        <label :for="id + '-note'">{{
          noteRequired ? 'Motivo de la acción' : 'Observaciones'
        }}</label>
        <Textarea
          :id="id + '-note'"
          v-model="note"
          rows="3"
          :aria-required="noteRequired"
          :disabled="saving"
        />
      </div>
      <p v-else>Se ampliará el periodo por los días que duró la pausa.</p>
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
          :label="selected ? labels[selected] : 'Confirmar'"
          type="submit"
          :severity="selected === 'cancel' ? 'danger' : undefined"
          :loading="saving"
        />
      </div>
    </form>
  </Dialog>
  <CreditAdjustDialog
    v-model="adjustment"
    :membership="membership"
    @adjusted="emit('updated', $event)"
  />
</template>
