// "use client"

// import { Loader2 } from "lucide-react"

// interface LoadingSpinnerProps {
//   message?: string
// }

// export function LoadingSpinner({ message = "Loading..." }: LoadingSpinnerProps) {
//   return (
//     <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
//       <div className="flex flex-col items-center space-y-4">
//         <Loader2 className="h-8 w-8 animate-spin text-primary" />
//         <p className="text-sm text-muted-foreground">{message}</p>
//       </div>
//     </div>
//   )
// }


"use client"
import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps {
  className?: string
}

export function LoadingSpinner({ className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`flex h-screen bg-muted/40 ${className}`}>
      {/* Sidebar Skeleton */}
      <div className="w-64 bg-card border-r border-border animate-pulse">
        <div className="p-4 border-b border-border">
          <div className="h-8 bg-muted rounded"></div>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-6 bg-muted rounded"></div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header Skeleton */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-6"></div>
          <div className="flex items-center space-x-4">
            <div className="h-8 w-32 bg-muted rounded"></div>
             <div className="h-8 w-8 bg-muted rounded-full"></div>
          </div>
        </header>

        {/* Main Content Skeleton */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Breadcrumb Skeleton */}
          <div className="mb-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-48"></div>
          </div>

          {/* Page Title Skeleton */}
          {/* <div className="mb-6 animate-pulse">
            <div className="h-8 bg-muted rounded w-64"></div>
          </div> */}

          {/* Stats Cards Skeleton */}
          {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((card) => (
              <div key={card} className="bg-card rounded-lg p-6 shadow-sm border border-border animate-pulse">
                <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div> */}

          {/* Table Container Skeleton */}
          <div className="bg-card rounded-lg shadow-sm border border-border">
            {/* Table Header Skeleton */}
            <div className="p-4 border-b border-border flex items-center justify-between animate-pulse">
              <div className="h-8 bg-muted rounded w-64"></div>
                <div className="flex items-center space-x-4">
              <div className="h-10 mr-0 bg-muted rounded w-8"></div>
              <div className="h-10 mr-0 bg-muted rounded w-8"></div>
              <div className="h-10 mr-0 bg-muted rounded w-8"></div>
              <div className="h-10 mr-0 bg-muted rounded w-8"></div>
              </div>
            </div>

            {/* Table Skeleton */}
            <div className="p-4">
              <div className="w-full animate-pulse">
                {/* Table header row */}
                <div className="grid grid-cols-12 gap-4 mb-4">
                  <div className="col-span-3 h-4 bg-muted rounded"></div>
                  <div className="col-span-2 h-4 bg-muted rounded"></div>
                  <div className="col-span-2 h-4 bg-muted rounded"></div>
                  <div className="col-span-2 h-4 bg-muted rounded"></div>
                  <div className="col-span-3 h-4 bg-muted rounded"></div>
                </div>
                
                {/* Table rows */}
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((row) => (
                    <div key={row} className="grid grid-cols-12 gap-4 py-3">
                      <div className="col-span-3 h-6 bg-muted rounded"></div>
                      <div className="col-span-2 h-6 bg-muted rounded"></div>
                      <div className="col-span-2 h-6 bg-muted rounded"></div>
                      <div className="col-span-2 h-6 bg-muted rounded"></div>
                      <div className="col-span-3 h-6 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Table Footer Skeleton */}
            <div className="p-4 border-t border-border flex items-center justify-between animate-pulse">
              <div className="h-4 bg-muted rounded w-48"></div>
              <div className="flex space-x-2">
                <div className="h-8 w-8 bg-muted rounded"></div>
                <div className="h-8 w-8 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}