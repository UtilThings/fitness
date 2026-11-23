<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { computed, ref, useId, watch } from 'vue';
import { useMemberships } from '@/composables/useMemberships';
import { usePlans } from '@/composables/usePlans';
import { todayLocal } from '@/lib/datetime';
import type { Membership } from '@/lib/memberships';
import type { PbError } from '@/lib/pb-errors';

const props = defineProps<{ client: string }>();
const emit = defineEmits<{ assigned: [membership: Membership] }>();
const open = defineModel<boolean>({ required: true });
const id = useId();
const { assign } = useMemberships();
const { items, loading, error: plansError, load } = usePlans();
const selected = ref<string>();
const date = ref('');
const notes = ref('');
const saving = ref(false);
const error = ref('');
const plans = computed(() =>
  items.value
    .filter(({ active }) => active)
    .map((plan) => ({
      ...plan,
      label: [plan.expand?.service?.name, plan.name]
        .filter(Boolean)
        .join(' · '),
    })),
);
const plan = computed(() =>
  plans.value.find(({ id }) => id === selected.value),
);

watch(
  open,
  (visible) => {
    if (!visible) return;
    selected.value = undefined;
    date.value = todayLocal();
    notes.value = '';
    error.value = '';
    void load();
  },
  { immediate: true },
);

async function submit() {
  if (!plan.value || !date.value || saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    const { membership } = await assign({
      client: props.client,
      plan: plan.value.id,
      starts_on: date.value,
      notes: notes.value.trim() || undefined,
    });
    emit('assigned', membership);
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
    header="Asignar plan"
    modal
    class="w-full max-w-lg"
    :closable="!saving"
    :close-on-escape="!saving"
  >
    <form class="grid gap-4" @submit.prevent="submit">
      <div class="grid gap-1">
        <label :for="id + '-plan'">Plan activo</label>
        <Select
          v-model="selected"
          :input-id="id + '-plan'"
          aria-label="Plan activo"
          :options="plans"
          option-value="id"
          option-label="label"
          filter
          placeholder="Selecciona un plan"
          :loading="loading"
          :disabled="saving"
        />
      </div>
      <Message v-if="plansError" severity="error" :closable="false">{{
        plansError.message
      }}</Message>
      <Message
        v-if="plan?.is_first_class || plan?.billing_unit === 'first_visit'"
        severity="info"
        :closable="false"
      >
        Primera clase disponible una sola vez por cliente.
      </Message>
      <Message
        v-if="plan?.commitment_periods"
        severity="warn"
        :closable="false"
      >
        Este plan tiene un compromiso de
        {{ plan.commitment_periods * 4 }} semanas.
      </Message>
      <div class="grid gap-1">
        <label :for="id + '-start'">Fecha de inicio</label>
        <InputText
          :id="id + '-start'"
          v-model="date"
          type="date"
          required
          :disabled="saving"
        />
      </div>
      <div class="grid gap-1">
        <label :for="id + '-notes'">Observaciones</label>
        <Textarea
          :id="id + '-notes'"
          v-model="notes"
          rows="3"
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
          label="Asignar"
          type="submit"
          :loading="saving"
          :disabled="!plan || !date"
        />
      </div>
    </form>
  </Dialog>
</template>
