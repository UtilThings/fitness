<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { computed, ref, useId, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import ClientPicker from '@/components/clients/ClientPicker.vue';
import {
  paymentMethods,
  usePayments,
  type Payment,
  type PaymentMethod,
} from '@/composables/usePayments';
import { fullName, type Client } from '@/lib/clients';
import { todayLocal } from '@/lib/datetime';
import { businessCurrency } from '@/lib/business-session';
import { formatCents, parseToCents } from '@/lib/money';
import type { PbError } from '@/lib/pb-errors';

const props = defineProps<{ payment?: Payment; client?: Client }>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ saved: [payment: Payment] }>();
const payments = usePayments();
const id = useId();
const methods = computed(() =>
  Object.entries(paymentMethods.value).map(([value, label]) => ({
    value,
    label,
  })),
);
const statuses = computed(() => [
  { value: 'paid', label: t('Paid') },
  { value: 'pending', label: t('Pending') },
]);
const selectedClient = ref<Client | null>(null);
const amount = ref('');
const method = ref<PaymentMethod>();
const status = ref<'paid' | 'pending'>('paid');
const date = ref('');
const note = ref('');
const error = ref('');
const saving = ref(false);
const title = computed(() =>
  props.payment ? t('Mark as paid') : t('Record payment'),
);

watch(
  open,
  (visible) => {
    if (!visible) return;
    selectedClient.value = props.client ?? null;
    amount.value = '';
    status.value = 'paid';
    method.value = props.payment?.method || undefined;
    date.value = todayLocal();
    note.value = props.payment?.note ?? '';
    error.value = '';
  },
  { immediate: true },
);

async function submit() {
  if (saving.value) return;
  const amount_cents = parseToCents(amount.value);
  if (
    !props.payment &&
    (!selectedClient.value || amount_cents === null || amount_cents < 1)
  ) {
    error.value = t('Select a client and enter an amount greater than zero.');
    return;
  }
  if (
    !date.value ||
    (status.value === 'paid' && (!method.value || date.value > todayLocal()))
  ) {
    error.value =
      status.value === 'paid'
        ? t('Select a payment method and enter a valid payment date.')
        : t('Enter the due date.');
    return;
  }
  const details = { note: note.value.trim() };
  saving.value = true;
  error.value = '';
  try {
    const result = props.payment
      ? await payments.pay(props.payment.id, {
          ...details,
          method: method.value!,
          paid_at: date.value,
        })
      : await payments.create({
          ...details,
          client: selectedClient.value!.id,
          amount_cents: amount_cents!,
          status: status.value,
          ...(status.value === 'paid'
            ? { method: method.value, paid_at: date.value }
            : { due_on: date.value }),
        });
    emit('saved', result);
    open.value = false;
  } catch (cause) {
    error.value = (cause as PbError).message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:visible="open"
    :header="title"
    modal
    class="w-full max-w-lg"
    :closable="!saving"
    :close-on-escape="!saving"
  >
    <form class="grid gap-4" @submit.prevent="submit">
      <p v-if="payment">
        {{
          payment.expand?.client
            ? fullName(payment.expand.client)
            : payment.client
        }}
        · {{ formatCents(payment.amount_cents, payment.currency) }}
      </p>
      <template v-else>
        <ClientPicker
          v-model="selectedClient"
          :disabled="saving || !!props.client"
        />
        <CatalogField
          :id="id + '-amount'"
          :label="t('Amount ({currency})', { currency: businessCurrency })"
        >
          <InputText
            :id="id + '-amount'"
            v-model="amount"
            inputmode="decimal"
            :disabled="saving"
            fluid
          />
        </CatalogField>
        <CatalogField :id="id + '-status'" :label="t('Status')">
          <Select
            v-model="status"
            :input-id="id + '-status'"
            :aria-label="t('Status')"
            :options="statuses"
            option-label="label"
            option-value="value"
            :disabled="saving"
            fluid
          />
        </CatalogField>
      </template>
      <CatalogField
        v-if="status === 'paid'"
        :id="id + '-method'"
        :label="t('Method')"
      >
        <Select
          v-model="method"
          :input-id="id + '-method'"
          :aria-label="t('Method')"
          :options="methods"
          option-label="label"
          option-value="value"
          :disabled="saving"
          fluid
        />
      </CatalogField>
      <CatalogField
        :id="id + '-date'"
        :label="status === 'paid' ? t('Payment date') : t('Due on')"
      >
        <InputText
          :id="id + '-date'"
          v-model="date"
          type="date"
          :disabled="saving"
          :max="status === 'paid' ? todayLocal() : undefined"
          fluid
        />
      </CatalogField>
      <CatalogField :id="id + '-note'" :label="t('Note')">
        <Textarea
          :id="id + '-note'"
          v-model="note"
          rows="3"
          :disabled="saving"
          fluid
        />
      </CatalogField>
      <Message v-if="error" severity="error" :closable="false">{{
        error
      }}</Message>
      <div class="flex justify-end gap-2">
        <Button
          :label="t('Close')"
          severity="secondary"
          outlined
          :disabled="saving"
          @click="open = false"
        />
        <Button :label="title" type="submit" :loading="saving" />
      </div>
    </form>
  </Dialog>
</template>
