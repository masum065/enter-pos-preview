import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

// POST /api/lock/verify-pin — Verify PIN and set unlock cookie
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pin } = await request.json();

    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { error: "PIN is required" },
        { status: 400 }
      );
    }

    // Get user from database
    const [user] = await db
      .select({ posPin: users.posPin, lockTimeoutMinutes: users.lockTimeoutMinutes })
      .from(users)
      .where(eq(users.id, session.id))
      .limit(1);

    if (!user || !user.posPin) {
      return NextResponse.json(
        { error: "No PIN configured" },
        { status: 400 }
      );
    }

    // Compare PIN server-side
    const isMatch = await bcrypt.compare(pin, user.posPin);

    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "Incorrect PIN" },
        { status: 401 }
      );
    }

    // Set unlock cookie (httpOnly, expires based on user's timeout setting)
    const cookieStore = await cookies();
    const maxAge = user.lockTimeoutMinutes * 60;
    cookieStore.set("pos_unlocked", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error verifying PIN:", error);
    return NextResponse.json(
      { error: "Failed to verify PIN" },
      { status: 500 }
    );
  }
}
