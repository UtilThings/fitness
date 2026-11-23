<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { computed, reactive, ref, shallowRef, useId, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import { useAuth } from '@/composables/useAuth';
import { useCoaching } from '@/composables/useCoaching';
import { fullName } from '@/lib/clients';
import {
  PROGRAM_DURATIONS,
  safeProgramUrl,
  validateProgramInput,
  type CoachingProgram,
  type ProgramInput,
} from '@/lib/coaching';
import { todayLocal } from '@/lib/datetime';
import type { Membership } from '@/lib/memberships';
import type { PbError } from '@/lib/pb-errors';
import type { Admin } from '@/types/pb';

const props = defineProps<{ program?: CoachingProgram; client?: string }>();
const visible = defineModel<boolean>('visible', { required: true });
const emit = defineEmits<{ saved: [program: CoachingProgram] }>();
const api = useCoaching();
const { user } = useAuth();
const id = useId();
const form = reactive<ProgramInput>({
  client: '',
  coach: '',
  membership: '',
  status: 'active',
  starts_on: '',
  duration_weeks: 12,
  goal: '',
  program_url: '',
  notes: '',
});
const memberships = shallowRef<Membership[]>([]);
const coaches = shallowRef<Admin[]>([]);
const clientOptions = computed(() => {
  const clients = new Map<string, string>();
  for (const { client, expand } of memberships.value) {
    if (expand?.client) clients.set(client, fullName(expand.client));
  }
  const current = props.program?.expand?.client;
  if (current) clients.set(current.id, fullName(current));
  return [...clients]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
});
const membershipOptions = computed(() =>
  memberships.value
    .filter(({ client }) => client === form.client)
    .map(({ id, expand }) => ({ value: id, label: expand?.plan?.name ?? id })),
);
const selectedCoachOptions = computed(() =>
  user.value?.role === 'coach'
    ? coaches.value.filter(({ id }) => id === user.value?.id)
    : coaches.value,
);
const durations = PROGRAM_DURATIONS.map((value) => ({
  value,
  label: value + ' semanas',
}));
const loading = ref(false);
const saving = ref(false);
const failed = ref(false);
const fields = ref<Record<string, string>>({});
const message = ref('');
let version = 0;

function chooseMembership() {
  if (!membershipOptions.value.some(({ value }) => value === form.membership)) {
    form.membership =
      membershipOptions.value.length === 1
        ? membershipOptions.value[0]!.value
        : '';
  }
}

watch(
  [visible, () => props.program, () => props.client],
  async ([open, program, client]) => {
    const current = ++version;
    if (!open) return;
    fields.value = {};
    message.value = '';
    failed.value = false;
    loading.value = true;
    memberships.value = [];
    coaches.value = [];
    Object.assign(form, {
      client: program?.client ?? client ?? '',
      coach:
        program?.coach ?? (user.value?.role === 'coach' ? user.value.id : ''),
      membership: program?.membership ?? '',
      status: program?.status ?? 'active',
      starts_on: program?.starts_on.slice(0, 10) ?? todayLocal(),
      duration_weeks: program?.duration_weeks ?? 12,
      goal: program?.goal ?? '',
      program_url: program?.program_url ?? '',
      notes: program?.notes ?? '',
    });
    try {
      const [rows, team] = await Promise.all([
        api.listOnlineMemberships(client ? { client } : {}),
        api.listCoaches(),
      ]);
      if (current !== version) return;
      const linked = program?.expand?.membership;
      const eligible = rows.filter(
        (membership) => membership.status === 'active',
      );
      memberships.value =
        linked && !eligible.some(({ id }) => id === linked.id)
          ? [...eligible, linked]
          : eligible;
      coaches.value = team;
      if (!program) chooseMembership();
    } catch (cause) {
      if (current !== version) return;
      failed.value = true;
      message.value = (cause as PbError).message;
    } finally {
      if (current === version) loading.value = false;
    }
  },
  { immediate: true },
);

async function submit() {
  if (saving.value || loading.value || failed.value) return;
  const validation = validateProgramInput(form);
  if (!clientOptions.value.some(({ value }) => value === form.client))
    validation.client = 'Selecciona un cliente con membresía online activa.';
  if (!membershipOptions.value.some(({ value }) => value === form.membership))
    validation.membership = 'Selecciona una membresía online activa.';
  if (!selectedCoachOptions.value.some(({ id }) => id === form.coach))
    validation.coach = 'Selecciona un coach activo.';
  if (form.program_url && !safeProgramUrl(form.program_url))
    validation.program_url = 'Indica un enlace HTTP o HTTPS válido.';
  fields.value = validation;
  message.value = '';
  if (Object.keys(validation).length) return;
  saving.value = true;
  try {
    const { status, ...values } = form;
    const saved = props.program
      ? await api.updateProgram(props.program.id, values)
      : await api.createProgram({ ...values, status });
    visible.value = false;
    emit('saved', saved);
  } catch (cause) {
    const error = cause as PbError;
    fields.value = error.fields;
    message.value = error.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="program ? 'Editar programa' : 'Nuevo programa'"
    :closable="!saving"
    :close-on-escape="!saving"
    class="w-full max-w-xl"
  >
    <form class="grid gap-4" novalidate @submit.prevent="submit">
      <Message v-if="message" severity="error" :closable="false">{{
        message
      }}</Message>
      <Message
        v-if="!loading && !failed && !clientOptions.length"
        severity="info"
        :closable="false"
        >Primero asigna una membresía online activa al cliente.</Message
      >
      <CatalogField
        :id="id + '-client'"
        v-slot="{ describedBy }"
        label="Cliente"
        :error="fields.client"
      >
        <Select
          v-model="form.client"
          :input-id="id + '-client'"
          :options="clientOptions"
          option-label="label"
          option-value="value"
          :aria-describedby="describedBy"
          :disabled="!!client || !!program || loading"
          :loading="loading"
          filter
          fluid
          @update:model-value="chooseMembership"
        />
      </CatalogField>
      <CatalogField
        :id="id + '-membership'"
        v-slot="{ describedBy }"
        label="Membresía online"
        :error="fields.membership"
      >
        <Select
          v-model="form.membership"
          :input-id="id + '-membership'"
          :options="membershipOptions"
          option-label="label"
          option-value="value"
          :aria-describedby="describedBy"
          :disabled="!form.client || loading"
          fluid
        />
      </CatalogField>
      <CatalogField
        :id="id + '-coach'"
        v-slot="{ describedBy }"
        label="Coach"
        :error="fields.coach"
      >
        <Select
          v-model="form.coach"
          :input-id="id + '-coach'"
          :options="selectedCoachOptions"
          option-label="name"
          option-value="id"
          :aria-describedby="describedBy"
          :disabled="user?.role === 'coach' || loading"
          filter
          fluid
        />
      </CatalogField>
      <div class="grid gap-4 sm:grid-cols-2">
        <CatalogField
          :id="id + '-starts'"
          v-slot="{ describedBy }"
          label="Fecha de inicio"
          :error="fields.starts_on"
        >
          <input
            :id="id + '-starts'"
            v-model="form.starts_on"
            type="date"
            :aria-describedby="describedBy"
            class="p-inputtext w-full"
          />
        </CatalogField>
        <CatalogField
          :id="id + '-duration'"
          v-slot="{ describedBy }"
          label="Duración"
          :error="fields.duration_weeks"
        >
          <Select
            v-model="form.duration_weeks"
            :input-id="id + '-duration'"
            :options="durations"
            option-label="label"
            option-value="value"
            :aria-describedby="describedBy"
            fluid
          />
        </CatalogField>
      </div>
      <CatalogField :id="id + '-goal'" label="Objetivo" :error="fields.goal">
        <Textarea :id="id + '-goal'" v-model="form.goal" rows="2" fluid />
      </CatalogField>
      <CatalogField
        :id="id + '-url'"
        v-slot="{ describedBy }"
        label="Enlace al plan"
        :error="fields.program_url"
      >
        <InputText
          :id="id + '-url'"
          v-model="form.program_url"
          type="url"
          :aria-describedby="describedBy"
          fluid
        />
      </CatalogField>
      <CatalogField
        :id="id + '-notes'"
        label="Notas internas"
        :error="fields.notes"
      >
        <Textarea :id="id + '-notes'" v-model="form.notes" rows="3" fluid />
      </CatalogField>
      <div class="flex justify-end gap-2">
        <Button
          type="button"
          label="Cancelar"
          severity="secondary"
          text
          :disabled="saving"
          @click="visible = false"
        />
        <Button
          type="submit"
          label="Guardar programa"
          :disabled="loading || failed || !clientOptions.length"
          :loading="saving"
        />
      </div>
    </form>
  </Dialog>
</template>
