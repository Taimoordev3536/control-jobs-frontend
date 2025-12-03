"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Lock } from "lucide-react"

interface Props {
  onBack: () => void
  onComplete?: () => void
  job?: any
}

export default function WebSignIn({ onBack, onComplete }: Props) {
  const [pin, setPin] = React.useState("")

  return (
    <div className="min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold">Web Sign-in (PIN)</h3>
      </div>

      <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-800">
        <p className="text-sm text-gray-600 mb-3">Enter the PIN provided by the client or the web portal. This is a UI placeholder.</p>

        <div className="mb-3">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full p-2 rounded border border-gray-200 bg-white text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => onComplete && onComplete()}>
            <Lock className="w-4 h-4 mr-2" /> Submit
          </Button>
          <Button variant="secondary" onClick={onBack}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
