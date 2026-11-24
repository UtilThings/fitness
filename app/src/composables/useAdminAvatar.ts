import { ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { pb } from '@/lib/pocketbase';
import type { Admin } from '@/types/pb';

type AvatarRecord = Pick<
  Admin,
  'id' | 'collectionId' | 'collectionName' | 'avatar'
>;
const fileTokenLifetime = 120_000;
let cached:
  { session: string; expires: number; token: Promise<string> } | undefined;

async function avatarToken() {
  const session = pb.authStore.token;
  const now = Date.now();
  if (cached?.session !== session || cached.expires <= now) {
    const token = pb.files
      .getToken({ requestKey: null })
      .catch((error: unknown) => {
        if (cached?.token === token) cached = undefined;
        throw error;
      });
    cached = { session, expires: now + fileTokenLifetime, token };
  }
  return cached.token;
}

export function useAdminAvatar(
  record: MaybeRefOrGetter<AvatarRecord | null | undefined>,
  thumb: string,
) {
  const url = ref<string>();
  watch(
    () => {
      const member = toValue(record);
      return [member?.id, member?.avatar] as const;
    },
    async ([, avatar], _, onCleanup) => {
      url.value = undefined;
      const member = toValue(record);
      if (!member || !avatar) return;
      const session = pb.authStore.token;
      if (!session) return;
      let current = true;
      onCleanup(() => {
        current = false;
      });
      try {
        const token = await avatarToken();
        if (current && pb.authStore.token === session)
          url.value = pb.files.getURL(member, avatar, { token, thumb });
      } catch {
        // The caller displays initials when the file cannot be authorized.
      }
    },
    { immediate: true, flush: 'sync' },
  );
  return url;
}
