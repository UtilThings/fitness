<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { computed, ref, shallowRef, useId, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import ClientPicker from '@/components/clients/ClientPicker.vue';
import { useCoachAgenda } from '@/composables/useCoachAgenda';
import { useCoachAvailability } from '@/composables/useCoachAvailability';
import {
  useMemberships,
  type BookingEligibility,
} from '@/composables/useMemberships';
import {
  agendaError,
  fitsAvailability,
  sessionStart,
  type AgendaSession,
  type AvailabilitySlot,
} from '@/lib/agenda';
import type { Service } from '@/lib/catalog';
import { fullName, type Client } from '@/lib/clients';
import { todayLocal } from '@/lib/datetime';
import type { PbError } from '@/lib/pb-errors';
import SessionDateFields from './SessionDateFields.vue';

const props = defineProps<{
  coaches: { label: string; value: string }[];
  services: Service[];
  initialDate?: string;
  initialTime?: string;
  initialCoach?: string;
  lockedCoach?: string;
  canOverride?: boolean;
}>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ saved: [session: AgendaSession] }>();
const { createPrivate } = useCoachAgenda();
const { list } = useCoachAvailability();
const { privateEligibility } = useMemberships();
const id = useId();
const coach = ref('');
const service = ref('');
const date = ref('');
const time = ref('');
const duration = ref<number | null>(60);
const notes = ref('');
const first = shallowRef<Client | null>(null);
const second = shallowRef<Client | null>(null);
const withSecond = ref(false);
const openSeat = ref(false);
const exceptions = ref<Record<string, string>>({});
const saving = ref(false);
const error = shallowRef<PbError>();
const formError = ref('');
const slots = shallowRef<AvailabilitySlot[]>();
const previews = shallowRef<
  Record<string, BookingEligibility & { partner: boolean }>
>({});
const previewError = ref(false);
const checking = ref(false);
const startsAt = computed(() => sessionStart(date.value, time.value));
const personal = computed(() =>
  props.services.filter((item) => item.active && item.kind === 'personal'),
);
const clients = computed(() =>
  [
    first.value,
    withSecond.value && second.value?.id !== first.value?.id
      ? second.value
      : null,
  ].filter((client) => client !== null),
);
const clientIds = computed(() => clients.value.map((client) => client.id));
const outside = computed(
  () =>
    !!slots.value &&
    !!startsAt.value &&
    !!duration.value &&
    !fitsAvailability(slots.value, startsAt.value, duration.value),
);
const allowOpenSeat = computed(
  () =>
    !withSecond.value &&
    !!first.value &&
    previews.value[first.value.id]?.partner === true,
);

watch(
  open,
  (visible) => {
    if (!visible) return;
    coach.value = props.lockedCoach || props.initialCoach || '';
    service.value = '';
    date.value = props.initialDate || todayLocal();
    time.value = props.initialTime || '09:00';
    duration.value = 60;
    notes.value = '';
    first.value = null;
    second.value = null;
    withSecond.value = false;
    openSeat.value = false;
    exceptions.value = {};
    error.value = undefined;
    formError.value = '';
  },
  { immediate: true },
);

watch(
  [open, coach],
  async ([visible, coachId], _, onCleanup) => {
    slots.value = undefined;
    if (!visible || !coachId) return;
    let current = true;
    onCleanup(() => {
      current = false;
    });
    try {
      const rows = await list(coachId);
      if (current) slots.value = rows;
    } catch {
      // The scheduling request provides the authoritative availability check.
    }
  },
  { immediate: true },
);

watch(
  [open, service, startsAt, clientIds],
  async ([visible, serviceId, start, ids], _, onCleanup) => {
    previews.value = {};
    previewError.value = false;
    if (
      !visible ||
      !serviceId ||
      !start ||
      Date.parse(start) <= Date.now() ||
      !ids.length
    ) {
      checking.value = false;
      return;
    }
    let current = true;
    onCleanup(() => {
      current = false;
    });
    checking.value = true;
    const results = await Promise.allSettled(
      ids.map((client) => privateEligibility(client, serviceId, start)),
    );
    if (!current) return;
    previews.value = Object.fromEntries(
      results.flatMap((result, index) =>
        result.status === 'fulfilled' ? [[ids[index]!, result.value]] : [],
      ),
    );
    previewError.value = results.some((result) => result.status === 'rejected');
    checking.value = false;
  },
  { immediate: true },
);

