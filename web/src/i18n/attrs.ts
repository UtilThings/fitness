import {
  formatMessage,
  type Message,
  type MessageKey,
  type Params,
} from './index';

export const translatableAttributes = [
  'alt',
  'aria-label',
  'placeholder',
  'title',
] as const;
type Attribute = (typeof translatableAttributes)[number];
type MessageInput = string | { key: string; params?: Params };

export function messageData(
  key: string,
  params?: Params,
  attribute?: Attribute,
) {
  const suffix = attribute ? `-${attribute}` : '';
  return {
    [`data-i18n${suffix}`]: key,
    [`data-i18n-params${suffix}`]: params ? JSON.stringify(params) : undefined,
  };
}

function renderAttributes(attrs: Partial<Record<Attribute, MessageInput>>) {
  const result: Record<string, string | undefined> = {};
  for (const attribute of translatableAttributes) {
    const message = attrs[attribute];
    if (message === undefined) continue;
    const { key, params } =
      typeof message === 'string'
        ? { key: message, params: undefined }
        : message;
    result[attribute] = formatMessage(key, params, 'en');
    Object.assign(result, messageData(key, params, attribute));
  }
  return result;
}

export const i18nAttrs = renderAttributes;

export function messageAttrs(
  attrs: Partial<Record<Attribute, MessageKey | Message>>,
) {
  return renderAttributes(attrs);
}
