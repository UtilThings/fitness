<script setup lang="ts">
import { t } from '@/i18n';
</script>

<template>
  <section
    class="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-16 text-center"
  >
    <i class="pi pi-lock text-primary text-3xl" aria-hidden="true" />
    <h1 class="text-2xl font-bold">
      {{ t('You do not have permission to view this page') }}
    </h1>
    <p>{{ t('Your role does not have access to this section.') }}</p>
    <RouterLink to="/" class="text-primary font-medium underline">{{
      t('Back to home')
    }}</RouterLink>
  </section>
</template>
