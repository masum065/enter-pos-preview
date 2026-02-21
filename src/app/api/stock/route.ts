import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stockItems, products, suppliers, supplierTransactions, activityLogs } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { stockItemSchema } from "@/lib/validations/inventory";

// GET /api/stock - List stock items with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let queryBuilder = db
      .select({
        stockItem: stockItems,
        product: products,
      })
      .from(stockItems)
      .leftJoin(products, eq(stockItems.productId, products.id))
      .$dynamic();

    // Apply filters
    if (productId) {
      queryBuilder = queryBuilder.where(eq(stockItems.productId, productId));
    }
    if (status) {
      queryBuilder = queryBuilder.where(eq(stockItems.status, status as any));
    }

    const items = await queryBuilder
      .orderBy(desc(stockItems.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count (efficient)
    const totalCount = await db.select({ count: sql<number>`count(*)` }).from(stockItems);

    // Aggregate stats (from ALL data, not paginated)
    const [availableStats] = await db.select({
      count: sql<number>`count(*)`,
      value: sql<string>`COALESCE(SUM(${stockItems.purchasePrice}), 0)`,
    }).from(stockItems).where(eq(stockItems.status, 'Available'));

    const [soldStats] = await db.select({
      count: sql<number>`count(*)`,
    }).from(stockItems).where(eq(stockItems.status, 'Sold'));

    return NextResponse.json({
      stockItems: items,
      stats: {
        total: Number(totalCount[0].count),
        available: Number(availableStats.count),
        sold: Number(soldStats.count),
        stockValue: Number(availableStats.value),
      },
      pagination: {
        page,
        limit,
        total: Number(totalCount[0].count),
        totalPages: Math.ceil(Number(totalCount[0].count) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching stock:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock items" },
      { status: 500 }
    );
  }
}

// POST /api/stock - Add new stock items
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    if (!["admin", "manager"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = stockItemSchema.parse(body);

    // Use transaction for atomicity (especially when supplier is involved)
    const result = await db.transaction(async (tx) => {
      // 1. Insert stock item
      const [newStockItem] = await tx
        .insert(stockItems)
        .values({ ...validatedData, createdBy: session.id })
        .returning();

      // 2. If purchased from supplier, update supplier financials
      if (validatedData.purchaseSource === "supplier" && validatedData.supplierId) {
        const [supplier] = await tx
          .select()
          .from(suppliers)
          .where(eq(suppliers.id, validatedData.supplierId))
          .limit(1);

        if (supplier) {
          const purchaseAmount = parseFloat(String(validatedData.purchasePrice));
          const currentBalance = parseFloat(supplier.balance);
          const currentTotalPurchases = parseFloat(supplier.totalPurchases);
          const newBalance = currentBalance + purchaseAmount; // Purchase increases what we owe

          // Create supplier transaction record (purchase)
          await tx.insert(supplierTransactions).values({
            supplierId: validatedData.supplierId,
            type: "purchase",
            amount: purchaseAmount.toFixed(2),
            description: `Stock purchase: ${validatedData.serialNumber}`,
            reference: newStockItem.id,
            balanceAfter: newBalance.toFixed(2),
            createdBy: session.id,
          });

          // Update supplier balance and totalPurchases
          await tx
            .update(suppliers)
            .set({
              balance: newBalance.toFixed(2),
              totalPurchases: (currentTotalPurchases + purchaseAmount).toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(suppliers.id, validatedData.supplierId));
        }
      }

      // 3. Activity log
      await tx.insert(activityLogs).values({
        userId: session.id,
        userName: session.name,
        userRole: session.role,
        action: "STOCK_ADD",
        entityId: newStockItem.id,
        details: `Added stock: ${validatedData.serialNumber} (${validatedData.purchaseSource})${validatedData.supplierName ? ` from ${validatedData.supplierName}` : ""}`,
        afterData: {
          serialNumber: validatedData.serialNumber,
          purchasePrice: validatedData.purchasePrice,
          purchaseSource: validatedData.purchaseSource,
          supplierName: validatedData.supplierName,
        },
      });

      return newStockItem;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error adding stock:", error);
    
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to add stock" },
      { status: 500 }
    );
  }
}
