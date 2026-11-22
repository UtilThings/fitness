<script setup lang="ts">
import StatusTag from '@/components/StatusTag.vue';
import { CLIENT_STATUS, type ClientStatus } from '@/lib/clients';

defineProps<{ status: ClientStatus }>();
</script>

<template>
  <StatusTag :value="status" :map="CLIENT_STATUS" />
</template>
