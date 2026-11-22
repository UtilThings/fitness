import { ref, shallowRef } from 'vue';
import { parsePbError, type PbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';
import type { BaseRecord } from '@/types/pb';

export interface CollectionFilter {
  expression: string;
  params?: Record<string, unknown>;
}

interface CollectionOptions {
  perPage?: number;
  fullList?: boolean;
  sort?: string;
  expand?: string;
  fields?: string;
  baseFilter?: CollectionFilter;
}

type CollectionData = Record<string, unknown> | FormData;

let collectionInstances = 0;
const fieldName = /^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;

export function useCollection<T = BaseRecord>(
  name: string,
  options: CollectionOptions = {},
) {
  const collection = pb.collection(name);
  const requestKey = `useCollection:${name}:${++collectionInstances}`;
  let latestLoad = 0;
  const items = shallowRef<T[]>([]);
  const total = ref(0);
  const page = ref(1);
  const perPage = ref(options.perPage ?? 20);
  const sort = ref(options.sort ?? '');
  const filters = ref<CollectionFilter[]>([]);
  const searchFilter = shallowRef<CollectionFilter>();
  const loading = ref(false);
  const error = shallowRef<PbError | null>(null);

  function buildFilter(): string | undefined {
    const clauses = [options.baseFilter, ...filters.value, searchFilter.value];
    return (
      clauses
        .filter((clause) => clause !== undefined)
        .filter(({ expression }) => expression.trim())
        .map(({ expression, params }) => `(${pb.filter(expression, params)})`)
        .join(' && ') || undefined
    );
  }

  async function load() {
    const version = ++latestLoad;
    loading.value = true;
    error.value = null;
    try {
      const query = {
        sort: sort.value || undefined,
        filter: buildFilter(),
        expand: options.expand,
        fields: options.fields,
        requestKey,
      };
      if (options.fullList) {
        const records = await collection.getFullList<T>(query);
        if (version !== latestLoad) return;
        items.value = records;
        total.value = records.length;
        return;
      }
      const result = await collection.getList<T>(
        page.value,
        perPage.value,
        query,
      );
      if (version !== latestLoad) return;
      items.value = result.items;
      total.value = result.totalItems;
      page.value = result.page;
      perPage.value = result.perPage;
    } catch (cause) {
      if (version !== latestLoad) return;
      const parsed = parsePbError(cause);
      if (!parsed.aborted) error.value = parsed;
    } finally {
      if (version === latestLoad) loading.value = false;
    }
  }

  function setPage(value: number) {
    page.value = value;
    return load();
  }

  function setSort(value: string) {
    sort.value = value;
    return setPage(1);
  }

  function search(text: string, fields: readonly string[]) {
    if (fields.some((field) => !fieldName.test(field))) {
      throw new TypeError(
        'Los campos de búsqueda deben ser nombres de campos de PocketBase',
      );
    }
    const term = text.trim();
    searchFilter.value =
      term && fields.length
        ? {
            expression: fields
              .map((field) => `${field} ~ {:term}`)
              .join(' || '),
            params: { term },
          }
        : undefined;
    return setPage(1);
  }

  async function mutate<R>(operation: () => Promise<R>): Promise<R> {
    let result: R;
    try {
      result = await operation();
    } catch (cause) {
      throw parsePbError(cause);
    }
    await load();
    return result;
  }

  function create(data: CollectionData) {
    return mutate(() => collection.create<T>(data, { requestKey: null }));
  }

  function update(id: string, data: CollectionData) {
    return mutate(() => collection.update<T>(id, data, { requestKey: null }));
  }

  function remove(id: string) {
    return mutate(() => collection.delete(id, { requestKey: null }));
  }

  return {
    items,
    total,
    page,
    perPage,
    sort,
    filters,
    loading,
    error,
    load,
    setPage,
    setSort,
    search,
    create,
    update,
    remove,
  };
}
