<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <header class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 class="text-xl font-semibold">{{ title }}</h1>
      <p
        v-if="description"
        class="mt-1 text-sm text-surface-600 dark:text-surface-300"
      >
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
