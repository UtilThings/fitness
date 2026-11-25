<script setup lang="ts">
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import { useRoute } from 'vue-router';
import { useBusiness } from '@/composables/useBusiness';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { usePrimeVueLocale } from '@/i18n/primevue';
import { env } from '@/lib/env';

const route = useRoute();
const { business } = useBusiness();

usePrimeVueLocale();
useDocumentTitle(
  () =>
    route.meta.requiresAuth ? business.value?.name || env.appName : env.appName,
  () => route.matched.length === 1,
);
</script>

<template>
  <RouterView />
  <Toast position="top-right" />
  <ConfirmDialog />
</template>
