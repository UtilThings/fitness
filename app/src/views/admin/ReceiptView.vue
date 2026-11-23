<script setup lang="ts">
import Button from 'primevue/button';
import Message from 'primevue/message';
import { ref, shallowRef, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import logo from '@/assets/jq-logo.png';
import {
  paymentMethods,
  usePayments,
  type Payment,
} from '@/composables/usePayments';
import { business } from '@/lib/business';
import { fullName } from '@/lib/clients';
import { formatCivilDate } from '@/lib/datetime';
import { formatCents } from '@/lib/money';
import type { PbError } from '@/lib/pb-errors';
import '@/styles/print.css';

const route = useRoute();
const api = usePayments();
const receipt = shallowRef<Payment>();
const loading = ref(true);
const error = ref('');

watch(
  () => route.params.id,
  async (id, _, onCleanup) => {
    let current = true;
    onCleanup(() => {
      current = false;
    });
    receipt.value = undefined;
    error.value = '';
    loading.value = true;
    try {
      const payment = await api.get(String(id));
      if (!current) return;
      if (
        payment.status === 'pending' ||
        !payment.receipt_number ||
        !payment.paid_at
      ) {
        error.value = 'Este cobro aún no tiene recibo.';
        return;
      }
      receipt.value = payment;
    } catch (cause) {
      if (current) error.value = (cause as PbError).message;
    } finally {
      if (current) loading.value = false;
    }
  },
  { immediate: true },
);

function printReceipt() {
  window.print();
}
</script>

<template>
  <main class="receipt-page mx-auto grid max-w-2xl gap-4 p-5 sm:p-8">
    <nav
      class="receipt-actions flex items-center justify-between gap-3"
      aria-label="Acciones del recibo"
    >
      <RouterLink
        :to="{ name: 'payments' }"
        class="text-sm font-medium text-primary hover:underline"
      >
        <i class="pi pi-arrow-left mr-1" aria-hidden="true" /> Volver a Pagos
      </RouterLink>
      <Button
        v-if="receipt"
        icon="pi pi-print"
        label="Imprimir"
        @click="printReceipt"
      />
    </nav>
    <p v-if="loading" role="status">Cargando recibo…</p>
    <Message v-else-if="error" severity="warn" :closable="false">{{
      error
    }}</Message>
    <article
      v-else-if="receipt"
      class="receipt-document grid gap-6 rounded-lg border border-surface-200 bg-surface-0 p-6 shadow-sm dark:border-surface-700 dark:bg-surface-900 sm:p-8"
    >
      <header
        class="flex items-start justify-between gap-4 border-b border-surface-200 pb-5 dark:border-surface-700"
      >
        <div>
          <img :src="logo" alt="" class="mb-2 h-10 w-auto" />
          <p class="font-semibold">{{ business.name }}</p>
          <p>{{ business.city }}</p>
          <p v-if="business.contact">{{ business.contact }}</p>
        </div>
        <div class="text-right">
          <h1 class="text-xl font-semibold">Recibo de pago</h1>
          <p class="font-mono text-sm">{{ receipt.receipt_number }}</p>
          <p>{{ formatCivilDate(receipt.paid_at) }}</p>
          <p
            v-if="receipt.status === 'void'"
            class="mt-2 font-bold text-red-700 dark:text-red-400"
          >
            ANULADO
          </p>
        </div>
      </header>
      <dl class="grid gap-4 sm:grid-cols-2">
        <div>
          <dt class="text-sm font-medium">Cliente</dt>
          <dd>
            {{
              receipt.expand?.client
                ? fullName(receipt.expand.client)
                : receipt.client
            }}
          </dd>
        </div>
        <div>
          <dt class="text-sm font-medium">Concepto</dt>
          <dd>{{ receipt.expand?.plan?.name ?? 'Cobro manual' }}</dd>
        </div>
        <div>
          <dt class="text-sm font-medium">Método de pago</dt>
          <dd>{{ receipt.method ? paymentMethods[receipt.method] : '—' }}</dd>
        </div>
        <div>
          <dt class="text-sm font-medium">Monto (USD)</dt>
          <dd class="text-xl font-semibold">
            {{ formatCents(receipt.amount_cents) }}
          </dd>
        </div>
      </dl>
    </article>
  </main>
</template>
