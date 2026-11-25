<script setup lang="ts">
import { t } from '@/i18n';
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
        <dt class="text-sm text-muted-color">{{ t('Coach') }}</dt>
        <dd class="font-medium">
          {{ program.expand?.coach?.name ?? program.coach }}
        </dd>
      </div>
      <div>
        <dt class="text-sm text-muted-color">{{ t('Progress') }}</dt>
        <dd class="font-medium">
          {{
            t('Week {week} of {total}', {
              week: program.flags.week,
              total: program.flags.total,
            })
          }}
        </dd>
      </div>
      <div>
        <dt class="text-sm text-muted-color">{{ t('Renewal') }}</dt>
        <dd class="font-medium">
          {{ program.renews_on ? formatCivilDate(program.renews_on) : '—' }}
        </dd>
      </div>
      <div>
        <dt class="mb-1 text-sm text-muted-color">
          {{ t('Average adherence') }}
        </dt>
        <dd>
          <AdherenceBadge
            :value="program.flags.adherence.average"
            :trend="program.flags.adherence.trend"
          />
        </dd>
      </div>
      <div>
        <dt class="text-sm text-muted-color">{{ t('Start') }}</dt>
        <dd class="font-medium">{{ formatCivilDate(program.starts_on) }}</dd>
      </div>
      <div>
        <dt class="text-sm text-muted-color">{{ t('Expected end') }}</dt>
        <dd class="font-medium">{{ formatCivilDate(program.flags.endsOn) }}</dd>
      </div>
      <div v-if="program.goal" class="sm:col-span-2">
        <dt class="text-sm text-muted-color">{{ t('Goal') }}</dt>
        <dd class="whitespace-pre-wrap">{{ program.goal }}</dd>
      </div>
      <div v-if="program.notes" class="sm:col-span-2">
        <dt class="text-sm text-muted-color">{{ t('Internal notes') }}</dt>
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
      {{ t('Open training plan') }}
      <i class="pi pi-external-link ms-1 text-xs" aria-hidden="true" />
    </a>
  </div>
</template>
