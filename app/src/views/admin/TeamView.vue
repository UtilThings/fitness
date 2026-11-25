<script setup lang="ts">
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
const activeOptions = [
  { value: true, label: 'Activos' },
  { value: false, label: 'Inactivos' },
];
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
    notify.success('Integrante creado');
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
    notify.success(value ? 'Integrante activado' : 'Integrante desactivado');
  } catch (cause) {
    notify.error((cause as PbError).message);
  } finally {
    working.value = false;
  }
}

function remove(member: Admin) {
  confirmDelete({
    message: `¿Eliminar a ${member.name || member.email} del equipo?`,
    onConfirm: async () => {
      if (working.value || !canManage.value) return;
      working.value = true;
      try {
        const result = await team.deleteOrDeactivate(member);
        if (result.needsDeactivate) {
          if (member.active) deactivate.value = member;
          else
            notify.info(
              'Este integrante tiene registros asociados y ya está inactivo',
            );
          return;
        }
        await fixPage();
        notify.success('Integrante eliminado');
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
    <PageHeader title="Equipo">
      <template v-if="canManage" #actions>
        <Button
          label="Nuevo integrante"
          icon="pi pi-plus"
          @click="openCreate"
        />
      </template>
    </PageHeader>

    <DataToolbar placeholder="Buscar por nombre o correo" @search="search">
      <template #filters>
        <Select
          v-model="role"
          :options="roleOptions"
          option-label="label"
          option-value="value"
          aria-label="Filtrar por rol"
          placeholder="Todos los roles"
          show-clear
          @change="applyFilters"
        />
        <Select
          v-model="active"
          :options="activeOptions"
          option-label="label"
          option-value="value"
          aria-label="Filtrar por estado"
          placeholder="Todos los estados"
          show-clear
          @change="applyFilters"
        />
      </template>
    </DataToolbar>

    <div v-if="error" class="flex flex-wrap items-center gap-3" role="alert">
      <span>{{ error.message }}</span>
      <Button
        label="Reintentar"
        severity="secondary"
        outlined
        @click="team.load()"
      />
    </div>
    <EmptyState
      v-else-if="!loading && !items.length && !total"
      icon="pi pi-users"
      title="No hay integrantes para mostrar"
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
      <Column header="Nombre">
        <template #body="{ data }">
          <div class="flex min-w-36 items-center gap-3">
            <MemberAvatar :member="data" />
            <RouterLink
              :to="{ name: 'team-member', params: { id: data.id } }"
              class="font-medium text-primary hover:underline"
            >
              {{ data.name || data.email || 'Sin nombre' }}
            </RouterLink>
          </div>
        </template>
      </Column>
      <Column header="Correo">
        <template #body="{ data }">{{ data.email || '—' }}</template>
      </Column>
      <Column header="Rol">
        <template #body="{ data }"
          ><StatusTag :value="data.role" :map="ROLE_STATUS"
        /></template>
      </Column>
      <Column header="Estado">
        <template #body="{ data }"
          ><StatusTag :value="String(data.active)" :map="ACTIVE_STATUS"
        /></template>
      </Column>
      <Column v-if="canManage" header="Acciones">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              type="button"
              size="small"
              :label="data.active ? 'Desactivar' : 'Activar'"
              severity="secondary"
              text
              :disabled="working"
              @click="setActive(data, !data.active)"
            />
            <Button
              v-if="data.id !== user?.id"
              type="button"
              size="small"
              label="Eliminar"
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
      header="Nuevo integrante"
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
      header="Desactivar integrante"
      modal
      class="w-[min(28rem,calc(100%-2rem))]"
      @update:visible="deactivate = null"
    >
      <p>Tiene registros asociados. ¿Quieres desactivarlo en su lugar?</p>
      <template #footer>
        <Button
          label="Cancelar"
          severity="secondary"
          text
          @click="deactivate = null"
        />
        <Button
          label="Desactivar"
          severity="warn"
          @click="deactivate && setActive(deactivate, false)"
        />
      </template>
    </Dialog>
  </div>
</template>
