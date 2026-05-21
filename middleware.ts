import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { decodeJwt } from "jose"

const IMP_COOKIE = "cj-imp-token"

const roleRoutes: Record<string, string[]> = {
  admin: ["/dashboard", "/partners", "/employers", "/invoices", "/commissions", "/rates", "/information", "/utilities", "/aid", "/tasks", "/messages"],
  partner: ["/dashboard", "/employers", "/billing", "/invoices", "/commissions", "/rates", "/information", "/utilities", "/aid", "/tasks", "/messages"],
  employer: ["/dashboard", "/jobs", "/clients", "/workers", "/work-centers", "/surveys", "/invoices", "/billing", "/information", "/utilities", "/aid", "/tasks", "/records", "/messages"],
  client: ["/dashboard", "/jobs", "/surveys", "/information", "/aid", "/tasks", "/records", "/messages"],
  worker: ["/dashboard", "/jobs", "/occupation", "/surveys", "/information", "/aid", "/tasks", "/records", "/messages"],
}

function readImpersonatedRole(impToken: string): string | null {
  try {
    const payload = decodeJwt(impToken)
    if (!payload.isImpersonating) return null
    const role = (payload as any).role?.name
    return typeof role === "string" ? role.toLowerCase() : null
  } catch {
    return null
  }
}

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl

    if (
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/accept-invite") ||
      pathname.startsWith("/verify-email") ||
      pathname.startsWith("/check-your-email") ||
      pathname.startsWith("/impersonate")
    ) {
      return NextResponse.next()
    }

    const token = req.nextauth.token
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    const impToken = req.cookies.get(IMP_COOKIE)?.value
    const impersonatedRole = impToken ? readImpersonatedRole(impToken) : null
    const userRole =
      impersonatedRole || token.role?.name?.toLowerCase()

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
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/register") ||
          pathname.startsWith("/accept-invite") ||
          pathname.startsWith("/verify-email") ||
          pathname.startsWith("/check-your-email") ||
          pathname.startsWith("/impersonate")
        ) {
          return true
        }
        return !!token
      },
    },
  },
)

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
