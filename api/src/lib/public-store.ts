/// <reference path="../../pb_data/types.d.ts" />

import {
  buildCatalog, buildSchedule, normalizeWeek, PublicQueryError, PUBLIC_SCHEDULE_MAX_WEEKS,
  type PublicPlanInput, type PublicServiceInput,
} from "./public-catalog";
import { addLocalDays, startOfLocalDay, utcToLocal } from "./tz";
import { pocketBaseDate } from "./schedule-store";

const CACHE_PREFIX = "public:v1:";
const CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300";

function setting(name: string, fallback: number): number {
  const raw = $os.getenv(name).trim();
  const number = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(number) && number <= 365 ? number : fallback;
}

export function setPublicCors(e: core.RequestEvent) {
  const header = e.response.header();
  header.add("Vary", "Origin");
  const origin = e.request.header.get("Origin");
  const origins = $os.getenv("PUBLIC_SITE_ORIGINS").split(",").map((value) => value.trim());
  if (/^https?:\/\/[^/*?\s]+$/.test(origin) && origins.includes(origin)) {
    header.set("Access-Control-Allow-Origin", origin);
    if (e.request.method === "OPTIONS") header.set("Access-Control-Allow-Methods", "GET, HEAD");
  }
}

function activeServices(app: core.App): PublicServiceInput[] {
  return app.findRecordsByFilter("services", "active = true", "sort,id", 0, 0).map((row) => ({
    id: row!.id, active: true, sort: row!.getInt("sort"), slug: row!.getString("slug"),
    name: row!.getString("name"), kind: row!.getString("kind") as PublicServiceInput["kind"],
  }));
}

function coachNames(app: core.App) {
  const coaches = app.findRecordsByFilter("admins", "active = true && (role = 'owner' || role = 'coach')", "", 0, 0);
  return new Map(coaches.map((row) => [row!.id, row!.getString("name")]));
}

function catalog(app: core.App) {
  const plans = app.findRecordsByFilter("plans", "active = true", "sort,id", 0, 0).map((row) => ({
    service: row!.getString("service"), active: true, sort: row!.getInt("sort"), name: row!.getString("name"),
    price_cents: row!.getInt("price_cents"), billing_unit: row!.getString("billing_unit") as PublicPlanInput["billing_unit"],
    sessions: row!.getInt("sessions"), per_week: row!.getInt("per_week"), commitment_periods: row!.getInt("commitment_periods"),
    is_first_class: row!.getBool("is_first_class"), partner: row!.getBool("partner"), note: row!.getString("note"),
  }));
  const templates = app.findRecordsByFilter("class_templates", "active = true", "weekday,start_time,id", 0, 0).map((row) => ({
    service: row!.getString("service"), active: true, weekday: row!.getInt("weekday"), start_time: row!.getString("start_time"),
    coach: row!.getString("coach"), capacity: row!.getInt("capacity"),
  }));
  return buildCatalog(activeServices(app), plans, templates, coachNames(app));
}

function schedule(app: core.App, week: string) {
  const params = {
    from: pocketBaseDate(startOfLocalDay(week)),
    to: pocketBaseDate(startOfLocalDay(addLocalDays(week, 7))),
  };
  const sessions = app.findRecordsByFilter("class_sessions",
    "status = 'scheduled' && (kind = 'regular' || kind = 'special') && service.active = true && starts_at >= {:from} && starts_at < {:to}",
    "starts_at,id", 0, 0, params).map((row) => ({
    id: row!.id, service: row!.getString("service"), coach: row!.getString("coach"), starts_at: row!.getString("starts_at"),
    capacity: row!.getInt("capacity"), kind: row!.getString("kind"), status: row!.getString("status"),
  }));
  const counts = arrayOf(new DynamicModel({ session: "", occupied: 0 })) as { session: string; occupied: number }[];
  if (sessions.length) {
    app.db().newQuery(`
      SELECT b.session, count(*) AS occupied
      FROM bookings AS b JOIN class_sessions AS s ON s.id = b.session
      JOIN services AS svc ON svc.id = s.service
      WHERE b.status IN ('booked', 'attended', 'no_show') AND s.status = 'scheduled'
        AND s.kind IN ('regular', 'special') AND svc.active = true
        AND s.starts_at >= {:from} AND s.starts_at < {:to}
      GROUP BY b.session`).bind(params).all(counts);
  }
  return buildSchedule(week, sessions, new Map(counts.map(({ session, occupied }) => [session, occupied])),
    activeServices(app), coachNames(app));
}

function cachedResponse(e: core.RequestEvent, key: string, load: () => unknown) {
  const store = e.app.store();
  const seconds = setting("PUBLIC_CATALOG_CACHE_SECONDS", 30);
  const now = Date.now();
  const cacheKey = CACHE_PREFIX + key;
  const cached = store.get(cacheKey) as { expires: number; body: string } | null;
  let body: string;
  if (cached && cached.expires > now) {
    body = cached.body;
  } else {
    body = JSON.stringify(load());
    if (seconds) store.set(cacheKey, { expires: Date.now() + seconds * 1000, body });
  }
  e.response.header().set("Cache-Control", CACHE_CONTROL);
  return e.json(200, JSON.parse(body));
}

function publicError(e: core.RequestEvent, error: unknown) {
  if (error instanceof PublicQueryError) return e.json(400, { message: error.message });
  e.app.logger().error("Error al cargar datos públicos", "error", String(error));
  return e.json(500, { message: "No se pudieron cargar los datos públicos." });
}

export function servePublicCatalog(e: core.RequestEvent) {
  try {
    return cachedResponse(e, "catalog", () => catalog(e.app));
  } catch (error) {
    return publicError(e, error);
  }
}

export function servePublicSchedule(e: core.RequestEvent) {
  try {
    const query = e.request.url.query();
    const today = utcToLocal(new Date().toISOString()).date;
    const week = normalizeWeek(query.has("week") ? query.get("week") : undefined,
      today, setting("PUBLIC_SCHEDULE_MAX_WEEKS", PUBLIC_SCHEDULE_MAX_WEEKS));
    return cachedResponse(e, `schedule:${week}`, () => schedule(e.app, week));
  } catch (error) {
    return publicError(e, error);
  }
}
