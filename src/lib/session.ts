import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "your-secret-key-min-32-characters-long"
);

export interface SessionData {
  id: string;      // UUID primary key (for DB foreign keys)
  userId: string;  // varchar user_id (for display, e.g. 'admin')
  name: string;
  email: string;
  role: string;
}

export async function createSession(data: SessionData) {
  const token = await new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 1 day
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    
    // Validate payload has required fields
    if (
      typeof payload.id === "string" &&
      typeof payload.userId === "string" &&
      typeof payload.name === "string" &&
      typeof payload.email === "string" &&
      typeof payload.role === "string"
    ) {
      return {
        id: payload.id,
        userId: payload.userId,
        name: payload.name,
        email: payload.email,
        role: payload.role,
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
