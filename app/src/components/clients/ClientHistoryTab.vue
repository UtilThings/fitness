<script setup lang="ts">
import { historySections } from '@/views/admin/clients/history-sections';

defineProps<{ clientId: string }>();
</script>

<template>
  <div class="grid gap-4">
    <section
      v-for="section in historySections"
      :key="section.key"
      class="rounded-lg border border-surface-200 p-4 dark:border-surface-700"
    >
      <h2 class="mb-2 font-semibold">{{ section.label }}</h2>
      <component
        :is="section.component"
        v-if="section.available"
        :client-id="clientId"
      />
      <p v-else class="text-sm text-muted-color">
        Disponible con la feature {{ section.feature }}
      </p>
    </section>
  </div>
</template>
