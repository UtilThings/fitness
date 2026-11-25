<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Column from 'primevue/column';
import DataTable, { type DataTablePageEvent } from 'primevue/datatable';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import DataToolbar from '@/components/DataToolbar.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusTag from '@/components/StatusTag.vue';
import MemberAvatar from '@/components/team/MemberAvatar.vue';
import MemberForm from '@/components/team/MemberForm.vue';
import { ACTIVE_STATUS, ROLE_STATUS } from '@/components/team/team-labels';
import { useAuth } from '@/composables/useAuth';
import type { CollectionFilter } from '@/composables/useCollection';
import { useConfirmDelete } from '@/composables/useConfirmDelete';
import { useNotify } from '@/composables/useNotify';
import { useTeam, type NewMember } from '@/composables/useTeam';
import type { PbError } from '@/lib/pb-errors';
import { ROLES, type Admin, type Role } from '@/types/pb';

const { user, can } = useAuth();
const { confirmDelete } = useConfirmDelete();
const notify = useNotify();
const team = useTeam();
const { items, loading, error, page, perPage, total, filters } = team;
const canManage = computed(() => can('team.manage'));
const role = ref<Role | null>(null);
const active = ref<boolean | null>(null);
const roleOptions = computed(() =>
  ROLES.map((value) => ({
    value,
    label: ROLE_STATUS.value[value].label,
  })),
);
const activeOptions = computed(() => [
  { value: true, label: t('Active members') },
  { value: false, label: t('Inactive members') },
]);
const createVisible = ref(false);
const newMember = ref<NewMember>(blankMember());
const creationError = ref<PbError | null>(null);
const creating = ref(false);
const working = ref(false);
const deactivate = ref<Admin | null>(null);

onMounted(() => team.load());

function applyFilters() {
  const clauses: CollectionFilter[] = [];
  if (role.value)
    clauses.push({
      expression: 'role = {:role}',
      params: { role: role.value },
    });
  if (active.value != null)
    clauses.push({
      expression: 'active = {:active}',
      params: { active: active.value },
    });
  filters.value = clauses;
  return team.setPage(1);
}

function search(text: string) {
  return team.search(text, ['name', 'email']);
}

function changePage(event: DataTablePageEvent) {
  perPage.value = event.rows;
  return team.setPage(event.page + 1);
}

async function fixPage() {
  const last = Math.max(1, Math.ceil(total.value / perPage.value));
  if (!error.value && page.value > last) await team.setPage(last);
}

function blankMember(): NewMember {
  return {
    name: '',
    email: '',
    role: 'coach',
    phone: '',
    bio: '',
    password: '',
  };
}

function openCreate() {
  newMember.value = blankMember();
  creationError.value = null;
  createVisible.value = true;
}

function clearCreate() {
  newMember.value = blankMember();
  creationError.value = null;
}

async function createMember(data: NewMember) {
  if (creating.value || !canManage.value) return;
  creationError.value = null;
  creating.value = true;
  try {
    await team.createMember(data);
    createVisible.value = false;
    notify.success(t('Team member created'));
  } catch (cause) {
    creationError.value = cause as PbError;
    notify.error(creationError.value.message);
  } finally {
    creating.value = false;
  }
}

async function setActive(member: Admin, value: boolean) {
  if (working.value || !canManage.value) return;
  working.value = true;
  deactivate.value = null;
  try {
    await team.setActive(member.id, value);
    await fixPage();
    notify.success(
      value ? t('Team member activated') : t('Team member deactivated'),
    );
  } catch (cause) {
    notify.error((cause as PbError).message);
  } finally {
    working.value = false;
  }
}

function remove(member: Admin) {
  confirmDelete({
    message: t('Remove {name} from the team?', {
      name: member.name || member.email,
    }),
    onConfirm: async () => {
      if (working.value || !canManage.value) return;
      working.value = true;
      try {
        const result = await team.deleteOrDeactivate(member);
        if (result.needsDeactivate) {
          if (member.active) deactivate.value = member;
          else
            notify.info(
              t('This team member has related records and is already inactive'),
            );
          return;
        }
        await fixPage();
        notify.success(t('Team member deleted'));
      } catch (cause) {
        notify.error((cause as PbError).message);
      } finally {
        working.value = false;
      }
    },
  });
}
</script>

