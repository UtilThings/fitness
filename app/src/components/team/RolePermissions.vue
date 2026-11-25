<script setup lang="ts">
import { t } from '@/i18n';
import {
  PERMISSIONS,
  permissionLabel,
  type Permission,
} from '@/lib/permissions';
import { ROLES, type Role } from '@/types/pb';
import { ROLE_STATUS } from './team-labels';

defineProps<{ highlight?: Role }>();

const permissions = Object.keys(PERMISSIONS) as Permission[];
const highlightClass = 'bg-primary/10 font-semibold';
</script>

<template>
  <div class="overflow-x-auto">
    <table
      class="w-full text-left text-sm"
      :aria-label="t('Permissions by role')"
    >
      <thead class="border-b border-surface-200 dark:border-surface-700">
        <tr>
          <th class="px-3 py-2" scope="col">{{ t('Permission') }}</th>
          <th
            v-for="role in ROLES"
            :key="role"
            :data-role="role"
            :data-highlighted="role === highlight ? true : undefined"
            :class="[
              'px-3 py-2 text-center',
              role === highlight && highlightClass,
            ]"
            scope="col"
          >
            {{ ROLE_STATUS[role].label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="permission in permissions"
          :key="permission"
          :data-permission="permission"
        >
          <th class="px-3 py-2 font-medium" scope="row">
            {{ permissionLabel(permission) }}
          </th>
          <td
            v-for="role in ROLES"
            :key="role"
            :data-role="role"
            :class="[
              'px-3 py-2 text-center',
              role === highlight && highlightClass,
            ]"
          >
            {{ PERMISSIONS[permission].includes(role) ? t('Yes') : '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
