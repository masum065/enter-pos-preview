import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { DEFAULT_SHOP_INFO } from "@/lib/shop-info";
import type { ShopInfo } from "@/lib/shop-info";

const SHOP_INFO_KEY = "shop_info_v2";


// GET /api/shop-info — public-ish, cached aggressively
export async function GET() {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SHOP_INFO_KEY))
      .limit(1);

    const info: ShopInfo = rows.length > 0
      ? (rows[0].value as unknown as ShopInfo)
      : DEFAULT_SHOP_INFO;

    return NextResponse.json(info, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error fetching shop info:", error);
    return NextResponse.json(DEFAULT_SHOP_INFO);
  }
}

// PUT /api/shop-info — admin only
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Only admin can update shop info" }, { status: 403 });
    }

    const body: ShopInfo = await request.json();

    // Upsert
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SHOP_INFO_KEY))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({ value: body as any, updatedAt: new Date() })
        .where(eq(settings.key, SHOP_INFO_KEY));
    } else {
      await db.insert(settings).values({
        key: SHOP_INFO_KEY,
        value: body as any,
        description: "Shop information for invoices",
      });
    }

    // Activity log
    await db.insert(activityLogs).values({
      userId: session.id,
      userName: session.name,
      userRole: session.role,
      action: "SHOP_INFO_UPDATE",
      details: "Updated shop information & invoice settings",
    });

    return NextResponse.json(body);
  } catch (error) {
    console.error("Error updating shop info:", error);
    return NextResponse.json(
      { error: "Failed to update shop info" },
      { status: 500 }
    );
  }
}
