// "use client"

// import { useState } from "react"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import Profile from "./profile"
// import Accounting from "./accounting"
// import Aid from "./aid"
// import Web from "./web"

// export default function AdminConfigurationMainPage() {
//   const [activeTab, setActiveTab] = useState("profile")

//   return (
//     <div className="bg-background min-h-screen">
//       <div className="bg-card border-b border-border">
//         <div className="flex items-center justify-between p-4">
//           <h1 className="text-2xl font-semibold text-foreground">Admin Configuration</h1>
//         </div>

//         <div className="border-b border-border">
//           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//             <TabsList className="flex justify-start bg-transparent rounded-none h-auto p-0 border-none">
//               {[
//                 { key: "profile", label: "Profile" },
//                 { key: "accounting", label: "Accounting" },
//                 { key: "aid", label: "AId" },
//                 { key: "web", label: "Web" },
//               ].map((tab) => (
//                 <TabsTrigger
//                   key={tab.key}
//                   value={tab.key}
//                   className="px-6 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground hover:text-foreground transition-colors"
//                 >
//                   {tab.label}
//                 </TabsTrigger>
//               ))}
//             </TabsList>
//           </Tabs>
//         </div>
//       </div>

//       <div className="min-h-[300px] bg-card p-6">
//         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//           <TabsContent value="profile" className="mt-0">
//             <Profile />
//           </TabsContent>
//           <TabsContent value="accounting" className="mt-0">
//             <Accounting />
//           </TabsContent>
//           <TabsContent value="aid" className="mt-0">
//             <Aid />
//           </TabsContent>
//           <TabsContent value="web" className="mt-0">
//             <Web />
//           </TabsContent>
//         </Tabs>
//       </div>
//     </div>
//   )
// }


"use client"

import { useState } from "react"
import Rates from "./rates"
import Accounting from "./accounting"
import Aid from "./aid"
import Web from "./web"
import { useTranslation } from "@/hooks/use-translation"

export default function AdminConfigurationMainPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("rates")

  const tabs = [
    { key: "rates", label: t("rates") },
    { key: "accounting", label: t("accounting") || "Accounting" },
    { key: "aid", label: t("help") || "Help" },
    { key: "web", label: t("Web") || "Web" },
  ]

  return (
    <div className="bg-background min-h-screen">
      <div className="bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-semibold text-foreground">Admin Configuration</h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="min-h-[300px] bg-card p-6">
        {activeTab === "rates" && <Rates />}
        {activeTab === "accounting" && <Accounting />}
        {activeTab === "aid" && <Aid />}
        {activeTab === "web" && <Web />}
      </div>
    </div>
  )
}