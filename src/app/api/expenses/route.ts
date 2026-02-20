import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, activityLogs } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { expenseSchema } from "@/lib/validations/services";

// GET /api/expenses - List expenses with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let queryBuilder = db.select().from(expenses).$dynamic();

    const conditions = [];
    if (category) conditions.push(eq(expenses.category, category));
    if (startDate) conditions.push(gte(expenses.date, new Date(startDate)));
    if (endDate) conditions.push(lte(expenses.date, new Date(endDate)));

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    const allExpenses = await queryBuilder
      .orderBy(desc(expenses.date))
      .limit(limit)
      .offset(offset);

    const totalCount = await db.select({ count: sql<number>`count(*)` }).from(expenses);

    // Category breakdown
    const breakdown = await db
      .select({
        category: expenses.category,
        total: sql<string>`SUM(${expenses.amount})`,
        count: sql<number>`count(*)`,
      })
      .from(expenses)
      .groupBy(expenses.category)
      .orderBy(sql`SUM(${expenses.amount}) DESC`);

    return NextResponse.json({
      expenses: allExpenses,
      categoryBreakdown: breakdown,
      pagination: {
        page, limit,
        total: Number(totalCount[0].count),
        totalPages: Math.ceil(Number(totalCount[0].count) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

// POST /api/expenses - Create expense
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const validatedData = expenseSchema.parse(body);

    // Generate expense number
    const year = new Date().getFullYear();
    const lastExpense = await db
      .select()
      .from(expenses)
      .orderBy(desc(expenses.createdAt))
      .limit(1);

    const counter = lastExpense.length > 0
      ? parseInt(lastExpense[0].expenseNumber.split("-")[2]) + 1
      : 1;
    const expenseNumber = `EXP-${year}-${counter.toString().padStart(4, "0")}`;

    const [newExpense] = await db
      .insert(expenses)
      .values({
        expenseNumber,
        ...validatedData,
        createdBy: session.id,
      })
      .returning();

    await db.insert(activityLogs).values({
      userId: session.id,
      userName: session.name,
      userRole: session.role,
      action: "EXPENSE_CREATE",
      entityId: newExpense.id,
      details: `New expense: ${expenseNumber} - ${validatedData.category}: ৳${validatedData.amount}`,
      afterData: newExpense,
    });

    return NextResponse.json(newExpense, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
