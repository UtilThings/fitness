<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>();
</script>

<template>
  <div class="mb-6 text-center">
    <h1 class="text-2xl font-bold">{{ title }}</h1>
    <p v-if="subtitle" class="mt-2 text-sm text-surface-500">{{ subtitle }}</p>
  </div>
</template>
