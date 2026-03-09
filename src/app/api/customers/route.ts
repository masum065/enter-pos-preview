import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, activityLogs } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { customerSchema } from "@/lib/validations/purchases";

// GET /api/customers - List customers with search
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

    let queryBuilder = db.select().from(customers).$dynamic();
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(customers).$dynamic();

    if (search) {
      const searchTerm = `%${search.trim()}%`;
      const whereClause = sql`(${customers.name} ILIKE ${searchTerm} OR ${customers.phone} ILIKE ${searchTerm} OR ${customers.nid} ILIKE ${searchTerm} OR ${customers.email} ILIKE ${searchTerm})`;
      queryBuilder = queryBuilder.where(whereClause);
      countQuery = countQuery.where(whereClause);
    }

    // Run data + count sequentially to prevent connection pool exhaustion
    const allCustomers = await queryBuilder.orderBy(desc(customers.createdAt)).limit(limit).offset(offset);
    const totalCount = await countQuery;

    const response = NextResponse.json({
      customers: allCustomers,
      pagination: {
        page,
        limit,
        total: Number(totalCount[0].count),
        totalPages: Math.ceil(Number(totalCount[0].count) / limit),
      },
    });
    response.headers.set("Cache-Control", "private, max-age=10, stale-while-revalidate=30");
    return response;
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

// POST /api/customers - Create customer
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = customerSchema.parse(body);

    const [newCustomer] = await db
      .insert(customers)
      .values(validatedData)
      .returning();

    await db.insert(activityLogs).values({
      userId: session.id,
      userName: session.name,
      userRole: session.role,
      action: "CUSTOMER_CREATE",
      entityId: newCustomer.id,
      details: `Added new customer: ${newCustomer.name}`,
      afterData: newCustomer,
    });

    return NextResponse.json(newCustomer, { status: 201 });
  } catch (error) {
    console.error("Error creating customer:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
