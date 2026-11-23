<script setup lang="ts">
import Card from 'primevue/card';
import type { RouteLocationRaw } from 'vue-router';

defineProps<{
  title: string;
  value: number;
  icon: string;
  to?: RouteLocationRaw;
}>();
</script>

<template>
  <Card class="min-w-0">
    <template #content>
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <RouterLink
            v-if="to"
            :to="to"
            class="text-sm text-primary hover:underline"
            >{{ title }}</RouterLink
          >
          <p v-else class="text-sm">{{ title }}</p>
          <p class="mt-1 text-2xl font-semibold tabular-nums">{{ value }}</p>
        </div>
        <i :class="icon" class="mt-1 text-primary" aria-hidden="true" />
      </div>
    </template>
  </Card>
</template>
