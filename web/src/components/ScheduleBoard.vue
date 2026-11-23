<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  fetchSchedule,
  type PublicSchedule,
  type PublicSession,
} from '@/lib/api';
import { formatLocalTime, SERVICE_SLUGS } from '@/lib/catalog';
import {
  classesForDay,
  formatRange,
  MAX_SCHEDULE_WEEKS,
  weekDays,
  weekStart,
  type ServiceFilter,
} from '@/lib/schedule';
import { useLang } from '@/lib/use-lang';

const filters = {
  All: '',
  'Group Strength': SERVICE_SLUGS.groupPlans,
  'Tropical Jump': SERVICE_SLUGS.jumpPlans,
} satisfies Record<ServiceFilter, string>;
const statusColor = {
  full: 'text-destructive',
  almost: 'text-accent',
  available: 'text-primary',
  checkAvailability: 'text-muted-foreground',
};

interface ClassCard {
  time: string;
  service: string;
  coach: string;
  availability?: Pick<PublicSession, 'capacity' | 'spots_left' | 'status'>;
}

const { lang, t } = useLang();
const locale = computed(() => (lang.value === 'es' ? 'es-US' : 'en-US'));
const weekday = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      weekday: 'short',
      timeZone: 'UTC',
    }),
);
const monthDay = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }),
);
const today = new Date();
const offset = ref(0);
const maxWeeks = ref(MAX_SCHEDULE_WEEKS);
const filter = ref<ServiceFilter>('All');
const retry = ref(0);
const state = ref<'loading' | 'ready' | 'error'>('loading');
const response = ref<PublicSchedule>();
const start = computed(() => weekStart(today, offset.value));
const week = computed(() => start.value.toISOString().slice(0, 10));
const days = computed(() =>
  weekDays(
    response.value
      ? new Date(`${response.value.week_start}T00:00:00Z`)
      : start.value,
  ),
);
const range = computed(() =>
  formatRange(days.value[0], days.value[6], locale.value),
);

watch(
  [week, retry],
  async ([requested], _previous, onCleanup) => {
    const controller = new AbortController();
    onCleanup(() => controller.abort());
    response.value = undefined;
    state.value = 'loading';
    try {
      const result = await fetchSchedule(requested, controller.signal);
      if (controller.signal.aborted) return;
      response.value = result.schedule;
      maxWeeks.value = result.maxWeeks ?? MAX_SCHEDULE_WEEKS;
      state.value = 'ready';
    } catch {
      if (!controller.signal.aborted) state.value = 'error';
    }
  },
  { immediate: true },
);

const schedule = computed(() => {
  const sessionsByDay = new Map<string, ClassCard[]>();
  const slug = filters[filter.value];
  for (const session of response.value?.sessions ?? []) {
    if (slug && session.service.slug !== slug) continue;
    const classes = sessionsByDay.get(session.local_date) ?? [];
    classes.push({
      time: formatLocalTime(session.local_time),
      service: session.service.name,
      coach: session.coach_name,
      availability: session,
    });
    sessionsByDay.set(session.local_date, classes);
  }
  return days.value
    .map<{ date: Date; classes: ClassCard[] }>((date) => ({
      date,
      classes:
        state.value === 'error'
          ? classesForDay(date.getUTCDay(), filter.value)
          : (sessionsByDay.get(date.toISOString().slice(0, 10)) ?? []),
    }))
    .filter(({ classes }) => classes.length > 0);
});

function moveWeek(increment: number) {
  if (
    offset.value + increment >= 0 &&
    offset.value + increment <= maxWeeks.value
  ) {
    offset.value += increment;
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div
        class="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by service"
      >
        <button
          v-for="(_, service) in filters"
          :key="service"
          type="button"
          :aria-pressed="filter === service"
          class="rounded-full border px-4 py-2 text-sm font-bold"
          :class="
            filter === service
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground'
          "
          @click="filter = service"
        >
          {{ service }}
        </button>
      </div>
      <div class="flex items-center gap-3">
        <button
          type="button"
          aria-label="Previous week"
          class="rounded-full border border-border p-2"
          :disabled="offset === 0"
          @click="moveWeek(-1)"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <span class="text-sm font-bold" aria-live="polite">{{ range }}</span>
        <button
          type="button"
          aria-label="Next week"
          class="rounded-full border border-border p-2"
          :disabled="offset >= maxWeeks"
          @click="moveWeek(1)"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
    <div class="mt-8 space-y-4" :aria-busy="state === 'loading'">
      <div v-if="state === 'loading'" role="status">
        <p class="text-sm text-muted-foreground">{{ t('loading') }}</p>
        <div
          class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          aria-hidden="true"
        >
          <div
            v-for="placeholder in 3"
            :key="placeholder"
            class="h-36 animate-pulse rounded-xl bg-muted motion-reduce:animate-none"
          />
        </div>
      </div>
      <div v-if="state === 'error'" class="rounded-xl border border-border p-4">
        <p role="status">{{ t('loadError') }} {{ t('fallbackNotice') }}</p>
        <button class="btn btn-outline mt-3" type="button" @click="retry++">
          {{ t('retry') }}
        </button>
      </div>
      <p
        v-if="state !== 'loading' && !schedule.length"
        class="text-muted-foreground"
        role="status"
      >
        {{ t('noClasses') }}
      </p>
      <div
        v-for="{ date, classes } in schedule"
        :key="date.getTime()"
        class="grid gap-3 md:grid-cols-[140px_1fr]"
      >
        <div>
          <p class="font-display text-3xl uppercase">
            {{ weekday.format(date) }}
          </p>
          <p class="text-sm text-muted-foreground">
            {{ monthDay.format(date) }}
          </p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="({ time, service, coach, availability }, index) in classes"
            :key="index"
            class="card-surface p-5"
          >
            <div class="flex items-start justify-between">
              <div>
                <p class="font-display text-2xl">{{ time }}</p>
                <p class="font-semibold">{{ service }}</p>
                <p v-if="coach" class="text-xs text-muted-foreground">
                  {{ coach }}
                </p>
              </div>
              <span
                class="text-xs font-bold uppercase"
                :class="
                  statusColor[availability?.status ?? 'checkAvailability']
                "
                >{{ t(availability?.status ?? 'checkAvailability') }}</span
              >
            </div>
            <p v-if="availability" class="mt-3 text-sm text-muted-foreground">
              {{ availability.spots_left }} / {{ availability.capacity }}
              {{ t('spots') }}
            </p>
            <a
              href="/contact"
              class="btn mt-4 w-full !py-2"
              :class="
                availability?.status === 'full' ? 'btn-outline' : 'btn-primary'
              "
              >{{
                t(
                  availability?.status === 'full'
                    ? 'waitlist'
                    : availability
                      ? 'reserve'
                      : 'contact',
                )
              }}</a
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
