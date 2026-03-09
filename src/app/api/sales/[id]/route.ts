import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sales, saleItems, payments as paymentsTable, users, customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

// GET /api/sales/[id] - Get sale with items, payments, salesman name, customer address
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

    const [sale] = await db.select().from(sales).where(eq(sales.id, params.id)).limit(1);
    if (!sale) return NextResponse.json({ error: "Sale not found" }, { status: 404 });

    if (session.role === "employee" && sale.createdBy !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Execute queries sequentially
    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, params.id));
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.saleId, params.id));

    // Salesman name
    let createdByName = "Admin";
    try {
      const [user] = await db.select({ name: users.name, role: users.role })
        .from(users).where(eq(users.id, sale.createdBy)).limit(1);
      if (user) createdByName = `${user.name}`;
    } catch {}

    // Customer address
    let customerAddress = "";
    try {
      const [cust] = await db.select({ address: customers.address })
        .from(customers).where(eq(customers.id, sale.customerId)).limit(1);
      if (cust?.address) customerAddress = cust.address;
    } catch {}

    return NextResponse.json({ ...sale, items, payments, createdByName, customerAddress });
  } catch (error) {
    console.error("Error fetching sale:", error);
    return NextResponse.json({ error: "Failed to fetch sale" }, { status: 500 });
  }
}
