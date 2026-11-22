<script setup lang="ts">
defineProps<{ id: string; label: string; error?: string; help?: string }>();
</script>

<template>
  <div class="grid content-start gap-1.5">
    <label :for="id" class="text-sm font-medium">{{ label }}</label>
    <slot
      :described-by="error ? id + '-error' : help ? id + '-help' : undefined"
    />
    <small v-if="help" :id="id + '-help'" class="text-muted-color">{{
      help
    }}</small>
    <small
      v-if="error"
      :id="id + '-error'"
      class="text-red-600 dark:text-red-400"
      role="alert"
      >{{ error }}</small
    >
  </div>
</template>
