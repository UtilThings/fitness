<script setup lang="ts">
import logo from '@/assets/jq-logo.png';
</script>

<template>
  <main class="flex min-h-screen items-center justify-center p-4">
    <div
      class="w-full max-w-md rounded-2xl border border-surface-200 bg-surface-0 p-8 shadow-lg dark:border-surface-800 dark:bg-surface-900"
    >
      <img :src="logo" alt="JQ Fitness" class="mx-auto mb-4 h-14 w-auto" />
      <RouterView />
    </div>
  </main>
</template>
