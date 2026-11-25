<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import { type Direction } from '@/lib/catalog';

defineProps<{
  name: string;
  busy: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
}>();
defineEmits<{ move: [direction: Direction]; edit: []; remove: [] }>();
</script>

<template>
  <div class="flex gap-1">
    <Button
      type="button"
      icon="pi pi-arrow-up"
      :aria-label="t('Move up {name}', { name })"
      severity="secondary"
      size="small"
      text
      :disabled="busy || !canMoveUp"
      @click="$emit('move', 'up')"
    />
    <Button
      type="button"
      icon="pi pi-arrow-down"
      :aria-label="t('Move down {name}', { name })"
      severity="secondary"
      size="small"
      text
      :disabled="busy || !canMoveDown"
      @click="$emit('move', 'down')"
    />
    <Button
      type="button"
      icon="pi pi-pencil"
      :aria-label="t('Edit {name}', { name })"
      severity="secondary"
      size="small"
      text
      :disabled="busy"
      @click="$emit('edit')"
    />
    <Button
      type="button"
      icon="pi pi-trash"
      :aria-label="t('Delete {name}', { name })"
      severity="danger"
      size="small"
      text
      :disabled="busy"
      @click="$emit('remove')"
    />
  </div>
</template>
