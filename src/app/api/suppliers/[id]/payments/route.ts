import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { suppliers, supplierTransactions, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { supplierPaymentSchema } from "@/lib/validations/purchases";

// POST /api/suppliers/[id]/payments - Record payment to supplier
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
    const validatedData = supplierPaymentSchema.parse(body);

    // Use transaction (preserve business logic: payment reduces balance)
    const result = await db.transaction(async (tx) => {
      const [supplier] = await tx
        .select()
        .from(suppliers)
        .where(eq(suppliers.id, params.id))
        .limit(1);

      if (!supplier) throw new Error("Supplier not found");

      const paymentAmount = parseFloat(validatedData.amount);
      const currentBalance = parseFloat(supplier.balance);
      const newBalance = currentBalance - paymentAmount; // Payment reduces what we owe
      const currentTotalPaid = parseFloat(supplier.totalPaid);

      // Create transaction record
      const [transaction] = await tx
        .insert(supplierTransactions)
        .values({
          supplierId: params.id,
          type: "payment",
          amount: (-paymentAmount).toFixed(2), // Negative = reduces balance
          description: validatedData.description || "Payment to supplier",
          reference: validatedData.reference,
          balanceAfter: newBalance.toFixed(2),
          createdBy: session.id,
        })
        .returning();

      // Update supplier balance
      const [updatedSupplier] = await tx
        .update(suppliers)
        .set({
          balance: newBalance.toFixed(2),
          totalPaid: (currentTotalPaid + paymentAmount).toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(suppliers.id, params.id))
        .returning();

      // Activity log
      await tx.insert(activityLogs).values({
        userId: session.id,
        userName: session.name,
        userRole: session.role,
        action: "SUPPLIER_PAYMENT",
        entityId: params.id,
        details: `Payment to ${supplier.companyName}: ৳${paymentAmount}`,
        beforeData: { balance: supplier.balance, totalPaid: supplier.totalPaid },
        afterData: { balance: newBalance.toFixed(2), totalPaid: (currentTotalPaid + paymentAmount).toFixed(2) },
      });

      return { supplier: updatedSupplier, transaction };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error recording payment:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
