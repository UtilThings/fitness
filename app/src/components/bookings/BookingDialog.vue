<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import { computed, ref, shallowRef, useId, watch } from 'vue';
import ClientPicker from '@/components/clients/ClientPicker.vue';
import CreditOverrideDialog from '@/components/memberships/CreditOverrideDialog.vue';
import { useAuth } from '@/composables/useAuth';
import { useBookingClock } from '@/composables/useBookingClock';
import { useBookings } from '@/composables/useBookings';
import { useSessionAvailability } from '@/composables/useSessionAvailability';
import {
  canReserveSession,
  type Booking,
  type SessionAvailability,
} from '@/lib/bookings';
import { fullName, type Client } from '@/lib/clients';
import { formatDateTime } from '@/lib/datetime';
import type { PbError } from '@/lib/pb-errors';
import type { ClassSession } from '@/lib/schedule-week';
import AvailabilityTag from './AvailabilityTag.vue';

const props = defineProps<{ session: ClassSession; client?: Client }>();
const emit = defineEmits<{ booked: [booking: Booking] }>();
const open = defineModel<boolean>({ required: true });
const id = useId();
const bookings = useBookings();
const { can } = useAuth();
const availabilityApi = useSessionAvailability();
const now = useBookingClock();
const picked = shallowRef<Client | null>(null);
const client = computed(() => props.client ?? picked.value);
const availability = shallowRef<SessionAvailability>();
const freePlan = ref(false);
const planError = ref(false);
const useFreeClass = ref(false);
const saving = ref(false);
const loadError = shallowRef<PbError>();
const saveError = shallowRef<PbError>();
const overrideOpen = ref(false);
const overrideError = ref('');
const creditErrorCodes = [
  'no_credits',
  'weekly_limit',
  'no_membership',
  'membership_not_active',
];
const eligible = computed(
  () =>
    props.session.kind !== 'special' &&
    freePlan.value &&
    !!client.value &&
    client.value.status !== 'inactive' &&
    !client.value.free_class_used,
);
const reservable = computed(() => canReserveSession(props.session, now.value));

watch(
  [open, () => props.session.id],
  async ([visible], _, onCleanup) => {
    picked.value = null;
    availability.value = undefined;
    freePlan.value = false;
    planError.value = false;
    useFreeClass.value = false;
    loadError.value = undefined;
    saveError.value = undefined;
    overrideOpen.value = false;
    overrideError.value = '';
    if (!visible) return;

    let current = true;
    onCleanup(() => {
      current = false;
    });
    await Promise.all([
      availabilityApi
        .get(props.session.id)
        .then((result) => {
          if (current) availability.value = result;
        })
        .catch((cause: PbError) => {
          if (current) loadError.value = cause;
        }),
      bookings
        .hasFreeClassPlan(props.session.service)
        .then((result) => {
          if (current) freePlan.value = result;
        })
        .catch(() => {
          if (current) planError.value = true;
        }),
    ]);
  },
  { immediate: true },
);

watch(client, () => {
  useFreeClass.value = false;
  saveError.value = undefined;
  overrideOpen.value = false;
});

async function submit(overrideNote?: string) {
  if (
    saving.value ||
    !availability.value ||
    !reservable.value ||
    !client.value ||
    client.value.status === 'inactive'
  )
    return;
  saving.value = true;
  if (!overrideNote) saveError.value = undefined;
  overrideError.value = '';
  try {
    const result = await bookings.create({
      session: props.session.id,
      client: client.value.id,
      useFreeClass: eligible.value && useFreeClass.value,
      ...(overrideNote ? { overrideNote } : {}),
    });
    emit('booked', result);
    overrideOpen.value = false;
    open.value = false;
  } catch (cause) {
    const error = cause as PbError;
    if (overrideNote) overrideError.value = error.message;
    else {
      saveError.value = error;
      if (
        error.code &&
        creditErrorCodes.includes(error.code) &&
        !(eligible.value && useFreeClass.value) &&
        can('memberships.manage')
      ) {
        overrideOpen.value = true;
      }
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:visible="open"
    :header="t('Book class')"
    modal
    class="w-full max-w-lg"
    :closable="!saving"
    :close-on-escape="!saving"
  >
    <form class="grid gap-4" @submit.prevent="submit()">
      <div>
        <p v-if="session.expand?.service" class="font-medium">
          {{ session.expand.service.name }}
        </p>
        <p>{{ formatDateTime(session.starts_at) }}</p>
      </div>
      <Message v-if="loadError" severity="error" :closable="false">{{
        loadError.message
      }}</Message>
      <template v-else-if="availability">
        <AvailabilityTag
          :availability="availability.availability"
          :spots-left="availability.spots_left"
        />
        <Message
          v-if="availability.spots_left === 0"
          severity="warn"
          :closable="false"
        >
          {{ t('They will be added to the waitlist.') }}
        </Message>
      </template>
      <p v-else role="status">{{ t('Checking availability…') }}</p>
      <Message v-if="!reservable" severity="warn" :closable="false">{{
        t('This session no longer accepts bookings.')
      }}</Message>
      <p v-if="props.client">{{ fullName(props.client) }}</p>
      <ClientPicker v-else v-model="picked" :disabled="saving" />
      <Message
        v-if="client?.status === 'paused'"
        severity="warn"
        :closable="false"
        >{{ t('The client is paused.') }}</Message
      >
      <Message
        v-if="client?.status === 'inactive'"
        severity="warn"
        :closable="false"
        >{{ t('The client is inactive.') }}</Message
      >
      <div v-if="eligible" class="flex items-center gap-2">
        <Checkbox
          v-model="useFreeClass"
          :input-id="id"
          binary
          :disabled="saving"
        />
        <label :for="id">{{ t('Free first class') }}</label>
      </div>
      <p v-else-if="planError" class="text-sm text-muted-color">
        {{ t('Could not verify the free first class.') }}
      </p>
      <Message
        v-if="saveError && !overrideOpen"
        severity="error"
        :closable="false"
      >
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
          :label="t('Book')"
          type="submit"
          :loading="saving"
          :disabled="
            !availability ||
            !reservable ||
            !client ||
            client.status === 'inactive'
          "
        />
      </div>
    </form>
  </Dialog>
  <CreditOverrideDialog
    v-model="overrideOpen"
    :message="saveError?.message ?? ''"
    :saving="saving"
    :error="overrideError"
    @confirmed="submit"
  />
</template>
