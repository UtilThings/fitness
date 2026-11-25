<script setup lang="ts">
import SelectButton from 'primevue/selectbutton';
import { ref } from 'vue';
import { locale, setLocale, t, type Locale } from '@/i18n';

const options = [
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
];
const loadFailed = ref(false);

async function selectLocale(value: Locale) {
  loadFailed.value = false;
  try {
    await setLocale(value);
  } catch {
    loadFailed.value = true;
  }
}
</script>

<template>
  <div>
    <SelectButton
      :model-value="locale"
      :options="options"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      :aria-label="t('Language')"
      size="small"
      @update:model-value="selectLocale"
    />
    <p v-if="loadFailed" role="alert">
      {{ t('Could not load the selected language.') }}
    </p>
  </div>
</template>
