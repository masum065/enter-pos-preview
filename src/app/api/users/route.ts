import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, activityLogs } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { createUserSchema } from "@/lib/validations/settings";
import bcrypt from "bcryptjs";

// GET /api/users - List users (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allUsers = await db
      .select({
        id: users.id,
        userId: users.userId,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// POST /api/users - Create user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // Check if userId already exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.userId, validatedData.userId))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "User ID already exists" }, { status: 409 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        userId: validatedData.userId,
        name: validatedData.name,
        email: validatedData.email || null,
        passwordHash,
        role: validatedData.role,
        createdBy: session.id,
      })
      .returning({
        id: users.id,
        userId: users.userId,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    // Activity log
    await db.insert(activityLogs).values({
      userId: session.id,
      userName: session.name,
      userRole: session.role,
      action: "USER_CREATE",
      entityId: newUser.id,
      details: `Created new user: ${newUser.userId} (${newUser.role})`,
      afterData: { userId: newUser.userId, name: newUser.name, role: newUser.role },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
