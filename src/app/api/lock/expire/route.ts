import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";

// POST /api/lock/expire — Delete the unlock cookie (called when idle timer fires)
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.delete("pos_unlocked");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error expiring lock:", error);
    return NextResponse.json(
      { error: "Failed to expire lock" },
      { status: 500 }
    );
  }
}
