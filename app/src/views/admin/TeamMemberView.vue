<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { computed, ref, shallowRef, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusTag from '@/components/StatusTag.vue';
import MemberAvatar from '@/components/team/MemberAvatar.vue';
import MemberForm from '@/components/team/MemberForm.vue';
import RolePermissions from '@/components/team/RolePermissions.vue';
import { ACTIVE_STATUS, ROLE_STATUS } from '@/components/team/team-labels';
import { useAuth } from '@/composables/useAuth';
import { useNotify } from '@/composables/useNotify';
import { useTeam, type NewMember } from '@/composables/useTeam';
import type { PbError } from '@/lib/pb-errors';
import type { Admin } from '@/types/pb';

const route = useRoute();
const { user, can } = useAuth();
const team = useTeam();
const notify = useNotify();
const member = shallowRef<Admin | null>(null);
const loadError = shallowRef<PbError | null>(null);
const retry = ref(0);
const loading = ref(true);
const busy = ref(false);
const editing = ref(false);
const draft = ref<NewMember>();
const editErrors = ref<Record<string, string>>();
const isSelf = computed(() => member.value?.id === user.value?.id);
const canEdit = computed(() => can('team.manage') && !isSelf.value);
const displayName = computed(
  () => member.value?.name || member.value?.email || t('Unnamed'),
);

watch(
  [() => route.params.id, retry],
  async ([id], _, onCleanup) => {
    let current = true;
    onCleanup(() => {
      current = false;
    });
    member.value = null;
    loadError.value = null;
    editing.value = false;
    loading.value = true;
    try {
      if (typeof id === 'string') {
        const record = await team.getMember(id);
        if (current) member.value = record;
      }
    } catch (cause) {
      if (current) loadError.value = cause as PbError;
    } finally {
      if (current) loading.value = false;
    }
  },
  { immediate: true },
);

function openEdit() {
  if (!member.value) return;
  const { name, email, role, phone, bio } = member.value;
  draft.value = {
    name,
    email: email ?? '',
    role,
    phone: phone ?? '',
    bio: bio ?? '',
    password: '',
  };
  editErrors.value = undefined;
  editing.value = true;
}

async function update(
  operation: (id: string) => Promise<Admin>,
  message: string,
) {
  const id = member.value?.id;
  if (!id || !canEdit.value || busy.value) return;
  busy.value = true;
  editErrors.value = undefined;
  try {
    const record = await operation(id);
    if (member.value?.id === id) {
      member.value = record;
      editing.value = false;
    }
    notify.success(message);
  } catch (cause) {
    const error = cause as PbError;
    if (member.value?.id === id) editErrors.value = error.fields;
    notify.error(error.message);
  } finally {
    busy.value = false;
  }
}

function save({ name, role, phone, bio }: NewMember) {
  return update(
    (id) => team.updateMember(id, { name, role, phone, bio }),
    t('Team member updated'),
  );
}

function upload(file: File) {
  return update((id) => team.uploadAvatar(id, file), t('Photo updated'));
}

function toggleActive() {
  const active = !member.value?.active;
  return update(
    (id) => team.setActive(id, active),
    active ? t('Team member activated') : t('Team member deactivated'),
  );
}
</script>

<template>
  <div class="grid max-w-5xl gap-5">
    <RouterLink
      :to="{ name: 'team' }"
      class="w-fit text-sm font-medium text-primary hover:underline"
    >
      <i class="pi pi-arrow-left mr-1" aria-hidden="true" />
      {{ t('Back to team') }}
    </RouterLink>
    <p v-if="loading" role="status">{{ t('Loading team member…') }}</p>
    <EmptyState
      v-else-if="!member && (!loadError || loadError.status === 404)"
      icon="pi pi-user"
      :title="t('Team member not found')"
    />
    <div
      v-else-if="loadError"
      class="flex flex-wrap items-center gap-3"
      role="alert"
    >
      <span>{{ loadError.message }}</span>
      <Button
        :label="t('Retry')"
        severity="secondary"
        outlined
        @click="retry++"
      />
    </div>

    <template v-if="member">
      <PageHeader :title="displayName">
        <template v-if="canEdit || isSelf" #actions>
          <template v-if="canEdit">
            <Button
              :label="member.active ? t('Deactivate') : t('Activate')"
              severity="secondary"
              outlined
              :disabled="busy"
              @click="toggleActive"
            />
            <Button
              :label="t('Edit')"
              icon="pi pi-pencil"
              :disabled="busy"
              @click="openEdit"
            />
          </template>
          <RouterLink
            v-else
            :to="{ name: 'profile' }"
            class="text-sm font-medium text-primary hover:underline"
            >{{ t('Go to my profile') }}</RouterLink
          >
        </template>
      </PageHeader>

      <section
        class="grid gap-5 rounded-xl border border-surface-200 bg-surface-0 p-5 dark:border-surface-800 dark:bg-surface-900"
      >
        <div class="flex flex-wrap items-center justify-between gap-4">
          <MemberAvatar
            :member="member"
            size="xlarge"
            :editable="canEdit"
            :busy="busy"
            @upload="upload"
          />
          <div class="flex flex-wrap gap-2">
            <StatusTag :value="member.role" :map="ROLE_STATUS" />
            <StatusTag :value="String(member.active)" :map="ACTIVE_STATUS" />
          </div>
        </div>
        <dl class="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt class="font-medium">{{ t('Email address') }}</dt>
            <dd class="break-all text-surface-600 dark:text-surface-300">
              {{ member.email || '—' }}
            </dd>
          </div>
          <div>
            <dt class="font-medium">{{ t('Phone') }}</dt>
            <dd class="text-surface-600 dark:text-surface-300">
              {{ member.phone || '—' }}
            </dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="font-medium">{{ t('Bio') }}</dt>
            <dd
              class="wrap-anywhere whitespace-pre-wrap text-surface-600 dark:text-surface-300"
            >
              {{ member.bio || '—' }}
            </dd>
          </div>
        </dl>
      </section>

      <section
        class="grid gap-3 rounded-xl border border-surface-200 bg-surface-0 p-5 dark:border-surface-800 dark:bg-surface-900"
      >
        <h2 class="font-semibold">{{ t('Permissions by role') }}</h2>
        <RolePermissions :highlight="member.role" />
      </section>

      <section
        v-if="member.role !== 'reception'"
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-200 bg-surface-0 p-5 dark:border-surface-800 dark:bg-surface-900"
      >
        <h2 class="font-semibold">{{ t('Schedule and classes') }}</h2>
        <Button
          as="RouterLink"
          :to="{ name: 'classes', query: { coach: member.id } }"
          :label="t('View schedule')"
          icon="pi pi-calendar"
          severity="secondary"
          outlined
        />
      </section>

      <Dialog
        v-if="canEdit"
        v-model:visible="editing"
        :header="t('Edit team member')"
        modal
        :closable="!busy"
        :close-on-escape="!busy"
        class="w-[min(32rem,calc(100%-2rem))]"
      >
        <MemberForm
          v-if="draft"
          v-model="draft"
          mode="edit"
          :errors="editErrors"
          :busy="busy"
          @submit="save"
          @cancel="editing = false"
        />
      </Dialog>
    </template>
  </div>
</template>
