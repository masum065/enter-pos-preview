import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customerTransactions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";

// GET /api/customers/[id]/transactions - List customer transactions
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

    const transactions = await db
      .select()
      .from(customerTransactions)
      .where(eq(customerTransactions.customerId, params.id))
      .orderBy(desc(customerTransactions.createdAt))
      .limit(50);

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Error fetching customer transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
