import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { suppliers, supplierTransactions, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

// POST /api/suppliers/[id]/adjustments
// type: "due"     → adds to balance (we owe supplier)
// type: "advance" → subtracts from balance (supplier owes us)
export async function POST(
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
    const { type, amount, description, reference } = body;

    if (!["due", "advance"].includes(type)) {
      return NextResponse.json({ error: "type must be 'due' or 'advance'" }, { status: 400 });
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [supplier] = await tx
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, params.id))
        .limit(1);

      if (!supplier) throw new Error("Supplier not found");

      const adjAmount = parseFloat(amount);
      const currentBalance = parseFloat(supplier.balance);

      // due → increases balance (we owe more)
      // advance → decreases balance (supplier gives us credit)
      const delta = type === "due" ? adjAmount : -adjAmount;
      const newBalance = currentBalance + delta;

      // Transaction record: positive = debit (we owe), negative = credit
      const [transaction] = await tx
        .insert(supplierTransactions)
        .values({
          supplierId: params.id,
          type: "adjustment",
          amount: delta.toFixed(2),
          description: description || (type === "due"
            ? `Opening due balance: ৳${adjAmount}`
            : `Opening advance balance: ৳${adjAmount}`),
          reference: reference || undefined,
          balanceAfter: newBalance.toFixed(2),
          createdBy: session.id,
        })
        .returning();

      const [updatedSupplier] = await tx
        .update(suppliers)
        .set({ balance: newBalance.toFixed(2), updatedAt: new Date() })
        .where(eq(suppliers.id, params.id))
        .returning();

      await tx.insert(activityLogs).values({
        userId: session.id,
        userName: session.name,
        userRole: session.role,
        action: "SUPPLIER_ADJUSTMENT",
        entityId: params.id,
        details: `Balance adjustment (${type}) for ${supplier.companyName}: ৳${adjAmount}`,
        beforeData: { balance: supplier.balance },
        afterData: { balance: newBalance.toFixed(2) },
      });

      return { supplier: updatedSupplier, transaction };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error recording adjustment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record adjustment" },
      { status: 500 }
    );
  }
}
