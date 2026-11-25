<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Drawer from 'primevue/drawer';
import Message from 'primevue/message';
import Select from 'primevue/select';
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import CoachAgendaGrid from '@/components/agenda/CoachAgendaGrid.vue';
import PrivateSessionDialog from '@/components/agenda/PrivateSessionDialog.vue';
import { useAuth } from '@/composables/useAuth';
import { useCoachAgenda } from '@/composables/useCoachAgenda';
import { useNotify } from '@/composables/useNotify';
import { useServices } from '@/composables/useServices';
import type { AgendaSession, AvailabilitySlot } from '@/lib/agenda';
import { BOOKING_STATUS } from '@/lib/bookings';
import { fullName } from '@/lib/clients';
import {
  addLocalDays,
  formatDateTime,
  localParts,
  todayLocal,
} from '@/lib/datetime';
import type { PbError } from '@/lib/pb-errors';
import { weekDays, weekStartFor } from '@/lib/schedule-week';

const { role, user } = useAuth();
const catalog = useServices();
const { list } = useCoachAgenda();
const notify = useNotify();
const coach = ref(role.value === 'coach' ? (user.value?.id ?? '') : '');
const date = ref(todayLocal());
const week = ref(true);
const days = computed(() =>
  week.value ? weekDays(weekStartFor(date.value)) : [date.value],
);
const firstDay = computed(() => days.value[0]!);
const lastDay = computed(() => days.value.at(-1)!);
const sessions = shallowRef<AgendaSession[]>([]);
const slots = shallowRef<AvailabilitySlot[]>([]);
const selected = shallowRef<AgendaSession>();
const loading = ref(false);
const error = shallowRef<PbError>();
const privateOpen = ref(false);
const canOverride = computed(
  () => role.value === 'owner' || role.value === 'reception',
);
const canSchedule = computed(
  () =>
    !!coach.value &&
    (canOverride.value ||
      (role.value === 'coach' && coach.value === user.value?.id)),
);
let version = 0;

async function reload() {
  const current = ++version;
  if (!coach.value) return;
  loading.value = true;
  error.value = undefined;
  try {
    const result = await list(coach.value, firstDay.value, lastDay.value);
    if (current !== version) return;
    sessions.value = result.sessions;
    slots.value = result.slots;
  } catch (cause) {
    if (current !== version) return;
    error.value = cause as PbError;
  } finally {
    if (current === version) loading.value = false;
  }
}

watch(
  [coach, firstDay, lastDay],
  () => {
    selected.value = undefined;
    sessions.value = [];
    slots.value = [];
    void reload();
  },
  { immediate: true },
);

onMounted(async () => {
  await Promise.all([catalog.loadCoaches(), catalog.load()]);
  if (!coach.value) coach.value = catalog.coachOptions.value[0]?.value ?? '';
});

function shift(step: number) {
  date.value = addLocalDays(date.value, step * (week.value ? 7 : 1));
}

function saved(session: AgendaSession) {
  const created = localParts(session.starts_at).date;
  if (session.coach === coach.value && days.value.includes(created)) {
    void reload();
  } else {
    coach.value = session.coach;
    date.value = created;
  }
  notify.success(t('Private session scheduled'));
}
</script>

<template>
  <div class="grid gap-5">
    <PageHeader :title="t('Coach schedule')">
      <template #actions>
        <RouterLink
          :to="{ name: 'coach-availability' }"
          class="text-sm font-medium text-primary hover:underline"
          >{{ t('Weekly availability') }}</RouterLink
        >
        <Button
          v-if="canSchedule"
          :label="t('Private session')"
          icon="pi pi-plus"
          @click="privateOpen = true"
        />
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <Select
        v-model="coach"
        :aria-label="t('Coach')"
        :options="catalog.coachOptions.value"
        option-label="label"
        option-value="value"
        :placeholder="t('Select a coach')"
        class="w-full sm:w-64"
      />
      <div class="flex flex-wrap items-center gap-2">
        <Button
          :aria-label="t('Previous')"
          icon="pi pi-chevron-left"
          severity="secondary"
          outlined
          @click="shift(-1)"
        />
        <Button
          :label="t('Today')"
          severity="secondary"
          outlined
          @click="date = todayLocal()"
        />
        <Button
          :aria-label="t('Next')"
          icon="pi pi-chevron-right"
          severity="secondary"
          outlined
          @click="shift(1)"
        />
        <Button
          :label="t('Day')"
          severity="secondary"
          :outlined="week"
          :aria-pressed="!week"
          @click="week = false"
        />
        <Button
          :label="t('Week')"
          severity="secondary"
          :outlined="!week"
          :aria-pressed="week"
          @click="week = true"
        />
      </div>
    </div>

    <Message
      v-if="catalog.coachesError.value || catalog.error.value || error"
      severity="error"
      :closable="false"
    >
      {{
        (catalog.coachesError.value ?? catalog.error.value ?? error)?.message
      }}
    </Message>
    <p v-if="loading" role="status">{{ t('Loading schedule…') }}</p>
    <CoachAgendaGrid
      v-else-if="coach && !error"
      :days="days"
      :sessions="sessions"
      :slots="slots"
      @select="selected = $event"
    />

    <Drawer
      :visible="!!selected"
      position="right"
      class="w-full! sm:w-96!"
      :header="t('Session details')"
      @update:visible="
        (visible) => {
          if (!visible) selected = undefined;
        }
      "
    >
      <div v-if="selected" class="grid gap-3">
        <h2 class="font-semibold">
          {{ selected.title || selected.expand?.service?.name || t('Session') }}
        </h2>
        <p>
          {{ formatDateTime(selected.starts_at) }} ·
          {{
            t('{minutes} min · Capacity {capacity}', {
              minutes: selected.duration_min,
              capacity: selected.capacity,
            })
          }}
        </p>
        <p v-if="selected.notes">{{ selected.notes }}</p>
        <h3 class="font-semibold">{{ t('Bookings') }}</h3>
        <ul
          v-if="selected.expand?.bookings_via_session?.length"
          class="grid gap-1"
        >
          <li
            v-for="booking in selected.expand.bookings_via_session"
            :key="booking.id"
          >
            {{
              booking.expand?.client
                ? fullName(booking.expand.client)
                : t('Client')
            }}
            · {{ BOOKING_STATUS[booking.status].label }}
          </li>
        </ul>
        <p v-else class="text-sm text-muted-color">{{ t('No bookings') }}</p>
        <RouterLink
          :to="{ name: 'classes', query: { session: selected.id } }"
          class="font-medium text-primary hover:underline"
        >
          {{ t('Manage bookings and attendance') }}
        </RouterLink>
      </div>
    </Drawer>

    <PrivateSessionDialog
      v-model="privateOpen"
      :coaches="catalog.coachOptions.value"
      :services="catalog.items.value"
      :initial-coach="coach"
      :initial-date="date < todayLocal() ? todayLocal() : date"
      :locked-coach="role === 'coach' ? user?.id : undefined"
      :can-override="canOverride"
      @saved="saved"
    />
  </div>
</template>
