<script setup lang="ts">
import Card from 'primevue/card';
</script>

<template>
  <div class="flex flex-col gap-4">
    <h1 class="text-xl font-semibold">Panel de administración</h1>
    <Card>
      <template #content>
        <p class="text-surface-500">Aquí irán las métricas del gimnasio.</p>
      </template>
    </Card>
  </div>
</template>
