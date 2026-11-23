<script setup lang="ts">
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import { useId } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';

defineProps<{ fields?: Record<string, string>; disabled?: boolean }>();
const date = defineModel<string>('date', { required: true });
const time = defineModel<string>('time', { required: true });
const duration = defineModel<number | null>('duration', { required: true });
const id = useId();
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2">
    <CatalogField
      :id="id + '-date'"
      label="Fecha en Miramar"
      :error="fields?.starts_at"
    >
      <InputText
        :id="id + '-date'"
        v-model="date"
        type="date"
        required
        :disabled="disabled"
        fluid
      />
    </CatalogField>
    <CatalogField :id="id + '-time'" label="Hora en Miramar">
      <InputText
        :id="id + '-time'"
        v-model="time"
        type="time"
        required
        :disabled="disabled"
        fluid
      />
    </CatalogField>
  </div>
  <CatalogField
    :id="id + '-duration'"
    label="Duración (minutos)"
    :error="fields?.duration_min"
  >
    <InputNumber
      v-model="duration"
      :input-id="id + '-duration'"
      :min="15"
      :max="240"
      :disabled="disabled"
      fluid
    />
  </CatalogField>
</template>
