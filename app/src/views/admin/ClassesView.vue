<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Drawer from 'primevue/drawer';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import PrivateSessionDialog from '@/components/agenda/PrivateSessionDialog.vue';
import SpecialSessionDialog from '@/components/agenda/SpecialSessionDialog.vue';
import AvailabilityTag from '@/components/bookings/AvailabilityTag.vue';
import BookingDialog from '@/components/bookings/BookingDialog.vue';
import SessionRoster from '@/components/bookings/SessionRoster.vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import { useAuth } from '@/composables/useAuth';
import { useBookingClock } from '@/composables/useBookingClock';
import { useNotify } from '@/composables/useNotify';
import { useSchedule } from '@/composables/useSchedule';
import { useSessionAvailability } from '@/composables/useSessionAvailability';
import { useServices } from '@/composables/useServices';
import {
  canReserveSession,
  type Booking,
  type SessionAvailability,
} from '@/lib/bookings';
import {
  addLocalDays,
  formatDate,
  formatDayLabel,
  formatTime,
  localParts,
  localToUtcIso,
  todayLocal,
} from '@/lib/datetime';
import type { PbError } from '@/lib/pb-errors';
import {
  filterSessions,
  groupByDay,
  nextCalendarSlot,
  weekDays,
  weekStartFor,
  type ClassSession,
  type SessionKind,
} from '@/lib/schedule-week';

const route = useRoute();
const router = useRouter();
const { isOwner, role, user } = useAuth();
const notify = useNotify();
const schedule = useSchedule();
const catalog = useServices();
const availabilityApi = useSessionAvailability();
const now = useBookingClock();
const canEdit = computed(() => isOwner.value || role.value === 'reception');
const offset = ref(0);
const today = ref(todayLocal());
const week = computed(() => weekStartFor(today.value, offset.value));
const days = computed(() => weekDays(week.value));
const rangeLabel = computed(() => {
  const [first, last] = [week.value, days.value[6]!];
  const end = formatDate(localToUtcIso(last, '12:00'));
  return first.slice(0, 7) === last.slice(0, 7)
    ? first.slice(8).replace(/^0/, '') + ' – ' + end
    : formatDate(localToUtcIso(first, '12:00')) + ' – ' + end;
});
const service = ref('');
const kind = ref<SessionKind | ''>('');
const kindOptions = [
  { label: 'Todos los tipos', value: '' },
  { label: 'Regular', value: 'regular' },
  { label: 'Especial', value: 'special' },
  { label: 'Privada', value: 'private' },
];
const coach = computed({
  get: () => (typeof route.query.coach === 'string' ? route.query.coach : ''),
  set: (value: string) =>
    void router.replace({
      query: { ...route.query, coach: value || undefined },
    }),
});
const services = computed(() =>
  catalog.items.value.map(({ id, name, active }) => ({
    label: name,
    value: id,
    active,
  })),
);
const coachOptions = computed(() => [
  { label: 'Sin coach', value: '' },
  ...catalog.coachOptions.value,
]);
const coachFilters = computed(() => {
  const options = new Map(
    catalog.coachOptions.value.map(({ value, label }) => [value, label]),
  );
  for (const session of schedule.sessions.value) {
    if (session.coach && !options.has(session.coach))
      options.set(session.coach, coachName(session));
  }
  if (coach.value && !options.has(coach.value))
    options.set(coach.value, 'Coach seleccionado');
  return [
    { label: 'Todos los coaches', value: '' },
    ...Array.from(options, ([value, label]) => ({ value, label })),
  ];
});
const grouped = computed(() =>
  groupByDay(
    filterSessions(schedule.sessions.value, {
      service: service.value,
      coach: coach.value,
      kind: kind.value,
    }),
  ),
);
const canCreatePrivate = computed(
  () => canEdit.value || role.value === 'coach',
);
const creationCoach = computed(() =>
  role.value === 'coach' ? (user.value?.id ?? '') : coach.value,
);
const slotOptions = computed(() => {
  if (!canCreatePrivate.value) return new Map<string, string>();
  const sessionsByDay = groupByDay(
    filterSessions(schedule.sessions.value, { coach: creationCoach.value }),
  );
  return new Map(
    days.value.flatMap((day) => {
      const slot = nextCalendarSlot(
        day,
        sessionsByDay.get(day) ?? [],
        now.value,
      );
      return slot ? [[day, slot]] : [];
    }),
  );
});
const selectedSlot = ref('');
const privateOpen = ref(false);
const specialOpen = ref(false);
const creation = ref({ date: '', time: '' });
const selected = ref<ClassSession | null>(null);
const bookingOpen = ref(false);
const rosterRefresh = ref(0);
const availability = shallowRef(new Map<string, SessionAvailability>());
const availabilityError = shallowRef<PbError>();
let availabilityVersion = 0;
const mode = ref<'move' | 'cancel' | null>(null);
const busy = ref(false);
const fields = ref<Record<string, string>>({});
const draft = ref({
  title: '',
  coach: '',
  date: '',
  time: '',
  capacity: 1 as number | null,
  reason: '',
  notes: '',
});

