<script setup lang="ts">
import AutoComplete, {
  type AutoCompleteCompleteEvent,
  type AutoCompleteOptionSelectEvent,
} from 'primevue/autocomplete';
import { ref, shallowRef, useId, watch } from 'vue';
import { useClients } from '@/composables/useClients';
import {
  formatPhone,
  fullName,
  type Client,
  type ClientStatus,
} from '@/lib/clients';

const props = withDefaults(
  defineProps<{ label?: string; status?: ClientStatus; disabled?: boolean }>(),
  { label: 'Cliente', status: undefined },
);
const client = defineModel<Client | null>({ default: null });
const text = shallowRef<Client | string | null>(client.value);
const suggestions = shallowRef<Client[]>([]);
const failed = ref(false);
const id = useId();
const { list } = useClients();
let latestSearch = 0;

watch(client, (next) => {
  if (next || typeof text.value !== 'string') text.value = next;
});

function changeInput(value: Client | string | null) {
  text.value = value;
  latestSearch++;
  failed.value = false;
  suggestions.value = [];
  if (!value || typeof value === 'string') client.value = null;
}

async function search({ query }: AutoCompleteCompleteEvent) {
  const version = ++latestSearch;
  const q = query.trim();
  if (q.length < 2) return;

  try {
    const result = await list({ q, status: props.status, perPage: 10 });
    if (version === latestSearch) suggestions.value = result.items;
  } catch {
    if (version === latestSearch) failed.value = true;
  }
}

function select({ value }: AutoCompleteOptionSelectEvent) {
  client.value = value;
}
</script>

<template>
  <div class="grid gap-1.5">
    <label :for="id" class="text-sm font-medium">{{ label }}</label>
    <AutoComplete
      :input-id="id"
      :model-value="text"
      :suggestions="suggestions"
      :option-label="fullName"
      :min-length="2"
      :delay="300"
      :disabled="disabled"
      :empty-search-message="
        failed ? 'No se pudo buscar clientes' : 'Sin coincidencias'
      "
      placeholder="Busca por nombre, email o teléfono"
      force-selection
      fluid
      @update:model-value="changeInput"
      @complete="search"
      @option-select="select"
    >
      <template #option="{ option }">
        <div>
          <div>{{ fullName(option) }}</div>
          <small v-if="option.email || option.phone" class="text-muted-color">
            {{
              [option.email, formatPhone(option.phone)]
                .filter(Boolean)
                .join(' · ')
            }}
          </small>
        </div>
      </template>
    </AutoComplete>
  </div>
</template>
