import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { serviceRecords, activityLogs } from "@/db/schema";
import { eq, and, or, desc, sql, ilike } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { serviceRecordSchema } from "@/lib/validations/services";

// GET /api/services - List services with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Build conditions — ALL must be AND
    const conditions = [];
    if (status) conditions.push(eq(serviceRecords.status, status));
    if (customerId) conditions.push(eq(serviceRecords.customerId, customerId));
    if (search) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(serviceRecords.serviceNumber, searchTerm),
          ilike(serviceRecords.customerName, searchTerm),
          ilike(serviceRecords.customerPhone, searchTerm),
          ilike(serviceRecords.deviceBrand, searchTerm),
          ilike(serviceRecords.deviceModel, searchTerm),
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Run all database queries in parallel
    const [
      services,
      totalCountResult,
      totalAllResult,
      statusBreakdown,
      pendingStatsResult
    ] = await Promise.all([
      db.select().from(serviceRecords)
        .where(whereClause)
        .orderBy(desc(serviceRecords.createdAt))
        .limit(limit)
        .offset(offset),
      
      db.select({ count: sql<number>`count(*)` })
        .from(serviceRecords)
        .where(whereClause),
      
      db.select({ count: sql<number>`count(*)` }).from(serviceRecords),
      
      db.select({
        status: serviceRecords.status,
        count: sql<number>`count(*)`,
      }).from(serviceRecords).groupBy(serviceRecords.status),
      
      db.select({
        count: sql<number>`count(*)`,
      }).from(serviceRecords).where(
        and(
          sql`${serviceRecords.status} != 'Completed'`,
          sql`${serviceRecords.status} != 'Delivered'`
        )
      )
    ]);

    const statusCounts: Record<string, number> = { All: Number(totalAllResult[0].count) };
    statusBreakdown.forEach((s) => { statusCounts[s.status] = Number(s.count); });

    return NextResponse.json({
      services,
      stats: {
        statusCounts,
        pendingCount: Number(pendingStatsResult[0].count),
      },
      pagination: {
        page, limit,
        total: Number(totalCountResult[0].count),
        totalPages: Math.ceil(Number(totalCountResult[0].count) / limit),
      },
    }, {
      headers: {
        "Cache-Control": "private, max-age=10",
      }
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}

// POST /api/services - Create service record
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const validatedData = serviceRecordSchema.parse(body);

    // Generate service number
    const year = new Date().getFullYear();
    const lastService = await db
      .select()
      .from(serviceRecords)
      .orderBy(desc(serviceRecords.createdAt))
      .limit(1);

    const counter = lastService.length > 0
      ? parseInt(lastService[0].serviceNumber.split("-")[2]) + 1
      : 1;
    const serviceNumber = `SRV-${year}-${counter.toString().padStart(4, "0")}`;

    const [newService] = await db
      .insert(serviceRecords)
      .values({
        serviceNumber,
        ...validatedData,
        createdBy: session.id,
      })
      .returning();

    await db.insert(activityLogs).values({
      userId: session.id,
      userName: session.name,
      userRole: session.role,
      action: "SERVICE_CREATE",
      entityId: newService.id,
      details: `New service: ${serviceNumber} for ${validatedData.customerName} - ${validatedData.deviceBrand} ${validatedData.deviceModel}`,
      afterData: newService,
    });

    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    console.error("Error creating service:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
