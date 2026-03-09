import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import { createSession } from "@/lib/session";
import { cookies } from "next/headers";
import { stripHtml, truncate } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const userId = truncate(stripHtml(String(body.userId || '')).trim(), 50);
    const password = String(body.password || '');

    if (!userId || !password) {
      return NextResponse.json(
        { error: "User ID and password are required" },
        { status: 400 }
      );
    }

    // Find user by userId
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is disabled" },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Create session
    await createSession({
      id: user.id,           // UUID for DB foreign keys
      userId: user.userId,   // varchar for display
      name: user.name,
      email: user.email || "",
      role: user.role,
    });

    // If user has lock screen enabled, set the unlock cookie so lock
    // doesn't trigger immediately after login. Idle timer starts fresh.
    if (user.lockEnabled && user.posPin) {
      const cookieStore = await cookies();
      const maxAge = (user.lockTimeoutMinutes || 5) * 60;
      cookieStore.set("pos_unlocked", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge,
        path: "/",
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
