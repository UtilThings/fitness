<script setup lang="ts">
import Tag from 'primevue/tag';
import { programStatuses, type ProgramStatus } from '@/lib/coaching';

defineProps<{ status: ProgramStatus }>();
const severities = {
  active: 'success',
  paused: 'warn',
  ended: 'secondary',
} as const;
</script>

<template>
  <Tag :value="programStatuses[status]" :severity="severities[status]" />
</template>
