"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { useAuth } from "@/hooks/use-auth";
import GoogleAddressInput from "@/components/GoogleAddressInput";

interface AddWorkCenterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkCenterAdded?: (workCenter: any) => void;
}

export default function AddWorkCenterModal({
  open,
  onOpenChange,
  onWorkCenterAdded,
}: AddWorkCenterModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { session, getUserRole } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contactName: "",
    landline: "",
    contactPhone: "",
    contactEmail: "",
    postalCode: "",
  });

  const [validationErrors, setValidationErrors] = useState({
    name: false,
    address: false,
    contactPhone: false,
    contactEmail: false,
  });

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleCreate = async () => {
    setError(null);
    setIsLoading(true);

    const errors = {
      name: !formData.name,
      address: !formData.address,
      contactPhone: !formData.contactPhone,
      contactEmail: !formData.contactEmail,
    };
    setValidationErrors(errors);

    if (
      errors.name ||
      errors.address ||
      errors.contactPhone ||
      errors.contactEmail
    ) {
      setIsLoading(false);
      return;
    }

    try {
      // No role restriction: allow any authenticated user to create a work center

      // derive client id from current URL, e.g. /clients/1
      const getClientIdFromPath = () => {
        if (typeof window === "undefined") return null;
        const parts = window.location.pathname.split("/").filter(Boolean);
        const last = parts[parts.length - 1];
        const id = parseInt(last, 10);
        return Number.isNaN(id) ? null : id;
      };

      const clientId = getClientIdFromPath();

      const payload = {
        name: formData.name,
        address: formData.address,
        contactName: formData.contactName,
        landline: formData.landline,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        postalCode: formData.postalCode,
        // clientId is taken from the URL, not sent in the body
      };

      const token = session?.accessToken;
      // If clientId could not be determined, assume employer context and call employer-specific endpoint
      const url = clientId
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/client/${clientId}/work-centers`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/client/employer/work-centers`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create work center");
      }

      const result = await response.json();
      toast({
        title: t("Work center created successfully!"),
        variant: "default",
      });

      if (typeof onWorkCenterAdded === "function" && result.data) {
        const newWorkCenter = {
          id: result.data.id,
          name: result.data.name,
          address: result.data.address,
          postalCode: result.data.postalCode || "-",
          landline: result.data.landline || "-",
          contactName: result.data.contactName || "-",
          createdAt: result.data.createdAt
            ? new Date(result.data.createdAt).toLocaleDateString()
            : "-",
        };
        onWorkCenterAdded(newWorkCenter);
      }

      setTimeout(() => {
        onOpenChange(false);
        setFormData({
          name: "",
          address: "",
          contactName: "",
          landline: "",
          contactPhone: "",
          contactEmail: "",
          postalCode: "",
        });
        setValidationErrors({
          name: false,
          address: false,
          contactPhone: false,
          contactEmail: false,
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: err.message || t("unexpectedError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (
      validationErrors[field as keyof typeof validationErrors] !== undefined
    ) {
      setValidationErrors((prev) => ({ ...prev, [field]: false }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md p-0 gap-0 [&>button]:hidden h-[90vh] flex flex-col bg-background border-border mx-4">
        <DialogHeader className="p-4 sm:p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium text-foreground">
              {t("newWorkCenter")}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div
          ref={scrollContainerRef}
          className="px-4 sm:px-6 pb-8 flex-1 overflow-y-auto"
        >
          <div className="space-y-4">
            <div>
              <Label
                htmlFor="name"
                className="text-sm font-medium text-foreground"
              >
                {t("denomination")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData("name", e.target.value)}
                className={`mt-1 ${
                  validationErrors.name ? "border-red-500" : ""
                }`}
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-500">
                  This field is required
                </p>
              )}
            </div>

            {/* <div>
              <Label htmlFor="address" className="text-sm font-medium text-foreground">
                {t("address")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => updateFormData("address", e.target.value)}
                placeholder="Street, Number, Town..."
                className={`mt-1 ${validationErrors.address ? "border-red-500" : ""}`}
              />
              {validationErrors.address && <p className="mt-1 text-sm text-red-500">This field is required</p>}
            </div> */}
            <div>
              <Label
                htmlFor="address"
                className="text-sm font-medium text-foreground"
              >
                {t("address")} <span className="text-red-500">*</span>
              </Label>
              <GoogleAddressInput
                value={formData.address}
                onChange={(value, placeId) => {
                  updateFormData("address", value);
                  if (placeId) {
                    console.log("Selected Place ID:", placeId); // 👉 send this to backend for validation if needed
                  }
                }}
                placeholder="Street, Number, Town..."
                className={`mt-1 border p-2 w-full rounded ${
                  validationErrors.address ? "border-red-500" : ""
                }`}
              />
              {validationErrors.address && (
                <p className="mt-1 text-sm text-red-500">
                  This field is required
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="postalCode"
                className="text-sm font-medium text-foreground"
              >
                {t("postalCode")}
              </Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => updateFormData("postalCode", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label
                htmlFor="contactName"
                className="text-sm font-medium text-foreground"
              >
                {t("responsible")}
              </Label>
              <Input
                id="contactName"
                value={formData.contactName}
                onChange={(e) => updateFormData("contactName", e.target.value)}
                className="mt-1"
              />
            </div>

            {/*
            <div>
              <Label htmlFor="landline" className="text-sm font-medium text-foreground">
                {t("landline")}
              </Label>
              <Input
                id="landline"
                value={formData.landline}
                onChange={(e) => updateFormData("landline", e.target.value)}
                className="mt-1"
              />
            </div>
            */}

            <div>
              <Label
                htmlFor="contactPhone"
                className="text-sm font-medium text-foreground"
              >
                {t("mobile")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => updateFormData("contactPhone", e.target.value)}
                className={`mt-1 ${
                  validationErrors.contactPhone ? "border-red-500" : ""
                }`}
              />
              {validationErrors.contactPhone && (
                <p className="mt-1 text-sm text-red-500">
                  This field is required
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="landline"
                className="text-sm font-medium text-foreground"
              >
                {t("landline")}
              </Label>
              <Input
                id="landline"
                value={formData.landline}
                onChange={(e) => updateFormData("landline", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label
                htmlFor="contactEmail"
                className="text-sm font-medium text-foreground"
              >
                {t("email")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="contactEmail"
                value={formData.contactEmail}
                onChange={(e) => updateFormData("contactEmail", e.target.value)}
                className={`mt-1 ${
                  validationErrors.contactEmail ? "border-red-500" : ""
                }`}
              />
              {validationErrors.contactEmail && (
                <p className="mt-1 text-sm text-red-500">
                  This field is required
                </p>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleCreate}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 w-full sm:w-auto"
                disabled={isLoading}
              >
                {isLoading ? "Creating" : "Create"}
              </Button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-500 text-center">{error}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
