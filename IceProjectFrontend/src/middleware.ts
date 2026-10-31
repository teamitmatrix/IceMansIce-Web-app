import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getUserFromToken(token: string) {
  try {
    // Decode JWT token to get user info (basic decode, not verification)
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = parts[1];
    if (!payload) {
      return null;
    }
    
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = JSON.parse(atob(paddedPayload));
    return decoded;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}
export function middleware(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value;
    const { pathname } = request.nextUrl;

    // Paths that don't require authentication
    const publicPaths = [
      "/",
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/privacy-policy",
      "/terms",
    ];
    // Exact match for "/" so it does not treat every path as public
    const isPublicPath = publicPaths.some((path) =>
      path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`)
    );

    // Skip middleware for static files and API routes
    if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
      return NextResponse.next();
    }

    // Redirect to login if accessing private path without token
    if (!token && !isPublicPath) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // For authenticated users accessing public paths, redirect based on role
    if (token && (pathname === "/login" || pathname === "/register" || pathname === "/")) {
      const user = getUserFromToken(token);
      if (user && user.role) {
        switch (user.role) {
          case "driver":
            return NextResponse.redirect(new URL("/driver", request.url));
          case "customer":
            return NextResponse.redirect(new URL("/customer", request.url));
          case "admin":
            return NextResponse.redirect(new URL("/admin", request.url));
          default:
            // Unknown role: clear token and redirect to login
            const response = NextResponse.redirect(new URL("/login", request.url));
            response.cookies.delete("token");
            return response;
        }
      } else {
        // Invalid token: clear it and redirect to login
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("token");
        return response;
      }
    }

    // Prevent role-based access violations
    if (token) {
      const user = getUserFromToken(token);
      if (user && user.role) {
        // Admin access control
        if (pathname.startsWith("/admin") && user.role !== "admin") {
          switch (user.role) {
            case "driver":
              return NextResponse.redirect(new URL("/driver", request.url));
            case "customer":
              return NextResponse.redirect(new URL("/customer", request.url));
            default:
              return NextResponse.redirect(new URL("/login", request.url));
          }
        }

        // Drivers shouldn't access customer dashboard
        if (user.role === "driver" && pathname.startsWith("/customer")) {
          return NextResponse.redirect(new URL("/driver", request.url));
        }

        // Customers shouldn't access driver portal
        if (user.role === "customer" && pathname.startsWith("/driver")) {
          return NextResponse.redirect(new URL("/customer", request.url));
        }
      } else {
        // Invalid token: clear it and redirect to login
        const response = NextResponse.redirect(new URL("/login", request.url));
        response.cookies.delete("token");
        return response;
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    // On error, redirect to login to prevent the app from breaking
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)/",
  ],
};
