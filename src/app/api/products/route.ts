import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, and, or, desc, sql, ilike } from "drizzle-orm";
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
    const sortBy = searchParams.get("sortBy") || "latest";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const conditions = [];
    conditions.push(eq(products.isDeleted, false));

    if (category) {
      conditions.push(eq(products.category, category));
    }
    if (search) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(products.modelName, searchTerm),
          ilike(products.brand, searchTerm),
          ilike(products.category, searchTerm)
        )
      );
    }

    const whereClause = and(...conditions);

    // Server-side sorting
    const isAsc = sortOrder === "asc";
    let orderByClause;
    switch (sortBy) {
      case "name":
        orderByClause = isAsc ? products.modelName : desc(products.modelName);
        break;
      case "price":
        orderByClause = isAsc ? products.defaultSalePrice : desc(products.defaultSalePrice);
        break;
      case "latest":
      default:
        orderByClause = isAsc ? products.createdAt : desc(products.createdAt);
        break;
    }

    // Run queries sequentially to prevent connection pool exhaustion
    const allProducts = await db.select()
      .from(products)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
      
    const totalCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause);
      
    const categoryCounts = await db.select({
        category: products.category,
        count: sql<number>`count(*)`,
      })
      .from(products)
      .where(eq(products.isDeleted, false))
      .groupBy(products.category);

    const totalNonDeleted = categoryCounts.reduce((sum, c) => sum + Number(c.count), 0);

    const response = NextResponse.json({
      products: allProducts,
      categoryCounts: Object.fromEntries(
        [['All', totalNonDeleted], ...categoryCounts.map(c => [c.category, Number(c.count)])]
      ),
      pagination: {
        page,
        limit,
        total: Number(totalCountResult[0].count),
        totalPages: Math.ceil(Number(totalCountResult[0].count) / limit),
      },
    });
    // Products rarely change — 60s cache is safe
    response.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=120");
    return response;
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
      .values({ ...validatedData, createdBy: session.id })
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
