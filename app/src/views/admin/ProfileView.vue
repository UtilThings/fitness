<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Textarea from 'primevue/textarea';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import MemberAvatar from '@/components/team/MemberAvatar.vue';
import { validateBio, validatePhone } from '@/components/team/team-validation';
import { useAuth } from '@/composables/useAuth';
import { useNotify } from '@/composables/useNotify';
import { validatePassword } from '@/lib/password';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';
import type { Admin } from '@/types/pb';

const { user, login, logout } = useAuth();
const router = useRouter();
const notify = useNotify();
const details = ref({ name: '', phone: '', bio: '' });
const passwords = ref({ oldPassword: '', password: '', passwordConfirm: '' });
const detailErrors = ref<Record<string, string>>({});
const passwordErrors = ref<Record<string, string>>({});
const busy = ref<'details' | 'avatar' | 'password' | null>(null);
const passwordFields = computed(
  () =>
    [
      {
        key: 'oldPassword',
        label: t('Current password'),
        autocomplete: 'current-password',
      },
      {
        key: 'password',
        label: t('New password'),
        autocomplete: 'new-password',
      },
      {
        key: 'passwordConfirm',
        label: t('Confirm new password'),
        autocomplete: 'new-password',
      },
    ] as const,
);

function setDetails(record?: Admin | null) {
  details.value = {
    name: record?.name ?? '',
    phone: record?.phone ?? '',
    bio: record?.bio ?? '',
  };
}

watch(
  () => user.value?.id,
  () => setDetails(user.value),
  { immediate: true },
);

async function saveDetails() {
  if (!user.value || busy.value) return;
  const data = {
    ...details.value,
    name: details.value.name.trim(),
    phone: details.value.phone.trim(),
  };
  const fields: Record<string, string> = {};
  if (!data.name) fields.name = t('Enter a name');
  const phoneError = validatePhone(data.phone);
  const bioError = validateBio(data.bio);
  if (phoneError) fields.phone = phoneError;
  if (bioError) fields.bio = bioError;
  detailErrors.value = fields;
  if (Object.keys(fields).length) return;

  busy.value = 'details';
  try {
    const record = await pb
      .collection<Admin>('admins')
      .update(user.value.id, data, { requestKey: null });
    setDetails(record);
    notify.success(t('Profile updated'));
  } catch (cause) {
    const error = parsePbError(cause);
    detailErrors.value = error.fields;
    notify.error(error.message);
  } finally {
    busy.value = null;
  }
}

async function upload(file: File) {
  if (!user.value || busy.value) return;
  busy.value = 'avatar';
  const data = new FormData();
  data.set('avatar', file);
  try {
    await pb
      .collection<Admin>('admins')
      .update(user.value.id, data, { requestKey: null });
    notify.success(t('Photo updated'));
  } catch (cause) {
    const error = parsePbError(cause);
    notify.error(error.fields.avatar || error.message);
  } finally {
    busy.value = null;
  }
}

function resetPasswords() {
  passwords.value = { oldPassword: '', password: '', passwordConfirm: '' };
}

