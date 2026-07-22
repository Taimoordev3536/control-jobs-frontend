// import type React from "react"
// import type { Metadata } from "next"
// import { Inter } from "next/font/google"
// import "./globals.css"
// import { ThemeProvider } from "@/components/theme-provider"
// import { LanguageProvider } from "@/components/language-provider"
// import { AuthProvider } from "@/components/providers/auth-provider"
// import { Toaster } from "@/components/ui/toaster"

// const inter = Inter({ subsets: ["latin"] })

// export const metadata: Metadata = {
//   title: "ControlJobs",
//   description: "Job management platform",
//   generator: "v0.dev",
// }

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode
// }>) {
//   return (
//     <html lang="en" suppressHydrationWarning>
//       <body className={inter.className}>
//         <AuthProvider>
//           <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
//             <LanguageProvider>{children}</LanguageProvider>
//             <Toaster />
//           </ThemeProvider>
//         </AuthProvider>
//       </body>
//     </html>
//   )
// }


import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script" // 👈 import Script
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/components/language-provider"
import { AuthProvider } from "@/components/providers/auth-provider"
import { QueryProvider } from "@/components/providers/query-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ControlJobs",
  description: "Job management platform",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Browser extensions (ColorZilla's cz-shortcut-listen, Grammarly's
          data-gr-* …) inject attributes on <body> before React hydrates, which
          React then reports as a mismatch. Nothing we render causes it, and the
          noise buries real hydration errors. */}
      <body className={inter.className} suppressHydrationWarning>
        {/* Handle stale chunk errors after redeployment by forcing a full reload */}
        <Script id="chunk-error-handler" strategy="beforeInteractive">
          {`
            if (typeof window !== 'undefined') {
              window.addEventListener('error', function(e) {
                if (
                  e.message && (
                    e.message.indexOf('Loading chunk') > -1 ||
                    e.message.indexOf('ChunkLoadError') > -1 ||
                    e.message.indexOf('Loading CSS chunk') > -1
                  )
                ) {
                  if (!sessionStorage.getItem('chunk_reload')) {
                    sessionStorage.setItem('chunk_reload', '1');
                    window.location.reload();
                  }
                }
              });
            }
          `}
        </Script>

        {/* Google Maps loads on demand via lib/google-maps-loader.ts, only on
            pages that render a map or address autocomplete. */}

        <AuthProvider>
          <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              <LanguageProvider>{children}</LanguageProvider>
              <Toaster />
            </ThemeProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

