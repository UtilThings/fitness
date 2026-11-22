<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { reactive, useId, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import { todayLocal } from '@/lib/datetime';

const props = defineProps<{
  assessment: unknown;
  assessorId: string;
  error?: string;
  busy?: boolean;
}>();
const emit = defineEmits<{ submit: [value: Record<string, unknown>] }>();
const id = useId();
type Answer = string | number | boolean | null;
type SectionKey =
  'medical' | 'lifestyle' | 'training' | 'measurements' | 'summary';
type Field = { name: string; label: string } & (
  | { type: 'text' | 'number' | 'textarea' }
  | { type: 'select'; choices: { label: string; value: Answer }[] }
);

const sections: readonly {
  key: SectionKey;
  label: string;
  fields: readonly Field[];
}[] = [
  {
    key: 'medical',
    label: 'Información médica',
    fields: [
      { name: 'conditions', label: 'Condiciones médicas', type: 'textarea' },
      { name: 'injuries', label: 'Lesiones', type: 'textarea' },
      { name: 'medications', label: 'Medicamentos', type: 'textarea' },
      {
        name: 'parq_cleared',
        label: 'Apto según PAR-Q',
        type: 'select',
        choices: [
          { label: 'Sí', value: true },
          { label: 'No', value: false },
        ],
      },
    ],
  },
  {
    key: 'lifestyle',
    label: 'Estilo de vida',
    fields: [
      {
        name: 'activity_level',
        label: 'Nivel de actividad',
        type: 'select',
        choices: [
          { label: 'Sedentario', value: 'sedentary' },
          { label: 'Ligero', value: 'light' },
          { label: 'Moderado', value: 'moderate' },
          { label: 'Alto', value: 'high' },
        ],
      },
      { name: 'sleep_hours', label: 'Horas de sueño', type: 'number' },
      { name: 'stress_level', label: 'Nivel de estrés (1–5)', type: 'number' },
      {
        name: 'nutrition_notes',
        label: 'Notas de nutrición',
        type: 'textarea',
      },
    ],
  },
  {
    key: 'training',
    label: 'Entrenamiento',
    fields: [
      {
        name: 'experience',
        label: 'Experiencia',
        type: 'select',
        choices: [
          { label: 'Sin experiencia', value: 'none' },
          { label: 'Principiante', value: 'beginner' },
          { label: 'Intermedia', value: 'intermediate' },
          { label: 'Avanzada', value: 'advanced' },
        ],
      },
      { name: 'days_per_week', label: 'Días por semana', type: 'number' },
      { name: 'preferred_times', label: 'Horarios preferidos', type: 'text' },
      { name: 'equipment_access', label: 'Equipo disponible', type: 'text' },
    ],
  },
  {
    key: 'measurements',
    label: 'Medidas',
    fields: [
      { name: 'weight_lb', label: 'Peso (lb)', type: 'number' },
      { name: 'height_in', label: 'Estatura (in)', type: 'number' },
      { name: 'waist_in', label: 'Cintura (in)', type: 'number' },
      { name: 'body_fat_pct', label: 'Grasa corporal (%)', type: 'number' },
    ],
  },
  {
    key: 'summary',
    label: 'Objetivos y notas de la evaluación',
    fields: [
      { name: 'goals_detail', label: 'Detalle de objetivos', type: 'textarea' },
      { name: 'notes', label: 'Notas de evaluación', type: 'textarea' },
    ],
  },
];

const completed = reactive({ date: todayLocal(), by: '' });
const answers = reactive<Record<SectionKey, Record<string, Answer>>>({
  medical: {},
  lifestyle: {},
  training: {},
  measurements: {},
  summary: {},
});

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

watch(
  () => props.assessment,
  (raw) => {
    const source = object(raw);
    completed.date =
      typeof source.completed_on === 'string'
        ? source.completed_on
        : todayLocal();
    completed.by =
      typeof source.assessed_by === 'string' ? source.assessed_by : '';
    for (const section of sections) {
      const block =
        section.key === 'summary' ? source : object(source[section.key]);
      answers[section.key] = {};
      for (const field of section.fields) {
        const value = block[field.name];
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          answers[section.key][field.name] = value;
        }
      }
    }
  },
  { immediate: true },
);

function submit() {
  if (props.busy || !props.assessorId) return;
  const value: Record<string, unknown> = {
    version: 1,
    completed_on: completed.date,
    assessed_by: completed.by || props.assessorId,
  };
  for (const { key, fields } of sections) {
    const block: Record<string, Answer> = {};
    for (const field of fields) {
      const answer = answers[key][field.name];
      if (answer == null || answer === '') continue;
      block[field.name] = field.type === 'number' ? Number(answer) : answer;
    }
    if (key === 'summary') Object.assign(value, block);
    else if (Object.keys(block).length) value[key] = block;
  }
  emit('submit', value);
}
</script>

<template>
  <form class="grid gap-5" novalidate @submit.prevent="submit">
    <Message v-if="error" severity="error" :closable="false" role="alert">{{
      error
    }}</Message>
    <CatalogField
      :id="id + '-completed'"
      label="Fecha de evaluación"
      class="max-w-56"
    >
      <InputText
        :id="id + '-completed'"
        v-model="completed.date"
        type="date"
        :disabled="busy"
        fluid
      />
    </CatalogField>
    <fieldset
      v-for="{ key, label, fields } in sections"
      :key="key"
      class="grid gap-4 rounded-lg border border-surface-200 p-4 sm:grid-cols-2 dark:border-surface-700"
      :disabled="busy"
    >
      <legend class="px-1 font-semibold">{{ label }}</legend>
      <CatalogField
        v-for="field in fields"
        :id="id + '-' + field.name"
        :key="field.name"
        :label="field.label"
        :class="{ 'sm:col-span-2': field.type === 'textarea' }"
      >
        <Select
          v-if="field.type === 'select'"
          v-model="answers[key][field.name]"
          :input-id="id + '-' + field.name"
          :options="field.choices"
          :aria-label="field.label"
          option-label="label"
          option-value="value"
          placeholder="Sin registrar"
          show-clear
          fluid
        />
        <Textarea
          v-else-if="field.type === 'textarea'"
          :id="id + '-' + field.name"
          :model-value="String(answers[key][field.name] ?? '')"
          rows="2"
          fluid
          @update:model-value="answers[key][field.name] = $event ?? ''"
        />
        <InputText
          v-else
          :id="id + '-' + field.name"
          :model-value="String(answers[key][field.name] ?? '')"
          :type="field.type"
          :step="field.type === 'number' ? 'any' : undefined"
          fluid
          @update:model-value="answers[key][field.name] = $event ?? ''"
        />
      </CatalogField>
    </fieldset>
    <div class="flex justify-end">
      <Button
        type="submit"
        label="Guardar evaluación"
        :loading="busy"
        :disabled="!assessorId"
      />
    </div>
  </form>
</template>
