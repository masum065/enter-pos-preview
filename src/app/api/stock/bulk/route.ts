import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stockItems, suppliers, supplierTransactions, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { stockItemSchema } from "@/lib/validations/inventory";
import { z } from "zod";

const bulkSchema = z.object({
  items: z.array(stockItemSchema).min(1, "At least one item required").max(100, "Max 100 items per batch"),
});

// POST /api/stock/bulk - Add multiple stock items
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["admin", "manager"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { items } = bulkSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      const addedItems = [];
      const errors = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          // Insert stock item
          const [newStockItem] = await tx
            .insert(stockItems)
            .values({ ...item, createdBy: session.id })
            .returning();

          addedItems.push(newStockItem);

          // If purchased from supplier, update supplier financials
          if (item.purchaseSource === "supplier" && item.supplierId) {
            const [supplier] = await tx
              .select()
              .from(suppliers)
              .where(eq(suppliers.id, item.supplierId))
              .limit(1);

            if (supplier) {
              const purchaseAmount = parseFloat(String(item.purchasePrice));
              const currentBalance = parseFloat(supplier.balance);
              const currentTotalPurchases = parseFloat(supplier.totalPurchases);
              const newBalance = currentBalance + purchaseAmount;

              await tx.insert(supplierTransactions).values({
                supplierId: item.supplierId,
                type: "purchase",
                amount: purchaseAmount.toFixed(2),
                description: `Stock purchase (bulk): ${item.serialNumber}`,
                reference: newStockItem.id,
                balanceAfter: newBalance.toFixed(2),
                createdBy: session.id,
              });

              await tx
                .update(suppliers)
                .set({
                  balance: newBalance.toFixed(2),
                  totalPurchases: (currentTotalPurchases + purchaseAmount).toFixed(2),
                  updatedAt: new Date(),
                })
                .where(eq(suppliers.id, item.supplierId));
            }
          }
        } catch (error) {
          errors.push({
            index: i,
            serialNumber: item.serialNumber,
            error: (error as Error).message,
          });
        }
      }

      // Activity log for bulk add
      if (addedItems.length > 0) {
        await tx.insert(activityLogs).values({
          userId: session.id,
          userName: session.name,
          userRole: session.role,
          action: "STOCK_BULK_ADD",
          entityId: addedItems[0].id,
          details: `Bulk added ${addedItems.length} stock items (${items[0].purchaseSource})`,
          afterData: {
            count: addedItems.length,
            serialNumbers: addedItems.map(i => i.serialNumber),
            purchaseSource: items[0].purchaseSource,
            supplierName: items[0].supplierName,
          },
        });
      }

      return { added: addedItems.length, errors };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error bulk adding stock:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to bulk add stock" },
      { status: 500 }
    );
  }
}
