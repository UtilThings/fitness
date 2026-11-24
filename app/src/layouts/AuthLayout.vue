<script setup lang="ts">
import { watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { env } from '@/lib/env';

const route = useRoute();
watchEffect(() => {
  document.title = route.meta.title
    ? `${route.meta.title} · ${env.appName}`
    : env.appName;
});
</script>

<template>
  <main class="flex min-h-screen items-center justify-center p-4">
    <div
      class="w-full max-w-md rounded-2xl border border-surface-200 bg-surface-0 p-8 shadow-lg dark:border-surface-800 dark:bg-surface-900"
    >
      <p class="mb-4 text-center text-lg font-semibold">{{ env.appName }}</p>
      <RouterView />
    </div>
  </main>
</template>
