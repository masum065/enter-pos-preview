import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { serviceRecords, activityLogs } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let queryBuilder = db.select().from(serviceRecords).$dynamic();

    const conditions = [];
    if (status) conditions.push(eq(serviceRecords.status, status));
    if (customerId) conditions.push(eq(serviceRecords.customerId, customerId));

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    const services = await queryBuilder
      .orderBy(desc(serviceRecords.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db.select({ count: sql<number>`count(*)` }).from(serviceRecords);

    // Status breakdown (from ALL data, not paginated)
    const statusBreakdown = await db.select({
      status: serviceRecords.status,
      count: sql<number>`count(*)`,
    }).from(serviceRecords).groupBy(serviceRecords.status);

    const statusCounts: Record<string, number> = { All: Number(totalCount[0].count) };
    statusBreakdown.forEach((s) => { statusCounts[s.status] = Number(s.count); });

    // Pending = not Completed and not Delivered
    const [pendingStats] = await db.select({
      count: sql<number>`count(*)`,
    }).from(serviceRecords).where(
      and(
        sql`${serviceRecords.status} != 'Completed'`,
        sql`${serviceRecords.status} != 'Delivered'`
      )
    );

    return NextResponse.json({
      services,
      stats: {
        statusCounts,
        pendingCount: Number(pendingStats.count),
      },
      pagination: {
        page, limit,
        total: Number(totalCount[0].count),
        totalPages: Math.ceil(Number(totalCount[0].count) / limit),
      },
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
