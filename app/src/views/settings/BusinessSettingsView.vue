<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import PageHeader from '@/components/PageHeader.vue';
import { useBusiness } from '@/composables/useBusiness';
import { useNotify } from '@/composables/useNotify';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';
import type { Business } from '@/types/pb';

const { business, logoUrl, updateBusiness } = useBusiness();
const notify = useNotify();
const fields = [
  { key: 'name', label: 'Nombre', max: 80, type: 'text', required: true },
  { key: 'city', label: 'Ciudad', max: 80, type: 'text' },
  { key: 'phone', label: 'Teléfono', type: 'tel' },
  { key: 'email', label: 'Correo de contacto', type: 'email' },
] as const;
const imageTypes = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
];
const details = ref({ name: '', city: '', phone: '', email: '' });
const logoChange = ref<File | null | undefined>();
const preview = ref('');
const saving = ref(false);
const errors = ref<Record<string, string>>({});
const image = computed(() =>
  logoChange.value === null ? '' : preview.value || logoUrl.value,
);

function setLogo(file: File | null | undefined) {
  if (preview.value) URL.revokeObjectURL(preview.value);
  logoChange.value = file;
  preview.value = file ? URL.createObjectURL(file) : '';
}

watch(
  business,
  (record) => {
    details.value = {
      name: record?.name ?? '',
      city: record?.city ?? '',
      phone: record?.phone ?? '',
      email: record?.email ?? '',
    };
    setLogo(undefined);
  },
  { immediate: true },
);

onBeforeUnmount(() => setLogo(undefined));

function selectLogo(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  delete errors.value.logo;
  if (!imageTypes.includes(file.type)) {
    errors.value.logo =
      'Selecciona una imagen PNG, JPEG, WebP, GIF, AVIF o SVG.';
  } else if (file.size > 2 * 1024 * 1024) {
    errors.value.logo = 'El logo no puede superar 2 MB.';
  } else {
    setLogo(file);
  }
}

function removeLogo() {
  setLogo(null);
  delete errors.value.logo;
}

async function save() {
  const id = business.value?.id;
  if (!id || saving.value) return;
  errors.value = {};
  if (!details.value.name.trim()) {
    errors.value.name = 'Ingresa el nombre del negocio.';
    return;
  }
  const data = new FormData();
  for (const { key } of fields) data.set(key, details.value[key].trim());
  if (logoChange.value !== undefined) data.set('logo', logoChange.value ?? '');

  saving.value = true;
  try {
    const record = await pb
      .collection<Business>('businesses')
      .update(id, data, { requestKey: null });
    updateBusiness(record);
    notify.success('Negocio actualizado');
  } catch (cause) {
    const error = parsePbError(cause);
    errors.value = error.fields;
    notify.error(error.message);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="grid max-w-3xl gap-5">
    <PageHeader title="Negocio" />
    <form v-if="business" class="grid gap-5" @submit.prevent="save">
      <fieldset
        :disabled="saving"
        class="grid gap-4 rounded-xl border border-surface-200 bg-surface-0 p-5 dark:border-surface-800 dark:bg-surface-900"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <CatalogField
            v-for="field in fields"
            :id="'business-' + field.key"
            :key="field.key"
            v-slot="{ describedBy }"
            :label="field.label"
            :error="errors[field.key]"
          >
            <InputText
              :id="'business-' + field.key"
              v-model="details[field.key]"
              :type="field.type"
              :maxlength="'max' in field ? field.max : undefined"
              :required="'required' in field"
              :aria-describedby="describedBy"
            />
          </CatalogField>
        </div>
        <CatalogField
          id="business-logo"
          v-slot="{ describedBy }"
          label="Logo"
          :error="errors.logo"
          help="Imagen de hasta 2 MB."
        >
          <div class="flex flex-wrap items-center gap-4">
            <img
              v-if="image"
              :src="image"
              alt="Vista previa del logo"
              class="h-14 max-w-40 object-contain"
            />
            <input
              id="business-logo"
              type="file"
              :accept="imageTypes.join(',')"
              :aria-describedby="describedBy"
              class="max-w-full text-sm"
              @change="selectLogo"
            />
            <Button
              v-if="image"
              type="button"
              severity="secondary"
              variant="text"
              label="Quitar logo"
              @click="removeLogo"
            />
          </div>
        </CatalogField>
        <div>
          <Button type="submit" label="Guardar cambios" :loading="saving" />
        </div>
      </fieldset>
      <section
        class="grid gap-3 rounded-xl border border-surface-200 p-5 dark:border-surface-800"
      >
        <p class="text-sm text-muted-color">
          La moneda, la zona horaria y el prefijo los cambia el administrador de
          la plataforma.
        </p>
        <dl class="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt class="font-medium">Moneda</dt>
            <dd>{{ business.currency }}</dd>
          </div>
          <div>
            <dt class="font-medium">Zona horaria</dt>
            <dd>{{ business.timezone }}</dd>
          </div>
          <div>
            <dt class="font-medium">Prefijo de recibo</dt>
            <dd>{{ business.receipt_prefix }}</dd>
          </div>
        </dl>
      </section>
    </form>
  </div>
</template>
