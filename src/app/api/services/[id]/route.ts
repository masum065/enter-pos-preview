import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { serviceRecords, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { serviceRecordSchema, serviceStatusUpdateSchema, servicePaymentSchema } from "@/lib/validations/services";

// GET /api/services/[id]
export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    const params = await paramsPromise;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [service] = await db
      .select()
      .from(serviceRecords)
      .where(eq(serviceRecords.id, params.id))
      .limit(1);

    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error fetching service:", error);
    return NextResponse.json({ error: "Failed to fetch service" }, { status: 500 });
  }
}

// PUT /api/services/[id] - Update service
export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    const params = await paramsPromise;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    
    const [existing] = await db
      .select()
      .from(serviceRecords)
      .where(eq(serviceRecords.id, params.id))
      .limit(1);

    if (!existing) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    const [updatedService] = await db
      .update(serviceRecords)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(serviceRecords.id, params.id))
      .returning();

    await db.insert(activityLogs).values({
      userId: session.id,
      userName: session.name,
      userRole: session.role,
      action: "SERVICE_UPDATE",
      entityId: params.id,
      details: `Updated service: ${existing.serviceNumber}`,
      beforeData: existing,
      afterData: updatedService,
    });

    return NextResponse.json(updatedService);
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}

// DELETE /api/services/[id]
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
      .delete(serviceRecords)
      .where(eq(serviceRecords.id, params.id))
      .returning();

    if (!deleted) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }
}

// PATCH /api/services/[id] - Update status or add payment
export async function PATCH(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    const params = await paramsPromise;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action } = body;

    const [service] = await db
      .select()
      .from(serviceRecords)
      .where(eq(serviceRecords.id, params.id))
      .limit(1);

    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    if (action === "updateStatus") {
      const { status } = serviceStatusUpdateSchema.parse(body);
      
      const updates: Record<string, any> = { status, updatedAt: new Date() };

      // Business logic: auto-set dates on status change
      if (status === "Completed") {
        updates.completedDate = new Date();
      } else if (status === "Delivered") {
        updates.deliveredDate = new Date();
      }

      const [updated] = await db
        .update(serviceRecords)
        .set(updates)
        .where(eq(serviceRecords.id, params.id))
        .returning();

      await db.insert(activityLogs).values({
        userId: session.id,
        userName: session.name,
        userRole: session.role,
        action: "SERVICE_STATUS_UPDATE",
        entityId: params.id,
        details: `Service ${service.serviceNumber}: ${service.status} → ${status}`,
        beforeData: { status: service.status },
        afterData: { status },
      });

      return NextResponse.json(updated);
    }

    if (action === "addPayment") {
      const { amount } = servicePaymentSchema.parse(body);
      const paymentAmount = parseFloat(amount);
      const currentPaid = parseFloat(service.paidAmount);
      const totalCost = parseFloat(service.totalCost);

      // Business logic: calculate new payment status
      const newPaidAmount = currentPaid + paymentAmount;
      const newDueAmount = Math.max(0, totalCost - newPaidAmount);
      const newPaymentStatus = newDueAmount <= 0 ? "Paid" : newPaidAmount > 0 ? "Partial" : "Pending";

      const [updated] = await db
        .update(serviceRecords)
        .set({
          paidAmount: newPaidAmount.toFixed(2),
          dueAmount: newDueAmount.toFixed(2),
          paymentStatus: newPaymentStatus,
          updatedAt: new Date(),
        })
        .where(eq(serviceRecords.id, params.id))
        .returning();

      await db.insert(activityLogs).values({
        userId: session.id,
        userName: session.name,
        userRole: session.role,
        action: "SERVICE_PAYMENT",
        entityId: params.id,
        details: `Payment for ${service.serviceNumber}: ৳${paymentAmount}`,
        beforeData: { paidAmount: service.paidAmount, dueAmount: service.dueAmount, paymentStatus: service.paymentStatus },
        afterData: { paidAmount: newPaidAmount.toFixed(2), dueAmount: newDueAmount.toFixed(2), paymentStatus: newPaymentStatus },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error patching service:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}
