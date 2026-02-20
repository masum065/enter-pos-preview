import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, stockItems } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

// GET /api/reports/inventory - Inventory report
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Stock overview
    const stockOverview = await db
      .select({
        totalItems: sql<number>`count(*)`,
        available: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'available')`,
        sold: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'sold')`,
        service: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'service')`,
        returned: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'returned')`,
        damaged: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'damaged')`,
        totalStockValue: sql<string>`COALESCE(SUM(${stockItems.purchasePrice}::numeric), 0)`,
        availableStockValue: sql<string>`COALESCE(SUM(${stockItems.purchasePrice}::numeric) FILTER (WHERE ${stockItems.status} = 'available'), 0)`,
      })
      .from(stockItems);

    // Stock by category
    const stockByCategory = await db
      .select({
        category: products.category,
        totalItems: sql<number>`count(${stockItems.id})`,
        available: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'available')`,
        sold: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'sold')`,
        stockValue: sql<string>`COALESCE(SUM(${stockItems.purchasePrice}::numeric) FILTER (WHERE ${stockItems.status} = 'available'), 0)`,
      })
      .from(stockItems)
      .leftJoin(products, eq(stockItems.productId, products.id))
      .groupBy(products.category)
      .orderBy(sql`count(${stockItems.id}) DESC`);

    // Stock by brand
    const stockByBrand = await db
      .select({
        brand: products.brand,
        totalItems: sql<number>`count(${stockItems.id})`,
        available: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'available')`,
        stockValue: sql<string>`COALESCE(SUM(${stockItems.purchasePrice}::numeric) FILTER (WHERE ${stockItems.status} = 'available'), 0)`,
      })
      .from(stockItems)
      .leftJoin(products, eq(stockItems.productId, products.id))
      .groupBy(products.brand)
      .orderBy(sql`count(${stockItems.id}) DESC`);

    // Products with low stock (< 5 available)
    const lowStockProducts = await db
      .select({
        productId: products.id,
        modelName: products.modelName,
        brand: products.brand,
        category: products.category,
        available: sql<number>`count(*) FILTER (WHERE ${stockItems.status} = 'available')`,
      })
      .from(products)
      .leftJoin(stockItems, eq(products.id, stockItems.productId))
      .where(eq(products.isDeleted, false))
      .groupBy(products.id)
      .having(sql`count(*) FILTER (WHERE ${stockItems.status} = 'available') < 5`)
      .orderBy(sql`count(*) FILTER (WHERE ${stockItems.status} = 'available') ASC`);

    // Stock source breakdown
    const stockBySource = await db
      .select({
        purchaseSource: stockItems.purchaseSource,
        count: sql<number>`count(*)`,
        value: sql<string>`COALESCE(SUM(${stockItems.purchasePrice}::numeric), 0)`,
      })
      .from(stockItems)
      .groupBy(stockItems.purchaseSource);

    return NextResponse.json({
      overview: stockOverview[0],
      byCategory: stockByCategory,
      byBrand: stockByBrand,
      lowStock: lowStockProducts,
      bySource: stockBySource,
    });
  } catch (error) {
    console.error("Error fetching inventory report:", error);
    return NextResponse.json({ error: "Failed to fetch inventory report" }, { status: 500 });
  }
}
