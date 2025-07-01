"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState } from "react"
import ContreolJobs from "../../../icons/Logos/ControlJobs.svg";


export default function RegisterPage() {
  const [activeTab, setActiveTab] = useState<"ID" | "Billing" | "Access">("ID")
  const [formData, setFormData] = useState({
    employerType: "",
    name: "",
    address: "",
    landline: "",
    mobile: "",
    email: "",
    nif: "",
    username: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (activeTab === "ID") {
      if (!formData.name) newErrors.name = "This field is required."
      if (!formData.mobile) newErrors.mobile = "This field is required."
    }

    if (activeTab === "Billing") {
      if (!formData.nif) newErrors.nif = "This field is required."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
    if (errors[id]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[id]
        return newErrors
      })
    }
  }

  const handleTabChange = (tab: "ID" | "Billing" | "Access") => {
    if (validate()) {
      setActiveTab(tab)
    }
  }

  const handleNext = () => {
    if (!validate()) return

    if (activeTab === "ID") {
      setActiveTab("Billing")
    } else if (activeTab === "Billing") {
      setActiveTab("Access")
    }
  }

  const handleSubmit = () => {
    if (validate()) {
      console.log("Form submitted:", formData)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background pt-10">
      <div>
      <ContreolJobs className="h-20 w-48" />
      </div>

      <Card className="w-full max-w-md border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-center text-lg text-card-foreground">User registration</CardTitle>

          {/* Tabs */}
          <div className="flex justify-between mt-4 border-b border-border">
            <button
              className={`pb-2 px-1 transition-colors ${
                activeTab === "ID"
                  ? "font-bold border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleTabChange("ID")}
            >
              ID
            </button>
            <button
              className={`pb-2 px-1 transition-colors ${
                activeTab === "Billing"
                  ? "font-bold border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleTabChange("Billing")}
            >
              Billing
            </button>
            <button
              className={`pb-2 px-1 transition-colors ${
                activeTab === "Access"
                  ? "font-bold border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleTabChange("Access")}
            >
              Access
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {activeTab === "ID" && (
            <form className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="employerType" className="text-card-foreground">
                  Type of Employer
                </Label>
                <Select
                  value={formData.employerType}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, employerType: value }))}
                >
                  <SelectTrigger className="w-full bg-background border-input text-foreground">
                    <SelectValue placeholder="Select employer type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Particular">Particular</SelectItem>
                    <SelectItem value="Company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-card-foreground">
                  Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`bg-background border-input text-foreground ${errors.name ? "border-destructive" : ""}`}
                  placeholder="Enter your name"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address" className="text-card-foreground">
                  Address
                </Label>
                <Input
                  id="address"
                  type="text"
                  placeholder="Street, Number, Town..."
                  value={formData.address}
                  onChange={handleInputChange}
                  className="bg-background border-input text-foreground"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="landline" className="text-card-foreground">
                  Landline
                </Label>
                <Input
                  id="landline"
                  type="tel"
                  value={formData.landline}
                  onChange={handleInputChange}
                  className="bg-background border-input text-foreground"
                  placeholder="Enter landline number"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mobile" className="text-card-foreground">
                  Mobile
                </Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  className={`bg-background border-input text-foreground ${errors.mobile ? "border-destructive" : ""}`}
                  placeholder="Enter mobile number"
                />
                {errors.mobile && <p className="text-sm text-destructive">{errors.mobile}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-card-foreground">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="bg-background border-input text-foreground"
                  placeholder="Enter your email"
                />
              </div>
              <div className="text-center mt-2">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-primary underline">
                  I already have an account
                </Link>
              </div>
            </form>
          )}

          {activeTab === "Billing" && (
            <form className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nif" className="text-card-foreground">
                  NIF
                </Label>
                <Input
                  id="nif"
                  type="text"
                  value={formData.nif}
                  onChange={handleInputChange}
                  className={`bg-background border-input text-foreground ${errors.nif ? "border-destructive" : ""}`}
                  placeholder="Enter your NIF"
                />
                {errors.nif && <p className="text-sm text-destructive">{errors.nif}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="homeRate" className="text-card-foreground">
                  Home Rate
                </Label>
                <p className="text-sm text-muted-foreground">Minimum fee: €6/month</p>
              </div>
              <div className="text-center mt-4">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-primary underline">
                  I already have an account
                </Link>
              </div>
            </form>
          )}

          {activeTab === "Access" && (
            <form className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username" className="text-card-foreground">
                  User name
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="bg-background border-input text-foreground"
                  placeholder="Enter username"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-card-foreground">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="bg-background border-input text-foreground"
                  placeholder="Enter your email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-card-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="bg-background border-input text-foreground"
                  placeholder="Enter password"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword" className="text-card-foreground">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="bg-background border-input text-foreground"
                  placeholder="Confirm password"
                />
              </div>
              <div className="text-center mt-2">
                <Link href="/login" className="text-sm text-muted-foreground hover:text-primary underline">
                  I already have an account
                </Link>
              </div>
            </form>
          )}
        </CardContent>

        <CardContent className="flex justify-between pt-0">
          {activeTab !== "ID" && (
            <Button
              variant="outline"
              onClick={() => setActiveTab(activeTab === "Billing" ? "ID" : "Billing")}
              className="border-border text-foreground hover:bg-accent"
            >
              Former
            </Button>
          )}
          {activeTab === "ID" && (
            <Button className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleNext}>
              Following
            </Button>
          )}
          {activeTab === "Billing" && (
            <Button className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleNext}>
              Following
            </Button>
          )}
          {activeTab === "Access" && (
            <Button className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSubmit}>
              Create
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
