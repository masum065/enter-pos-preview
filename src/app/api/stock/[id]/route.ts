import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stockItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { z } from "zod";

const updateStockSchema = z.object({
  status: z.enum(["Available", "Sold", "Returned", "Damaged", "Service", "In Transit"]).optional(),
  notes: z.string().optional(),
});

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

    // Only admin/manager can update directly
    if (!["admin", "manager"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateStockSchema.parse(body);

    const [updatedItem] = await db
      .update(stockItems)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(stockItems.id, params.id))
      .returning();

    if (!updatedItem) {
      return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
    }

    return NextResponse.json({ stockItem: updatedItem });
  } catch (error) {
    console.error("Error updating stock item:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: (error as any).errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update stock item" },
      { status: 500 }
    );
  }
}
