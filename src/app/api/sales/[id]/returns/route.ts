import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  sales, 
  saleItems, 
  saleReturns, 
  saleReturnItems, 
  stockItems,
  activityLogs,
  customers,
  customerTransactions
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { processReturnSchema } from "@/lib/validations/sales";

// POST /api/sales/[id]/returns - Process return/refund
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

    // Only admin and manager can process returns
    if (!["admin", "manager"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = processReturnSchema.parse(body);

    // Use transaction for atomicity
    const result = await db.transaction(async (tx) => {
      // Get sale with items
      const [sale] = await tx
        .select()
        .from(sales)
        .where(eq(sales.id, params.id))
        .limit(1);

      if (!sale) {
        throw new Error("Sale not found");
      }

      const saleItemIds = validatedData.items.map(i => i.saleItemId);
      const itemsToReturn = await tx
        .select()
        .from(saleItems)
        .where(inArray(saleItems.id, saleItemIds));

      if (itemsToReturn.length !== validatedData.items.length) {
        throw new Error("Some sale items not found");
      }

      // Check if items are already returned
      for (const item of itemsToReturn) {
        if (item.isReturned) {
          throw new Error(`Item ${item.serialNumber} is already returned`);
        }
      }

      // Calculate return amount (preserve business logic)
      const totalReturnAmount = itemsToReturn.reduce(
        (sum, item) => sum + parseFloat(item.amount), 
        0
      );

      // Create return record
      const [newReturn] = await tx
        .insert(saleReturns)
        .values({
          saleId: params.id,
          totalReturnAmount: totalReturnAmount.toFixed(2),
          refundMethod: validatedData.refundMethod,
          refundAmount: validatedData.refundAmount,
          reason: validatedData.reason,
          processedBy: session.id,
        })
        .returning();

      // Create return items
      await tx.insert(saleReturnItems).values(
        itemsToReturn.map((item, index) => ({
          returnId: newReturn.id,
          saleItemId: item.id,
          serialNumber: item.serialNumber,
          productName: item.productName,
          returnAmount: item.amount,
          reason: validatedData.items[index].reason,
        }))
      );

      // Mark items as returned
      await tx
        .update(saleItems)
        .set({
          isReturned: true,
          returnedAt: new Date(),
        })
        .where(inArray(saleItems.id, saleItemIds));

      // Update stock items status (returned)
      const stockItemIds = itemsToReturn.map(i => i.stockItemId);
      await tx
        .update(stockItems)
        .set({
          status: "Returned",
          saleId: null,
          soldAt: null,
        })
        .where(inArray(stockItems.id, stockItemIds));

      // Get all sale items to determine new status
      const allSaleItems = await tx
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, params.id));

      const returnedCount = allSaleItems.filter(i => i.isReturned).length;
      const allReturned = returnedCount === allSaleItems.length;

      // Determine new status (preserve business logic)
      let newStatus: string = sale.status;
      if (allReturned) {
        newStatus = "returned";
      } else if (returnedCount > 0) {
        newStatus = "partially_returned";
      }

      // Calculate new totals for the sale
      const returnedProfit = itemsToReturn.reduce(
        (sum, item) => sum + parseFloat(item.profit), 
        0
      );
      const newTotalProfit = parseFloat(sale.totalProfit) - returnedProfit;
      const newTotalReturned = parseFloat(sale.totalReturned || "0") + totalReturnAmount;
      
      const newSubtotal = parseFloat(sale.subtotal) - totalReturnAmount;
      const newGrandTotal = parseFloat(sale.grandTotal) - totalReturnAmount;
      const newPaidAmount = parseFloat(sale.paidAmount) - parseFloat(validatedData.refundAmount);
      // Ensure due is not negative due to floating point math
      const newDueAmount = Math.max(0, newGrandTotal - newPaidAmount);

      // Update sale
      const [updatedSale] = await tx
        .update(sales)
        .set({
          status: newStatus,
          totalReturned: newTotalReturned.toFixed(2),
          totalProfit: newTotalProfit.toFixed(2),
          subtotal: newSubtotal.toFixed(2),
          grandTotal: newGrandTotal.toFixed(2),
          paidAmount: newPaidAmount.toFixed(2),
          dueAmount: newDueAmount.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(sales.id, params.id))
        .returning();

      // Create activity log
      await tx.insert(activityLogs).values({
        userId: session.id,
        userName: session.name,
        userRole: session.role,
        action: "REFUND",
        entityId: sale.id,
        details: `Refund processed for ${sale.invoiceNumber}. Refund amount: ৳${validatedData.refundAmount}`,
        beforeData: {
          status: sale.status,
          totalReturned: sale.totalReturned || "0",
          grandTotal: sale.grandTotal,
        },
        afterData: {
          status: newStatus,
          totalReturned: newTotalReturned.toFixed(2),
          grandTotal: newGrandTotal.toFixed(2),
        },
      });

      // Update customer ledger
      const refundAmount = parseFloat(validatedData.refundAmount);
      const [currentCustomer] = await tx.select().from(customers).where(eq(customers.id, sale.customerId));
      const prevCustomerBalance = parseFloat(currentCustomer?.balance || '0');
      const newCustomerBalance = prevCustomerBalance - totalReturnAmount;
      const prevTotalPurchases = parseFloat(currentCustomer?.totalPurchases || '0');
      const prevTotalPaid = parseFloat(currentCustomer?.totalPaid || '0');

      await tx.update(customers).set({
        totalPurchases: (prevTotalPurchases - totalReturnAmount).toFixed(2),
        totalPaid: (prevTotalPaid - refundAmount).toFixed(2),
        balance: newCustomerBalance.toFixed(2),
        updatedAt: new Date(),
      }).where(eq(customers.id, sale.customerId));

      await tx.insert(customerTransactions).values({
        customerId: sale.customerId,
        type: 'return',
        amount: totalReturnAmount.toFixed(2),
        description: `Return for ${sale.invoiceNumber} — ৳${totalReturnAmount.toFixed(2)} returned, ৳${refundAmount} refunded`,
        reference: sale.invoiceNumber,
        balanceAfter: newCustomerBalance.toFixed(2),
        createdBy: session.id,
      });

      return { sale: updatedSale, return: newReturn };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error processing return:", error);
    
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
      { error: "Failed to process return" },
      { status: 500 }
    );
  }
}
