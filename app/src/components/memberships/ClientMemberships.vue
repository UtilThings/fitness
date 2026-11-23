<script setup lang="ts">
import Button from 'primevue/button';
import Message from 'primevue/message';
import { computed, ref, shallowRef, watch } from 'vue';
import AssignPlanDialog from '@/components/memberships/AssignPlanDialog.vue';
import CreditLedger from '@/components/memberships/CreditLedger.vue';
import MembershipActions from '@/components/memberships/MembershipActions.vue';
import MembershipStatusTag from '@/components/memberships/MembershipStatusTag.vue';
import { useAuth } from '@/composables/useAuth';
import { useMemberships } from '@/composables/useMemberships';
import {
  formatMembershipDate,
  membershipBalanceLabel,
  type CreditMovement,
  type Membership,
} from '@/lib/memberships';
import type { PbError } from '@/lib/pb-errors';

const props = defineProps<{ client: string }>();
const emit = defineEmits<{ changed: [] }>();
const { can } = useAuth();
const members = useMemberships();
const assigning = ref(false);
const revision = ref(0);
const list = shallowRef<Membership[]>([]);
const selected = ref('');
const loading = ref(false);
const error = ref('');
const movements = shallowRef<CreditMovement[]>([]);
const ledgerLoading = ref(false);
const ledgerError = ref('');
const canManage = computed(() => can('memberships.manage'));
const current = computed(() =>
  list.value.find(({ id }) => id === selected.value),
);
const visible = computed(() =>
  [...list.value].sort(
    (a, b) =>
      Number(['active', 'paused'].includes(b.status)) -
      Number(['active', 'paused'].includes(a.status)),
  ),
);

watch(
  [() => props.client, revision],
  async ([client], _, onCleanup) => {
    let active = true;
    onCleanup(() => {
      active = false;
    });
    loading.value = true;
    error.value = '';
    try {
      const result = await members.listForClient(client);
      if (!active) return;
      list.value = result;
      if (!result.some(({ id }) => id === selected.value))
        selected.value = visible.value[0]?.id ?? '';
    } catch (cause) {
      if (active) error.value = (cause as PbError).message;
    } finally {
      if (active) loading.value = false;
    }
  },
  { immediate: true },
);

watch([selected, revision], async ([id], _, onCleanup) => {
  let active = true;
  onCleanup(() => {
    active = false;
  });
  movements.value = [];
  ledgerError.value = '';
  ledgerLoading.value = !!id;
  if (!id) return;
  try {
    const result = await members.ledger(id);
    if (active) movements.value = result;
  } catch (cause) {
    if (active) ledgerError.value = (cause as PbError).message;
  } finally {
    if (active) ledgerLoading.value = false;
  }
});

function refresh(membership: Membership) {
  selected.value = membership.id;
  revision.value++;
  emit('changed');
}
</script>

<template>
  <section class="grid gap-4">
    <div v-if="canManage" class="flex justify-end">
      <Button
        label="Asignar plan"
        icon="pi pi-plus"
        @click="assigning = true"
      />
    </div>
    <Message v-if="error" severity="error" :closable="false">
      {{ error }}
      <Button label="Reintentar" size="small" text @click="revision++" />
    </Message>
    <p v-else-if="loading && !visible.length" role="status">
      Cargando membresías…
    </p>
    <p v-else-if="!visible.length" class="text-muted-color">
      El cliente aún no tiene membresías.
    </p>
    <ul v-if="visible.length" class="grid gap-2">
      <li
        v-for="membership in visible"
        :key="membership.id"
        class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-200 p-3 dark:border-surface-700"
      >
        <div class="grid gap-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-semibold">{{
              membership.expand?.plan?.name ?? membership.plan
            }}</span>
            <MembershipStatusTag :membership="membership" />
          </div>
          <span class="text-sm text-muted-color">
            {{ formatMembershipDate(membership.current_period_start) }} –
            {{ formatMembershipDate(membership.current_period_end) }}
          </span>
          <span
            class="text-sm"
            :class="{
              'text-red-600 dark:text-red-400': membership.credits_balance < 0,
            }"
          >
            Créditos: {{ membershipBalanceLabel(membership) }}
          </span>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            label="Historial"
            size="small"
            severity="secondary"
            text
            :aria-label="
              'Historial de ' +
              (membership.expand?.plan?.name ?? membership.plan)
            "
            :aria-pressed="selected === membership.id"
            @click="selected = membership.id"
          />
          <MembershipActions
            v-if="canManage"
            :membership="membership"
            @updated="refresh"
          />
        </div>
      </li>
    </ul>
    <div
      v-if="current"
      class="rounded-lg border border-surface-200 p-4 dark:border-surface-700"
    >
      <h2 class="mb-3 font-semibold">
        Historial de {{ current.expand?.plan?.name ?? current.plan }}
      </h2>
      <Message v-if="ledgerError" severity="error" :closable="false">
        {{ ledgerError }}
        <Button label="Reintentar" size="small" text @click="revision++" />
      </Message>
      <CreditLedger
        :membership="current"
        :movements="movements"
        :loading="ledgerLoading"
      />
    </div>
    <AssignPlanDialog
      v-if="canManage"
      v-model="assigning"
      :client="client"
      @assigned="refresh"
    />
  </section>
</template>
