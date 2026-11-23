<script setup lang="ts">
import { formatCivilDate } from '@/lib/datetime';
import type { CoachingCheckin } from '@/lib/coaching';
import AdherenceBadge from './AdherenceBadge.vue';

defineProps<{ checkins: CoachingCheckin[] }>();
</script>

<template>
  <p v-if="!checkins.length" class="text-sm text-muted-color">
    Todavía no hay check-ins.
  </p>
  <ol
    v-else
    class="grid gap-4 border-s border-surface-200 ps-4 dark:border-surface-700"
  >
    <li v-for="entry in checkins" :key="entry.id" class="grid gap-1">
      <div class="flex flex-wrap items-center gap-2">
        <time class="font-medium" :datetime="entry.checked_at.slice(0, 10)">{{
          formatCivilDate(entry.checked_at)
        }}</time>
        <AdherenceBadge :value="entry.adherence" />
      </div>
      <span v-if="entry.expand?.created_by" class="text-sm text-muted-color">{{
        entry.expand.created_by.name
      }}</span>
      <p v-if="entry.notes" class="whitespace-pre-wrap text-sm">
        {{ entry.notes }}
      </p>
    </li>
  </ol>
</template>
