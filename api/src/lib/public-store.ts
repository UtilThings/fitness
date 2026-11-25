/// <reference path="../../pb_data/types.d.ts" />

import {
  buildCatalog, buildSchedule, normalizeWeek, PublicQueryError, PUBLIC_SCHEDULE_MAX_WEEKS,
  type PublicBusiness, type PublicPlanInput, type PublicServiceInput,
} from "./public-catalog";
import { addLocalDays, startOfLocalDay, utcToLocal } from "./tz";
import { parseKey, verifyKey } from "./business-key";
import { pocketBaseDate } from "./schedule-store";

const CACHE_PREFIX = "public:v2:";

function setting(name: string, fallback: number): number {
  const raw = $os.getenv(name).trim();
  const number = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(number) && number <= 365 ? number : fallback;
}

function publicBusiness(e: core.RequestEvent, record: core.Record): PublicBusiness {
  const logo = record.getString("logo");
  const base = e.app.settings().meta.appURL.replace(/\/$/, "");
  const logo_url = logo ? `${base}/api/files/${record.collection().id}/${record.id}/${encodeURIComponent(logo)}` : "";
  return {
    name: record.getString("name"), city: record.getString("city"), logo_url,
    currency: record.getString("currency"), timezone: record.getString("timezone"),
  };
}

export function publicPreflight(e: core.RequestEvent) {
  const header = e.response.header();
  header.add("Vary", "Origin");
  const origin = e.request.header.get("Origin");
  if (origin) {
    // Browsers send the header name, not its value, on preflight. The GET checks the keyed business.
    const allowed = arrayOf(new DynamicModel({ allowed: 0 }));
    e.app.db().newQuery(`
      SELECT 1 AS allowed FROM businesses AS b, json_each(b.allowed_origins) AS o
      WHERE b.active = true AND b.public_key_prefix != '' AND o.value = {:origin} LIMIT 1
    `).bind({ origin }).all(allowed);
    if (allowed.length) {
      header.set("Access-Control-Allow-Origin", origin);
      header.set("Access-Control-Allow-Methods", "GET, HEAD");
      header.set("Access-Control-Allow-Headers", "X-Business-Key");
    }
  }
  return e.noContent(204);
}

function withPublicBusiness(e: core.RequestEvent, load: (record: core.Record) => void) {
  const header = e.response.header();
  header.add("Vary", "Origin, X-Business-Key");
  const key = e.request.header.get("X-Business-Key");
  const prefix = parseKey(key)?.prefix ?? "!!!!!!!!";
  const record = e.app.findRecordsByFilter("businesses", "public_key_prefix = {:prefix}", "", 1, 0, { prefix })[0];
  const matches = verifyKey(key, record?.getString("public_key_hash") ?? "");
  if (!matches || !record?.getBool("active")) {
    header.set("Cache-Control", "no-store");
    return e.json(401, { message: "The API key is invalid." });
  }

  const origin = e.request.header.get("Origin");
  const stored = record.getString("allowed_origins");
  const allowed: unknown = stored ? JSON.parse(stored) : null;
  if (origin && Array.isArray(allowed) && allowed.includes(origin)) {
    header.set("Access-Control-Allow-Origin", origin);
    header.set("Access-Control-Expose-Headers", "X-Public-Schedule-Max-Weeks");
  }
  return load(record);
}

function activeServices(app: core.App, business: string): PublicServiceInput[] {
  return app.findRecordsByFilter("services", "business = {:business} && active = true", "sort,id", 0, 0, { business }).map((row) => ({
    id: row!.id, active: true, sort: row!.getInt("sort"), slug: row!.getString("slug"),
    name: row!.getString("name"), kind: row!.getString("kind") as PublicServiceInput["kind"],
  }));
}

function coachNames(app: core.App, business: string) {
  const coaches = app.findRecordsByFilter("admins", "business = {:business} && active = true && (role = 'owner' || role = 'coach')", "", 0, 0, { business });
  return new Map(coaches.map((row) => [row!.id, row!.getString("name")]));
}

function catalog(app: core.App, business: string, details: PublicBusiness) {
  const plans = app.findRecordsByFilter("plans", "business = {:business} && active = true", "sort,id", 0, 0, { business }).map((row) => ({
    service: row!.getString("service"), active: true, sort: row!.getInt("sort"), name: row!.getString("name"),
    price_cents: row!.getInt("price_cents"), billing_unit: row!.getString("billing_unit") as PublicPlanInput["billing_unit"],
    sessions: row!.getInt("sessions"), per_week: row!.getInt("per_week"), commitment_periods: row!.getInt("commitment_periods"),
    is_first_class: row!.getBool("is_first_class"), partner: row!.getBool("partner"), note: row!.getString("note"),
  }));
  const templates = app.findRecordsByFilter("class_templates", "business = {:business} && active = true", "weekday,start_time,id", 0, 0, { business }).map((row) => ({
    service: row!.getString("service"), active: true, weekday: row!.getInt("weekday"), start_time: row!.getString("start_time"),
    coach: row!.getString("coach"), capacity: row!.getInt("capacity"),
  }));
  return buildCatalog(activeServices(app, business), plans, templates, coachNames(app, business), details);
}

function schedule(app: core.App, week: string, business: string, details: PublicBusiness) {
  const { timezone } = details;
  const params = {
    business,
    from: pocketBaseDate(startOfLocalDay(week, timezone)),
    to: pocketBaseDate(startOfLocalDay(addLocalDays(week, 7), timezone)),
  };
  const sessions = app.findRecordsByFilter("class_sessions",
    "business = {:business} && status = 'scheduled' && (kind = 'regular' || kind = 'special') && service.active = true && starts_at >= {:from} && starts_at < {:to}",
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
        AND b.business = {:business} AND s.business = {:business} AND svc.business = {:business}
        AND s.kind IN ('regular', 'special') AND svc.active = true
        AND s.starts_at >= {:from} AND s.starts_at < {:to}
      GROUP BY b.session`).bind(params).all(counts);
  }
  return buildSchedule(week, sessions, new Map(counts.map(({ session, occupied }) => [session, occupied])),
    activeServices(app, business), coachNames(app, business), details);
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
  e.response.header().set("Cache-Control", "no-store");
  return e.json(200, JSON.parse(body));
}

function publicError(e: core.RequestEvent, error: unknown) {
  if (error instanceof PublicQueryError) return e.json(400, { message: error.message });
  e.app.logger().error("Could not load public data.", "error", String(error));
  return e.json(500, { message: "Could not load the public data." });
}

export function servePublicCatalog(e: core.RequestEvent) {
  try {
    return withPublicBusiness(e, (business) => cachedResponse(e, `${business.id}:catalog`,
      () => catalog(e.app, business.id, publicBusiness(e, business))));
  } catch (error) {
    return publicError(e, error);
  }
}

export function servePublicSchedule(e: core.RequestEvent) {
  try {
    return withPublicBusiness(e, (business) => {
      const query = e.request.url.query();
      const details = publicBusiness(e, business);
      const today = utcToLocal(new Date().toISOString(), details.timezone).date;
      const maxWeeks = setting("PUBLIC_SCHEDULE_MAX_WEEKS", PUBLIC_SCHEDULE_MAX_WEEKS);
      const week = normalizeWeek(query.has("week") ? query.get("week") : undefined, today, maxWeeks);
      e.response.header().set("X-Public-Schedule-Max-Weeks", String(maxWeeks));
      return cachedResponse(e, `${business.id}:schedule:${week}`, () => schedule(e.app, week, business.id, details));
    });
  } catch (error) {
    return publicError(e, error);
  }
}
