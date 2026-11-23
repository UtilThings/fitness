<script setup lang="ts">
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
    <h3 class="font-semibold">Vista previa</h3>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400" role="alert">
      {{ error }}
    </p>
    <p v-else-if="loading" class="text-sm text-muted-color">Actualizando…</p>
    <template v-else-if="rendered">
      <p class="break-words font-medium">{{ rendered.subject }}</p>
      <p class="whitespace-pre-wrap break-words">{{ rendered.body }}</p>
    </template>
    <p v-else class="text-sm text-muted-color">
      Completa el asunto y el mensaje para ver un ejemplo.
    </p>
  </section>
</template>
