import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { suppliers, activityLogs } from "@/db/schema";
import { or, like, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { supplierSchema } from "@/lib/validations/purchases";

// GET /api/suppliers - List suppliers with search
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let queryBuilder = db.select().from(suppliers).$dynamic();

    if (search) {
      queryBuilder = queryBuilder.where(
        or(
          like(suppliers.companyName, `%${search}%`),
          like(suppliers.phone, `%${search}%`)
        )
      );
    }

    const allSuppliers = await queryBuilder
      .orderBy(desc(suppliers.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db.select({ count: sql<number>`count(*)` }).from(suppliers);

    // Aggregate stats (from ALL data)
    const [suppAgg] = await db.select({
      totalPayable: sql<string>`COALESCE(SUM(GREATEST(${suppliers.balance}, 0)), 0)`,
      totalPurchases: sql<string>`COALESCE(SUM(${suppliers.totalPurchases}), 0)`,
      totalPaid: sql<string>`COALESCE(SUM(${suppliers.totalPaid}), 0)`,
    }).from(suppliers);

    return NextResponse.json({
      suppliers: allSuppliers,
      stats: {
        total: Number(totalCount[0].count),
        totalPayable: Number(suppAgg.totalPayable),
        totalPurchases: Number(suppAgg.totalPurchases),
        totalPaid: Number(suppAgg.totalPaid),
      },
      pagination: {
        page,
        limit,
        total: Number(totalCount[0].count),
        totalPages: Math.ceil(Number(totalCount[0].count) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

// POST /api/suppliers - Create supplier
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["admin", "manager"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = supplierSchema.parse(body);

    const [newSupplier] = await db
      .insert(suppliers)
      .values(validatedData)
      .returning();

    await db.insert(activityLogs).values({
      userId: session.id,
      userName: session.name,
      userRole: session.role,
      action: "SUPPLIER_CREATE",
      entityId: newSupplier.id,
      details: `Added new supplier: ${newSupplier.companyName}`,
      afterData: newSupplier,
    });

    return NextResponse.json(newSupplier, { status: 201 });
  } catch (error) {
    console.error("Error creating supplier:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
  }
}
