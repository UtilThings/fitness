<script setup lang="ts">
import Button from 'primevue/button';
import Message from 'primevue/message';
import Skeleton from 'primevue/skeleton';

defineProps<{ error?: string; loading: boolean }>();
defineEmits<{ retry: [] }>();
</script>

<template>
  <Message v-if="error" severity="error">
    <div class="flex flex-wrap items-center gap-3">
      <span>{{ error }}</span>
      <Button
        label="Reintentar"
        size="small"
        severity="secondary"
        @click="$emit('retry')"
      />
    </div>
  </Message>
  <div
    v-else-if="loading"
    class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    aria-label="Cargando el dashboard"
    aria-busy="true"
  >
    <Skeleton v-for="index in 4" :key="index" height="5rem" />
  </div>
</template>
