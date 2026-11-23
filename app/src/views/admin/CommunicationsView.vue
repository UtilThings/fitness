<script setup lang="ts">
import Message from 'primevue/message';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import Tabs from 'primevue/tabs';
import { computed, onMounted, ref } from 'vue';
import ClassMessageForm from '@/components/communications/ClassMessageForm.vue';
import MessageHistory from '@/components/communications/MessageHistory.vue';
import TemplateEditor from '@/components/communications/TemplateEditor.vue';
import PageHeader from '@/components/PageHeader.vue';
import { useAuth } from '@/composables/useAuth';
import { useMessageTemplates } from '@/composables/useMessageTemplates';
import type {
  Locale,
  MessageDraft,
  MessageTemplate,
  ServiceKey,
} from '@/lib/messages';
import { parsePbError } from '@/lib/pb-errors';

const { isOwner } = useAuth();
const { list } = useMessageTemplates();
const templates = ref<MessageTemplate[]>([]);
const error = ref('');
const loading = ref(true);
const saved = ref(false);
const key = ref<ServiceKey>('booking_confirmed');
const locale = ref<Locale>('es');

const selected = computed<MessageDraft>(
  () =>
    templates.value.find(
      (item) => item.key === key.value && item.locale === locale.value,
    ) ?? {
      key: key.value,
      locale: locale.value,
      subject: '',
      body: '',
      active: true,
    },
);

onMounted(async () => {
  try {
    templates.value = await list();
  } catch (cause) {
    error.value = parsePbError(cause).message;
  } finally {
    loading.value = false;
  }
});

function select(nextKey: ServiceKey, nextLocale: Locale) {
  key.value = nextKey;
  locale.value = nextLocale;
  saved.value = false;
}

function recordSave(template: MessageTemplate) {
  templates.value = [
    ...templates.value.filter(({ id }) => id !== template.id),
    template,
  ];
  saved.value = true;
}
</script>

<template>
  <div class="grid gap-5">
    <PageHeader title="Comunicaciones" />
    <Tabs value="templates" lazy scrollable>
      <TabList>
        <Tab value="templates">Plantillas</Tab>
        <Tab value="history">Historial</Tab>
        <Tab value="manual">Mensaje a clase</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="templates">
          <p v-if="loading" role="status" class="text-sm text-muted-color">
            Cargando plantillas…
          </p>
          <Message v-else-if="error" severity="error" :closable="false">{{
            error
          }}</Message>
          <template v-else>
            <p v-if="!isOwner" class="mt-0 text-sm text-muted-color">
              Solo lectura.
            </p>
            <Message
              v-if="saved"
              severity="success"
              class="mb-4"
              :closable="false"
              >Plantilla guardada.</Message
            >
            <TemplateEditor
              :template="selected"
              :read-only="!isOwner"
              @select="select"
              @saved="recordSave"
            />
          </template>
        </TabPanel>
        <TabPanel value="history"><MessageHistory /></TabPanel>
        <TabPanel value="manual"><ClassMessageForm /></TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
