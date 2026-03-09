import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stockItems, products, suppliers, supplierTransactions, activityLogs } from "@/db/schema";
import { eq, and, or, desc, sql, ilike } from "drizzle-orm";
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
    const source = searchParams.get("source");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limitParam = searchParams.get("limit");
    const limit = limitParam === "all" ? 100000 : parseInt(limitParam || "20");
    const offset = (page - 1) * limit;

    // Build conditions — ALL must be AND
    const conditions = [];

    if (productId) {
      conditions.push(eq(stockItems.productId, productId));
    }
    if (status) {
      conditions.push(eq(stockItems.status, status as any));
    }
    if (source) {
      conditions.push(eq(stockItems.purchaseSource, source));
    }
    if (search) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(stockItems.serialNumber, searchTerm),
          ilike(stockItems.imei, searchTerm),
          ilike(stockItems.supplierName, searchTerm)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Run queries sequentially to use exactly 1 DB connection
    // This prevents connection pool exhaustion
    const items = await db
      .select({ stockItem: stockItems, product: products })
      .from(stockItems)
      .leftJoin(products, eq(stockItems.productId, products.id))
      .where(whereClause)
      .orderBy(desc(stockItems.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db.select({ count: sql<number>`count(*)` })
      .from(stockItems)
      .where(whereClause);

    // Single query replacing multiple stats queries
    const statsQuery = await db.select({
      total: sql<number>`count(*)`,
      available: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'Available')`,
      sold: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'Sold')`,
      stockValue: sql<string>`COALESCE(SUM(${stockItems.purchasePrice}) FILTER (WHERE ${stockItems.status} = 'Available'), 0)`,
    }).from(stockItems);

    const allStats = statsQuery[0] || { total: 0, available: 0, sold: 0, stockValue: 0 };

    // Status group counts for filter tabs
    const statusCountsRaw = await db.select({
      status: stockItems.status,
      count: sql<number>`count(*)`,
    }).from(stockItems).groupBy(stockItems.status);

    const statusCountMap: Record<string, number> = { All: Number(allStats.total) };
    statusCountsRaw.forEach(s => { statusCountMap[s.status] = Number(s.count); });

    const response = NextResponse.json({
      stockItems: items,
      stats: {
        total: Number(allStats.total),
        available: Number(allStats.available),
        sold: Number(allStats.sold),
        stockValue: Number(allStats.stockValue),
      },
      statusCounts: statusCountMap,
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
