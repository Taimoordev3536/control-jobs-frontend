"use client"

import { useEffect } from "react"

/**
 * Last-resort boundary for errors thrown in the ROOT layout, above every route
 * group. It replaces the whole document (must render its own <html>/<body>), so
 * it can't use app providers or translations — keep it self-contained and plain.
 * The per-route (dashboard)/error.tsx handles everything inside the app shell;
 * this only fires when that shell itself fails.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#f8f7fb",
          color: "#1e1428",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#6b6577", margin: "0 0 24px" }}>
            The application ran into an unexpected problem.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "#662D91",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
