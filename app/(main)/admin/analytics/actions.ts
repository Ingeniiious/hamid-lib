"use server";

import { db } from "@/lib/db";
import { pageView } from "@/database/schema";
import { sql, gte, lte, and } from "drizzle-orm";
import { getAdminSession, requirePermission } from "@/lib/admin/auth";

export async function getOverviewStats(dateFrom?: string, dateTo?: string) {
  const session = await getAdminSession();
  requirePermission(session, "analytics.view");

  const conditions = [];
  if (dateFrom) conditions.push(gte(pageView.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(pageView.createdAt, new Date(dateTo)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [views, visitors, newUsers] = await Promise.all([
    db
      .select({ count: sql<string>`count(*)` })
      .from(pageView)
      .where(where)
      .then((r) => Number(r[0]?.count || 0)),
    db
      .select({
        count: sql<string>`count(DISTINCT ${pageView.sessionId})`,
      })
      .from(pageView)
      .where(where)
      .then((r) => Number(r[0]?.count || 0)),
    db
      .execute<{ count: string }>(
        dateFrom
          ? sql`SELECT count(*)::text as count FROM neon_auth."user" WHERE "createdAt" >= ${dateFrom}::timestamp ${dateTo ? sql`AND "createdAt" <= ${dateTo}::timestamp` : sql``}`
          : sql`SELECT count(*)::text as count FROM neon_auth."user"`
      )
      .then((r) => Number(r[0]?.count || 0)),
  ]);

  return { totalViews: views, uniqueVisitors: visitors, newUsers };
}

export async function getPageViewsOverTime(
  dateFrom: string,
  dateTo: string,
  granularity: "day" | "week" | "month" = "day"
) {
  const session = await getAdminSession();
  requirePermission(session, "analytics.view");

  const trunc = granularity === "day" ? "day" : granularity === "week" ? "week" : "month";

  const rows = await db.execute<{ date: string; count: string }>(
    sql`SELECT date_trunc(${trunc}, ${pageView.createdAt})::date::text as date, count(*)::text as count
        FROM ${pageView}
        WHERE ${pageView.createdAt} >= ${dateFrom}::timestamp
          AND ${pageView.createdAt} <= ${dateTo}::timestamp
        GROUP BY 1
        ORDER BY 1
        LIMIT 400`
  );

  return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
}

export async function getTopPages(dateFrom?: string, dateTo?: string, limit = 10) {
  const session = await getAdminSession();
  requirePermission(session, "analytics.view");

  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const conditions = [];
  if (dateFrom) conditions.push(sql`${pageView.createdAt} >= ${dateFrom}::timestamp`);
  if (dateTo) conditions.push(sql`${pageView.createdAt} <= ${dateTo}::timestamp`);
  const whereClause = conditions.length > 0
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;

  const rows = await db.execute<{ path: string; count: string }>(
    sql`SELECT ${pageView.path} as path, count(*)::text as count
        FROM ${pageView}
        ${whereClause}
        GROUP BY ${pageView.path}
        ORDER BY count(*) DESC
        LIMIT ${safeLimit}`
  );

  return rows.map((r) => ({ path: r.path, count: Number(r.count) }));
}

export async function getDeviceBreakdown(dateFrom?: string, dateTo?: string) {
  const session = await getAdminSession();
  requirePermission(session, "analytics.view");

  const conditions = [];
  if (dateFrom) conditions.push(sql`${pageView.createdAt} >= ${dateFrom}::timestamp`);
  if (dateTo) conditions.push(sql`${pageView.createdAt} <= ${dateTo}::timestamp`);
  const whereClause = conditions.length > 0
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;

  const [devices, browsers, oses] = await Promise.all([
    db.execute<{ name: string; count: string }>(
      sql`SELECT ${pageView.deviceType} as name, count(*)::text as count FROM ${pageView} ${whereClause} GROUP BY 1 ORDER BY count(*) DESC LIMIT 50`
    ),
    db.execute<{ name: string; count: string }>(
      sql`SELECT ${pageView.browser} as name, count(*)::text as count FROM ${pageView} ${whereClause} GROUP BY 1 ORDER BY count(*) DESC LIMIT 50`
    ),
    db.execute<{ name: string; count: string }>(
      sql`SELECT ${pageView.os} as name, count(*)::text as count FROM ${pageView} ${whereClause} GROUP BY 1 ORDER BY count(*) DESC LIMIT 50`
    ),
  ]);

  return {
    devices: devices.map((r) => ({ name: r.name || "unknown", count: Number(r.count) })),
    browsers: browsers.map((r) => ({ name: r.name || "unknown", count: Number(r.count) })),
    oses: oses.map((r) => ({ name: r.name || "unknown", count: Number(r.count) })),
  };
}

export async function getGeoBreakdown(dateFrom?: string, dateTo?: string) {
  const session = await getAdminSession();
  requirePermission(session, "analytics.view");

  const conditions = [];
  if (dateFrom) conditions.push(sql`${pageView.createdAt} >= ${dateFrom}::timestamp`);
  if (dateTo) conditions.push(sql`${pageView.createdAt} <= ${dateTo}::timestamp`);
  const whereClause = conditions.length > 0
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;

  const rows = await db.execute<{ country: string; count: string }>(
    sql`SELECT COALESCE(${pageView.country}, 'Unknown') as country, count(*)::text as count
        FROM ${pageView}
        ${whereClause}
        GROUP BY 1
        ORDER BY count(*) DESC
        LIMIT 20`
  );

  return rows.map((r) => ({ country: r.country, count: Number(r.count) }));
}

export async function getRealtimeVisitors() {
  const session = await getAdminSession();
  requirePermission(session, "analytics.view");

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const rows = await db
    .select({ count: sql<string>`count(DISTINCT ${pageView.sessionId})` })
    .from(pageView)
    .where(gte(pageView.createdAt, fiveMinAgo));

  return Number(rows[0]?.count || 0);
}

export async function getReferrerStats(dateFrom?: string, dateTo?: string) {
  const session = await getAdminSession();
  requirePermission(session, "analytics.view");

  const conditions = [sql`${pageView.referrer} IS NOT NULL`, sql`${pageView.referrer} != ''`];
  if (dateFrom) conditions.push(sql`${pageView.createdAt} >= ${dateFrom}::timestamp`);
  if (dateTo) conditions.push(sql`${pageView.createdAt} <= ${dateTo}::timestamp`);

  const rows = await db.execute<{ referrer: string; count: string }>(
    sql`SELECT ${pageView.referrer} as referrer, count(*)::text as count
        FROM ${pageView}
        WHERE ${sql.join(conditions, sql` AND `)}
        GROUP BY 1
        ORDER BY count(*) DESC
        LIMIT 10`
  );

  return rows.map((r) => ({ referrer: r.referrer, count: Number(r.count) }));
}

export async function getUserGrowth(dateFrom: string, dateTo: string) {
  const session = await getAdminSession();
  requirePermission(session, "analytics.view");

  const rows = await db.execute<{ date: string; count: string }>(
    sql`SELECT date_trunc('day', "createdAt")::date::text as date, count(*)::text as count
        FROM neon_auth."user"
        WHERE "createdAt" >= ${dateFrom}::timestamp
          AND "createdAt" <= ${dateTo}::timestamp
        GROUP BY 1
        ORDER BY 1
        LIMIT 400`
  );

  return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
}
