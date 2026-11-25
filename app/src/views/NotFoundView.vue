<script setup lang="ts">
import { t } from '@/i18n';
</script>

<template>
  <main
    class="flex min-h-screen flex-col items-center justify-center gap-4 p-6"
  >
    <h1 class="text-4xl font-bold">404</h1>
    <p>{{ t('The page you are looking for does not exist.') }}</p>
    <RouterLink to="/" class="text-primary underline">{{
      t('Back to home')
    }}</RouterLink>
  </main>
</template>
