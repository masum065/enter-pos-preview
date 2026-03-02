import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-min-32-characters-long'
);

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

  // Public paths
  const publicPaths = ['/auth/sign-in', '/api/auth'];
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
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
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
