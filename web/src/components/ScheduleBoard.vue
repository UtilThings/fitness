<script setup lang="ts">
import { computed, ref } from 'vue';
import { availability } from '@/lib/data';
import {
  classesForDay,
  formatRange,
  spotsLeft,
  weekDays,
  weekStart,
  type ServiceFilter,
} from '@/lib/schedule';
import { useLang } from '@/lib/use-lang';

const filters = ['All', 'Group Strength', 'Tropical Jump'] as const;
const statusColor = {
  full: 'text-destructive',
  almost: 'text-accent',
  available: 'text-primary',
};
const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const monthDay = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
});
const { t } = useLang();

const today = new Date();
const offset = ref(0);
const filter = ref<ServiceFilter>('All');
const start = computed(() => weekStart(today, offset.value));
const days = computed(() => weekDays(start.value));
const range = computed(() => formatRange(start.value, days.value[6]));
const schedule = computed(() =>
  days.value
    .map((date) => ({
      date,
      classes: classesForDay(date.getDay(), filter.value).map((template) => {
        const left = spotsLeft(date, template);
        return { ...template, left, status: availability(left) };
      }),
    }))
    .filter(({ classes }) => classes.length > 0),
);
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
          v-for="service in filters"
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
          @click="offset = Math.max(0, offset - 1)"
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
          @click="offset++"
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
    <div class="mt-8 space-y-4">
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
            v-for="{ time, service, coach, left, capacity, status } in classes"
            :key="time"
            class="card-surface p-5"
          >
            <div class="flex items-start justify-between">
              <div>
                <p class="font-display text-2xl">{{ time }}</p>
                <p class="font-semibold">{{ service }}</p>
                <p class="text-xs text-muted-foreground">{{ coach }}</p>
              </div>
              <span
                class="text-xs font-bold uppercase"
                :class="statusColor[status]"
                >{{ t(status) }}</span
              >
            </div>
            <p class="mt-3 text-sm text-muted-foreground">
              {{ left }} / {{ capacity }} {{ t('spots') }}
            </p>
            <a
              href="/contact"
              class="btn mt-4 w-full !py-2"
              :class="status === 'full' ? 'btn-outline' : 'btn-primary'"
              >{{ t(status === 'full' ? 'waitlist' : 'reserve') }}</a
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
