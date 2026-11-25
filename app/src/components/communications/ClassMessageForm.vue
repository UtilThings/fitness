<script setup lang="ts">
import { t } from '@/i18n';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import { computed, onMounted, ref, useId, watch } from 'vue';
import CatalogField from '@/components/catalog/CatalogField.vue';
import { useMessagePreview } from '@/composables/useMessageTemplates';
import type { Booking } from '@/lib/bookings';
import { fullName } from '@/lib/clients';
import { formatDateTime } from '@/lib/datetime';
import {
  ALLOWED_VARIABLES,
  isEligible,
  validateTemplate,
} from '@/lib/messages';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';
import type { ClassSession } from '@/lib/schedule-week';
import MessagePreview from './MessagePreview.vue';

type SendResult = { sent: number; failed: number; skipped: number };
const LIMIT = 200;
const variables = ALLOWED_VARIABLES.manual
  .map((name) => '{{' + name + '}}')
  .join(', ');
const id = useId();
const classes = ref<{ id: string; label: string }[]>([]);
const session = ref('');
const subject = ref('');
const body = ref('');
const recipients = ref<Booking[]>([]);
const total = ref(0);
const loadingClasses = ref(false);
const loadingRecipients = ref(false);
const classError = ref('');
const recipientError = ref('');
const sendError = ref('');
const sending = ref(false);
const confirming = ref(false);
const result = ref<SendResult>();
let revision = 0;

const { preview, rendered, previewError, previewing, clearPreview } =
  useMessagePreview();
const draft = computed(() => ({
  key: 'manual',
  subject: subject.value,
  body: body.value,
}));
const problems = computed(() => validateTemplate(draft.value));
const eligible = computed(
  () =>
    recipients.value.filter(
      ({ expand }) => !!expand?.client && isEligible(expand.client),
    ).length,
);
const canSend = computed(
  () =>
    !!session.value &&
    !loadingRecipients.value &&
    !recipientError.value &&
    total.value <= LIMIT &&
    eligible.value > 0 &&
    !problems.value.length &&
    !sending.value,
);

onMounted(async () => {
  loadingClasses.value = true;
  try {
    const data = await pb
      .collection('class_sessions')
      .getFullList<ClassSession>({
        filter: pb.filter('status = "scheduled" && starts_at > {:now}', {
          now: new Date(),
        }),
        sort: 'starts_at,id',
        expand: 'service',
        requestKey: null,
      });
    classes.value = data.map((item) => ({
      id: item.id,
      label:
        (item.title || item.expand?.service?.name || t('Class')) +
        ' · ' +
        formatDateTime(item.starts_at),
    }));
  } catch (cause) {
    classError.value = parsePbError(cause).message;
  } finally {
    loadingClasses.value = false;
  }
});

watch(session, async (value) => {
  const request = ++revision;
  recipients.value = [];
  total.value = 0;
  confirming.value = false;
  result.value = undefined;
  recipientError.value = '';
  sendError.value = '';
  if (!value) {
    loadingRecipients.value = false;
    return;
  }
  loadingRecipients.value = true;
  try {
    const data = await pb.collection('bookings').getList<Booking>(1, LIMIT, {
      filter: pb.filter(
        'session = {:session} && (status = "booked" || status = "waitlisted")',
        { session: value },
      ),
      sort: 'id',
      expand: 'client',
      requestKey: null,
    });
    if (revision !== request) return;
    recipients.value = data.items;
    total.value = data.totalItems;
  } catch (cause) {
    if (revision === request)
      recipientError.value = parsePbError(cause).message;
  } finally {
    if (revision === request) loadingRecipients.value = false;
  }
});

watch(draft, (value) => {
  if (problems.value.length) clearPreview();
  else preview(value);
});

function startConfirmation() {
  if (canSend.value) confirming.value = true;
}

async function send() {
  if (!confirming.value || !canSend.value) return;
  sending.value = true;
  sendError.value = '';
  result.value = undefined;
  try {
    result.value = await pb.send<SendResult>(
      `/api/admin/messages/class/${encodeURIComponent(session.value)}`,
      {
        method: 'POST',
        body: { subject: subject.value, body: body.value },
        requestKey: null,
      },
    );
  } catch (cause) {
    sendError.value = parsePbError(cause).message;
  } finally {
    sending.value = false;
    confirming.value = false;
  }
}

