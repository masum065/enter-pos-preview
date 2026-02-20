import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stockItems, products } from "@/db/schema";
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

    return NextResponse.json({
      stockItems: items,
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

    const [newStockItem] = await db
      .insert(stockItems)
      .values({ ...validatedData, createdBy: session.id })
      .returning();

    return NextResponse.json(newStockItem, { status: 201 });
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
