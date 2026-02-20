import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { expenseSchema } from "@/lib/validations/services";

// GET /api/expenses/[id]
export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    const params = await paramsPromise;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, params.id))
      .limit(1);

    if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    return NextResponse.json(expense);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch expense" }, { status: 500 });
  }
}

// PUT /api/expenses/[id]
export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    const params = await paramsPromise;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["admin", "manager"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = expenseSchema.parse(body);

    const [existing] = await db.select().from(expenses).where(eq(expenses.id, params.id)).limit(1);

    const [updated] = await db
      .update(expenses)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(expenses.id, params.id))
      .returning();

    if (!updated) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    await db.insert(activityLogs).values({
      userId: session.id,
      userName: session.name,
      userRole: session.role,
      action: "EXPENSE_UPDATE",
      entityId: params.id,
      details: `Updated expense: ${existing?.expenseNumber}`,
      beforeData: existing,
      afterData: updated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

// DELETE /api/expenses/[id]
export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    const params = await paramsPromise;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [deleted] = await db.delete(expenses).where(eq(expenses.id, params.id)).returning();
    if (!deleted) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
