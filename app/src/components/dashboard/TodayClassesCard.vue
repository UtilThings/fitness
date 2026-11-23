<script setup lang="ts">
import Card from 'primevue/card';
import ProgressBar from 'primevue/progressbar';
import AvailabilityTag from '@/components/bookings/AvailabilityTag.vue';
import type { DashboardSession } from '@/composables/useDashboard';
import { formatTime } from '@/lib/datetime';

defineProps<{ sessions: DashboardSession[] }>();
</script>

<template>
  <Card class="min-w-0">
    <template #title>Clases de hoy</template>
    <template #content>
      <p v-if="!sessions.length">No hay clases para hoy.</p>
      <ul v-else class="divide-y divide-surface-200 dark:divide-surface-700">
        <li
          v-for="session in sessions"
          :key="session.id"
          class="grid gap-3 py-3 sm:grid-cols-2 sm:items-center"
        >
          <div class="min-w-0">
            <RouterLink
              :to="{ path: '/classes', query: { session: session.id } }"
              class="wrap-anywhere font-medium text-primary hover:underline"
            >
              {{ formatTime(session.starts_at) }} · {{ session.service.name }}
            </RouterLink>
            <p
              class="wrap-anywhere text-sm text-surface-600 dark:text-surface-300"
            >
              {{
                session.coach?.name ||
                (session.coach ? 'Coach asignado' : 'Sin coach')
              }}
            </p>
          </div>
          <div class="grid min-w-0 gap-2">
            <p class="text-sm">
              {{ session.booked }} / {{ session.capacity }} cupos ocupados
            </p>
            <ProgressBar
              :value="
                Math.min(
                  100,
                  Math.round((session.booked / session.capacity) * 100),
                )
              "
              :show-value="false"
              :aria-label="`Ocupación de ${session.service.name}`"
              style="height: 0.4rem"
            />
            <AvailabilityTag
              :availability="session.availability"
              :spots-left="session.spots_left"
            />
          </div>
        </li>
      </ul>
    </template>
  </Card>
</template>