<template>
  <div class="grid gap-5">
    <PageHeader :title="t('Team')">
      <template v-if="canManage" #actions>
        <Button
          :label="t('New team member')"
          icon="pi pi-plus"
          @click="openCreate"
        />
      </template>
    </PageHeader>

    <DataToolbar :placeholder="t('Search by name or email')" @search="search">
      <template #filters>
        <Select
          v-model="role"
          :options="roleOptions"
          option-label="label"
          option-value="value"
          :aria-label="t('Filter by role')"
          :placeholder="t('All roles')"
          show-clear
          @change="applyFilters"
        />
        <Select
          v-model="active"
          :options="activeOptions"
          option-label="label"
          option-value="value"
          :aria-label="t('Filter by status')"
          :placeholder="t('All statuses')"
          show-clear
          @change="applyFilters"
        />
      </template>
    </DataToolbar>

    <div v-if="error" class="flex flex-wrap items-center gap-3" role="alert">
      <span>{{ error.message }}</span>
      <Button
        :label="t('Retry')"
        severity="secondary"
        outlined
        @click="team.load()"
      />
    </div>
    <EmptyState
      v-else-if="!loading && !items.length && !total"
      icon="pi pi-users"
      :title="t('No team members to display')"
    />
    <DataTable
      v-else
      :value="items"
      data-key="id"
      :loading="loading"
      :first="(page - 1) * perPage"
      :rows="perPage"
      :total-records="total"
      :paginator="total > perPage"
      lazy
      @page="changePage"
    >
      <Column :header="t('Name')">
        <template #body="{ data }">
          <div class="flex min-w-36 items-center gap-3">
            <MemberAvatar :member="data" />
            <RouterLink
              :to="{ name: 'team-member', params: { id: data.id } }"
              class="font-medium text-primary hover:underline"
            >
              {{ data.name || data.email || t('Unnamed') }}
            </RouterLink>
          </div>
        </template>
      </Column>
      <Column :header="t('Email')">
        <template #body="{ data }">{{ data.email || '—' }}</template>
      </Column>
      <Column :header="t('Role')">
        <template #body="{ data }"
          ><StatusTag :value="data.role" :map="ROLE_STATUS"
        /></template>
      </Column>
      <Column :header="t('Status')">
        <template #body="{ data }"
          ><StatusTag :value="String(data.active)" :map="ACTIVE_STATUS"
        /></template>
      </Column>
      <Column v-if="canManage" :header="t('Actions')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              type="button"
              size="small"
              :label="data.active ? t('Deactivate') : t('Activate')"
              severity="secondary"
              text
              :disabled="working"
              @click="setActive(data, !data.active)"
            />
            <Button
              v-if="data.id !== user?.id"
              type="button"
              size="small"
              :label="t('Delete')"
              severity="danger"
              text
              :disabled="working"
              @click="remove(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="createVisible"
      :header="t('New team member')"
      modal
      :closable="!creating"
      :close-on-escape="!creating"
      class="w-[min(32rem,calc(100%-2rem))]"
      @hide="clearCreate"
    >
      <MemberForm
        v-model="newMember"
        mode="create"
        :errors="creationError?.fields"
        :busy="creating"
        @submit="createMember"
        @cancel="createVisible = false"
      />
    </Dialog>

    <Dialog
      :visible="!!deactivate"
      :header="t('Deactivate team member')"
      modal
      class="w-[min(28rem,calc(100%-2rem))]"
      @update:visible="deactivate = null"
    >
      <p>
        {{
          t(
            'There are related records. Would you like to deactivate this member?',
          )
        }}
      </p>
      <template #footer>
        <Button
          :label="t('Cancel')"
          severity="secondary"
          text
          @click="deactivate = null"
        />
        <Button
          :label="t('Deactivate')"
          severity="warn"
          @click="deactivate && setActive(deactivate, false)"
        />
      </template>
    </Dialog>
  </div>
</template>
