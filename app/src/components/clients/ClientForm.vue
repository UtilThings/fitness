<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { computed, ref, useId, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import { useClients } from '@/composables/useClients';
import type { ClientDetails } from '@/lib/clients';
import { LOCALES } from '@/lib/messages';

const props = defineProps<{
  mode: 'create' | 'edit';
  clientId?: string;
  errors?: Record<string, string>;
  busy?: boolean;
}>();
const model = defineModel<ClientDetails>({ required: true });
const emit = defineEmits<{ submit: [values: ClientDetails]; cancel: [] }>();
const id = useId();
const { hasMatchingPhone } = useClients();
const duplicatePhone = ref(false);
const phone = () => model.value.phone;
let latestCheck = 0;

const fields = computed(
  () =>
    [
      {
        key: 'first_name',
        label: t('Name'),
        type: 'text',
        max: 80,
        required: true,
        autocomplete: 'given-name',
      },
      {
        key: 'last_name',
        label: t('Last name'),
        type: 'text',
        max: 80,
        required: true,
        autocomplete: 'family-name',
      },
      {
        key: 'email',
        label: t('Email address'),
        type: 'email',
        autocomplete: 'email',
      },
      { key: 'phone', label: t('Phone'), type: 'tel', autocomplete: 'tel' },
      { key: 'joined_on', label: t('Join date'), type: 'date' },
      {
        key: 'emergency_contact',
        label: t('Emergency contact'),
        type: 'text',
        max: 200,
      },
    ] as const satisfies readonly {
      key: Exclude<keyof ClientDetails, 'locale'>;
      label: string;
      type: string;
      max?: number;
      required?: boolean;
      autocomplete?: string;
    }[],
);

watch(phone, () => {
  latestCheck++;
  duplicatePhone.value = false;
});

async function checkPhone() {
  const version = ++latestCheck;
  try {
    const matches = await hasMatchingPhone(phone(), props.clientId);
    if (version === latestCheck) duplicatePhone.value = matches;
  } catch {
    if (version === latestCheck) duplicatePhone.value = false;
  }
}

function submit() {
  if (props.busy) return;
  emit('submit', {
    ...model.value,
    first_name: model.value.first_name.trim(),
    last_name: model.value.last_name.trim(),
  });
}
</script>

<template>
  <form class="grid gap-4" novalidate @submit.prevent="submit">
    <div class="grid gap-4 sm:grid-cols-2">
      <CatalogField
        v-for="field in fields"
        :id="id + '-' + field.key"
        :key="field.key"
        :label="field.label"
        :error="errors?.[field.key]"
        :help="
          field.key === 'phone' && duplicatePhone
            ? t('Another client has this phone number.')
            : undefined
        "
      >
        <template #default="{ describedBy }">
          <InputText
            :id="id + '-' + field.key"
            :model-value="model[field.key]"
            :type="field.type"
            :required="'required' in field && field.required"
            :maxlength="'max' in field ? field.max : undefined"
            :autocomplete="
              'autocomplete' in field ? field.autocomplete : undefined
            "
            :invalid="!!errors?.[field.key]"
            :aria-describedby="describedBy"
            :disabled="busy"
            fluid
            @update:model-value="
              model = { ...model, [field.key]: $event ?? '' }
            "
            @blur="field.key === 'phone' && checkPhone()"
          />
        </template>
      </CatalogField>
      <CatalogField
        :id="id + '-locale'"
        :label="t('Communication language')"
        :error="errors?.locale"
      >
        <template #default="{ describedBy }">
          <Select
            :input-id="id + '-locale'"
            :model-value="model.locale ?? 'es'"
            :options="LOCALES"
            option-label="label"
            option-value="value"
            :disabled="busy"
            :invalid="!!errors?.locale"
            :aria-describedby="describedBy"
            fluid
            @update:model-value="model = { ...model, locale: $event }"
          />
        </template>
      </CatalogField>
    </div>
    <div class="flex justify-end gap-2">
      <Button
        v-if="mode === 'create'"
        :label="t('Cancel')"
        severity="secondary"
        text
        :disabled="busy"
        @click="emit('cancel')"
      />
      <Button
        type="submit"
        :label="
          mode === 'create' ? t('Create client') : t('Save details{\'\'}')
        "
        :loading="busy"
      />
    </div>
  </form>
</template>
