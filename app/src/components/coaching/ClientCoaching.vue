<script setup lang="ts">
import Button from 'primevue/button';
import Message from 'primevue/message';
import { computed, ref, shallowRef, watch } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { useCoaching } from '@/composables/useCoaching';
import {
  canManageProgram,
  canRegisterCheckin,
  type CoachingCheckin,
  type ProgramOverview,
} from '@/lib/coaching';
import { formatCivilDate } from '@/lib/datetime';
import type { PbError } from '@/lib/pb-errors';
import AdherenceBadge from './AdherenceBadge.vue';
import CheckinDialog from './CheckinDialog.vue';
import CheckinTimeline from './CheckinTimeline.vue';
import ProgramFormDialog from './ProgramFormDialog.vue';
import ProgramStatusTag from './ProgramStatusTag.vue';
import ProgramSummary from './ProgramSummary.vue';

const props = defineProps<{
  client: string;
  programs: ProgramOverview[];
  hasActiveMembership: boolean;
}>();
const emit = defineEmits<{ changed: [] }>();
const { user } = useAuth();
const api = useCoaching();
const current = computed(() =>
  props.programs.find(({ status }) => status !== 'ended'),
);
const previous = computed(() =>
  props.programs.filter(({ status }) => status === 'ended'),
);
const canCreate = computed(
  () =>
    user.value?.role !== 'reception' &&
    canManageProgram(user.value) &&
    props.hasActiveMembership &&
    !current.value,
);
const creating = ref(false);
const registering = ref(false);
const history = shallowRef<CoachingCheckin[]>([]);
const loading = ref(false);
const error = ref('');
const revision = ref(0);

watch(
  [() => current.value?.id, revision],
  async ([program], _, onCleanup) => {
    let fresh = true;
    onCleanup(() => {
      fresh = false;
    });
    error.value = '';
    loading.value = !!program;
    if (!program) {
      history.value = [];
      return;
    }
    try {
      const rows = await api.listCheckins(program);
      if (fresh) history.value = rows;
    } catch (cause) {
      if (fresh) error.value = (cause as PbError).message;
    } finally {
      if (fresh) loading.value = false;
    }
  },
  { immediate: true },
);

function checkinSaved() {
  revision.value++;
  emit('changed');
}
</script>

<template>
  <section class="grid gap-4">
    <template v-if="current">
      <ProgramSummary :program="current" />
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-lg font-semibold">Historial de check-ins</h2>
        <Button
          v-if="canRegisterCheckin(user, current)"
          label="Registrar check-in"
          icon="pi pi-plus"
          @click="registering = true"
        />
      </div>
      <Message v-if="error" severity="error" :closable="false">
        {{ error }}
        <Button label="Reintentar" size="small" text @click="revision++" />
      </Message>
      <p v-else-if="loading" role="status">Cargando check-ins…</p>
      <CheckinTimeline v-else :checkins="history" />
      <CheckinDialog
        v-if="registering"
        v-model:visible="registering"
        :program="current"
        @saved="checkinSaved"
      />
    </template>
    <div v-else class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-muted-color">El cliente no tiene un programa vigente.</p>
      <Button
        v-if="canCreate"
        label="Crear programa"
        icon="pi pi-plus"
        @click="creating = true"
      />
    </div>

    <div v-if="previous.length" class="grid gap-2">
      <h2 class="text-lg font-semibold">Programas anteriores</h2>
      <ul class="grid gap-2">
        <li
          v-for="program in previous"
          :key="program.id"
          class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-surface-200 p-3 dark:border-surface-700"
        >
          <ProgramStatusTag :status="program.status" />
          <span class="text-sm"
            >{{ formatCivilDate(program.starts_on) }} ·
            {{ program.duration_weeks }} semanas</span
          >
          <span class="text-sm">{{
            program.expand?.coach?.name ?? program.coach
          }}</span>
          <AdherenceBadge
            :value="program.flags.adherence.average"
            :trend="program.flags.adherence.trend"
          />
        </li>
      </ul>
    </div>
    <ProgramFormDialog
      v-if="creating"
      v-model:visible="creating"
      :client="client"
      @saved="emit('changed')"
    />
  </section>
</template>