function problem(field: 'subject' | 'body') {
  return draft.value[field]
    ? problems.value.find((item) => item.field === field)?.message
    : undefined;
}
</script>

<template>
  <div class="grid gap-5 lg:grid-cols-2">
    <form
      class="grid content-start gap-4"
      novalidate
      @submit.prevent="startConfirmation"
    >
      <CatalogField
        :id="id + '-session'"
        :label="t('Upcoming class')"
        :error="classError"
      >
        <Select
          v-model="session"
          :input-id="id + '-session'"
          :options="classes"
          option-label="label"
          option-value="id"
          :placeholder="t('Choose a class')"
          :loading="loadingClasses"
          :disabled="sending || confirming"
          filter
          fluid
        />
      </CatalogField>
      <Message v-if="recipientError" severity="error" :closable="false">{{
        recipientError
      }}</Message>
      <p v-else-if="loadingRecipients" class="text-sm text-muted-color">
        {{ t('Checking booked clients…') }}
      </p>
      <Message v-else-if="total > LIMIT" severity="warn" :closable="false">{{
        t('This class exceeds the limit of {limit} recipients.', {
          limit: LIMIT,
        })
      }}</Message>
      <details v-else-if="session" class="rounded-lg border border-surface p-3">
        <summary class="cursor-pointer text-sm font-medium">
          {{
            t(
              '{eligible} will receive the message · {skipped} will be skipped',
              { eligible, skipped: total - eligible },
            )
          }}
        </summary>
        <ul
          v-if="recipients.length"
          class="mb-0 grid max-h-40 gap-1 overflow-y-auto pl-5 text-sm"
        >
          <li v-for="booking in recipients" :key="booking.id">
            {{
              booking.expand?.client
                ? fullName(booking.expand.client)
                : t('Client unavailable')
            }}
            <span
              v-if="
                !booking.expand?.client || !isEligible(booking.expand.client)
              "
              class="text-muted-color"
              >{{ t('· Will be skipped') }}</span
            >
          </li>
        </ul>
        <p v-else class="mb-0 text-sm text-muted-color">
          {{ t('This class has no booked clients.') }}
        </p>
      </details>
      <CatalogField
        :id="id + '-subject'"
        v-slot="{ describedBy }"
        :label="t('Subject')"
        :error="problem('subject')"
      >
        <InputText
          :id="id + '-subject'"
          v-model="subject"
          :aria-describedby="describedBy"
          :disabled="sending || confirming"
          maxlength="150"
          fluid
        />
      </CatalogField>
      <CatalogField
        :id="id + '-body'"
        v-slot="{ describedBy }"
        :label="t('Message')"
        :error="problem('body')"
      >
        <Textarea
          :id="id + '-body'"
          v-model="body"
          :aria-describedby="describedBy"
          :disabled="sending || confirming"
          maxlength="5000"
          rows="7"
          fluid
        />
      </CatalogField>
      <p class="m-0 text-sm text-muted-color">
        {{ t('Allowed variables: {variables}.', { variables }) }}
      </p>
      <div class="flex justify-end">
        <Button
          :label="t('Review message')"
          type="submit"
          :disabled="!canSend"
        />
      </div>
      <Message v-if="sendError" severity="error" :closable="false">{{
        sendError
      }}</Message>
      <Message
        v-if="result"
        :severity="result.failed ? 'warn' : 'success'"
        :closable="false"
      >
        {{
          t('Sent: {sent} · Failed: {failed} · Skipped: {skipped}', {
            sent: result.sent,
            failed: result.failed,
            skipped: result.skipped,
          })
        }}
      </Message>
    </form>
    <MessagePreview
      :rendered="rendered"
      :loading="previewing"
      :error="previewError"
    />

    <Dialog
      v-model:visible="confirming"
      :header="t('Confirm sending')"
      modal
      :closable="!sending"
      :close-on-escape="!sending"
    >
      <p>
        {{
          t(
            'The message will be sent to {eligible} booked clients. {skipped} will be skipped.',
            { eligible, skipped: total - eligible },
          )
        }}
      </p>
      <template #footer>
        <Button
          :label="t('Back')"
          severity="secondary"
          text
          :disabled="sending"
          @click="confirming = false"
        />
        <Button
          :label="t('Send message')"
          icon="pi pi-send"
          :loading="sending"
          @click="send"
        />
      </template>
    </Dialog>
  </div>
</template>
