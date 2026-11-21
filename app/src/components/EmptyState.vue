<script setup lang="ts">
defineProps<{ icon: string; title: string; description?: string }>();
</script>

<template>
  <section
    class="flex flex-col items-center gap-3 rounded-lg border border-dashed border-surface-300 px-6 py-10 text-center dark:border-surface-700"
  >
    <i :class="icon" class="text-2xl text-surface-500" aria-hidden="true" />
    <div>
      <h2 class="font-semibold">{{ title }}</h2>
      <p
        v-if="description"
        class="mt-1 text-sm text-surface-600 dark:text-surface-300"
      >
        {{ description }}
      </p>
    </div>
    <slot />
  </section>
</template>