watch(
  week,
  () => {
    selectedSlot.value = '';
    availability.value = new Map();
    void reloadWeek();
  },
  { immediate: true },
);

async function loadAvailability() {
  const version = ++availabilityVersion;
  availabilityError.value = undefined;
  try {
    const rows = await availabilityApi.list({
      from: week.value,
      to: addLocalDays(week.value, 7),
    });
    if (version === availabilityVersion)
      availability.value = new Map(rows.map((row) => [row.session, row]));
  } catch (cause) {
    if (version !== availabilityVersion) return;
    availability.value = new Map();
    availabilityError.value = cause as PbError;
  }
}

function reloadWeek() {
  return Promise.all([schedule.loadWeek(offset.value), loadAvailability()]);
}

function reserved(booking: Booking) {
  rosterRefresh.value++;
  void loadAvailability();
  notify.success(
    booking.status === 'waitlisted'
      ? 'Cliente añadido a la lista de espera'
      : 'Reserva confirmada',
  );
}

onMounted(() => {
  void catalog.load();
  void catalog.loadCoaches();
});

function changeWeek(next: number) {
  today.value = todayLocal();
  offset.value = next;
}

function serviceName(session: ClassSession) {
  return (
    session.expand?.service?.name ??
    services.value.find(({ value }) => value === session.service)?.label ??
    'Servicio'
  );
}

function coachName(session: ClassSession) {
  return (
    session.expand?.coach?.name ||
    session.expand?.coach?.email ||
    catalog.coachOptions.value.find(({ value }) => value === session.coach)
      ?.label ||
    (session.coach ? 'Coach asignado' : 'Sin coach')
  );
}

function openSession(session: ClassSession) {
  selected.value = session;
  const { date, time } = localParts(session.starts_at);
  draft.value = {
    title: session.title ?? '',
    coach: session.coach,
    date,
    time,
    capacity: session.capacity,
    notes: session.notes,
    reason: '',
  };
  fields.value = {};
}

watch(
  () => route.query.session,
  async (id, _previous, onCleanup) => {
    if (typeof id !== 'string' || !id) return;
    let current = true;
    onCleanup(() => {
      current = false;
    });
    try {
      const session = await schedule.getSession(id);
      if (current) openSession(session);
    } catch (cause) {
      if (current) notify.error((cause as PbError).message);
    }
  },
  { immediate: true },
);

function closeSession() {
  bookingOpen.value = false;
  selected.value = null;
  if (route.query.session) {
    void router.replace({ query: { ...route.query, session: undefined } });
  }
}

function openDialog(action: NonNullable<typeof mode.value>) {
  if (selected.value) openSession(selected.value);
  mode.value = action;
}

function openCreation(type: 'special' | 'private', slot?: string) {
  const defaultDate = week.value > today.value ? week.value : today.value;
  creation.value = slot
    ? localParts(slot)
    : { date: defaultDate, time: '09:00' };
  selectedSlot.value = '';
  if (type === 'special') specialOpen.value = true;
  else privateOpen.value = true;
}

function chooseSlot(slot: string) {
  if (!canEdit.value) openCreation('private', slot);
  else selectedSlot.value = selectedSlot.value === slot ? '' : slot;
}

function created(session: ClassSession) {
  const date = localParts(session.starts_at).date;
  if (service.value && service.value !== session.service) service.value = '';
  if (coach.value && coach.value !== session.coach) coach.value = '';
  if (kind.value && kind.value !== session.kind) kind.value = session.kind;
  if (days.value.includes(date)) {
    void reloadWeek();
  } else {
    const current = todayLocal();
    const civil = (value: string) => Date.parse(value + 'T00:00:00Z');
    changeWeek(
      (civil(weekStartFor(date)) - civil(weekStartFor(current))) /
        (7 * 86_400_000),
    );
  }
  notify.success(
    session.kind === 'special'
      ? 'Clase especial creada'
      : 'Sesión privada agendada',
  );
}

