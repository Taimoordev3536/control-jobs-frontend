"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Info } from "lucide-react";
import { LocationPickerDialog } from "@/components/LocationPickerDialog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
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
import GoogleAddressInput, { AddressComponents } from "@/components/GoogleAddressInput";

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
    street: "",
    streetNumber: "",
    floor: "",
    locality: "",
    province: "",
    country: "",
    contactName: "",
    landline: "",
    contactPhone: "",
    contactEmail: "",
    postalCode: "",
    latitude: null as number | null,
    longitude: null as number | null,
    gpsRadius: 100,
  });

  const [validationErrors, setValidationErrors] = useState({
    name: false,
    address: false,
  });
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleCreate = async () => {
    setError(null);

    const errors = {
      name: !formData.name,
      address: !formData.address,
    };
    setValidationErrors(errors);

    if (
      errors.name ||
      errors.address
    ) {
      return;
    }

    setIsLoading(true);

    try {
      // No role restriction: allow any authenticated user to create a work center

      // derive client UUID from current URL, e.g. /clients/<uuid>
      const getClientIdFromPath = () => {
        if (typeof window === "undefined") return null;
        const parts = window.location.pathname.split("/").filter(Boolean);
        // URL pattern: /clients/<uuid>
        if (parts.length >= 2 && parts[parts.length - 2] === "clients") {
          return parts[parts.length - 1] || null;
        }
        return null;
      };

      const clientId = getClientIdFromPath();

      const payload = {
        name: formData.name,
        address: formData.address,
        street: formData.street,
        streetNumber: formData.streetNumber,
        floor: formData.floor,
        locality: formData.locality,
        province: formData.province,
        country: formData.country,
        contactName: formData.contactName,
        landline: formData.landline,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        postalCode: formData.postalCode,
        // Include clientId if we're creating for a specific client
        clientId: clientId || undefined,
        // GPS enforcement fields (auto-populated from Google Places)
        latitude: formData.latitude,
        longitude: formData.longitude,
        gpsRadius: formData.gpsRadius,
      };

      const token = session?.accessToken;
      // Use new unified endpoint
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers`;

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
        variant: "success",
      });

      if (typeof onWorkCenterAdded === "function" && result.data) {
        const newWorkCenter = {
          id: result.data.publicId || result.data.id,
          code: result.data.code || "",
          name: result.data.name,
          address: result.data.address,
          locality: result.data.locality || result.data.city || "-",
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
          street: "",
          streetNumber: "",
          floor: "",
          locality: "",
          province: "",
          country: "",
          contactName: "",
          landline: "",
          contactPhone: "",
          contactEmail: "",
          postalCode: "",
          latitude: null,
          longitude: null,
          gpsRadius: 100,
        });
        setValidationErrors({
          name: false,
          address: false,
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
      <DialogContent
        className="max-w-sm sm:max-w-md p-0 gap-0 max-h-[90vh] flex flex-col bg-background border-border mx-4"
        onPointerDownOutside={(e) => {
          // Prevent dialog from closing when clicking Google Places autocomplete suggestions
          const target = e.target as HTMLElement
          if (target.closest(".pac-container")) {
            e.preventDefault()
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement
          if (target.closest(".pac-container")) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader className="p-4 sm:p-6 pb-4 space-y-4">
          <div className="flex items-center justify-between relative">
            <div className="flex-1" />
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <DialogTitle className="text-lg font-semibold text-foreground text-center tracking-tight whitespace-nowrap">
                {t("newWorkCenter")}
              </DialogTitle>
            </div>
            <div className="flex-1 flex justify-end" />
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
                placeholder="Ej. Centro Principal"
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
                className="text-sm font-medium text-foreground flex items-center gap-1"
              >
                {t("address")} <span className="text-red-500">*</span>
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex items-center p-0" tabIndex={-1}>
                        <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[14rem] text-xs px-2 py-1">
                      {t("addressTip")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <div className="flex gap-2 mt-1">
                <div className="flex-1">
                  <GoogleAddressInput
                    value={formData.address}
                    onChange={(value, placeId, components) => {
                      updateFormData("address", value);
                      if (components) {
                        updateFormData("street", components.street || "");
                        updateFormData("streetNumber", components.streetNumber || "");
                        updateFormData("locality", components.city || "");
                        updateFormData("province", components.province || "");
                        updateFormData("country", components.country || "");
                        updateFormData("postalCode", components.postalCode || "");
                        if (components.latitude != null) updateFormData("latitude", components.latitude);
                        if (components.longitude != null) updateFormData("longitude", components.longitude);
                      }
                    }}
                    placeholder="Ej. Calle Gran Vía, 25"
                    className={`border p-2 w-full rounded ${
                      validationErrors.address ? "border-red-500" : ""
                    }`}
                  />
                </div>
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setShowLocationPicker(true)}
                        className="flex items-center justify-center h-10 w-10 rounded-md border border-input bg-muted/30 hover:bg-muted/60 transition shrink-0"
                      >
                        <MapPin className="h-4 w-4 text-[#6B21A8]" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {t("pickLocationFromMap") || "Seleccionar ubicación en el mapa"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <LocationPickerDialog
                open={showLocationPicker}
                onOpenChange={setShowLocationPicker}
                initialLat={formData.latitude}
                initialLng={formData.longitude}
                onLocationSelect={(formattedAddress, components) => {
                  updateFormData("address", formattedAddress);
                  updateFormData("street", components.street || "");
                  updateFormData("streetNumber", components.streetNumber || "");
                  updateFormData("locality", components.city || "");
                  updateFormData("province", components.province || "");
                  updateFormData("country", components.country || "");
                  updateFormData("postalCode", components.postalCode || "");
                  updateFormData("latitude", components.latitude ?? null);
                  updateFormData("longitude", components.longitude ?? null);
                }}
              />
              {validationErrors.address && (
                <p className="mt-1 text-sm text-red-500">
                  This field is required
                </p>
              )}
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
                placeholder="Ej. Juan Pérez"
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
                {t("mobile")}
              </Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  updateFormData("contactPhone", val);
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ej. 612345678"
                className="mt-1"
              />
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
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  updateFormData("landline", val);
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ej. 912345678"
                className="mt-1"
              />
            </div>

            <div>
              <Label
                htmlFor="contactEmail"
                className="text-sm font-medium text-foreground"
              >
                {t("email")}
              </Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => updateFormData("contactEmail", e.target.value)}
                placeholder="ejemplo@correo.com"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleCreate}
                className="text-white px-6 w-full sm:w-auto"
                style={{ backgroundColor: "#662D91" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#551A80")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#662D91")}
                disabled={isLoading}
              >
                {isLoading ? (t("creating") || "Creando...") : (t("create") || "Crear")}
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
