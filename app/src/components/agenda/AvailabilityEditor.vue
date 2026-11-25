<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import { computed, ref, useId, watch } from 'vue';
import { useCoachAvailability } from '@/composables/useCoachAvailability';
import { slotError, slotsByDay, type AvailabilitySlot } from '@/lib/agenda';
import type { PbError } from '@/lib/pb-errors';
import { weekdayLabel } from '@/lib/schedule-week';

const props = defineProps<{ coach: string; readonly?: boolean }>();
const id = useId();
const { list, create, update, remove } = useCoachAvailability();
const slots = ref<AvailabilitySlot[]>([]);
const days = computed(() => slotsByDay(slots.value));
const draft = ref<AvailabilitySlot>();
const error = ref('');
const loadError = ref('');
const loading = ref(false);
const busy = ref(false);
let version = 0;

watch(
  () => props.coach,
  async (coach) => {
    const current = ++version;
    draft.value = undefined;
    slots.value = [];
    error.value = '';
    loadError.value = '';
    if (!coach) return;
    loading.value = true;
    try {
      const rows = await list(coach);
      if (current === version) slots.value = rows;
    } catch (cause) {
      if (current === version) loadError.value = (cause as PbError).message;
    } finally {
      if (current === version) loading.value = false;
    }
  },
  { immediate: true },
);

function edit(weekday: number, slot?: AvailabilitySlot) {
  draft.value = slot
    ? { ...slot }
    : {
        id: '',
        coach: props.coach,
        weekday,
        start_time: '',
        end_time: '',
      };
  error.value = '';
}

async function save() {
  if (!draft.value || busy.value || props.readonly) return;
  const { id, ...slot } = draft.value;
  error.value = slotError(slot, slots.value, id);
  if (error.value) return;
  const current = version;
  busy.value = true;
  try {
    const saved = await (id ? update(id, slot) : create(slot));
    if (current === version) {
      slots.value = [
        ...slots.value.filter((existing) => existing.id !== id),
        saved,
      ];
      draft.value = undefined;
    }
  } catch (cause) {
    if (current === version) error.value = (cause as PbError).message;
  } finally {
    busy.value = false;
  }
}

async function deleteSlot() {
  const id = draft.value?.id;
  if (!id || busy.value || props.readonly) return;
  const current = version;
  error.value = '';
  busy.value = true;
  try {
    await remove(id);
    if (current === version) {
      slots.value = slots.value.filter((slot) => slot.id !== id);
      draft.value = undefined;
    }
  } catch (cause) {
    if (current === version) error.value = (cause as PbError).message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <Message v-if="loadError" severity="error" :closable="false">{{
    loadError
  }}</Message>
  <p v-else-if="loading" role="status">{{ t('Loading availability…') }}</p>
  <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    <section
      v-for="(day, weekday) in days"
      :key="weekday"
      class="grid content-start gap-3 rounded-xl border border-surface p-4"
    >
      <h2 class="font-semibold">{{ weekdayLabel(weekday) }}</h2>
      <p v-if="!day.length" class="text-sm text-muted-color">
        {{ t('No time slots') }}
      </p>
      <ul v-else class="grid gap-1">
        <li
          v-for="slot in day"
          :key="slot.id"
          class="flex min-h-9 items-center justify-between gap-2"
        >
          <span class="tabular-nums"
            >{{ slot.start_time }} – {{ slot.end_time }}</span
          >
          <Button
            v-if="!readonly"
            :aria-label="
              t('Edit time slot starting at {time}', { time: slot.start_time })
            "
            icon="pi pi-pencil"
            text
            size="small"
            :disabled="busy"
            @click="edit(weekday, slot)"
          />
        </li>
      </ul>
      <form
        v-if="!readonly && draft?.weekday === weekday"
        class="grid gap-2"
        novalidate
        @submit.prevent="save"
      >
        <div class="flex flex-wrap gap-2">
          <div class="grid gap-1">
            <label :for="id + '-start'" class="text-sm">{{ t('Start') }}</label>
            <InputText
              :id="id + '-start'"
              v-model="draft.start_time"
              type="time"
              :disabled="busy"
            />
          </div>
          <div class="grid gap-1">
            <label :for="id + '-end'" class="text-sm">{{ t("End{''}") }}</label>
            <InputText
              :id="id + '-end'"
              v-model="draft.end_time"
              type="time"
              :disabled="busy"
            />
          </div>
        </div>
        <Message v-if="error" severity="error" :closable="false">{{
          error
        }}</Message>
        <div class="flex flex-wrap gap-2">
          <Button
            type="submit"
            :label="t('Save')"
            size="small"
            :loading="busy"
          />
          <Button
            :label="t('Close')"
            size="small"
            severity="secondary"
            text
            :disabled="busy"
            @click="draft = undefined"
          />
          <Button
            v-if="draft.id"
            :label="t('Delete time slot')"
            severity="danger"
            size="small"
            text
            :disabled="busy"
            @click="deleteSlot"
          />
        </div>
      </form>
      <Button
        v-else-if="!readonly"
        :label="t('Add time slot')"
        icon="pi pi-plus"
        size="small"
        outlined
        :disabled="busy"
        @click="edit(weekday)"
      />
    </section>
  </div>
</template>
