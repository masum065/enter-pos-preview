import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  purchaseInvoices, 
  stockItems, 
  suppliers, 
  supplierTransactions, 
  activityLogs,
  customers,
  customerTransactions,
  users
} from "@/db/schema";
import { eq, and, gte, lte, desc, sql, or, ilike } from "drizzle-orm";
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
    const search = searchParams.get("search");
    const paymentStatus = searchParams.get("paymentStatus"); // "paid" | "partial" | "unpaid"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const conditions = [];
    if (startDate) conditions.push(gte(purchaseInvoices.purchaseDate, new Date(startDate)));
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(purchaseInvoices.purchaseDate, end));
    }
    if (sellerId) conditions.push(eq(purchaseInvoices.sellerId, sellerId));
    if (search) {
      conditions.push(
        or(
          ilike(purchaseInvoices.invoiceNumber, `%${search}%`),
          ilike(purchaseInvoices.serialNumber, `%${search}%`),
          ilike(purchaseInvoices.sellerName, `%${search}%`),
          ilike(purchaseInvoices.sellerPhone, `%${search}%`),
          ilike(purchaseInvoices.productName, `%${search}%`),
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Execute queries sequentially — join users to get salesman name
    const allRows = await db.select({
        purchase: purchaseInvoices,
        createdByName: users.name,
      })
      .from(purchaseInvoices)
      .leftJoin(users, eq(purchaseInvoices.createdBy, users.id))
      .where(whereClause)
      .orderBy(desc(purchaseInvoices.purchaseDate))
      .limit(limit)
      .offset(offset);
        
    const totalCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(purchaseInvoices)
      .where(whereClause);
        
    const purchaseAggResult = await db.select({
      totalAmount: sql<string>`COALESCE(SUM(${purchaseInvoices.purchasePrice}), 0)`,
      totalPaid: sql<string>`COALESCE(SUM(${purchaseInvoices.paidAmount}), 0)`,
      totalCount: sql<number>`count(*)`,
    }).from(purchaseInvoices).where(whereClause);

    // Flatten join result
    let allPurchases = allRows.map(row => ({
      ...row.purchase,
      createdByName: row.createdByName || "Admin",
    }));

    // Apply paymentStatus filter in-memory (derived field)
    let filteredPurchases = allPurchases;
    if (paymentStatus) {
      filteredPurchases = allPurchases.filter((p) => {
        const price = parseFloat(p.purchasePrice);
        const paid = parseFloat(p.paidAmount);
        const balance = price - paid;
        if (paymentStatus === "paid") return balance <= 0;
        if (paymentStatus === "partial") return balance > 0 && paid > 0;
        if (paymentStatus === "unpaid") return paid <= 0;
        return true;
      });
    }

    const purchaseAgg = purchaseAggResult[0];

    return NextResponse.json({
      purchases: filteredPurchases,
      stats: {
        totalPurchases: Number(purchaseAgg.totalCount),
        totalAmount: Number(purchaseAgg.totalAmount),
        totalPaid: Number(purchaseAgg.totalPaid),
        totalDue: Number(purchaseAgg.totalAmount) - Number(purchaseAgg.totalPaid),
      },
      pagination: {
        page,
        limit,
        total: Number(totalCountResult[0].count),
        totalPages: Math.ceil(Number(totalCountResult[0].count) / limit),
      }
    }, {
      headers: {
        "Cache-Control": "private, max-age=10",
      }
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

      // 5. Update customer (seller) ledger
      const purchasePrice = parseFloat(validatedData.purchasePrice);
      const paidAmount = parseFloat(validatedData.paidAmount);
      const dueToSeller = purchasePrice - paidAmount;

      const [currentCustomer] = await tx.select().from(customers).where(eq(customers.id, validatedData.sellerId));
      if (currentCustomer) {
        const prevBalance = parseFloat(currentCustomer.balance || '0');
        // Negative balance = shop owes the customer
        const newBalance = prevBalance - dueToSeller;
        const prevTotalPaid = parseFloat(currentCustomer.totalPaid || '0');

        await tx.update(customers).set({
          totalPaid: (prevTotalPaid + paidAmount).toFixed(2),
          balance: newBalance.toFixed(2),
          updatedAt: new Date(),
        }).where(eq(customers.id, validatedData.sellerId));

        await tx.insert(customerTransactions).values({
          customerId: validatedData.sellerId,
          type: 'purchase',
          amount: purchasePrice.toFixed(2),
          description: `Purchase ${invoiceNumber} — ${validatedData.productName} (${validatedData.serialNumber}). Paid: ৳${paidAmount.toFixed(2)}, Due: ৳${dueToSeller.toFixed(2)}`,
          reference: invoiceNumber,
          balanceAfter: newBalance.toFixed(2),
          createdBy: session.id,
        });
      }

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
