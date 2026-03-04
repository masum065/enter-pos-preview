import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { cookies } from "next/headers";

// GET /api/lock/status — Return lock settings for current user
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user lock settings
    const [user] = await db
      .select({
        posPin: users.posPin,
        lockEnabled: users.lockEnabled,
        lockTimeoutMinutes: users.lockTimeoutMinutes,
      })
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if unlocked via cookie
    const cookieStore = await cookies();
    const isUnlocked = cookieStore.get("pos_unlocked")?.value === "true";

    return NextResponse.json({
      lockEnabled: user.lockEnabled,
      lockTimeoutMinutes: user.lockTimeoutMinutes,
      hasPin: !!user.posPin,
      isUnlocked,
    });
  } catch (error) {
    console.error("Error fetching lock status:", error);
    return NextResponse.json(
      { error: "Failed to fetch lock status" },
      { status: 500 }
    );
  }
}
