import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

// GET /api/activity-logs - List activity logs (audit trail)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only admin and manager can view audit trail
    if (!["admin", "manager"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let queryBuilder = db.select().from(activityLogs).$dynamic();

    const conditions = [];
    if (userId) conditions.push(eq(activityLogs.userId, userId));
    if (action) conditions.push(eq(activityLogs.action, action));
    if (startDate) conditions.push(gte(activityLogs.createdAt, new Date(startDate)));
    if (endDate) {
      const endD = new Date(endDate);
      endD.setHours(23, 59, 59, 999);
      conditions.push(lte(activityLogs.createdAt, endD));
    }

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    const logs = await queryBuilder
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db.select({ count: sql<number>`count(*)` }).from(activityLogs);

    // Get unique actions for filter dropdown
    const uniqueActions = await db
      .select({ action: activityLogs.action })
      .from(activityLogs)
      .groupBy(activityLogs.action)
      .orderBy(activityLogs.action);

    return NextResponse.json({
      logs,
      actions: uniqueActions.map(a => a.action),
      pagination: {
        page, limit,
        total: Number(totalCount[0].count),
        totalPages: Math.ceil(Number(totalCount[0].count) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 });
  }
}
