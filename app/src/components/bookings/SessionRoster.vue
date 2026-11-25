<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { computed, ref, shallowRef, useId, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import { useBookingClock } from '@/composables/useBookingClock';
import { useBookings } from '@/composables/useBookings';
import {
  BOOKING_STATUS,
  canCancelBooking,
  type AttendanceStatus,
  type Booking,
} from '@/lib/bookings';
import { fullName } from '@/lib/clients';
import type { PbError } from '@/lib/pb-errors';
import type { ClassSession } from '@/lib/schedule-week';
import CancelBookingDialog from './CancelBookingDialog.vue';

const props = defineProps<{ session: ClassSession; refreshKey?: number }>();
const emit = defineEmits<{ changed: [booking: Booking] }>();
const bookings = useBookings();
const now = useBookingClock();
const id = useId();
const rows = shallowRef<Booking[]>([]);
const loading = ref(false);
const busy = ref(false);
const error = shallowRef<PbError>();
const cancelling = shallowRef<Booking>();
const cancelOpen = ref(false);
const correction = shallowRef<{ booking: Booking; status: AttendanceStatus }>();
const note = ref('');
let version = 0;

const enrolled = computed(() =>
  rows.value.filter(
    ({ status }) =>
      status === 'booked' || status === 'attended' || status === 'no_show',
  ),
);
const waiting = computed(() =>
  rows.value.filter(({ status }) => status === 'waitlisted'),
);
const groups = computed(() => [
  {
    key: 'booked',
    label: t('Booked clients'),
    rows: enrolled.value,
    empty: t('No booked clients'),
  },
  {
    key: 'waitlist',
    label: t('Waitlist'),
    rows: waiting.value,
    empty: t('No clients on the waitlist'),
  },
]);
const attendanceEnabled = computed(
  () =>
    props.session.status !== 'cancelled' &&
    now.value >= Date.parse(props.session.starts_at.replace(' ', 'T')),
);

async function load() {
  const current = ++version;
  loading.value = true;
  error.value = undefined;
  try {
    const list = await bookings.listBySession(props.session.id);
    if (version === current) rows.value = list;
  } catch (cause) {
    if (version === current) error.value = cause as PbError;
  } finally {
    if (version === current) loading.value = false;
  }
}

watch(
  () => props.session.id,
  () => {
    rows.value = [];
    cancelling.value = undefined;
    cancelOpen.value = false;
    correction.value = undefined;
  },
);

watch([() => props.session.id, () => props.refreshKey], load, {
  immediate: true,
});

function cancel(booking: Booking) {
  cancelling.value = booking;
  cancelOpen.value = true;
}

function changed(booking: Booking) {
  emit('changed', booking);
  void load();
}

function attendanceAction(booking: Booking, status: AttendanceStatus) {
  if (booking.status === 'booked') return mark(booking, status);
  note.value = '';
  correction.value = { booking, status };
}

async function mark(
  booking: Booking,
  status: AttendanceStatus,
  overrideNote?: string,
) {
  if (!attendanceEnabled.value || busy.value) return;
  busy.value = true;
  error.value = undefined;
  try {
    const result = await bookings.markAttendance(
      booking.id,
      status,
      overrideNote,
    );
    correction.value = undefined;
    changed(result);
  } catch (cause) {
    error.value = cause as PbError;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="grid gap-4">
    <Message v-if="error && !correction" severity="error" :closable="false">
      {{ Object.values(error.fields).join(' ') || error.message }}
    </Message>
    <p v-if="loading" role="status">{{ t('Loading bookings…') }}</p>
    <section v-for="group in groups" :key="group.key" class="grid gap-2">
      <h3 class="font-semibold">{{ group.label }} ({{ group.rows.length }})</h3>
      <p v-if="!group.rows.length && !loading" class="text-sm text-muted-color">
        {{ group.empty }}
      </p>
      <table
        v-if="group.rows.length"
        class="w-full text-left text-sm"
        :aria-label="group.label"
      >
        <thead class="sr-only">
          <tr>
            <th scope="col">{{ t('Client') }}</th>
            <th scope="col">{{ t('Status') }}</th>
            <th scope="col">{{ t('Actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="booking in group.rows"
            :key="booking.id"
            class="border-t border-surface align-top"
          >
            <td class="py-2 pr-2">
              <span v-if="booking.waitlist_position"
                >{{ booking.waitlist_position }}.
              </span>
              {{
                booking.expand?.client
                  ? fullName(booking.expand.client)
                  : booking.client
              }}
              <span
                v-if="booking.free_class"
                class="block text-xs text-muted-color"
                >{{ t('Free class') }}</span
              >
            </td>
            <td class="py-2">
              <Tag
                :value="BOOKING_STATUS[booking.status].label"
                :severity="BOOKING_STATUS[booking.status].severity"
              />
            </td>
            <td class="py-1 pl-1">
              <div class="flex flex-wrap justify-end">
                <Button
                  v-if="
                    session.status === 'scheduled' &&
                    canCancelBooking(booking, session.starts_at, now)
                  "
                  :label="t('Cancel')"
                  text
                  size="small"
                  severity="danger"
                  :disabled="busy || loading"
                  @click="cancel(booking)"
                />
                <template
                  v-if="
                    booking.status !== 'waitlisted' &&
                    session.status !== 'cancelled'
                  "
                >
                  <Button
                    v-if="booking.status !== 'attended'"
                    :label="t('Attended')"
                    text
                    size="small"
                    :disabled="!attendanceEnabled || busy || loading"
                    @click="attendanceAction(booking, 'attended')"
                  />
                  <Button
                    v-if="booking.status !== 'no_show'"
                    :label="t('No-show')"
                    text
                    size="small"
                    :disabled="!attendanceEnabled || busy || loading"
                    @click="attendanceAction(booking, 'no_show')"
                  />
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <CancelBookingDialog
      v-if="cancelling"
      v-model="cancelOpen"
      :booking="cancelling"
      :starts-at="session.starts_at"
      @cancelled="changed"
    />
    <Dialog
      :visible="!!correction"
      :header="t('Correct attendance')"
      modal
      class="w-full max-w-lg"
      :closable="!busy"
      :close-on-escape="!busy"
      @update:visible="
        (visible) => {
          if (!visible) correction = undefined;
        }
      "
    >
      <form
        v-if="correction"
        class="grid gap-4"
        @submit.prevent="
          note.trim() &&
          mark(correction.booking, correction.status, note.trim())
        "
      >
        <CatalogField
          :id="id"
          :label="t('Reason for correction')"
          :error="error?.fields.override_note"
        >
          <Textarea
            :id="id"
            v-model="note"
            maxlength="500"
            rows="3"
            fluid
            :disabled="busy"
          />
        </CatalogField>
        <Message v-if="error" severity="error" :closable="false">{{
          error.message
        }}</Message>
        <Button
          type="submit"
          :label="t('Save correction')"
          :loading="busy"
          :disabled="!note.trim()"
        />
      </form>
    </Dialog>
  </div>
</template>
