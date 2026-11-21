<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { ref, useId } from 'vue';
import type { NewMember } from '@/composables/useTeam';
import { generatePassword, validatePassword } from '@/lib/password';
import { ROLES } from '@/types/pb';
import { ROLE_STATUS } from './team-labels';

const props = defineProps<{
  mode: 'create' | 'edit';
  errors?: Record<string, string>;
  busy?: boolean;
  lockRole?: boolean;
}>();

const model = defineModel<NewMember>({ required: true });
const emit = defineEmits<{ submit: [values: NewMember]; cancel: [] }>();
const id = useId();
const clientErrors = ref<Record<string, string>>({});
const roleOptions = ROLES.map((role) => ({
  value: role,
  label: ROLE_STATUS[role].label,
}));

function fieldError(field: keyof NewMember) {
  return clientErrors.value[field] || props.errors?.[field];
}

function setField<K extends keyof NewMember>(field: K, value: NewMember[K]) {
  model.value = { ...model.value, [field]: value };
  delete clientErrors.value[field];
}

function submit() {
  const values = {
    ...model.value,
    name: model.value.name.trim(),
    email: model.value.email.trim(),
    phone: model.value.phone.trim(),
  };
  const invalid: Record<string, string> = {};
  if (!values.name) invalid.name = 'Ingresa un nombre';
  if (!ROLES.includes(values.role)) invalid.role = 'Selecciona un rol';
  if (!/^[0-9+()\-\s.]{0,30}$/.test(values.phone))
    invalid.phone = 'Ingresa un teléfono válido de hasta 30 caracteres';
  if ([...values.bio].length > 600) invalid.bio = 'Usa hasta 600 caracteres';
  if (props.mode === 'create') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
      invalid.email = 'Ingresa un correo válido';
    const passwordError = validatePassword(values.password);
    if (passwordError) invalid.password = passwordError;
  }
  clientErrors.value = invalid;
  if (!props.busy && !Object.keys(invalid).length) emit('submit', values);
}
</script>

<template>
  <form class="grid gap-4" novalidate @submit.prevent="submit">
    <div class="grid gap-1.5">
      <label :for="`${id}-name`" class="text-sm font-medium">Nombre</label>
      <InputText
        :id="`${id}-name`"
        :model-value="model.name"
        required
        :invalid="!!fieldError('name')"
        :aria-describedby="fieldError('name') && `${id}-name-error`"
        @update:model-value="setField('name', $event ?? '')"
      />
      <small
        v-if="fieldError('name')"
        :id="`${id}-name-error`"
        class="text-red-600 dark:text-red-400"
        role="alert"
        >{{ fieldError('name') }}</small
      >
    </div>
    <div class="grid gap-1.5">
      <label :for="`${id}-email`" class="text-sm font-medium"
        >Correo electrónico</label
      >
      <InputText
        :id="`${id}-email`"
        :model-value="model.email"
        type="email"
        autocomplete="email"
        :required="mode === 'create'"
        :readonly="mode === 'edit'"
        :invalid="!!fieldError('email')"
        :aria-describedby="fieldError('email') && `${id}-email-error`"
        @update:model-value="setField('email', $event ?? '')"
      />
      <small
        v-if="fieldError('email')"
        :id="`${id}-email-error`"
        class="text-red-600 dark:text-red-400"
        role="alert"
        >{{ fieldError('email') }}</small
      >
    </div>
    <div class="grid gap-1.5">
      <label :for="`${id}-role`" class="text-sm font-medium">Rol</label>
      <Select
        :input-id="`${id}-role`"
        :model-value="model.role"
        :options="roleOptions"
        option-label="label"
        option-value="value"
        :disabled="lockRole"
        :invalid="!!fieldError('role')"
        :aria-describedby="fieldError('role') && `${id}-role-error`"
        @update:model-value="setField('role', $event)"
      />
      <small
        v-if="fieldError('role')"
        :id="`${id}-role-error`"
        class="text-red-600 dark:text-red-400"
        role="alert"
        >{{ fieldError('role') }}</small
      >
    </div>
    <div class="grid gap-1.5">
      <label :for="`${id}-phone`" class="text-sm font-medium">Teléfono</label>
      <InputText
        :id="`${id}-phone`"
        :model-value="model.phone"
        type="tel"
        autocomplete="tel"
        :maxlength="30"
        :invalid="!!fieldError('phone')"
        :aria-describedby="fieldError('phone') && `${id}-phone-error`"
        @update:model-value="setField('phone', $event ?? '')"
      />
      <small
        v-if="fieldError('phone')"
        :id="`${id}-phone-error`"
        class="text-red-600 dark:text-red-400"
        role="alert"
        >{{ fieldError('phone') }}</small
      >
    </div>
    <div class="grid gap-1.5">
      <label :for="`${id}-bio`" class="text-sm font-medium">Biografía</label>
      <Textarea
        :id="`${id}-bio`"
        :model-value="model.bio"
        :maxlength="600"
        rows="3"
        :invalid="!!fieldError('bio')"
        :aria-describedby="fieldError('bio') && `${id}-bio-error`"
        @update:model-value="setField('bio', $event ?? '')"
      />
      <small
        v-if="fieldError('bio')"
        :id="`${id}-bio-error`"
        class="text-red-600 dark:text-red-400"
        role="alert"
        >{{ fieldError('bio') }}</small
      >
    </div>
    <div v-if="mode === 'create'" class="grid gap-1.5">
      <label :for="`${id}-password`" class="text-sm font-medium"
        >Contraseña inicial</label
      >
      <div class="flex flex-wrap gap-2 sm:flex-nowrap">
        <Password
          :input-id="`${id}-password`"
          :model-value="model.password"
          class="min-w-0 flex-1"
          autocomplete="new-password"
          :feedback="false"
          toggle-mask
          fluid
          :invalid="!!fieldError('password')"
          :input-props="{
            required: true,
            'aria-describedby': [
              `${id}-password-help`,
              fieldError('password') && `${id}-password-error`,
            ]
              .filter(Boolean)
              .join(' '),
          }"
          @update:model-value="setField('password', $event ?? '')"
        />
        <Button
          type="button"
          label="Generar"
          severity="secondary"
          outlined
          @click="setField('password', generatePassword())"
        />
      </div>
      <small
        :id="`${id}-password-help`"
        class="text-surface-600 dark:text-surface-300"
        >Comunica la contraseña inicial en persona.</small
      >
      <small
        v-if="fieldError('password')"
        :id="`${id}-password-error`"
        class="text-red-600 dark:text-red-400"
        role="alert"
        >{{ fieldError('password') }}</small
      >
    </div>
    <div class="flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        label="Cancelar"
        severity="secondary"
        text
        :disabled="busy"
        @click="emit('cancel')"
      />
      <Button
        type="submit"
        :label="mode === 'create' ? 'Crear integrante' : 'Guardar cambios'"
        :loading="busy"
      />
    </div>
  </form>
</template>
