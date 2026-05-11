// Resolve the role-scoped /me + logo/profile endpoints for the current user.
// The backend mounts each role's controller at a different base path (some
// plural, some singular, admin under /users/admin), so callers must dispatch
// by role rather than hard-coding /employers/me everywhere.
//
// Employers carry TWO distinct images:
//   - `profile` — identity photo used in the nav avatar, future WhatsApp
//     profile, etc. (writes to /employers/me/profile-photo).
//   - `logo`    — brand artwork printed on QR-code PDF footers.
// Other roles only need one image; for them `profile` is undefined and the
// `logo` endpoint doubles as their avatar source (legacy behaviour).
export interface LogoEndpoints {
  /** GET — returns the current row including logoUrl and (employer only) profilePhotoUrl. */
  read: string
  /** POST/DELETE — upload or remove the logo asset (QR-PDF brand image for employers). */
  logo: string
  /** POST/DELETE — upload or remove the identity photo. Employer-only; absent for other roles. */
  profile?: string
}

export function logoEndpointsFor(role: string | null | undefined): LogoEndpoints | null {
  switch (role) {
    case "employer":
      return {
        read: "/employers/me",
        logo: "/employers/me/logo",
        profile: "/employers/me/profile-photo",
      }
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
