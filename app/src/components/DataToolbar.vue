<script setup lang="ts">
import { t } from '@/i18n';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    searchClass?: string;
  }>(),
  {
    modelValue: '',
    placeholder: undefined,
    searchClass: 'w-full sm:w-auto',
  },
);
const emit = defineEmits<{
  'update:modelValue': [value: string];
  search: [value: string];
}>();

const searchLabel = computed(() => props.placeholder ?? t('Search'));
const draft = ref(props.modelValue);
let pendingSearch: ReturnType<typeof setTimeout> | undefined;

function updateSearch(value?: string) {
  const text = value ?? '';
  draft.value = text;
  emit('update:modelValue', text);
  clearTimeout(pendingSearch);
  pendingSearch = setTimeout(() => emit('search', text), 300);
}

watch(
  () => props.modelValue,
  (value) => {
    if (value === draft.value) return;
    clearTimeout(pendingSearch);
    draft.value = value;
  },
);
onBeforeUnmount(() => clearTimeout(pendingSearch));
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <IconField :class="searchClass">
      <InputIcon class="pi pi-search" aria-hidden="true" />
      <InputText
        :model-value="draft"
        type="search"
        :placeholder="searchLabel"
        :aria-label="searchLabel"
        class="w-full"
        @update:model-value="updateSearch"
      />
    </IconField>
    <slot name="filters" />
    <div v-if="$slots.actions" class="flex flex-wrap gap-2 sm:ms-auto">
      <slot name="actions" />
    </div>
  </div>
</template>