async function changePassword() {
  if (!user.value || busy.value) return;
  const { id, email } = user.value;
  const data = { ...passwords.value };
  const fields: Record<string, string> = {};
  const invalid = validatePassword(data.password);
  if (!data.oldPassword) fields.oldPassword = t('Enter your current password');
  if (invalid) fields.password = invalid;
  if (!data.passwordConfirm || data.password !== data.passwordConfirm) {
    fields.passwordConfirm = t('Passwords must match');
  }
  passwordErrors.value = fields;
  if (Object.keys(fields).length) return;

  busy.value = 'password';
  try {
    await pb.collection<Admin>('admins').update(id, data, { requestKey: null });
    resetPasswords();
    try {
      await login(email, data.password);
      notify.success(t('Password updated'));
    } catch {
      logout();
      notify.info(t('Password updated. Sign in again with the new password.'));
      await router.replace({
        name: 'login',
        query: { redirect: '/settings/profile' },
      });
    }
  } catch (cause) {
    const error = parsePbError(cause);
    passwordErrors.value = error.fields;
    if (error.fields.oldPassword)
      passwordErrors.value.oldPassword = t('The current password is incorrect');
    if (!Object.keys(error.fields).length) notify.error(error.message);
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <div class="grid max-w-3xl gap-5">
    <PageHeader :title="t('My profile')" />

    <section
      v-if="user"
      class="grid gap-4 rounded-xl border border-surface-200 bg-surface-0 p-5 dark:border-surface-800 dark:bg-surface-900"
    >
      <h2 class="font-semibold">{{ t('Personal information') }}</h2>
      <MemberAvatar
        :member="user"
        size="xlarge"
        editable
        :busy="!!busy"
        @upload="upload"
      />
      <form
        :aria-label="t('Personal information')"
        class="grid gap-4"
        novalidate
        @submit.prevent="saveDetails"
      >
        <div class="grid gap-1.5">
          <label for="profile-name" class="text-sm font-medium">{{
            t('Name')
          }}</label>
          <InputText
            id="profile-name"
            v-model="details.name"
            autocomplete="name"
            required
            :invalid="!!detailErrors.name"
            :aria-describedby="detailErrors.name && 'profile-name-error'"
          />
          <small
            v-if="detailErrors.name"
            id="profile-name-error"
            class="text-red-600 dark:text-red-400"
            role="alert"
            >{{ detailErrors.name }}</small
          >
        </div>
        <div class="grid gap-1.5">
          <label for="profile-phone" class="text-sm font-medium">{{
            t('Phone')
          }}</label>
          <InputText
            id="profile-phone"
            v-model="details.phone"
            type="tel"
            autocomplete="tel"
            :maxlength="30"
            :invalid="!!detailErrors.phone"
            :aria-describedby="detailErrors.phone && 'profile-phone-error'"
          />
          <small
            v-if="detailErrors.phone"
            id="profile-phone-error"
            class="text-red-600 dark:text-red-400"
            role="alert"
            >{{ detailErrors.phone }}</small
          >
        </div>
        <div class="grid gap-1.5">
          <label for="profile-bio" class="text-sm font-medium">{{
            t('Bio')
          }}</label>
          <Textarea
            id="profile-bio"
            v-model="details.bio"
            :maxlength="600"
            rows="3"
            :invalid="!!detailErrors.bio"
            :aria-describedby="detailErrors.bio && 'profile-bio-error'"
          />
          <small
            v-if="detailErrors.bio"
            id="profile-bio-error"
            class="text-red-600 dark:text-red-400"
            role="alert"
            >{{ detailErrors.bio }}</small
          >
        </div>
        <Button
          type="submit"
          :label="t('Save changes')"
          class="justify-self-start"
          :disabled="!!busy"
          :loading="busy === 'details'"
        />
      </form>
    </section>

    <section
      v-if="user"
      class="grid gap-4 rounded-xl border border-surface-200 bg-surface-0 p-5 dark:border-surface-800 dark:bg-surface-900"
    >
      <h2 class="font-semibold">{{ t('Change password') }}</h2>
      <form
        :aria-label="t('Change password')"
        class="grid gap-4"
        novalidate
        @submit.prevent="changePassword"
      >
        <div
          v-for="{ key, label, autocomplete } in passwordFields"
          :key="key"
          class="grid gap-1.5"
        >
          <label :for="`profile-${key}`" class="text-sm font-medium">{{
            label
          }}</label>
          <Password
            v-model="passwords[key]"
            :input-id="`profile-${key}`"
            :autocomplete="autocomplete"
            :feedback="false"
            :invalid="!!passwordErrors[key]"
            :input-props="{
              required: true,
              'aria-describedby': passwordErrors[key] && `profile-${key}-error`,
            }"
            toggle-mask
            fluid
          />
          <small
            v-if="passwordErrors[key]"
            :id="`profile-${key}-error`"
            class="text-red-600 dark:text-red-400"
            role="alert"
            >{{ passwordErrors[key] }}</small
          >
        </div>
        <Button
          type="submit"
          :label="t('Change password')"
          class="justify-self-start"
          :disabled="!!busy"
          :loading="busy === 'password'"
        />
      </form>
    </section>
  </div>
</template>
