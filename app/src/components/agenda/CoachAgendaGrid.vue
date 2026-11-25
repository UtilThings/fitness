<script setup lang="ts">
import { t } from '@/i18n';
import { computed } from 'vue';
import {
  slotsByDay,
  type AgendaSession,
  type AvailabilitySlot,
} from '@/lib/agenda';
import { BOOKING_STATUS } from '@/lib/bookings';
import { fullName } from '@/lib/clients';
import { formatDayLabel, formatTime } from '@/lib/datetime';
import { groupByDay } from '@/lib/schedule-week';

const props = defineProps<{
  days: string[];
  sessions: AgendaSession[];
  slots: AvailabilitySlot[];
}>();
const emit = defineEmits<{ select: [session: AgendaSession] }>();
const grouped = computed(() => groupByDay(props.sessions));
const weekdays = computed(() => slotsByDay(props.slots));
const columns = computed(() =>
  props.days.map((date) => ({
    date,
    slots: weekdays.value[new Date(date + 'T00:00:00Z').getUTCDay()] ?? [],
    sessions: grouped.value.get(date) ?? [],
  })),
);
</script>

<template>
  <div
    class="grid gap-3"
    :class="{ 'sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7': days.length > 1 }"
  >
    <section
      v-for="day in columns"
      :key="day.date"
      :data-day="day.date"
      class="grid min-w-0 content-start gap-3 rounded-xl border border-surface bg-surface-50 p-3 dark:bg-surface-900"
    >
      <h2 class="text-sm font-semibold capitalize">
        {{ formatDayLabel(day.date) }}
      </h2>
      <div class="grid gap-1">
        <h3 class="text-xs font-semibold text-muted-color">
          {{ t('Availability') }}
        </h3>
        <p v-if="!day.slots.length" class="text-sm text-muted-color">
          {{ t('No time slots') }}
        </p>
        <p
          v-for="slot in day.slots"
          :key="slot.id"
          class="rounded border-l-2 border-emerald-500 bg-emerald-500/10 px-2 py-1 text-sm tabular-nums"
        >
          {{ slot.start_time }} – {{ slot.end_time }}
        </p>
      </div>
      <p v-if="!day.sessions.length" class="text-sm text-muted-color">
        {{ t('No sessions') }}
      </p>
      <button
        v-for="session in day.sessions"
        :key="session.id"
        type="button"
        class="grid gap-1 rounded-lg border border-surface bg-surface-0 p-2 text-left text-sm hover:border-primary dark:bg-surface-800"
        @click="emit('select', session)"
      >
        <span
          class="font-semibold"
          :class="{ 'line-through': session.status === 'cancelled' }"
        >
          {{ session.title || session.expand?.service?.name || t('Session') }}
        </span>
        <span
          >{{ formatTime(session.starts_at) }} ·
          {{ t('{minutes} min', { minutes: session.duration_min }) }}</span
        >
        <span class="text-muted-color">{{
          t('Capacity {capacity}', { capacity: session.capacity })
        }}</span>
        <span v-if="session.status === 'cancelled'">{{ t('Canceled') }}</span>
        <span v-else-if="session.status === 'completed'">{{
          t('Completed')
        }}</span>
        <span
          v-for="booking in session.expand?.bookings_via_session"
          :key="booking.id"
          class="break-words text-xs"
        >
          {{
            booking.expand?.client
              ? fullName(booking.expand.client)
              : t('Client')
          }}
          · {{ BOOKING_STATUS[booking.status].label }}
        </span>
      </button>
    </section>
  </div>
</template>