async function run(operation: () => Promise<string>, close = true) {
  if (busy.value) return;
  busy.value = true;
  fields.value = {};
  try {
    const message = await operation();
    if (close) {
      mode.value = null;
      selected.value = null;
    }
    await reloadWeek();
    notify.success(message);
  } catch (cause) {
    const error = cause as PbError;
    fields.value = error.fields;
    notify.error(error.message);
  } finally {
    busy.value = false;
  }
}

function submit() {
  const { reason, date, time, coach } = draft.value;
  const session = selected.value;
  if (!session) return;
  if (Array.from(reason.trim()).length < 3) {
    fields.value = { reason: 'Escribe un motivo de al menos 3 caracteres.' };
    return;
  }
  if (mode.value === 'cancel') {
    return run(async () => {
      await schedule.cancelSession(session.id, reason);
      return 'Sesión cancelada';
    });
  }
  let startsAt: string;
  try {
    startsAt = localToUtcIso(date, time);
  } catch {
    fields.value = { starts_at: 'Indica una fecha y hora válidas.' };
    return;
  }
  return run(async () => {
    await schedule.moveSession(session.id, { startsAt, coach, reason });
    return 'Sesión movida';
  });
}

function saveDetails(session: ClassSession) {
  const { title, capacity } = draft.value;
  const updateCapacity =
    session.kind === 'private' || session.kind === 'special';
  if (session.kind === 'special' && !title.trim()) {
    fields.value = { title: 'Escribe un título para la clase especial.' };
    return;
  }
  if (
    updateCapacity &&
    (!capacity || !Number.isInteger(capacity) || capacity < 1)
  ) {
    fields.value = { capacity: 'Indica un cupo válido.' };
    return;
  }
  return run(async () => {
    await schedule.updateSession(session.id, {
      coach: draft.value.coach,
      notes: draft.value.notes,
      ...(session.kind === 'special' && { title: title.trim() }),
      ...(updateCapacity && capacity !== null && { capacity }),
    });
    return 'Sesión actualizada';
  });
}

function generate() {
  return run(async () => {
    const { created, skipped_existing, skipped_blocked } =
      await schedule.generate({ from: week.value });
    return `Creadas ${created} · Existentes ${skipped_existing} · Bloqueadas ${skipped_blocked}`;
  }, false);
}
</script>

