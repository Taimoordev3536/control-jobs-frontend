// import { DataTable } from "@/components/data-table"

// export default function UtilitiesInvitePage() {
//   const invites = [
//     {
//       id: 1,
//       email: "john@example.com",
//       role: "Worker",
//       status: "Sent",
//       dateSent: "2025-01-15",
//       expiresOn: "2025-02-15",
//     },
//     {
//       id: 2,
//       email: "sarah@company.com",
//       role: "Client",
//       status: "Accepted",
//       dateSent: "2025-01-18",
//       expiresOn: "2025-02-18",
//     },
//     {
//       id: 3,
//       email: "mike@business.com",
//       role: "Employer",
//       status: "Pending",
//       dateSent: "2025-01-20",
//       expiresOn: "2025-02-20",
//     },
//     {
//       id: 4,
//       email: "lisa@startup.com",
//       role: "Partner",
//       status: "Expired",
//       dateSent: "2024-12-15",
//       expiresOn: "2025-01-15",
//     },
//   ]

//   return (
//     <div>
//       <h1 className="page-title">Invite Management</h1>
//       <p className="text-gray-600 mb-6">Send and manage user invitations</p>
//       <DataTable
//         data={invites}
//         columns={[
//           { key: "email", label: "Email" },
//           { key: "role", label: "Role" },
//           { key: "status", label: "Status" },
//           { key: "dateSent", label: "Date Sent" },
//           { key: "expiresOn", label: "Expires On" },
//         ]}
//         totalRecords={4}
//       />
//     </div>
//   )
// }


"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

export default function InvitePage() {
  const [selectedDate, setSelectedDate] = useState("June 17, 2025")
  const [userType, setUserType] = useState("workers")
  const [selectedUsers, setSelectedUsers] = useState("")
  const { t } = useTranslation()

  const handleInvite = () => {
    console.log("Invite sent:", { selectedDate, userType, selectedUsers })
  }

  const handlePrevDate = () => {
    // Handle previous date logic
    console.log("Previous date")
  }

  const handleNextDate = () => {
    // Handle next date logic
    console.log("Next date")
  }

  return (
    <div className="p-6 bg-background min-h-screen">
      <div className="bg-card rounded-lg shadow-sm border border-border">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-semibold text-foreground">{t("userRegistration")}</h1>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Date Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t("date")}</Label>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handlePrevDate} className="p-1 h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-foreground min-w-[120px] text-center">{selectedDate}</span>
              <Button variant="ghost" size="sm" onClick={handleNextDate} className="p-1 h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* User Type Radio Buttons */}
          <div className="space-y-3">
            <RadioGroup value={userType} onValueChange={setUserType} className="flex gap-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="workers" id="workers" />
                <Label htmlFor="workers" className="text-sm font-medium text-foreground">
                  {t("workers")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="customers" id="customers" />
                <Label htmlFor="customers" className="text-sm font-medium text-foreground">
                  {t("customers")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Select Dropdown */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t("select")}</Label>
            <Select value={selectedUsers} onValueChange={setSelectedUsers}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectUsers")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user1">User 1</SelectItem>
                <SelectItem value="user2">User 2</SelectItem>
                <SelectItem value="user3">User 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invite Button */}
          <div className="pt-4">
            <Button onClick={handleInvite} className="bg-purple-600 hover:bg-purple-700 text-white px-8">
              {t("invite")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
