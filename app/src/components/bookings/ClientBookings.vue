<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { computed, ref, shallowRef, useId, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import { useBookingClock } from '@/composables/useBookingClock';
import { useBookings } from '@/composables/useBookings';
import { useNotify } from '@/composables/useNotify';
import { useSchedule } from '@/composables/useSchedule';
import {
  BOOKING_STATUS,
  canCancelBooking,
  canReserveSession,
  type Booking,
} from '@/lib/bookings';
import type { Client } from '@/lib/clients';
import { formatDateTime, formatTime, todayLocal } from '@/lib/datetime';
import type { PbError } from '@/lib/pb-errors';
import type { ClassSession } from '@/lib/schedule-week';
import BookingDialog from './BookingDialog.vue';
import CancelBookingDialog from './CancelBookingDialog.vue';

const props = defineProps<{ clientId: string; client?: Client }>();
const emit = defineEmits<{ changed: [] }>();
const bookings = useBookings();
const schedule = useSchedule();
const notify = useNotify();
const now = useBookingClock();
const id = useId();
const rows = shallowRef<Booking[]>([]);
const error = shallowRef<PbError>();
const loading = ref(false);
const selecting = ref(false);
const date = ref(todayLocal());
const sessions = shallowRef<ClassSession[]>([]);
const session = shallowRef<ClassSession>();
const sessionError = shallowRef<PbError>();
const loadingSessions = ref(false);
const bookingOpen = ref(false);
const cancelling = shallowRef<Booking>();
const cancelOpen = ref(false);
let loadVersion = 0;
let sessionVersion = 0;

const options = computed(() =>
  sessions.value
    .filter((item) => canReserveSession(item, now.value))
    .map((item) => ({
      label: `${formatTime(item.starts_at)} · ${item.expand?.service?.name ?? t('Session')}`,
      value: item,
    })),
);

async function loadHistory() {
  const version = ++loadVersion;
  loading.value = true;
  error.value = undefined;
  try {
    const list = await bookings.listByClient(props.clientId);
    if (loadVersion === version) rows.value = list;
  } catch (cause) {
    if (loadVersion === version) error.value = cause as PbError;
  } finally {
    if (loadVersion === version) loading.value = false;
  }
}

watch(
  () => props.clientId,
  () => {
    rows.value = [];
    selecting.value = false;
    bookingOpen.value = false;
    cancelling.value = undefined;
    cancelOpen.value = false;
    void loadHistory();
  },
  { immediate: true },
);

watch([selecting, date], async ([opened, day]) => {
  const version = ++sessionVersion;
  sessions.value = [];
  session.value = undefined;
  sessionError.value = undefined;
  loadingSessions.value = false;
  if (!opened || !day || day < todayLocal()) return;
  loadingSessions.value = true;
  try {
    const upcoming = await schedule.listUpcoming(day);
    if (version === sessionVersion) sessions.value = upcoming;
  } catch (cause) {
    if (version === sessionVersion) sessionError.value = cause as PbError;
  } finally {
    if (version === sessionVersion) loadingSessions.value = false;
  }
});

function changed() {
  emit('changed');
  void loadHistory();
}

function reserved(booking: Booking) {
  selecting.value = false;
  changed();
  notify.success(
    booking.status === 'waitlisted'
      ? t('Client added to the waitlist')
      : t('Booking confirmed'),
  );
}

function cancel(booking: Booking) {
  cancelling.value = booking;
  cancelOpen.value = true;
}
</script>

<template>
  <div class="grid gap-3">
    <Button
      v-if="client && client.status !== 'inactive'"
      :label="t('Book class')"
      icon="pi pi-plus"
      class="w-fit"
      :aria-expanded="selecting"
      @click="selecting = !selecting"
    />
    <form
      v-if="selecting"
      class="flex flex-wrap items-end gap-3"
      @submit.prevent="
        session && canReserveSession(session, now) && (bookingOpen = true)
      "
    >
      <CatalogField :id="id + '-date'" :label="t('Date in Miramar')">
        <InputText
          :id="id + '-date'"
          v-model="date"
          type="date"
          :min="todayLocal()"
        />
      </CatalogField>
      <CatalogField
        :id="id + '-session'"
        :label="t('Session')"
        :error="sessionError?.message"
      >
        <Select
          v-model="session"
          :input-id="id + '-session'"
          :aria-label="t('Session')"
          :options="options"
          option-label="label"
          option-value="value"
          :loading="loadingSessions"
          :disabled="loadingSessions || !options.length"
          :placeholder="
            options.length ? t('Select a session') : t('No upcoming sessions')
          "
        />
      </CatalogField>
      <Button
        type="submit"
        :label="t('Continue')"
        :disabled="!session || !canReserveSession(session, now)"
      />
    </form>

    <Message v-if="error" severity="error" :closable="false">{{
      error.message
    }}</Message>
    <p v-if="loading" role="status">{{ t('Loading bookings…') }}</p>
    <p v-else-if="!error && !rows.length" class="text-sm text-muted-color">
      {{ t('No bookings recorded') }}
    </p>
    <ul v-if="rows.length" class="divide-y divide-surface">
      <li
        v-for="booking in rows"
        :key="booking.id"
        class="flex flex-wrap items-start justify-between gap-2 py-3"
      >
        <div>
          <p class="font-medium">
            {{ booking.expand?.session?.expand?.service?.name ?? t('Session') }}
          </p>
          <p v-if="booking.expand?.session" class="text-sm text-muted-color">
            {{ formatDateTime(booking.expand.session.starts_at) }}
          </p>
          <p v-if="booking.override_note" class="text-sm wrap-break-word">
            {{
              booking.override_note === 'session_cancelled'
                ? t('Session canceled by the gym')
                : booking.override_note
            }}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Tag
            :value="BOOKING_STATUS[booking.status].label"
            :severity="BOOKING_STATUS[booking.status].severity"
          />
          <Button
            v-if="
              booking.expand?.session?.status === 'scheduled' &&
              canCancelBooking(booking, booking.expand.session.starts_at, now)
            "
            :label="t('Cancel')"
            severity="danger"
            text
            size="small"
            :disabled="loading"
            @click="cancel(booking)"
          />
        </div>
      </li>
    </ul>
    <BookingDialog
      v-if="session && client"
      v-model="bookingOpen"
      :session="session"
      :client="client"
      @booked="reserved"
    />
    <CancelBookingDialog
      v-if="cancelling?.expand?.session"
      v-model="cancelOpen"
      :booking="cancelling"
      :starts-at="cancelling.expand.session.starts_at"
      @cancelled="changed"
    />
  </div>
</template>
