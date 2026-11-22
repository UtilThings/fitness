<script setup lang="ts">
import Tag from 'primevue/tag';
import type { Availability } from '@/lib/bookings';

defineProps<{ availability: Availability; spotsLeft: number }>();

const labels = {
  available: { text: 'Disponible', severity: 'success' },
  almost: { text: 'Casi llena', severity: 'warn' },
  full: { text: 'Llena', severity: 'danger' },
} as const;
</script>

<template>
  <Tag
    :severity="labels[availability].severity"
    :value="`${labels[availability].text} · ${spotsLeft} ${spotsLeft === 1 ? 'cupo' : 'cupos'}`"
    class="w-fit"
  />
</template>
