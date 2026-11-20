<script setup lang="ts">
import { ref } from 'vue';

interface Field {
  kind: 'text' | 'email' | 'select' | 'textarea';
  placeholder?: string;
  required?: boolean;
  options?: string[];
  rows?: number;
}

defineProps<{
  title?: string;
  fields: Field[];
  submitLabel: string;
  successMessage: string;
}>();
const emit = defineEmits<{ submitted: [] }>();

const submitted = ref(false);
const fieldClass =
  'w-full rounded-lg border border-input bg-background px-4 py-3';
const textFieldClass = `${fieldClass} outline-none focus:border-primary`;

function submit() {
  if (submitted.value) return;
  submitted.value = true;
  emit('submitted');
}
</script>

<template>
  <form class="card-surface space-y-4 p-7" @submit.prevent="submit">
    <h2 v-if="title" class="text-3xl">{{ title }}</h2>
    <p v-if="submitted" class="text-primary" role="status">
      {{ successMessage }}
    </p>
    <template v-else>
      <template v-for="(field, index) in fields" :key="index">
        <select
          v-if="field.kind === 'select'"
          :class="fieldClass"
          :required="field.required"
          :aria-label="field.placeholder ?? field.options?.[0]"
        >
          <option v-for="option in field.options" :key="option">
            {{ option }}
          </option>
        </select>
        <textarea
          v-else-if="field.kind === 'textarea'"
          :class="textFieldClass"
          :placeholder="field.placeholder"
          :aria-label="field.placeholder"
          :required="field.required"
          :rows="field.rows"
        />
        <input
          v-else
          :class="textFieldClass"
          :type="field.kind"
          :placeholder="field.placeholder"
          :aria-label="field.placeholder"
          :required="field.required"
        />
      </template>
      <button type="submit" class="btn btn-primary w-full">
        {{ submitLabel }}
      </button>
    </template>
  </form>
</template>