<template>
  <div class="grid gap-5">
    <PageHeader title="Clases" description="Horario semanal de Miramar">
      <template #actions>
        <Button
          v-if="canEdit"
          label="Nueva clase especial"
          icon="pi pi-plus"
          @click="openCreation('special')"
        />
        <Button
          v-if="canCreatePrivate"
          label="Sesión privada"
          severity="secondary"
          outlined
          @click="openCreation('private')"
        />
        <Button
          v-if="isOwner"
          label="Generar sesiones"
          severity="secondary"
          :loading="busy"
          @click="generate"
        />
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <Button
          aria-label="Semana anterior"
          icon="pi pi-chevron-left"
          severity="secondary"
          outlined
          @click="changeWeek(offset - 1)"
        />
        <Button
          label="Hoy"
          severity="secondary"
          outlined
          @click="changeWeek(0)"
        />
        <Button
          aria-label="Semana siguiente"
          icon="pi pi-chevron-right"
          severity="secondary"
          outlined
          @click="changeWeek(offset + 1)"
        />
        <h2 class="ml-2 font-semibold" aria-live="polite">{{ rangeLabel }}</h2>
      </div>
      <div class="flex flex-wrap gap-2">
        <Select
          v-model="service"
          aria-label="Servicio"
          :options="[{ label: 'Todos los servicios', value: '' }, ...services]"
          option-label="label"
          option-value="value"
        />
        <Select
          v-model="coach"
          aria-label="Coach"
          :options="coachFilters"
          option-label="label"
          option-value="value"
        />
        <Select
          v-model="kind"
          aria-label="Tipo de sesión"
          :options="kindOptions"
          option-label="label"
          option-value="value"
        />
        <Button
          v-if="user"
          label="Mis clases"
          severity="secondary"
          :outlined="coach !== user.id"
          :aria-pressed="coach === user.id"
          @click="coach = coach === user.id ? '' : user.id"
        />
      </div>
    </div>

    <Message
      v-if="
        schedule.error.value ||
        catalog.error.value ||
        catalog.coachesError.value ||
        availabilityError
      "
      severity="error"
      :closable="false"
    >
      {{
        (
          schedule.error.value ??
          catalog.error.value ??
          catalog.coachesError.value ??
          availabilityError
        )?.message
      }}
    </Message>
    <p v-if="schedule.loading.value" role="status">Cargando semana…</p>
    <div v-else class="grid gap-3 xl:grid-cols-7">
      <section
        v-for="day in days"
        :key="day"
        :data-day="day"
        class="grid content-start gap-2 rounded-xl border border-surface bg-surface-50 p-2 dark:bg-surface-900"
      >
        <h3
          class="px-1 py-2 text-sm font-semibold capitalize"
          :class="{ 'text-primary': day === today }"
        >
          {{ formatDayLabel(day) }}
        </h3>
        <p
          v-if="!grouped.get(day)?.length"
          class="px-1 text-sm text-muted-color"
        >
          Sin sesiones
        </p>
        <button
          v-for="session in grouped.get(day)"
          :key="session.id"
          type="button"
          :data-session="session.id"
          class="grid gap-1 rounded-lg border border-surface bg-surface-0 p-3 text-left hover:border-primary dark:bg-surface-800"
          :class="{
            'border-l-4 border-l-violet-500': session.kind === 'special',
            'border-l-4 border-l-sky-500': session.kind === 'private',
          }"
          @click="openSession(session)"
        >
          <span
            :class="{ 'line-through': session.status === 'cancelled' }"
            class="grid font-medium"
          >
            {{ formatTime(session.starts_at) }}
            <span>{{ session.title || serviceName(session) }}</span>
          </span>
          <span
            class="text-sm"
            :class="
              session.coach
                ? 'text-muted-color'
                : 'text-orange-700 dark:text-orange-300'
            "
            >{{ coachName(session) }}</span
          >
          <Tag
            v-if="session.kind === 'special' || session.kind === 'private'"
            :value="session.kind === 'special' ? 'Especial' : 'Privada'"
            :severity="session.kind === 'special' ? 'secondary' : 'info'"
            class="justify-self-start"
          />
          <AvailabilityTag
            v-if="
              session.status === 'scheduled' && availability.has(session.id)
            "
            :availability="availability.get(session.id)!.availability"
            :spots-left="availability.get(session.id)!.spots_left"
          />
          <span
            v-if="session.status === 'cancelled'"
            class="text-sm text-red-700 dark:text-red-300"
            >Cancelada · {{ session.cancel_reason }}</span
          >
          <span
            v-else-if="session.status === 'completed'"
            class="text-sm text-muted-color"
            >Completada</span
          >
        </button>
        <div v-if="slotOptions.has(day)" class="grid gap-1">
          <Button
            :label="formatTime(slotOptions.get(day)!)"
            icon="pi pi-plus"
            size="small"
            severity="secondary"
            text
            :aria-label="
              'Agregar sesión ' +
              formatDayLabel(day) +
              ' a las ' +
              formatTime(slotOptions.get(day)!)
            "
            :aria-expanded="
              canEdit ? selectedSlot === slotOptions.get(day) : undefined
            "
            @click="chooseSlot(slotOptions.get(day)!)"
          />
          <div v-if="selectedSlot === slotOptions.get(day)" class="grid gap-1">
            <Button
              label="Nueva clase especial"
              size="small"
              severity="secondary"
              outlined
              @click="openCreation('special', slotOptions.get(day))"
            />
            <Button
              label="Sesión privada"
              size="small"
              severity="secondary"
              outlined
              @click="openCreation('private', slotOptions.get(day))"
            />
          </div>
        </div>
      </section>
    </div>

    <Drawer
      :visible="!!selected"
      position="right"
      class="w-full! sm:w-96!"
      header="Detalle de sesión"
      @update:visible="
        (visible) => {
          if (!visible) closeSession();
        }
      "
    >
      <div v-if="selected" class="grid gap-4">
        <h2 class="text-lg font-semibold">
          {{ selected.title || serviceName(selected) }}
        </h2>
        <p>
          {{ formatDate(selected.starts_at) }} ·
          {{ formatTime(selected.starts_at) }} · {{ selected.duration_min }} min
          · Cupo {{ selected.capacity }}
        </p>
        <p v-if="selected.title" class="text-sm text-muted-color">
          {{ serviceName(selected) }}
        </p>
        <p v-if="selected.status === 'cancelled'">
          Cancelada · {{ selected.cancel_reason }}
        </p>
        <p v-if="selected.status === 'completed'">Completada</p>
        <form
          v-if="canEdit"
          class="grid gap-3"
          @submit.prevent="saveDetails(selected)"
        >
          <CatalogField
            v-if="selected.kind === 'special'"
            id="detail-title"
            label="Título"
            :error="fields.title"
          >
            <InputText
              id="detail-title"
              v-model="draft.title"
              maxlength="120"
              fluid
            />
          </CatalogField>
          <CatalogField
            v-if="selected.kind !== 'regular'"
            id="detail-capacity"
            label="Cupo"
            :error="fields.capacity"
          >
            <InputNumber
              v-model="draft.capacity"
              input-id="detail-capacity"
              :min="1"
              :max="selected.kind === 'private' ? 2 : undefined"
              fluid
            />
          </CatalogField>
          <CatalogField id="detail-coach" label="Coach" :error="fields.coach">
            <Select
              v-model="draft.coach"
              input-id="detail-coach"
              :options="
                selected.kind === 'private'
                  ? catalog.coachOptions.value
                  : coachOptions
              "
              option-label="label"
              option-value="value"
              :placeholder="coachName(selected)"
            />
          </CatalogField>
          <CatalogField
            id="detail-notes"
            label="Notas internas"
            :error="fields.notes"
          >
            <Textarea
              id="detail-notes"
              v-model="draft.notes"
              maxlength="500"
              rows="3"
            />
          </CatalogField>
          <Button type="submit" label="Guardar detalles" :loading="busy" />
        </form>
        <template v-else>
          <p>{{ coachName(selected) }}</p>
          <p v-if="selected.notes">{{ selected.notes }}</p>
        </template>
        <div
          v-if="canEdit && selected.status === 'scheduled'"
          class="flex flex-wrap gap-2"
        >
          <Button
            v-if="selected.kind !== 'private'"
            label="Mover sesión"
            severity="secondary"
            outlined
            :disabled="busy"
            @click="openDialog('move')"
          />
          <Button
            label="Cancelar sesión"
            severity="danger"
            outlined
            :disabled="busy"
            @click="openDialog('cancel')"
          />
        </div>
        <Button
          v-if="canReserveSession(selected, now)"
          label="Reservar"
          icon="pi pi-plus"
          @click="bookingOpen = true"
        />
        <SessionRoster
          :session="selected"
          :refresh-key="rosterRefresh"
          @changed="loadAvailability"
        />
      </div>
    </Drawer>

    <BookingDialog
      v-if="selected"
      v-model="bookingOpen"
      :session="selected"
      @booked="reserved"
    />

    <SpecialSessionDialog
      v-if="canEdit"
      v-model="specialOpen"
      :services="catalog.items.value"
      :coaches="catalog.coachOptions.value"
      :initial-date="creation.date"
      :initial-time="creation.time"
      :initial-coach="creationCoach"
      @saved="created"
    />
    <PrivateSessionDialog
      v-if="canCreatePrivate"
      v-model="privateOpen"
      :services="catalog.items.value"
      :coaches="catalog.coachOptions.value"
      :initial-date="creation.date"
      :initial-time="creation.time"
      :initial-coach="creationCoach"
      :locked-coach="role === 'coach' ? user?.id : undefined"
      :can-override="canEdit"
      @saved="created"
    />

    <Dialog
      :visible="!!mode"
      modal
      class="w-full max-w-lg"
      :header="mode === 'move' ? 'Mover sesión' : 'Cancelar sesión'"
      @update:visible="
        (visible) => {
          if (!visible) mode = null;
        }
      "
    >
      <form v-if="mode" class="grid gap-4" @submit.prevent="submit">
        <template v-if="mode !== 'cancel'">
          <div class="grid grid-cols-2 gap-3">
            <CatalogField
              id="session-date"
              label="Fecha en Miramar"
              :error="fields.starts_at"
            >
              <InputText id="session-date" v-model="draft.date" type="date" />
            </CatalogField>
            <CatalogField id="session-time" label="Hora en Miramar">
              <InputText id="session-time" v-model="draft.time" type="time" />
            </CatalogField>
          </div>
          <CatalogField id="session-coach" label="Coach" :error="fields.coach">
            <Select
              v-model="draft.coach"
              input-id="session-coach"
              :options="coachOptions"
              option-label="label"
              option-value="value"
              placeholder="Selecciona un coach"
            />
          </CatalogField>
        </template>
        <CatalogField id="session-reason" label="Motivo" :error="fields.reason">
          <Textarea
            id="session-reason"
            v-model="draft.reason"
            maxlength="200"
            rows="3"
          />
        </CatalogField>
        <div class="flex justify-end gap-2">
          <Button
            label="Cerrar"
            severity="secondary"
            outlined
            :disabled="busy"
            @click="mode = null"
          />
          <Button
            type="submit"
            :label="
              mode === 'cancel' ? 'Confirmar cancelación' : 'Guardar cambio'
            "
            :severity="mode === 'cancel' ? 'danger' : undefined"
            :loading="busy"
          />
        </div>
      </form>
    </Dialog>
  </div>
</template>
