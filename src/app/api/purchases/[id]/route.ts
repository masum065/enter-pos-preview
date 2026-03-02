import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseInvoices, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

// GET /api/purchases/[id] — return single purchase with createdByName
export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [purchase] = await db
      .select()
      .from(purchaseInvoices)
      .where(eq(purchaseInvoices.id, params.id))
      .limit(1);

    if (!purchase) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Salesman / prepared by
    let createdByName = "Admin";
    try {
      const [user] = await db
        .select({ name: users.name, role: users.role })
        .from(users)
        .where(eq(users.id, purchase.createdBy))
        .limit(1);
      if (user) createdByName = user.name;
    } catch {}

    return NextResponse.json({ ...purchase, createdByName });
  } catch (error) {
    console.error("Error fetching purchase:", error);
    return NextResponse.json({ error: "Failed to fetch purchase" }, { status: 500 });
  }
}
