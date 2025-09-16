
"use client"
import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  className?: string
}

export function LoadingSpinner({ className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`flex h-screen bg-muted/30 ${className}`}>
      {/* Sidebar Skeleton (minimized width ~30% of before) */}
      <aside className="hidden md:flex w-44 flex-col border-r border-border/30 p-3 space-y-3">
        <div className="h-6 bg-muted/40 rounded-lg animate-pulse"></div>
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-5 bg-muted/40 rounded-lg animate-pulse"></div>
        ))}
      </aside>

      {/* Main Section */}
      <div className="flex-1 flex flex-col">
        {/* Header (darker grey) */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6">
          <div className="h-8 w-32 bg-muted/70 rounded-lg animate-pulse"></div>
          <div className="flex items-center space-x-3">
            <div className="h-8 w-24 bg-muted/70 rounded-lg animate-pulse"></div>
            <div className="h-8 w-8 bg-muted/70 rounded-full animate-pulse"></div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 space-y-6 overflow-auto mr-6">
          {/* Breadcrumb */}
          <div className="h-4 w-48 bg-muted/50 rounded animate-pulse"></div>

          {/* Table Skeleton */}
          <div className="border border-border rounded-xl p-4 space-y-4 shadow-sm">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div className="h-6 w-48 bg-muted/70 rounded animate-pulse"></div>
              <div className="flex space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 w-8 bg-muted/70 rounded-md animate-pulse"></div>
                ))}
              </div>
            </div>

            {/* Rows */}
            <div className="space-y-3">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="h-10 bg-muted/70 rounded-lg animate-pulse"></div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-4">
              <div className="h-4 w-32 bg-muted/70 rounded animate-pulse"></div>
              <div className="flex space-x-2">
                <div className="h-8 w-8 bg-muted/70 rounded-md animate-pulse"></div>
                <div className="h-8 w-8 bg-muted/70 rounded-md animate-pulse"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}


