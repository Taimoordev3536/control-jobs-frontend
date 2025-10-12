"use client"

import { useState } from "react"
import Profile from "./profile"
import Notification from "./notification"

export default function PartnerConfigurationMainPage() {
  const [activeTab, setActiveTab] = useState("profile")

  const tabs = [
    { key: "profile", label: "Profile" },
    { key: "notification", label: "Notification" },
  ]

  return (
    <div className="bg-background min-h-screen">
      <div className="bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-semibold text-foreground">Partner Configuration</h1>
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
        {activeTab === "profile" && <Profile />}
        {activeTab === "notification" && <Notification />}
      </div>
    </div>
  )
}