import { addLocalDays, localToUtc, localWeekday, startOfLocalDay } from "./tz";

export const SESSION_WINDOW_WEEKS = 4;

export interface ScheduleBlockDates {
  date_from: string;
  date_to: string;
}

interface Template {
  id: string;
  service: string;
  weekday: number;
  start_time: string;
  duration_min: number;
  capacity: number;
  coach: string;
  active: boolean;
}

interface Service {
  active: boolean;
  default_coach: string;
}

export interface GeneratedSession {
  template: string;
  service: string;
  starts_at: string;
  duration_min: number;
  capacity: number;
  coach: string;
  kind: "regular";
  status: "scheduled";
}

export function isBlocked(date: string, blocks: readonly ScheduleBlockDates[]): boolean {
  return blocks.some((block) => block.date_from <= date && date <= block.date_to);
}

export function blockRangeUtc(block: ScheduleBlockDates): { from: string; to: string } {
  return { from: startOfLocalDay(block.date_from), to: startOfLocalDay(addLocalDays(block.date_to, 1)) };
}

export function sessionKey(template: string, startsAt: string): string {
  return template + "|" + new Date(startsAt.replace(" ", "T")).toISOString();
}

export function generateSessions(input: {
  templates: readonly Template[];
  services: ReadonlyMap<string, Service>;
  blocks: readonly ScheduleBlockDates[];
  from: string;
  weeks: number;
  existingKeys: ReadonlySet<string>;
}) {
  const { templates, services, blocks, from, weeks, existingKeys } = input;
  const toCreate: GeneratedSession[] = [];
  let skippedExisting = 0;
  let skippedBlocked = 0;
  for (let day = 0; day < weeks * 7; day++) {
    const date = addLocalDays(from, day);
    const weekday = localWeekday(date);
    const blocked = isBlocked(date, blocks);
    for (const template of templates) {
      const service = services.get(template.service);
      if (template.weekday !== weekday || !template.active || !service?.active) continue;
      if (blocked) {
        skippedBlocked++;
        continue;
      }
      const starts_at = localToUtc(date, template.start_time);
      if (existingKeys.has(sessionKey(template.id, starts_at))) {
        skippedExisting++;
        continue;
      }
      toCreate.push({
        template: template.id, service: template.service, starts_at,
        duration_min: template.duration_min, capacity: template.capacity,
        coach: template.coach || service.default_coach || "", kind: "regular", status: "scheduled",
      });
    }
  }
  return { toCreate, skippedExisting, skippedBlocked };
}
