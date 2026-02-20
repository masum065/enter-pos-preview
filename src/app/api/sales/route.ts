import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sales, saleItems, payments, stockItems, products, activityLogs } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { createSaleSchema } from "@/lib/validations/sales";

// GET /api/sales - List sales with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let queryBuilder = db
      .select()
      .from(sales)
      .$dynamic();

    // Apply filters
    const conditions = [];
    
    if (startDate) {
      conditions.push(gte(sales.invoiceDate, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(sales.invoiceDate, new Date(endDate)));
    }
    if (customerId) {
      conditions.push(eq(sales.customerId, customerId));
    }
    if (status) {
      conditions.push(eq(sales.status, status));
    }

    // Employee can only see their own sales
    if (session.role === "employee") {
      conditions.push(eq(sales.createdBy, session.id));
    }

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    const allSales = await queryBuilder
      .orderBy(desc(sales.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalCount = await db.select({ count: sql<number>`count(*)` }).from(sales);

    return NextResponse.json({
      sales: allSales,
      pagination: {
        page,
        limit,
        total: Number(totalCount[0].count),
        totalPages: Math.ceil(Number(totalCount[0].count) / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

// POST /api/sales - Create new sale (with transaction)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createSaleSchema.parse(body);

    // Use database transaction for atomicity
    const result = await db.transaction(async (tx) => {
      // 1. Get stock items and products for validation and calculations
      const stockItemIds = validatedData.items.map(item => item.stockItemId);
      const stockItemsData = await tx
        .select({
          stockItem: stockItems,
          product: products,
        })
        .from(stockItems)
        .leftJoin(products, eq(stockItems.productId, products.id))
        .where(sql`${stockItems.id} = ANY(${stockItemIds})`);

      // Validate all stock items exist and are available
      if (stockItemsData.length !== validatedData.items.length) {
        throw new Error("Some stock items not found");
      }

      for (const { stockItem } of stockItemsData) {
        if (stockItem.status !== "available") {
          throw new Error(`Stock item ${stockItem.serialNumber} is not available`);
        }
      }

      // 2. Calculate sale totals (preserve exact business logic)
      let subtotal = 0;
      const itemsWithCalculations = validatedData.items.map((item) => {
        const stockData = stockItemsData.find(s => s.stockItem.id === item.stockItemId);
        if (!stockData) throw new Error("Stock item not found");

        const salePrice = parseFloat(item.salePrice);
        const discount = parseFloat(item.discount);
        const quantity = item.quantity;
        const purchasePrice = parseFloat(stockData.stockItem.purchasePrice);

        // Business logic calculations
        const amount = (salePrice * quantity) - discount;
        const profit = amount - (purchasePrice * quantity);

        subtotal += amount;

        return {
          stockItemId: item.stockItemId,
          productId: stockData.stockItem.productId,
          serialNumber: stockData.stockItem.serialNumber,
          productName: stockData.product?.modelName || "Unknown",
          warranty: stockData.product?.warranty,
          quantity,
          salePrice: item.salePrice,
          purchasePrice: stockData.stockItem.purchasePrice,
          discount: item.discount,
          amount: amount.toFixed(2),
          profit: profit.toFixed(2),
        };
      });

      const discountAmount = parseFloat(validatedData.discountAmount);
      const taxPercent = parseFloat(validatedData.taxPercent);
      const taxAmount = (subtotal * taxPercent) / 100;
      const grandTotal = subtotal + taxAmount - discountAmount;

      const paidAmount = validatedData.payments.reduce(
        (sum, p) => sum + parseFloat(p.amount), 
        0
      );
      const dueAmount = Math.max(0, grandTotal - paidAmount);

      // Determine status
      const status = paidAmount >= grandTotal 
        ? "completed" 
        : paidAmount > 0 
        ? "partial" 
        : "pending";

      const totalProfit = itemsWithCalculations.reduce(
        (sum, item) => sum + parseFloat(item.profit), 
        0
      );

      // 3. Generate invoice number
      const year = new Date().getFullYear();
      const lastSale = await tx
        .select()
        .from(sales)
        .orderBy(desc(sales.createdAt))
        .limit(1);
      
      const counter = lastSale.length > 0 
        ? parseInt(lastSale[0].invoiceNumber.split('-')[2]) + 1 
        : 1;
      const invoiceNumber = `INV-${year}-${counter.toString().padStart(4, "0")}`;

      // 4. Create sale record
      const [newSale] = await tx
        .insert(sales)
        .values({
          invoiceNumber,
          invoiceDate: new Date(),
          customerId: validatedData.customerId,
          customerName: validatedData.customerName,
          customerPhone: validatedData.customerPhone,
          subtotal: subtotal.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          taxPercent: taxPercent.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          grandTotal: grandTotal.toFixed(2),
          paidAmount: paidAmount.toFixed(2),
          dueAmount: dueAmount.toFixed(2),
          totalProfit: totalProfit.toFixed(2),
          totalReturned: "0",
          status,
          notes: validatedData.notes,
          createdBy: session.id,
        })
        .returning();

      // 5. Create sale items
      await tx.insert(saleItems).values(
        itemsWithCalculations.map(item => ({
          saleId: newSale.id,
          ...item,
        }))
      );

      // 6. Create payment records
      await tx.insert(payments).values(
        validatedData.payments.map(payment => ({
          saleId: newSale.id,
          method: payment.method,
          amount: payment.amount,
          reference: payment.reference,
        }))
      );

      // 7. Update stock items status (atomic)
      await tx
        .update(stockItems)
        .set({
          status: "sold",
          saleId: newSale.id,
          soldAt: new Date(),
        })
        .where(sql`${stockItems.id} = ANY(${stockItemIds})`);

      // 8. Create activity log
      await tx.insert(activityLogs).values({
        userId: session.id,
        userName: session.name,
        userRole: session.role,
        action: "SALE_CREATE",
        entityId: newSale.id,
        details: `New sale created: ${invoiceNumber} for ${validatedData.customerName}. Total: ৳${grandTotal.toFixed(2)}`,
        afterData: {
          invoiceNumber,
          grandTotal: grandTotal.toFixed(2),
          itemsCount: validatedData.items.length,
        },
      });

      return newSale;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating sale:", error);
    
    if (error instanceof Error) {
      if (error.name === "ZodError") {
        return NextResponse.json(
          { error: "Validation failed", details: error },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    );
  }
}
