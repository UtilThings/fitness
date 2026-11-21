<script setup lang="ts">
import Tag, { type TagProps } from 'primevue/tag';
import { computed } from 'vue';

const props = defineProps<{
  value: string;
  map: Record<
    string,
    { label: string; severity: NonNullable<TagProps['severity']> }
  >;
}>();

const status = computed(() =>
  Object.hasOwn(props.map, props.value)
    ? props.map[props.value]
    : { label: props.value, severity: 'secondary' },
);
</script>

<template>
  <Tag :value="status.label" :severity="status.severity" />
</template>
