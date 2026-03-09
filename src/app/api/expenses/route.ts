import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, activityLogs } from "@/db/schema";
import { eq, and, gte, lte, desc, sql, or, ilike } from "drizzle-orm";
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
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const conditions = [];
    if (category) conditions.push(eq(expenses.category, category));
    if (startDate) conditions.push(gte(expenses.date, new Date(startDate)));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(expenses.date, end));
    }
    if (search) {
      conditions.push(
        or(
          ilike(expenses.description, `%${search}%`),
          ilike(expenses.category, `%${search}%`),
          ilike(expenses.expenseNumber, `%${search}%`),
          ilike(expenses.paidBy, `%${search}%`),
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Only 2 queries — fetch data + count. Stats calculated in JS from data.
    const [allExpenses, totalCountResult] = await Promise.all([
      db.select()
        .from(expenses)
        .where(whereClause)
        .orderBy(desc(expenses.date))
        .limit(limit)
        .offset(offset),

      db.select({ count: sql<number>`count(*)` })
        .from(expenses)
        .where(whereClause),
    ]);

    // Calculate stats from all expenses (separate lightweight query)
    let totalAmount = 0, thisMonthAmount = 0, todayAmount = 0;
    try {
      const allAmounts = await db.select({
        amount: expenses.amount,
        date: expenses.date,
      }).from(expenses);

      const todayStr = now.toISOString().split("T")[0];
      for (const e of allAmounts) {
        const amt = Number(e.amount) || 0;
        totalAmount += amt;
        const d = new Date(e.date);
        if (d >= monthStart) thisMonthAmount += amt;
        if (d.toISOString().split("T")[0] === todayStr) todayAmount += amt;
      }
    } catch {
      // Stats are non-critical — continue without them
    }

    // Category breakdown — run separately since it uses GROUP BY
    let breakdown: { category: string; total: string; count: number }[] = [];
    try {
      // Build date conditions for breakdown
      const dateConditions = [];
      if (startDate) dateConditions.push(gte(expenses.date, new Date(startDate)));
      if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        dateConditions.push(lte(expenses.date, endD));
      }
      const breakdownWhere = dateConditions.length > 0 ? and(...dateConditions) : undefined;

      breakdown = await db.select({
        category: expenses.category,
        total: sql<string>`SUM(${expenses.amount})`,
        count: sql<number>`count(*)`,
      })
        .from(expenses)
        .where(breakdownWhere)
        .groupBy(expenses.category)
        .orderBy(sql`SUM(${expenses.amount}) DESC`);
    } catch {
      // Non-critical, continue without breakdown
    }

    // Filtered amount from the count query
    const filteredAmount = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return NextResponse.json({
      expenses: allExpenses,
      categoryBreakdown: breakdown,
      stats: {
        totalAmount,
        thisMonthAmount,
        todayAmount,
        filteredAmount,
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
