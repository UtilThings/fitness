<script setup lang="ts">
import LocaleSwitcher from '@/components/LocaleSwitcher.vue';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { env } from '@/lib/env';

useDocumentTitle(() => env.appName);
</script>

<template>
  <main class="flex min-h-screen items-center justify-center p-4">
    <div
      class="w-full max-w-md rounded-2xl border border-surface-200 bg-surface-0 p-8 shadow-lg dark:border-surface-800 dark:bg-surface-900"
    >
      <p class="mb-4 text-center text-lg font-semibold">{{ env.appName }}</p>
      <RouterView />
      <LocaleSwitcher class="mt-4 flex justify-center" />
    </div>
  </main>
</template>
