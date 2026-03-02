import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { suppliers, activityLogs } from "@/db/schema";
import { or, ilike, desc, sql, and, gt, lt, eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { supplierSchema } from "@/lib/validations/purchases";

// GET /api/suppliers - List suppliers with search and filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const balanceFilter = searchParams.get("balanceFilter"); // "due" | "clear" | "advance"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(suppliers.companyName, `%${search}%`),
          ilike(suppliers.phone, `%${search}%`),
          ilike(suppliers.email, `%${search}%`),
          ilike(suppliers.address, `%${search}%`),
        )
      );
    }

    if (balanceFilter === "due") conditions.push(gt(suppliers.balance, "0"));
    if (balanceFilter === "clear") conditions.push(eq(suppliers.balance, "0"));
    if (balanceFilter === "advance") conditions.push(lt(suppliers.balance, "0"));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allSuppliers = await db
      .select()
      .from(suppliers)
      .where(whereClause)
      .orderBy(desc(suppliers.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(suppliers)
      .where(whereClause);

    // Aggregate stats (from ALL data, not filtered)
    const [suppAgg] = await db.select({
      totalPayable: sql<string>`COALESCE(SUM(GREATEST(CAST(${suppliers.balance} AS numeric), 0)), 0)`,
      totalPurchases: sql<string>`COALESCE(SUM(${suppliers.totalPurchases}), 0)`,
      totalPaid: sql<string>`COALESCE(SUM(${suppliers.totalPaid}), 0)`,
      total: sql<number>`count(*)`,
      withDue: sql<number>`count(*) FILTER (WHERE CAST(${suppliers.balance} AS numeric) > 0)`,
    }).from(suppliers);

    return NextResponse.json({
      suppliers: allSuppliers,
      stats: {
        total: Number(suppAgg.total),
        withDue: Number(suppAgg.withDue),
        totalPayable: Number(suppAgg.totalPayable),
        totalPurchases: Number(suppAgg.totalPurchases),
        totalPaid: Number(suppAgg.totalPaid),
      },
      pagination: {
        page, limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
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
