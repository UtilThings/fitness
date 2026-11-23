import {
  programFlags,
  matchesProgramAlert,
  type CheckinInput,
  type CoachingCheckin,
  type CoachingProgram,
  type ProgramAlert,
  type ProgramInput,
  type ProgramStatus,
} from '@/lib/coaching';
import { todayLocal } from '@/lib/datetime';
import type { Membership } from '@/lib/memberships';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';
import type { Admin } from '@/types/pb';

export interface CoachingFilters {
  client?: string;
  coach?: string;
  status?: ProgramStatus;
  alert?: ProgramAlert | 'renewal';
  search?: string;
}

const options = { requestKey: null };
const programOptions = {
  ...options,
  expand: 'client,coach,membership,membership.plan',
};
const checkinOptions = { ...options, sort: '-checked_at,-created,-id' };

async function request<T>(operation: Promise<T>) {
  try {
    return await operation;
  } catch (cause) {
    throw parsePbError(cause);
  }
}

function describe(
  program: CoachingProgram,
  checkins: CoachingCheckin[],
  today: string,
) {
  return {
    ...program,
    flags: programFlags(
      {
        ...program,
        starts_on: program.starts_on.slice(0, 10),
        renews_on: program.renews_on.slice(0, 10),
      },
      checkins.map((checkin) => ({
        ...checkin,
        checked_at: checkin.checked_at.slice(0, 10),
      })),
      program.expand?.membership,
      today,
    ),
  };
}

export function useCoaching() {
  const programs = pb.collection<CoachingProgram>('coaching_programs');
  const checkins = pb.collection<CoachingCheckin>('coaching_checkins');

  function listCheckins(programId: string) {
    return request(
      checkins.getFullList({
        ...checkinOptions,
        expand: 'created_by',
        filter: pb.filter('program = {:programId}', { programId }),
      }),
    );
  }

  async function listPrograms({
    client,
    coach,
    status,
    alert,
    search,
  }: CoachingFilters = {}) {
    const searchTerm = search?.trim();
    const filter = [
      client && pb.filter('client = {:client}', { client }),
      coach && pb.filter('coach = {:coach}', { coach }),
      status && pb.filter('status = {:status}', { status }),
      searchTerm &&
        searchTerm
          .split(/\s+/)
          .map((term) =>
            pb.filter(
              '(client.first_name ~ {:term} || client.last_name ~ {:term})',
              { term },
            ),
          )
          .join(' && '),
    ]
      .filter(Boolean)
      .join(' && ');
    const records = await request(
      programs.getFullList({
        ...programOptions,
        filter,
        sort: '-starts_on,-id',
      }),
    );
    const byProgram = new Map<string, CoachingCheckin[]>();

    for (let index = 0; index < records.length; index += 50) {
      const batch = records.slice(index, index + 50);
      const rows = await request(
        checkins.getFullList({
          ...checkinOptions,
          filter: batch
            .map(({ id }) => pb.filter('program = {:id}', { id }))
            .join(' || '),
        }),
      );
      for (const row of rows) {
        const existing = byProgram.get(row.program);
        if (existing) existing.push(row);
        else byProgram.set(row.program, [row]);
      }
    }
    const today = todayLocal();
    return records
      .map((record) => describe(record, byProgram.get(record.id) ?? [], today))
      .filter(({ flags }) => matchesProgramAlert(flags.alerts, alert));
  }

  async function getProgram(id: string) {
    const [program, history] = await Promise.all([
      request(programs.getOne(id, programOptions)),
      listCheckins(id),
    ]);
    return { program: describe(program, history, todayLocal()), history };
  }

  function listOnlineMemberships({
    client,
    activeOnly = true,
  }: { client?: string; activeOnly?: boolean } = {}) {
    const filter = [
      "plan.service.kind = 'online'",
      activeOnly && "status = 'active'",
      client && pb.filter('client = {:client}', { client }),
    ]
      .filter(Boolean)
      .join(' && ');
    return request(
      pb.collection<Membership>('memberships').getFullList({
        ...options,
        expand: 'client,plan',
        filter,
        sort: '-current_period_end,id',
      }),
    );
  }

  return {
    listPrograms,
    getProgram,
    listCheckins,
    listOnlineMemberships,
    listCoaches: (activeOnly = true) =>
      request(
        pb.collection<Admin>('admins').getFullList({
          ...options,
          filter:
            "(role = 'owner' || role = 'coach')" +
            (activeOnly ? ' && active = true' : ''),
          sort: 'name,id',
        }),
      ),
    createProgram: (input: ProgramInput) =>
      request(programs.create(input, options)),
    updateProgram: (id: string, input: Partial<ProgramInput>) =>
      request(programs.update(id, input, options)),
    setStatus: (id: string, status: ProgramStatus) =>
      request(programs.update(id, { status }, options)),
    createCheckin: (program: string, input: CheckinInput) =>
      request(checkins.create({ program, ...input }, options)),
  };
}
