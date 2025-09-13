import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Allow access to auth pages without authentication
    if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
      return NextResponse.next()
    }

    // Redirect to login if no token
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Role-based route protection
    const userRole = token.role?.name?.toLowerCase()

    // Define role-based access rules
    const roleRoutes: Record<string, string[]> = {
      admin: ["/partners", "/employers", "/invoices", "/commissions", "/rates", "/information", "/utilities", "/aid", "/tasks"],
      partner: ["/employers", "/billing", "/information", "/utilities", "/aid", "/tasks"],
      employer: ["/jobs", "/clients", "/workers", "/surveys", "/information", "/utilities", "/aid", "/tasks"],
      client: ["/jobs", "/surveys", "/information", "/aid", "/tasks"],
      worker: ["/jobs", "/occupation", "/surveys", "/information", "/aid", "/tasks"],
    }

    // Check if user has access to the current route
    if (userRole && roleRoutes[userRole]) {
      const allowedRoutes = roleRoutes[userRole]
      const hasAccess = allowedRoutes.some((route) => pathname.startsWith(route))

      if (
        !hasAccess &&
        pathname !== "/" &&
        !pathname.startsWith("/mydata") &&
        !pathname.startsWith("/configuration") &&
        !pathname.startsWith("/users") &&
        !pathname.startsWith("/wages")
      ) {
        // Redirect to default route for the role
        const defaultRoutes: Record<string, string> = {
          admin: "/partners",
          partner: "/employers",
          employer: "/jobs/control",
          client: "/jobs/control",
          worker: "/jobs/control",
        }

        return NextResponse.redirect(new URL(defaultRoutes[userRole] || "/jobs/control", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Allow access to auth pages
        if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
          return true
        }

        // Require authentication for all other pages
        return !!token
      },
    },
  },
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
