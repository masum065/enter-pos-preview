import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { suppliers, supplierTransactions, activityLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { supplierSchema } from "@/lib/validations/purchases";

// GET /api/suppliers/[id] - Get supplier with transactions
export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    const params = await paramsPromise;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, params.id))
      .limit(1);

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    // Get transactions
    const transactions = await db
      .select()
      .from(supplierTransactions)
      .where(eq(supplierTransactions.supplierId, params.id))
      .orderBy(desc(supplierTransactions.createdAt));

    return NextResponse.json({ ...supplier, transactions });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return NextResponse.json({ error: "Failed to fetch supplier" }, { status: 500 });
  }
}

// PUT /api/suppliers/[id] - Update supplier
export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    const params = await paramsPromise;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["admin", "manager"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = supplierSchema.parse(body);

    const [updatedSupplier] = await db
      .update(suppliers)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(suppliers.id, params.id))
      .returning();

    if (!updatedSupplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json(updatedSupplier);
  } catch (error) {
    console.error("Error updating supplier:", error);
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 });
  }
}

// DELETE /api/suppliers/[id] - Delete supplier (admin only)
export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    const params = await paramsPromise;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [deleted] = await db
      .delete(suppliers)
      .where(eq(suppliers.id, params.id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
  }
}
