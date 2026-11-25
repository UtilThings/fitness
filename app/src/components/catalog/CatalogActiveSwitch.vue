<script setup lang="ts">
import { t } from '@/i18n';
import ToggleSwitch from 'primevue/toggleswitch';
import { ref } from 'vue';

const props = defineProps<{
  name: string;
  active: boolean;
  disabled: boolean;
}>();
const emit = defineEmits<{ change: [active: boolean] }>();
const revision = ref(0);
const region = ref<HTMLElement>();
function requestChange(value: boolean) {
  // Keep the switch at the persisted value while a confirmation or save is pending.
  const restoreFocus = region.value?.contains(document.activeElement);
  revision.value++;
  if (restoreFocus) {
    requestAnimationFrame(() => {
      const focused = document.activeElement;
      if (focused === document.body || region.value?.contains(focused)) {
        region.value?.querySelector('input')?.focus();
      }
    });
  }
  emit('change', value);
}
</script>

<template>
  <span ref="region" class="inline-flex items-center gap-2">
    <ToggleSwitch
      :key="revision"
      :model-value="active"
      :aria-label="
        props.active
          ? t('Deactivate {name}', { name })
          : t('Activate {name}', { name })
      "
      :disabled="disabled"
      @update:model-value="requestChange"
    />
    <span class="text-sm">{{ active ? t('Active') : t('Inactive') }}</span>
  </span>
</template>
