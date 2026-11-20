<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthHeading from '@/components/AuthHeading.vue';
import { useAuth } from '@/composables/useAuth';
import { safeRedirect } from '@/router';

const { login } = useAuth();
const route = useRoute();
const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    await login(email.value, password.value);
    await router.push(safeRedirect(route.query.redirect));
  } catch {
    error.value = 'Correo o contraseña incorrectos.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthHeading title="Iniciar sesión" subtitle="Ingresa tus credenciales." />
  <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
    <div class="flex flex-col gap-2">
      <label for="email" class="text-sm">Correo electrónico</label>
      <InputText
        id="email"
        v-model="email"
        type="email"
        placeholder="nombre@empresa.com"
        autocomplete="username"
        required
        fluid
      />
    </div>
    <div class="flex flex-col gap-2">
      <label for="password" class="text-sm">Contraseña</label>
      <Password
        v-model="password"
        input-id="password"
        :feedback="false"
        toggle-mask
        autocomplete="current-password"
        required
        fluid
      />
    </div>
    <p v-if="error" class="text-sm text-red-500" role="alert">{{ error }}</p>
    <Button type="submit" label="Entrar" :loading="loading" fluid />
  </form>
  <p class="mt-6 text-center text-sm text-surface-500">
    <RouterLink
      :to="{ name: 'forgot-password' }"
      class="text-primary hover:underline"
    >
      ¿Olvidaste tu contraseña?
    </RouterLink>
  </p>
</template>
