<script setup lang="ts">
import { intlLocale } from '@/i18n/formats';
import Tag from 'primevue/tag';
import { computed } from 'vue';
import type { Trend } from '@/lib/coaching';

const props = defineProps<{ value: number | null; trend?: Trend }>();
const severity = computed(() => {
  const value = props.value;
  if (value === null) return 'secondary';
  if (value <= 2) return 'danger';
  if (value < 4) return 'warn';
  return 'success';
});
const score = computed(() =>
  props.value === null
    ? 'Sin check-ins'
    : new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 2 }).format(
        props.value,
      ) + ' / 5',
);
const trends = {
  up: { icon: 'pi pi-arrow-up', label: 'Al alza' },
  flat: { icon: 'pi pi-minus', label: 'Estable' },
  down: { icon: 'pi pi-arrow-down', label: 'A la baja' },
};
</script>

<template>
  <span class="inline-flex flex-wrap items-center gap-2">
    <Tag :value="score" :severity="severity" />
    <span
      v-if="trend && value !== null"
      class="inline-flex items-center gap-1 text-xs"
    >
      <i :class="trends[trend].icon" aria-hidden="true" />
      {{ trends[trend].label }}
    </span>
  </span>
</template>
