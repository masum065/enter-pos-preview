import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, like, or, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { productSchema } from "@/lib/validations/inventory";

// GET /api/products - List all products with search and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let queryBuilder = db.select().from(products).$dynamic();

    // Apply filters
    const conditions = [];
    
    // Always exclude soft-deleted products
    conditions.push(eq(products.isDeleted, false));
    
    if (search) {
      conditions.push(
        or(
          like(products.modelName, `%${search}%`),
          like(products.brand, `%${search}%`),
          like(products.category, `%${search}%`)
        )
      );
    }
    if (category) {
      conditions.push(eq(products.category, category));
    }

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(or(...conditions));
    }

    const allProducts = await queryBuilder
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    // Efficient count query
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.isDeleted, false));

    return NextResponse.json({
      products: allProducts,
      pagination: {
        page,
        limit,
        total: Number(totalCount[0].count),
        totalPages: Math.ceil(Number(totalCount[0].count) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST /api/products - Create new product
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions (only admin and manager can create)
    if (!["admin", "manager"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = productSchema.parse(body);

    const [newProduct] = await db
      .insert(products)
      .values(validatedData)
      .returning();

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
