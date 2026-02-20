import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stockItems, products } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { getSession } from "@/lib/session";

// GET /api/stock/low-stock - Get products with low available stock
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all products with their available stock count
    const productsWithStock = await db
      .select({
        product: products,
        availableCount: count(stockItems.id),
      })
      .from(products)
      .leftJoin(
        stockItems,
        eq(products.id, stockItems.productId)
      )
      .where(eq(stockItems.status, "available"))
      .groupBy(products.id);

    // Filter products with low stock (less than 5 available)
    const lowStockProducts = productsWithStock.filter(
      (item) => item.availableCount < 5
    );

    return NextResponse.json({ lowStockProducts });
  } catch (error) {
    console.error("Error fetching low stock:", error);
    return NextResponse.json(
      { error: "Failed to fetch low stock items" },
      { status: 500 }
    );
  }
}
