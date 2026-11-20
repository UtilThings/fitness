<script setup lang="ts">
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import { ref } from 'vue';
import AuthHeading from '@/components/AuthHeading.vue';
import { useAuth } from '@/composables/useAuth';

const { requestPasswordReset } = useAuth();

const email = ref('');
const loading = ref(false);
const sent = ref(false);
const error = ref('');

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    await requestPasswordReset(email.value);
    sent.value = true;
  } catch {
    error.value = 'No se pudo enviar la solicitud. Inténtalo de nuevo.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthHeading
    title="¿Olvidaste tu contraseña?"
    subtitle="Ingresa tu correo electrónico."
  />
  <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
    <div class="flex flex-col gap-2">
      <label for="email" class="text-sm">Correo electrónico</label>
      <InputText
        id="email"
        v-model="email"
        type="email"
        placeholder="nombre@empresa.com"
        autocomplete="username"
        :disabled="sent"
        required
        fluid
      />
    </div>
    <Message v-if="sent" severity="success" size="small">
      Si el correo está registrado, recibirás un enlace para restablecer tu
      contraseña.
    </Message>
    <p v-if="error" class="text-sm text-red-500" role="alert">{{ error }}</p>
    <Button
      type="submit"
      label="Enviar enlace"
      :loading="loading"
      :disabled="sent"
      fluid
    />
  </form>
  <p class="mt-6 text-center text-sm text-surface-500">
    ¿Recordaste tu contraseña?
    <RouterLink :to="{ name: 'login' }" class="text-primary hover:underline">
      Iniciar sesión
    </RouterLink>
  </p>
</template>
