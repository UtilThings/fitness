<script setup lang="ts">
import Tag from 'primevue/tag';
import { computed } from 'vue';
import {
  programAlerts,
  safeProgramUrl,
  type ProgramOverview,
} from '@/lib/coaching';
import { formatCivilDate } from '@/lib/datetime';
import AdherenceBadge from './AdherenceBadge.vue';
import ProgramStatusTag from './ProgramStatusTag.vue';

const props = defineProps<{ program: ProgramOverview }>();
const link = computed(() => safeProgramUrl(props.program.program_url));
</script>

<template>
  <div
    class="grid gap-4 rounded-lg border border-surface-200 p-4 dark:border-surface-700"
  >
    <div class="flex flex-wrap items-center gap-2">
      <ProgramStatusTag :status="program.status" />
      <Tag
        v-for="alert in program.flags.alerts"
        :key="alert"
        :value="programAlerts[alert]"
        :severity="alert === 'at_risk' ? 'danger' : 'warn'"
      />
    </div>
    <dl class="grid gap-3 sm:grid-cols-2">
      <div>
        <dt class="text-sm text-muted-color">Coach</dt>
        <dd class="font-medium">
          {{ program.expand?.coach?.name ?? program.coach }}
        </dd>
      </div>
      <div>
        <dt class="text-sm text-muted-color">Progreso</dt>
        <dd class="font-medium">
          Semana {{ program.flags.week }} de {{ program.flags.total }}
        </dd>
      </div>
      <div>
        <dt class="text-sm text-muted-color">Renovación</dt>
        <dd class="font-medium">
          {{ program.renews_on ? formatCivilDate(program.renews_on) : '—' }}
        </dd>
      </div>
      <div>
        <dt class="mb-1 text-sm text-muted-color">Adherencia promedio</dt>
        <dd>
          <AdherenceBadge
            :value="program.flags.adherence.average"
            :trend="program.flags.adherence.trend"
          />
        </dd>
      </div>
      <div>
        <dt class="text-sm text-muted-color">Inicio</dt>
        <dd class="font-medium">{{ formatCivilDate(program.starts_on) }}</dd>
      </div>
      <div>
        <dt class="text-sm text-muted-color">Fin previsto</dt>
        <dd class="font-medium">{{ formatCivilDate(program.flags.endsOn) }}</dd>
      </div>
      <div v-if="program.goal" class="sm:col-span-2">
        <dt class="text-sm text-muted-color">Objetivo</dt>
        <dd class="whitespace-pre-wrap">{{ program.goal }}</dd>
      </div>
      <div v-if="program.notes" class="sm:col-span-2">
        <dt class="text-sm text-muted-color">Notas internas</dt>
        <dd class="whitespace-pre-wrap">{{ program.notes }}</dd>
      </div>
    </dl>
    <a
      v-if="link"
      :href="link"
      target="_blank"
      rel="noopener noreferrer"
      class="w-fit font-medium text-primary hover:underline"
    >
      Abrir plan de entrenamiento
      <i class="pi pi-external-link ms-1 text-xs" aria-hidden="true" />
    </a>
  </div>
</template>
