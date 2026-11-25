<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import ToggleSwitch from 'primevue/toggleswitch';
import { computed, nextTick, ref, useId, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import {
  useMessagePreview,
  useMessageTemplates,
} from '@/composables/useMessageTemplates';
import {
  ALLOWED_VARIABLES,
  LOCALES,
  MESSAGE_LABELS,
  validateTemplate,
  type Locale,
  type MessageDraft,
  type MessageTemplate,
  type ServiceKey,
} from '@/lib/messages';
import MessagePreview from './MessagePreview.vue';

const props = defineProps<{ template: MessageDraft; readOnly?: boolean }>();
const emit = defineEmits<{
  select: [key: ServiceKey, locale: Locale];
  saved: [template: MessageTemplate];
}>();
const id = useId();
const keys = computed(() =>
  Object.entries(MESSAGE_LABELS.value)
    .filter(([key]) => key !== 'manual')
    .map(([value, label]) => ({ value, label })),
);
const draft = ref({ ...props.template });
const bodyField = ref<{ $el: HTMLTextAreaElement }>();
const submitted = ref(false);
const { save, saving, saveError, saveFields, clearSaveErrors } =
  useMessageTemplates();
const { preview, rendered, previewError, previewing, clearPreview } =
  useMessagePreview();

const problems = computed(() => validateTemplate(draft.value));
function fieldError(field: 'subject' | 'body') {
  return (
    problems.value.find(
      (problem) =>
        problem.field === field &&
        (submitted.value || draft.value[field] || problem.variable),
    )?.message || saveFields.value[field]
  );
}
watch(
  () => props.template,
  (template) => {
    draft.value = { ...template };
    submitted.value = false;
    clearSaveErrors();
  },
);
watch(
  () => ({
    key: draft.value.key,
    locale: draft.value.locale,
    subject: draft.value.subject,
    body: draft.value.body,
  }),
  (values) => {
    clearSaveErrors();
    if (problems.value.length) clearPreview();
    else preview(values);
  },
  { immediate: true },
);

async function insert(name: string) {
  const input = bodyField.value?.$el;
  if (!input || props.readOnly) return;
  const marker = '{{' + name + '}}';
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const body = draft.value.body;
  draft.value.body = body.slice(0, start) + marker + body.slice(end);
  await nextTick();
  input.focus();
  input.setSelectionRange(start + marker.length, start + marker.length);
}

async function submit() {
  submitted.value = true;
  if (props.readOnly || saving.value || problems.value.length) return;
  const template = await save(draft.value);
  if (template) emit('saved', template);
}
</script>

<template>
  <div class="grid gap-5 lg:grid-cols-2">
    <form class="grid content-start gap-4" novalidate @submit.prevent="submit">
      <div class="grid gap-3 sm:grid-cols-2">
        <CatalogField
          :id="id + '-key'"
          label="Plantilla"
          :error="saveFields.key"
        >
          <Select
            :input-id="id + '-key'"
            :model-value="draft.key"
            :options="keys"
            option-label="label"
            option-value="value"
            :disabled="saving"
            fluid
            @update:model-value="emit('select', $event, draft.locale)"
          />
        </CatalogField>
        <CatalogField
          :id="id + '-locale'"
          label="Idioma"
          :error="saveFields.locale"
        >
          <Select
            :input-id="id + '-locale'"
            :model-value="draft.locale"
            :options="LOCALES"
            option-label="label"
            option-value="value"
            :disabled="saving"
            fluid
            @update:model-value="emit('select', draft.key, $event)"
          />
        </CatalogField>
      </div>
      <div class="flex items-center gap-2">
        <ToggleSwitch
          v-model="draft.active"
          :input-id="id + '-active'"
          :disabled="readOnly || saving"
        />
        <label :for="id + '-active'" class="text-sm">Activa</label>
      </div>
      <CatalogField
        :id="id + '-subject'"
        v-slot="{ describedBy }"
        label="Asunto"
        :error="fieldError('subject')"
      >
        <InputText
          :id="id + '-subject'"
          v-model="draft.subject"
          :invalid="!!fieldError('subject')"
          :aria-describedby="describedBy"
          :readonly="readOnly"
          :disabled="saving"
          maxlength="150"
          fluid
        />
      </CatalogField>
      <CatalogField
        :id="id + '-body'"
        v-slot="{ describedBy }"
        label="Mensaje"
        :error="fieldError('body')"
      >
        <Textarea
          :id="id + '-body'"
          ref="bodyField"
          v-model="draft.body"
          :invalid="!!fieldError('body')"
          :aria-describedby="describedBy"
          :readonly="readOnly"
          :disabled="saving"
          maxlength="5000"
          rows="7"
          fluid
        />
      </CatalogField>
      <div class="grid gap-2">
        <span class="text-sm font-medium">Variables permitidas</span>
        <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
          <li v-for="variable in ALLOWED_VARIABLES[draft.key]" :key="variable">
            <span
              v-if="readOnly"
              class="rounded-full bg-surface-100 px-2.5 py-1 text-xs dark:bg-surface-800"
              >{{ variable }}</span
            >
            <Button
              v-else
              :label="variable"
              severity="secondary"
              outlined
              rounded
              size="small"
              :disabled="saving"
              @click="insert(variable)"
            />
          </li>
        </ul>
      </div>
      <p
        v-if="saveError"
        class="m-0 text-sm text-red-600 dark:text-red-400"
        role="alert"
      >
        {{ saveError }}
      </p>
      <div v-if="!readOnly" class="flex justify-end">
        <Button
          label="Guardar plantilla"
          type="submit"
          :loading="saving"
          :disabled="!!problems.length"
        />
      </div>
    </form>
    <MessagePreview
      :rendered="rendered"
      :loading="previewing"
      :error="previewError"
    />
  </div>
</template>
