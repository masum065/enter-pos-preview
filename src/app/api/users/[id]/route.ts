import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { updateUserSchema, changePasswordSchema } from "@/lib/validations/settings";
import bcrypt from "bcryptjs";

// GET /api/users/[id] - Get user details (admin only)
export async function GET(
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

    const [user] = await db
      .select({
        id: users.id,
        userId: users.userId,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1);

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

// PUT /api/users/[id] - Update user (admin only)
export async function PUT(
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

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    const [existing] = await db.select().from(users).where(eq(users.id, params.id)).limit(1);
    if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [updatedUser] = await db
      .update(users)
      .set({
        name: validatedData.name,
        email: validatedData.email || null,
        role: validatedData.role,
        isActive: validatedData.isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, params.id))
      .returning({
        id: users.id,
        userId: users.userId,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      });

    await db.insert(activityLogs).values({
      userId: session.id,
      userName: session.name,
      userRole: session.role,
      action: "USER_UPDATE",
      entityId: params.id,
      details: `Updated user: ${existing.userId}`,
      beforeData: { name: existing.name, role: existing.role, isActive: existing.isActive },
      afterData: { name: validatedData.name, role: validatedData.role, isActive: validatedData.isActive },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Deactivate user (admin only)
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

    // Don't allow deleting own account
    const [user] = await db.select().from(users).where(eq(users.id, params.id)).limit(1);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.userId === session.userId) {
      return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 });
    }

    // Soft delete - deactivate
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, params.id));

    await db.insert(activityLogs).values({
      userId: session.id,
      userName: session.name,
      userRole: session.role,
      action: "USER_DEACTIVATE",
      entityId: params.id,
      details: `Deactivated user: ${user.userId}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to deactivate user" }, { status: 500 });
  }
}

// PATCH /api/users/[id] - Change password
export async function PATCH(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
    const params = await paramsPromise;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    // Admin can reset any user's password, others can only change their own
    const [targetUser] = await db.select().from(users).where(eq(users.id, params.id)).limit(1);
    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (session.role !== "admin" && targetUser.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If admin resetting someone else's password, just need newPassword
    if (session.role === "admin" && targetUser.userId !== session.userId) {
      const { newPassword } = body;
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, params.id));

      await db.insert(activityLogs).values({
        userId: session.id,
        userName: session.name,
        userRole: session.role,
        action: "USER_PASSWORD_RESET",
        entityId: params.id,
        details: `Admin reset password for user: ${targetUser.userId}`,
      });

      return NextResponse.json({ success: true, message: "Password reset successfully" });
    }

    // User changing own password - verify current
    const validatedData = changePasswordSchema.parse(body);
    const isValid = await bcrypt.compare(validatedData.currentPassword, targetUser.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(validatedData.newPassword, 10);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, params.id));

    return NextResponse.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
