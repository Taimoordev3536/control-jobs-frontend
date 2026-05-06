// Resolve the role-scoped /me + /me/logo endpoints for the current user. The
// backend mounts each role's controller at a different base path (some plural,
// some singular, admin under /users/admin), so callers must dispatch by role
// rather than hard-coding /employers/me everywhere.
export interface LogoEndpoints {
  /** GET — returns the current row including logoUrl/logoPublicId. */
  read: string
  /** POST/DELETE — upload or remove the logo asset. */
  logo: string
}

export function logoEndpointsFor(role: string | null | undefined): LogoEndpoints | null {
  switch (role) {
    case "employer":
      return { read: "/employers/me", logo: "/employers/me/logo" }
    case "partner":
      return { read: "/partners/me", logo: "/partners/me/logo" }
    case "client":
      // ClientsController is mounted at /client (singular).
      return { read: "/client/me", logo: "/client/me/logo" }
    case "worker":
      // WorkersController is mounted at /worker (singular).
      return { read: "/worker/me", logo: "/worker/me/logo" }
    case "admin":
      return { read: "/users/admin/me", logo: "/users/admin/me/logo" }
    default:
      return null
  }
}
