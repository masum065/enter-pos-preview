import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  purchaseInvoices, 
  stockItems, 
  suppliers, 
  supplierTransactions, 
  activityLogs 
} from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { purchaseInvoiceSchema } from "@/lib/validations/purchases";

// GET /api/purchases - List purchase invoices with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sellerId = searchParams.get("sellerId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let queryBuilder = db.select().from(purchaseInvoices).$dynamic();

    const conditions = [];
    if (startDate) conditions.push(gte(purchaseInvoices.purchaseDate, new Date(startDate)));
    if (endDate) conditions.push(lte(purchaseInvoices.purchaseDate, new Date(endDate)));
    if (sellerId) conditions.push(eq(purchaseInvoices.sellerId, sellerId));

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    const allPurchases = await queryBuilder
      .orderBy(desc(purchaseInvoices.purchaseDate))
      .limit(limit)
      .offset(offset);

    const totalCount = await db.select({ count: sql<number>`count(*)` }).from(purchaseInvoices);

    // Aggregate stats (from ALL data, not paginated)
    const [purchaseAgg] = await db.select({
      totalAmount: sql<string>`COALESCE(SUM(${purchaseInvoices.purchasePrice}), 0)`,
      totalPaid: sql<string>`COALESCE(SUM(${purchaseInvoices.paidAmount}), 0)`,
    }).from(purchaseInvoices);

    return NextResponse.json({
      purchases: allPurchases,
      stats: {
        totalPurchases: Number(totalCount[0].count),
        totalAmount: Number(purchaseAgg.totalAmount),
        totalPaid: Number(purchaseAgg.totalPaid),
        totalDue: Number(purchaseAgg.totalAmount) - Number(purchaseAgg.totalPaid),
      },
      pagination: {
        page,
        limit,
        total: Number(totalCount[0].count),
        totalPages: Math.ceil(Number(totalCount[0].count) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
  }
}

// POST /api/purchases - Create purchase invoice with stock item (transaction)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["admin", "manager"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = purchaseInvoiceSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      // 1. Generate invoice number
      const year = new Date().getFullYear();
      const lastPurchase = await tx
        .select()
        .from(purchaseInvoices)
        .orderBy(desc(purchaseInvoices.createdAt))
        .limit(1);

      const counter = lastPurchase.length > 0
        ? parseInt(lastPurchase[0].invoiceNumber.split("-")[2]) + 1
        : 1;
      const invoiceNumber = `PURCH-${year}-${counter.toString().padStart(4, "0")}`;

      // 2. Create stock item
      const [newStockItem] = await tx
        .insert(stockItems)
        .values({
          serialNumber: validatedData.serialNumber,
          imei: validatedData.imei,
          productId: validatedData.productId,
          purchasePrice: validatedData.purchasePrice,
          purchaseSource: "local",
          sellerId: validatedData.sellerId,
          purchaseDate: validatedData.purchaseDate,
          status: "Available",
          createdBy: session.id,
        })
        .returning();

      // 3. Create purchase invoice
      const [newPurchase] = await tx
        .insert(purchaseInvoices)
        .values({
          invoiceNumber,
          purchaseDate: validatedData.purchaseDate,
          sellerId: validatedData.sellerId,
          sellerName: validatedData.sellerName,
          sellerPhone: validatedData.sellerPhone,
          productId: validatedData.productId,
          productName: validatedData.productName,
          serialNumber: validatedData.serialNumber,
          imei: validatedData.imei,
          purchasePrice: validatedData.purchasePrice,
          paymentMethod: validatedData.paymentMethod,
          paidAmount: validatedData.paidAmount,
          notes: validatedData.notes,
          stockItemId: newStockItem.id,
          createdBy: session.id,
        })
        .returning();

      // 4. Activity log
      await tx.insert(activityLogs).values({
        userId: session.id,
        userName: session.name,
        userRole: session.role,
        action: "PURCHASE_CREATE",
        entityId: newPurchase.id,
        details: `Local purchase: ${validatedData.productName} (${validatedData.serialNumber}) from ${validatedData.sellerName} for ৳${validatedData.purchasePrice}`,
        afterData: {
          invoiceNumber,
          productName: validatedData.productName,
          serialNumber: validatedData.serialNumber,
          purchasePrice: validatedData.purchasePrice,
        },
      });

      return { purchase: newPurchase, stockItem: newStockItem };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating purchase:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create purchase" }, { status: 500 });
  }
}
