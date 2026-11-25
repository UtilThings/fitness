<script setup lang="ts">
import { t } from '@/i18n';
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
    error.value = t('Could not send the request. Try again.');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthHeading
    :title="t('Forgot your password?')"
    :subtitle="t('Enter your email address.')"
  />
  <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
    <div class="flex flex-col gap-2">
      <label for="email" class="text-sm">{{ t('Email address') }}</label>
      <InputText
        id="email"
        v-model="email"
        type="email"
        :placeholder="t('name{\'@\'}company.com')"
        autocomplete="username"
        :disabled="sent"
        required
        fluid
      />
    </div>
    <Message v-if="sent" severity="success" size="small">
      {{
        t(
          'If the email address is registered, you will receive a password reset link.',
        )
      }}
    </Message>
    <p v-if="error" class="text-sm text-red-500" role="alert">{{ error }}</p>
    <Button
      type="submit"
      :label="t('Send link')"
      :loading="loading"
      :disabled="sent"
      fluid
    />
  </form>
  <p class="mt-6 text-center text-sm text-surface-500">
    {{ t('Remember your password?') }}
    <RouterLink :to="{ name: 'login' }" class="text-primary hover:underline">
      {{ t('Sign in') }}
    </RouterLink>
  </p>
</template>
