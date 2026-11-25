<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import Textarea from 'primevue/textarea';
import { computed, ref, shallowRef, useId, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import { useBookingClock } from '@/composables/useBookingClock';
import { useBookings } from '@/composables/useBookings';
import { useSessionAvailability } from '@/composables/useSessionAvailability';
import {
  canCancelBooking,
  formatDeadline,
  type Booking,
  type SessionAvailability,
} from '@/lib/bookings';
import type { PbError } from '@/lib/pb-errors';

const props = defineProps<{ booking: Booking; startsAt: string }>();
const emit = defineEmits<{ cancelled: [booking: Booking] }>();
const open = defineModel<boolean>({ required: true });
const id = useId();
const bookings = useBookings();
const availabilityApi = useSessionAvailability();
const now = useBookingClock();
const availability = shallowRef<SessionAvailability>();
const loadError = shallowRef<PbError>();
const saveError = shallowRef<PbError>();
const override = ref(false);
const note = ref('');
const noteError = ref('');
const saving = ref(false);
const cancellable = computed(() =>
  canCancelBooking(props.booking, props.startsAt, now.value),
);
const late = computed(
  () =>
    !!availability.value &&
    props.booking.status === 'booked' &&
    now.value > Date.parse(availability.value.cancellation_deadline),
);

watch(
  [open, () => props.booking.id],
  async ([visible], _, onCleanup) => {
    availability.value = undefined;
    loadError.value = undefined;
    saveError.value = undefined;
    override.value = false;
    note.value = '';
    noteError.value = '';
    if (!visible) return;

    let current = true;
    onCleanup(() => {
      current = false;
    });
    try {
      const result = await availabilityApi.get(props.booking.session);
      if (current) availability.value = result;
    } catch (cause) {
      if (current) loadError.value = cause as PbError;
    }
  },
  { immediate: true },
);

async function submit() {
  if (saving.value || !availability.value || !cancellable.value) return;
  const overrideNote =
    late.value && override.value ? note.value.trim() : undefined;
  noteError.value =
    overrideNote === '' ? t('Enter a reason for the override.') : '';
  if (noteError.value) return;
  saving.value = true;
  saveError.value = undefined;
  try {
    const result = await bookings.cancel(props.booking.id, { overrideNote });
    emit('cancelled', result);
    open.value = false;
  } catch (cause) {
    saveError.value = cause as PbError;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:visible="open"
    :header="t('Cancel booking')"
    modal
    class="w-full max-w-lg"
    :closable="!saving"
    :close-on-escape="!saving"
  >
    <form class="grid gap-4" @submit.prevent="submit">
      <Message v-if="loadError" severity="error" :closable="false">{{
        loadError.message
      }}</Message>
      <p v-else-if="availability">
        {{ t('Cancellation deadline without penalty (Miramar):') }}
        {{ formatDeadline(availability.cancellation_deadline) }}
      </p>
      <p v-else role="status">{{ t('Checking the cancellation window…') }}</p>
      <Message v-if="!cancellable" severity="warn" :closable="false">{{
        t('This booking can no longer be canceled.')
      }}</Message>
      <template v-else-if="late">
        <Message severity="warn" :closable="false">{{
          t('This will be recorded as a late cancellation.')
        }}</Message>
        <div class="flex items-center gap-2">
          <Checkbox
            v-model="override"
            :input-id="id + '-override'"
            binary
            :disabled="saving"
            @update:model-value="noteError = ''"
          />
          <label :for="id + '-override'">{{
            t('Cancel with an override')
          }}</label>
        </div>
        <CatalogField
          v-if="override"
          :id="id + '-note'"
          :label="t('Reason for override')"
          :error="noteError || saveError?.fields.override_note"
        >
          <Textarea
            :id="id + '-note'"
            v-model="note"
            maxlength="500"
            rows="3"
            fluid
            :disabled="saving"
            @update:model-value="noteError = ''"
          />
        </CatalogField>
      </template>
      <Message v-if="saveError" severity="error" :closable="false">
        {{ Object.values(saveError.fields).join(' ') || saveError.message }}
      </Message>
      <div class="flex justify-end gap-2">
        <Button
          :label="t('Close')"
          severity="secondary"
          outlined
          :disabled="saving"
          @click="open = false"
        />
        <Button
          type="submit"
          :label="t('Confirm cancellation')"
          severity="danger"
          :loading="saving"
          :disabled="!availability || !cancellable"
        />
      </div>
    </form>
  </Dialog>
</template>
