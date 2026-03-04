import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

// POST /api/lock/set-pin — Hash & save a 4-digit PIN
// Admins/managers can set PIN for other users via `targetUserId`
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pin, targetUserId } = await request.json();

    // Validate PIN: must be exactly 4 digits
    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits" },
        { status: 400 }
      );
    }

    // Determine which user to update
    let userId = session.id;
    if (targetUserId && targetUserId !== session.id) {
      // Only admin/manager can set PIN for other users
      if (session.role !== "admin" && session.role !== "manager") {
        return NextResponse.json({ error: "Not authorized to set PIN for other users" }, { status: 403 });
      }
      userId = targetUserId;
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Save to database and auto-enable lock
    await db
      .update(users)
      .set({
        posPin: hashedPin,
        lockEnabled: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true, message: "PIN set successfully" });
  } catch (error) {
    console.error("Error setting PIN:", error);
    return NextResponse.json(
      { error: "Failed to set PIN" },
      { status: 500 }
    );
  }
}
