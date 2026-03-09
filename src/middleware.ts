import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-min-32-characters-long'
);

// ── Rate Limiter (in-memory, per IP) ────────────────────────────────────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5;         // 5 attempts per window

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Clean up stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of loginAttempts.entries()) {
      if (now > entry.resetAt) loginAttempts.delete(ip);
    }
  }, 5 * 60_000);
}

// ── Security Headers ────────────────────────────────────────────────────────
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  // Prevent MIME-type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // Legacy XSS filter
  response.headers.set('X-XSS-Protection', '1; mode=block');
  // Control referrer info
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Disable unnecessary browser features
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Content Security Policy
  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https:",
    "frame-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));

  return response;
}

// Routes restricted by role
// employee: can only access dashboard, sales, customers, services, profile
const EMPLOYEE_BLOCKED = [
  '/inventory',
  '/purchases',
  '/expenses',
  '/suppliers',
  '/reports',
  '/settings',
  '/charts',
];

// manager: can access everything except settings (user management)
const MANAGER_BLOCKED = [
  '/settings',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Rate limit login API ─────────────────────────────────────────────
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'unknown';
    if (isRateLimited(ip)) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Too many login attempts. Please try again in a minute.' },
          { status: 429 }
        )
      );
    }
  }

  // Public paths
  const publicPaths = ['/auth/sign-in', '/api/auth'];
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Check session cookie
  const sessionCookie = request.cookies.get('session');
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }

  // Decode JWT to get role (edge-compatible)
  let role = 'employee';
  try {
    const { payload } = await jwtVerify(sessionCookie.value, secret);
    role = (payload.role as string) || 'employee';
  } catch {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url));
  }

  // Skip API routes — those have their own auth checks
  if (pathname.startsWith('/api/')) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Check role restrictions
  const blockedPaths =
    role === 'admin'    ? [] :
    role === 'manager'  ? MANAGER_BLOCKED :
    /* employee */        EMPLOYEE_BLOCKED;

  const isBlocked = blockedPaths.some(p => pathname.startsWith(p));

  if (isBlocked) {
    // Redirect to dashboard with an error param
    const url = new URL('/', request.url);
    url.searchParams.set('blocked', '1');
    return NextResponse.redirect(url);
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
