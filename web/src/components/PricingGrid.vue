<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getCatalog, type PlanGroup } from '@/lib/catalog';
import { formatPrice, type Plan } from '@/lib/data';
import { env } from '@/lib/env';
import { useLang } from '@/lib/use-lang';

const props = withDefaults(
  defineProps<{
    plans: Plan[];
    group: PlanGroup;
    cta?: string;
    to?: string;
    featuredIndex?: number;
  }>(),
  { cta: 'Inquire now', to: '/contact', featuredIndex: -1 },
);

const plans = ref(props.plans);
const updating = ref(false);
const { lang } = useLang();

onMounted(async () => {
  if (!env.PUBLIC_API_URL) return;
  updating.value = true;
  const catalog = await getCatalog();
  if (catalog.source === 'api') plans.value = catalog[props.group];
  updating.value = false;
});
</script>

<template>
  <div class="relative grid gap-6 md:grid-cols-3">
    <div
      v-for="(plan, index) in plans"
      :key="index"
      class="card-surface flex flex-col p-7"
      :class="{ 'border-primary': index === featuredIndex }"
    >
      <span
        v-if="index === featuredIndex"
        class="mb-3 self-start rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase text-accent-foreground"
        >Most popular</span
      >
      <h3 class="text-2xl">{{ plan.name }}</h3>
      <p class="mt-4 font-display text-5xl text-primary">
        {{ formatPrice(plan.price) }}
      </p>
      <p class="text-sm text-muted-foreground">{{ plan.unit }}</p>
      <ul class="my-6 space-y-2 text-sm">
        <li
          v-for="(item, itemIndex) in [
            plan.sessions,
            plan.freq,
            plan.note,
          ].filter(Boolean)"
          :key="itemIndex"
          class="flex gap-2"
        >
          <svg
            class="h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m20 6-11 11-5-5" />
          </svg>
          {{ item }}
        </li>
      </ul>
      <a
        :href="to"
        class="btn mt-auto"
        :class="index === featuredIndex ? 'btn-primary' : 'btn-outline'"
        >{{ cta }}</a
      >
    </div>
    <slot />
    <p
      class="pointer-events-none absolute end-0 top-full mt-1 text-xs text-muted-foreground"
      role="status"
    >
      {{ updating ? (lang === 'es' ? 'Actualizando…' : 'Updating…') : '' }}
    </p>
  </div>
</template>
