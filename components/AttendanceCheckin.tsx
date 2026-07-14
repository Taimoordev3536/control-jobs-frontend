"use client"

import { useState, useEffect } from "react"
import { formatLocalDateTime } from "@/lib/datetime"

export default function AttendanceCheckin() {
  const [ip, setIp] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)

  const allowedIPs = ["39.50.140.1"] // Replace with your real IP

  useEffect(() => {
    const fetchIP = async () => {
      try {
        const res = await fetch("https://api.ipify.org?format=json")
        const data = await res.json()
        setIp(data.ip)
      } catch (err) {
        console.error("IP fetch error", err)
        setStatus("❌ Could not fetch IP address.")
      }
    }
    fetchIP()
  }, [])

  const handleCheckin = () => {
    setLoading(true)
    if (allowedIPs.includes(ip)) {
      const now = formatLocalDateTime(new Date())
      localStorage.setItem("attendance", JSON.stringify({ ip, checkInTime: now }))
      setStatus(`✅ Attendance marked at ${now}`)
    } else {
      setStatus("❌ You are not on an authorized network.")
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 rounded-xl shadow-lg border">
      <h2 className="text-2xl font-semibold mb-4">📍 Attendance Check-In</h2>

      <p className="mb-2">Your IP: <code className="bg-gray-100 px-2 py-1 rounded">{ip || "Detecting..."}</code></p>

      <button
        onClick={handleCheckin}
        disabled={!ip || loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Checking..." : "Check In"}
      </button>

      {status && (
        <div className="mt-4 text-sm text-gray-800">
          {status}
        </div>
      )}
    </div>
  )
}
