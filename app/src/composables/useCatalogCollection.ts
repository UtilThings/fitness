import { useCollection } from '@/composables/useCollection';
import { reorder, type Direction } from '@/lib/catalog';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';

export function useCatalogCollection<
  T extends { id: string; sort: number; active: boolean },
>(
  name: 'services' | 'plans',
  expand?: string,
  sameGroup: (item: T, other: T) => boolean = () => true,
) {
  const collection = useCollection<T>(name, {
    sort: 'sort,name,id',
    fullList: true,
    expand,
  });

  function save(data: Record<string, unknown>, id?: string) {
    return id ? collection.update(id, data) : collection.create(data);
  }

  function setActive(id: string, active: boolean) {
    return collection.update(id, { active });
  }

  async function move(id: string, direction: Direction) {
    const item = collection.items.value.find((record) => record.id === id);
    if (!item) return;
    const group = collection.items.value.filter((record) =>
      sameGroup(record, item),
    );
    const updates = reorder(group, id, direction);
    if (!updates.length) return;
    const previousSort = new Map(
      group.map((record) => [record.id, record.sort]),
    );
    try {
      await pb.send(`/api/catalog/${name}/order`, {
        method: 'PATCH',
        body: {
          updates: updates.map((update) => ({
            ...update,
            previous: previousSort.get(update.id),
          })),
        },
        requestKey: null,
      });
    } catch (cause) {
      throw parsePbError(cause);
    } finally {
      await collection.load();
    }
  }

  return { ...collection, save, setActive, move };
}
