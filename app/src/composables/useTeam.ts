import { shallowRef } from 'vue';
import { useCollection } from '@/composables/useCollection';
import { parsePbError, type PbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';
import type { Admin, Role } from '@/types/pb';

export interface NewMember {
  name: string;
  email: string;
  role: Role;
  phone: string;
  bio: string;
  password: string;
}

export function useTeam() {
  const team = useCollection<Admin>('admins', { sort: 'name' });
  const admins = pb.collection<Admin>('admins');
  const coaches = shallowRef<Admin[]>([]);
  const coachesError = shallowRef<PbError | null>(null);
  let latestCoachesLoad = 0;

  async function loadCoaches() {
    const version = ++latestCoachesLoad;
    coachesError.value = null;
    try {
      const records = await admins.getFullList({
        sort: 'name',
        filter: pb.filter(
          'active = {:active} && (role = {:coach} || role = {:owner})',
          {
            active: true,
            coach: 'coach',
            owner: 'owner',
          },
        ),
        requestKey: null,
      });
      if (version === latestCoachesLoad) coaches.value = records;
    } catch (cause) {
      if (version === latestCoachesLoad)
        coachesError.value = parsePbError(cause);
    }
  }

  async function getMember(id: string) {
    try {
      return await admins.getOne(id, { requestKey: null });
    } catch (cause) {
      throw parsePbError(cause);
    }
  }

  async function createMember(data: NewMember) {
    const record = await team.create({
      ...data,
      passwordConfirm: data.password,
      emailVisibility: true,
      active: true,
    });
    if (latestCoachesLoad) await loadCoaches();
    return record;
  }

  async function updateMember(
    id: string,
    data: Record<string, unknown> | FormData,
  ) {
    const record = await team.update(id, data);
    if (latestCoachesLoad) await loadCoaches();
    return record;
  }

  function setRole(id: string, role: Role) {
    return updateMember(id, { role });
  }

  function setActive(id: string, active: boolean) {
    return updateMember(id, { active });
  }

  function uploadAvatar(id: string, file: File) {
    const data = new FormData();
    data.set('avatar', file);
    return updateMember(id, data);
  }

  async function deleteOrDeactivate(member: Pick<Admin, 'id'>) {
    try {
      await team.remove(member.id);
    } catch (cause) {
      const error = cause as PbError;
      if (error.status === 409)
        return { deactivated: false, needsDeactivate: true };
      throw error;
    }
    if (latestCoachesLoad) await loadCoaches();
    return { deactivated: false, needsDeactivate: false };
  }

  return {
    ...team,
    coaches,
    coachesError,
    loadCoaches,
    getMember,
    createMember,
    updateMember,
    setRole,
    setActive,
    uploadAvatar,
    deleteOrDeactivate,
  };
}
