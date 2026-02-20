import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { shopSettingsSchema } from "@/lib/validations/settings";

// GET /api/settings - Get all settings
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allSettings = await db.select().from(settings);

    // Convert array of key-value pairs to object
    const settingsObj: Record<string, any> = {};
    for (const s of allSettings) {
      settingsObj[s.key] = s.value;
    }

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PUT /api/settings - Update settings (admin/manager)
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!["admin", "manager"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Upsert each setting
    for (const [key, value] of Object.entries(body)) {
      const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

      if (existing.length > 0) {
        await db
          .update(settings)
          .set({ value: value as any, updatedAt: new Date() })
          .where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({
          key,
          value: value as any,
          description: `Setting: ${key}`,
        });
      }
    }

    // Activity log
    await db.insert(activityLogs).values({
      userId: session.id,
      userName: session.name,
      userRole: session.role,
      action: "SETTINGS_UPDATE",
      details: `Updated settings: ${Object.keys(body).join(", ")}`,
      afterData: body,
    });

    // Return updated settings
    const allSettings = await db.select().from(settings);
    const settingsObj: Record<string, any> = {};
    for (const s of allSettings) {
      settingsObj[s.key] = s.value;
    }

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
