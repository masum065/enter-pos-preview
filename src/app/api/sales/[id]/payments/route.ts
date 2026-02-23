import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sales, payments as paymentsTable, activityLogs, customers, customerTransactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { addPaymentSchema } from "@/lib/validations/sales";

// POST /api/sales/[id]/payments - Add payment to existing sale
export async function POST(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    const params = await paramsPromise;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and manager can add payments
    if (!["admin", "manager"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = addPaymentSchema.parse(body);

    // Use transaction
    const result = await db.transaction(async (tx) => {
      // Get sale
      const [sale] = await tx
        .select()
        .from(sales)
        .where(eq(sales.id, params.id))
        .limit(1);

      if (!sale) {
        throw new Error("Sale not found");
      }

      // Create new payment
      const [newPayment] = await tx
        .insert(paymentsTable)
        .values({
          saleId: params.id,
          method: validatedData.method,
          amount: validatedData.amount,
          reference: validatedData.reference,
        })
        .returning();

      // Calculate new totals (preserve business logic)
      const allPayments = await tx
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.saleId, params.id));

      const newPaidAmount = allPayments.reduce(
        (sum, p) => sum + parseFloat(p.amount), 
        0
      );
      const grandTotal = parseFloat(sale.grandTotal);
      const newDueAmount = Math.max(0, grandTotal - newPaidAmount);

      // Determine new status
      const newStatus = newDueAmount <= 0 
        ? "completed" 
        : newDueAmount < grandTotal 
        ? "partial" 
        : "pending";

      // Update sale
      const [updatedSale] = await tx
        .update(sales)
        .set({
          paidAmount: newPaidAmount.toFixed(2),
          dueAmount: newDueAmount.toFixed(2),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, params.id))
        .returning();

      // Create activity log
      await tx.insert(activityLogs).values({
        userId: session.id,
        userName: session.name,
        userRole: session.role,
        action: "PAYMENT_ADD",
        entityId: sale.id,
        details: `Payment added to ${sale.invoiceNumber}: ৳${validatedData.amount} via ${validatedData.method}`,
        beforeData: {
          paidAmount: sale.paidAmount,
          dueAmount: sale.dueAmount,
          status: sale.status,
        },
        afterData: {
          paidAmount: newPaidAmount.toFixed(2),
          dueAmount: newDueAmount.toFixed(2),
          status: newStatus,
        },
      });

      // Update customer ledger
      const paymentAmount = parseFloat(validatedData.amount);
      const [currentCustomer] = await tx.select().from(customers).where(eq(customers.id, sale.customerId));
      const prevCustomerBalance = parseFloat(currentCustomer?.balance || '0');
      const newCustomerBalance = prevCustomerBalance - paymentAmount;
      const prevCustomerPaid = parseFloat(currentCustomer?.totalPaid || '0');

      await tx.update(customers).set({
        totalPaid: (prevCustomerPaid + paymentAmount).toFixed(2),
        balance: newCustomerBalance.toFixed(2),
        updatedAt: new Date(),
      }).where(eq(customers.id, sale.customerId));

      await tx.insert(customerTransactions).values({
        customerId: sale.customerId,
        type: 'payment',
        amount: validatedData.amount,
        description: `Payment for ${sale.invoiceNumber} — ৳${validatedData.amount} via ${validatedData.method}`,
        reference: sale.invoiceNumber,
        balanceAfter: newCustomerBalance.toFixed(2),
        createdBy: session.id,
      });

      return { sale: updatedSale, payment: newPayment };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error adding payment:", error);
    
    if (error instanceof Error) {
      if (error.name === "ZodError") {
        return NextResponse.json(
          { error: "Validation failed", details: error },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to add payment" },
      { status: 500 }
    );
  }
}
