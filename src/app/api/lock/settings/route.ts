import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { cookies } from "next/headers";

// PUT /api/lock/settings — Update lock enabled/timeout
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, any> = { updatedAt: new Date() };

    if (typeof body.lockEnabled === "boolean") {
      updates.lockEnabled = body.lockEnabled;

      // If disabling lock, clear the unlock cookie
      if (!body.lockEnabled) {
        const cookieStore = await cookies();
        cookieStore.delete("pos_unlocked");
      }
    }

    if (typeof body.lockTimeoutMinutes === "number") {
      const validTimeouts = [2, 5, 10];
      if (!validTimeouts.includes(body.lockTimeoutMinutes)) {
        return NextResponse.json(
          { error: "Invalid timeout. Must be 2, 5, or 10 minutes." },
          { status: 400 }
        );
      }
      updates.lockTimeoutMinutes = body.lockTimeoutMinutes;
    }

    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, session.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating lock settings:", error);
    return NextResponse.json(
      { error: "Failed to update lock settings" },
      { status: 500 }
    );
  }
}
