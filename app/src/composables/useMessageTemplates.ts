import { ClientResponseError } from 'pocketbase';
import { getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue';
import {
  translateTemplateProblem,
  type MessageDraft,
  type MessageTemplate,
  type PreviewDraft,
} from '@/lib/messages';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';

type Preview = {
  subject: string;
  body: string;
  html: string;
  unknown_variables: string[];
};

export function useMessagePreview() {
  const rendered = shallowRef<Preview>();
  const previewError = ref('');
  const previewing = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  function clearPreview() {
    clearTimeout(timer);
    controller?.abort();
    controller = undefined;
    rendered.value = undefined;
    previewError.value = '';
    previewing.value = false;
  }

  function preview(draft: PreviewDraft) {
    clearPreview();
    previewing.value = true;
    const request = new AbortController();
    controller = request;
    timer = setTimeout(async () => {
      try {
        const result = await pb.send<Preview>('/api/admin/messages/preview', {
          method: 'POST',
          body: draft,
          requestKey: null,
          signal: request.signal,
        });
        if (!request.signal.aborted) rendered.value = result;
      } catch (error) {
        if (request.signal.aborted) return;
        const problems: unknown =
          error instanceof ClientResponseError
            ? error.response.problems
            : undefined;
        const messages = Array.isArray(problems)
          ? problems.flatMap((problem) =>
              typeof problem?.message === 'string'
                ? [
                    translateTemplateProblem({
                      message: problem.message,
                      variable:
                        typeof problem.variable === 'string'
                          ? problem.variable
                          : undefined,
                    }),
                  ]
                : [],
            )
          : [];
        previewError.value = messages.join(' ') || parsePbError(error).message;
      } finally {
        if (!request.signal.aborted) previewing.value = false;
      }
    }, 300);
  }

  if (getCurrentScope()) onScopeDispose(clearPreview);
  return { rendered, previewError, previewing, preview, clearPreview };
}

export function useMessageTemplates() {
  const saving = ref(false);
  const saveError = ref('');
  const saveFields = ref<Record<string, string>>({});

  function clearSaveErrors() {
    saveError.value = '';
    saveFields.value = {};
  }

  function list() {
    return pb.collection('message_templates').getFullList<MessageTemplate>({
      sort: 'key,locale',
    });
  }

  async function save({
    id,
    key,
    locale,
    subject,
    body,
    active,
  }: MessageDraft) {
    saving.value = true;
    clearSaveErrors();
    try {
      const collection = pb.collection('message_templates');
      const data = { key, locale, subject, body, active };
      return id
        ? await collection.update<MessageTemplate>(id, data)
        : await collection.create<MessageTemplate>(data);
    } catch (error) {
      const parsed = parsePbError(error);
      if (!parsed.aborted) {
        saveError.value = parsed.message;
        saveFields.value = parsed.fields;
      }
    } finally {
      saving.value = false;
    }
  }

  return { list, save, saving, saveError, saveFields, clearSaveErrors };
}
