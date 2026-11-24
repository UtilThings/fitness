<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import { useConfirm } from 'primevue/useconfirm';
import { onBeforeUnmount, ref, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import PageHeader from '@/components/PageHeader.vue';
import { useBusiness } from '@/composables/useBusiness';
import { useBusinessKey } from '@/composables/useBusinessKey';
import { useNotify } from '@/composables/useNotify';
import { formatDateTime } from '@/lib/datetime';
import { parseAllowedOrigins } from '@/lib/integration-origins';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';
import type { Business } from '@/types/pb';

const { business, updateBusiness } = useBusiness();
const { rotate } = useBusinessKey();
const confirm = useConfirm();
const notify = useNotify();
const originsText = ref('');
const originsError = ref('');
const saving = ref(false);
const rotating = ref(false);
const revealedKey = ref('');
let mounted = true;

watch(
  () => business.value?.allowed_origins,
  (origins) => {
    originsText.value = (origins ?? []).join('\n');
  },
  { immediate: true },
);

function closeKey() {
  revealedKey.value = '';
}

watch(() => business.value?.id, closeKey);
onBeforeUnmount(() => {
  mounted = false;
  closeKey();
});

async function saveOrigins() {
  const record = business.value;
  if (!record || saving.value || rotating.value) return;
  originsError.value = '';
  let origins: string[];
  try {
    origins = parseAllowedOrigins(originsText.value);
  } catch (error) {
    originsError.value = (error as Error).message;
    return;
  }

  saving.value = true;
  try {
    const updated = await pb
      .collection<Business>('businesses')
      .update(record.id, { allowed_origins: origins }, { requestKey: null });
    updateBusiness(updated);
    notify.success('Orígenes guardados');
  } catch (cause) {
    const error = parsePbError(cause);
    originsError.value = error.fields.allowed_origins || error.message;
  } finally {
    saving.value = false;
  }
}

async function requestRotation() {
  const record = business.value;
  if (!mounted || !record || rotating.value || saving.value) return;
  rotating.value = true;
  try {
    const { key, prefix, rotated_at } = await rotate();
    if (!mounted || business.value?.id !== record.id) return;
    updateBusiness({
      ...business.value,
      public_key_prefix: prefix,
      public_key_rotated_at: rotated_at,
    });
    revealedKey.value = key;
  } catch (cause) {
    if (mounted) notify.error(parsePbError(cause).message);
  } finally {
    rotating.value = false;
  }
}

function confirmRotation() {
  const existingKey = !!business.value?.public_key_prefix;
  confirm.require({
    header: existingKey ? 'Rotar clave pública' : 'Generar clave pública',
    message: existingKey
      ? 'La clave anterior dejará de funcionar de inmediato. Actualiza el sitio con la nueva clave.'
      : 'Genera la clave que usará tu sitio para consultar el catálogo y el horario.',
    acceptLabel: existingKey ? 'Rotar clave' : 'Generar clave',
    rejectLabel: 'Cancelar',
    accept: requestRotation,
  });
}

async function copyKey() {
  const key = revealedKey.value;
  if (!key) return;
  try {
    await navigator.clipboard.writeText(key);
    notify.success('Clave copiada');
  } catch {
    notify.error('No se pudo copiar. Selecciona y copia la clave manualmente.');
  }
}
</script>

<template>
  <div class="grid max-w-3xl gap-5">
    <PageHeader title="Integración" />
    <template v-if="business">
      <section
        class="grid gap-4 rounded-xl border border-surface-200 p-5 dark:border-surface-800"
      >
        <h2 class="font-semibold">Clave pública</h2>
        <dl class="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt class="font-medium">Prefijo</dt>
            <dd>{{ business.public_key_prefix || 'Sin clave' }}</dd>
          </div>
          <div>
            <dt class="font-medium">Última rotación</dt>
            <dd>
              {{
                business.public_key_rotated_at
                  ? formatDateTime(business.public_key_rotated_at)
                  : '—'
              }}
            </dd>
          </div>
        </dl>
        <div>
          <Button
            type="button"
            :label="
              business.public_key_prefix ? 'Rotar clave' : 'Generar clave'
            "
            :loading="rotating"
            :disabled="saving"
            @click="confirmRotation"
          />
        </div>
      </section>

      <form
        class="grid gap-4 rounded-xl border border-surface-200 p-5 dark:border-surface-800"
        @submit.prevent="saveOrigins"
      >
        <CatalogField
          id="integration-origins"
          v-slot="{ describedBy }"
          label="Orígenes permitidos"
          help="Escribe un origen por línea, por ejemplo https://tusitio.com."
          :error="originsError"
        >
          <Textarea
            id="integration-origins"
            v-model="originsText"
            :aria-describedby="describedBy"
            :disabled="saving || rotating"
            rows="4"
          />
        </CatalogField>
        <div>
          <Button
            type="submit"
            label="Guardar orígenes"
            :loading="saving"
            :disabled="rotating"
          />
        </div>
      </form>
    </template>

    <Dialog
      :visible="!!revealedKey"
      modal
      header="Nueva clave pública"
      :style="{ width: 'min(36rem, 95vw)' }"
      @update:visible="
        (visible) => {
          if (!visible) closeKey();
        }
      "
    >
      <div v-if="revealedKey" class="grid gap-3">
        <p>
          Guarda la clave para configurar tu sitio. Al cerrar este diálogo ya no
          podrás recuperarla.
        </p>
        <CatalogField id="integration-key" label="Clave pública">
          <InputText
            id="integration-key"
            :model-value="revealedKey"
            readonly
            class="w-full font-mono"
          />
        </CatalogField>
      </div>
      <template #footer>
        <Button
          type="button"
          label="Cerrar"
          severity="secondary"
          variant="text"
          @click="closeKey"
        />
        <Button
          type="button"
          label="Copiar"
          icon="pi pi-copy"
          @click="copyKey"
        />
      </template>
    </Dialog>
  </div>
</template>
