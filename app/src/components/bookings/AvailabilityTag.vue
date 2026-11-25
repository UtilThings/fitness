<script setup lang="ts">
import { computed } from 'vue';
import { t } from '@/i18n';
import Tag from 'primevue/tag';
import type { Availability } from '@/lib/bookings';

defineProps<{ availability: Availability; spotsLeft: number }>();

const labels = computed(
  () =>
    ({
      available: { text: t('Available'), severity: 'success' },
      almost: { text: t('Almost full'), severity: 'warn' },
      full: { text: t('Full'), severity: 'danger' },
    }) as const,
);
</script>

<template>
  <Tag
    :severity="labels[availability].severity"
    :value="
      t(
        '{status} · 1 spot | {status} · {count} spots',
        { status: labels[availability].text, count: spotsLeft },
        spotsLeft,
      )
    "
    class="w-fit"
  />
</template>
