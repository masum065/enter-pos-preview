import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sales, saleItems, payments as paymentsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

// GET /api/sales/[id] - Get sale with items and payments
export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    const params = await paramsPromise;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get sale
    const [sale] = await db
      .select()
      .from(sales)
      .where(eq(sales.id, params.id))
      .limit(1);

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Employee can only see their own sales
    if (session.role === "employee" && sale.createdBy !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get sale items
    const items = await db
      .select()
      .from(saleItems)
      .where(eq(saleItems.saleId, params.id));

    // Get payments
    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.saleId, params.id));

    return NextResponse.json({
      ...sale,
      items,
      payments,
    });
  } catch (error) {
    console.error("Error fetching sale:", error);
    return NextResponse.json(
      { error: "Failed to fetch sale" },
      { status: 500 }
    );
  }
}