async function submit() {
  if (saving.value) return;
  error.value = undefined;
  formError.value = '';
  const coachId = props.lockedCoach || coach.value;
  if (
    !coachId ||
    !service.value ||
    !startsAt.value ||
    !duration.value ||
    !first.value ||
    (withSecond.value && (!second.value || second.value.id === first.value.id))
  ) {
    formError.value = t(
      'Enter the service, coach, date, and duration, and select different clients.',
    );
    return;
  }
  saving.value = true;
  try {
    const overrides = props.canOverride
      ? Object.fromEntries(
          clientIds.value.flatMap((client) => {
            const note = exceptions.value[client]?.trim();
            return note ? [[client, { override_note: note }]] : [];
          }),
        )
      : undefined;
    const { session } = await createPrivate({
      coach: coachId,
      service: service.value,
      starts_at: startsAt.value,
      duration_min: duration.value,
      client_ids: clientIds.value,
      capacity:
        withSecond.value || (allowOpenSeat.value && openSeat.value) ? 2 : 1,
      notes: notes.value.trim(),
      overrides,
    });
    emit('saved', session);
    open.value = false;
  } catch (cause) {
    error.value = cause as PbError;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:visible="open"
    modal
    :header="t('Private session')"
    class="w-full max-w-lg"
    :closable="!saving"
    :close-on-escape="!saving"
  >
    <form class="grid gap-4" @submit.prevent="submit">
      <CatalogField
        :id="id + '-coach'"
        :label="t('Coach')"
        :error="error?.fields.coach"
      >
        <Select
          v-model="coach"
          :input-id="id + '-coach'"
          :options="coaches"
          option-label="label"
          option-value="value"
          :placeholder="t('Select a coach')"
          :disabled="saving || !!lockedCoach"
          fluid
        />
      </CatalogField>
      <CatalogField
        :id="id + '-service'"
        :label="t('Personal service')"
        :error="error?.fields.service"
      >
        <Select
          v-model="service"
          :input-id="id + '-service'"
          :options="personal"
          option-label="name"
          option-value="id"
          :placeholder="t('Select a service')"
          :disabled="saving"
          fluid
        />
      </CatalogField>
      <SessionDateFields
        v-model:date="date"
        v-model:time="time"
        v-model:duration="duration"
        :fields="error?.fields"
        :disabled="saving"
      />
      <Message v-if="outside" severity="warn" :closable="false">{{
        t("The selected time appears to be outside the coach's availability.")
      }}</Message>
      <ClientPicker
        v-model="first"
        :label="t('First client')"
        status="active"
        :disabled="saving"
      />
      <div class="flex items-center gap-2">
        <Checkbox
          v-model="withSecond"
          :input-id="id + '-second'"
          binary
          :disabled="saving"
        />
        <label :for="id + '-second'">{{ t('Invite a second client') }}</label>
      </div>
      <ClientPicker
        v-if="withSecond"
        v-model="second"
        :label="t('Second client')"
        status="active"
        :disabled="saving"
      />
      <div v-if="allowOpenSeat" class="flex items-center gap-2">
        <Checkbox
          v-model="openSeat"
          :input-id="id + '-open-seat'"
          binary
          :disabled="saving"
        />
        <label :for="id + '-open-seat'">{{
          t('Leave a second spot open for another partner client')
        }}</label>
      </div>
      <p v-if="checking" role="status" class="text-sm text-muted-color">
        {{ t('Checking eligibility…') }}
      </p>
      <p v-else-if="previewError" class="text-sm text-muted-color">
        {{ t('Eligibility will be confirmed when you save.') }}
      </p>
      <div v-for="client in clients" :key="client.id" class="grid gap-2">
        <Message
          v-if="previews[client.id]?.allowed === false"
          severity="warn"
          :closable="false"
        >
          {{ fullName(client) }} ·
          {{
            agendaError({
              code: previews[client.id]?.code,
              message: t("Check the client's membership."),
              fields: {},
              status: 400,
            })
          }}
        </Message>
        <Message
          v-if="withSecond && previews[client.id]?.partner === false"
          severity="warn"
          :closable="false"
        >
          {{
            t('{name} needs an active partner membership for this service.', {
              name: fullName(client),
            })
          }}
        </Message>
        <CatalogField
          v-if="
            canOverride &&
            (previews[client.id]?.allowed === false ||
              (error?.code &&
                [
                  'no_credits',
                  'weekly_limit',
                  'no_membership',
                  'membership_not_active',
                ].includes(error.code)))
          "
          :id="id + '-' + client.id"
          :label="t('Override note · {name}', { name: fullName(client) })"
        >
          <Textarea
            :id="id + '-' + client.id"
            v-model="exceptions[client.id]"
            maxlength="500"
            rows="2"
            :disabled="saving"
            fluid
          />
        </CatalogField>
      </div>
      <CatalogField
        :id="id + '-notes'"
        :label="t('Internal notes')"
        :error="error?.fields.notes"
      >
        <Textarea
          :id="id + '-notes'"
          v-model="notes"
          maxlength="500"
          rows="2"
          :disabled="saving"
          fluid
        />
      </CatalogField>
      <Message v-if="formError || error" severity="error" :closable="false">{{
        formError || (error && agendaError(error))
      }}</Message>
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
          :label="t('Schedule session')"
          :loading="saving"
        />
      </div>
    </form>
  </Dialog>
</template>
