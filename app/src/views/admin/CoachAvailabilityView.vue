<script setup lang="ts">
import Message from 'primevue/message';
import Select from 'primevue/select';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/PageHeader.vue';
import AvailabilityEditor from '@/components/agenda/AvailabilityEditor.vue';
import { useAuth } from '@/composables/useAuth';
import { useServices } from '@/composables/useServices';

const { role, user } = useAuth();
const { coachOptions, coachesError, loadCoaches } = useServices();
const coach = ref(role.value === 'coach' ? (user.value?.id ?? '') : '');
const editable = computed(
  () =>
    role.value === 'owner' ||
    (role.value === 'coach' && coach.value === user.value?.id),
);

onMounted(async () => {
  await loadCoaches();
  if (!coach.value) coach.value = coachOptions.value[0]?.value ?? '';
});
</script>

<template>
  <div class="grid gap-5">
    <PageHeader
      title="Disponibilidad semanal"
      description="Tramos en la hora local de Miramar"
    >
      <template #actions>
        <RouterLink
          :to="{ name: 'coach-agenda' }"
          class="text-sm font-medium text-primary hover:underline"
          >Volver a la agenda</RouterLink
        >
      </template>
    </PageHeader>
    <Select
      v-model="coach"
      aria-label="Coach"
      :options="coachOptions"
      option-label="label"
      option-value="value"
      placeholder="Selecciona un coach"
      class="w-full sm:w-64"
    />
    <Message v-if="coachesError" severity="error" :closable="false">{{
      coachesError.message
    }}</Message>
    <template v-if="coach">
      <p v-if="!editable" class="text-sm text-muted-color">
        Disponibilidad de solo lectura.
      </p>
      <AvailabilityEditor :coach="coach" :readonly="!editable" />
    </template>
  </div>
</template>
