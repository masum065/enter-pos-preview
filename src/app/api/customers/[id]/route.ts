import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { customerSchema } from "@/lib/validations/purchases";

// GET /api/customers/[id]
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

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, params.id))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
}

// PUT /api/customers/[id]
export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    const params = await paramsPromise;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = customerSchema.parse(body);

    const [existing] = await db.select().from(customers).where(eq(customers.id, params.id)).limit(1);

    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(customers.id, params.id))
      .returning();

    if (!updatedCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await db.insert(activityLogs).values({
      userId: session.id,
      userName: session.name,
      userRole: session.role,
      action: "CUSTOMER_UPDATE",
      entityId: params.id,
      details: `Updated customer: ${existing?.name}`,
      beforeData: existing,
      afterData: updatedCustomer,
    });

    return NextResponse.json(updatedCustomer);
  } catch (error) {
    console.error("Error updating customer:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

// DELETE /api/customers/[id]
export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    const params = await paramsPromise;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [existing] = await db.select().from(customers).where(eq(customers.id, params.id)).limit(1);

    const [deleted] = await db
      .delete(customers)
      .where(eq(customers.id, params.id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    await db.insert(activityLogs).values({
      userId: session.id,
      userName: session.name,
      userRole: session.role,
      action: "CUSTOMER_DELETE",
      entityId: params.id,
      details: `Deleted customer: ${existing?.name}`,
      beforeData: existing,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
