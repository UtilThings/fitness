<script setup lang="ts">
import { t } from '@/i18n';
defineProps<{
  rendered?: { subject: string; body: string };
  loading?: boolean;
  error?: string;
}>();
</script>

<template>
  <section
    class="grid content-start gap-3 rounded-lg border border-surface p-4"
    aria-live="polite"
  >
    <h3 class="font-semibold">{{ t('Preview') }}</h3>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400" role="alert">
      {{ error }}
    </p>
    <p v-else-if="loading" class="text-sm text-muted-color">
      {{ t('Updating…') }}
    </p>
    <template v-else-if="rendered">
      <p class="break-words font-medium">{{ rendered.subject }}</p>
      <p class="whitespace-pre-wrap break-words">{{ rendered.body }}</p>
    </template>
    <p v-else class="text-sm text-muted-color">
      {{ t('Enter the subject and message to see a preview.') }}
    </p>
  </section>
</template>
