"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

interface WorkCenter {
  id: number
  code: string
  name: string
  denomination: string
  responsible: string
  address: string
  number: string
  floor: string
  postalCode: string
  locality: string
  province: string
  country: string
  phone: string
  mobile: string
  email: string
  observations: string
}

interface WorkCenterDescriptionTabProps {
  workCenter: WorkCenter
  onUpdate: () => void
}

export function WorkCenterDescriptionTab({ workCenter, onUpdate }: WorkCenterDescriptionTabProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
  
  const [formData, setFormData] = useState({
    denomination: workCenter.denomination || "",
    responsible: workCenter.responsible || "",
    address: workCenter.address || "",
    number: workCenter.number || "",
    floor: workCenter.floor || "",
    postalCode: workCenter.postalCode || "",
    locality: workCenter.locality || "",
    province: workCenter.province || "",
    country: workCenter.country || "",
    phone: workCenter.phone || "",
    mobile: workCenter.mobile || "",
    email: workCenter.email || "",
    observations: workCenter.observations || "",
  })

  const [isSaving, setIsSaving] = useState(false)

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!session?.accessToken) return

    setIsSaving(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenter.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onUpdate()
        alert("Centro de trabajo actualizado correctamente")
      } else {
        alert("Error al actualizar el centro de trabajo")
      }
    } catch (error) {
      console.error("Error saving work center:", error)
      alert("Error al guardar los cambios")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      denomination: workCenter.denomination || "",
      responsible: workCenter.responsible || "",
      address: workCenter.address || "",
      number: workCenter.number || "",
      floor: workCenter.floor || "",
      postalCode: workCenter.postalCode || "",
      locality: workCenter.locality || "",
      province: workCenter.province || "",
      country: workCenter.country || "",
      phone: workCenter.phone || "",
      mobile: workCenter.mobile || "",
      email: workCenter.email || "",
      observations: workCenter.observations || "",
    })
  }

  const handleDelete = async () => {
    if (!confirm("¿Está seguro de que desea eliminar este centro de trabajo?")) return
    if (!session?.accessToken) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenter.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })

      if (response.ok) {
        alert("Centro de trabajo eliminado correctamente")
        window.history.back()
      } else {
        alert("Error al eliminar el centro de trabajo")
      }
    } catch (error) {
      console.error("Error deleting work center:", error)
      alert("Error al eliminar el centro de trabajo")
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Row 1: Denominación and Responsable */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="denomination">Denominación</Label>
              <Input
                id="denomination"
                value={formData.denomination}
                onChange={(e) => handleChange("denomination", e.target.value)}
                placeholder="Sucursal 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsible">Responsable</Label>
              <Input
                id="responsible"
                value={formData.responsible}
                onChange={(e) => handleChange("responsible", e.target.value)}
                placeholder="Responsable 1"
              />
            </div>
          </div>

          {/* Row 2: Dirección, Nº, Piso/Puerta, Cod. Postal */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Gran Vía"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Nº</Label>
              <Input
                id="number"
                value={formData.number}
                onChange={(e) => handleChange("number", e.target.value)}
                placeholder="25"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor">Piso/Puerta...</Label>
              <Input
                id="floor"
                value={formData.floor}
                onChange={(e) => handleChange("floor", e.target.value)}
                placeholder="5º"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Cod. Postal</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => handleChange("postalCode", e.target.value)}
                placeholder="49123"
              />
            </div>
          </div>

          {/* Row 3: Localidad, Provincia, País */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="locality">Localidad</Label>
              <Input
                id="locality"
                value={formData.locality}
                onChange={(e) => handleChange("locality", e.target.value)}
                placeholder="Sevilla"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Provincia</Label>
              <Input
                id="province"
                value={formData.province}
                onChange={(e) => handleChange("province", e.target.value)}
                placeholder="Sevilla"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleChange("country", e.target.value)}
                placeholder="España"
              />
            </div>
          </div>

          {/* Row 4: Teléfono, Movil, Email */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="946123555"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Movil</Label>
              <Input
                id="mobile"
                value={formData.mobile}
                onChange={(e) => handleChange("mobile", e.target.value)}
                placeholder="645888999"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="sucursal@cliente1.com"
              />
            </div>
          </div>

          {/* Row 5: Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => handleChange("observations", e.target.value)}
              placeholder=""
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <div className="flex gap-2">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Guardar
              </Button>
              <Button 
                onClick={handleCancel} 
                variant="secondary"
              >
                Cancelar
              </Button>
            </div>
            <Button 
              onClick={handleDelete} 
              variant="destructive"
              className="bg-yellow-500 hover:bg-yellow-600 text-black"
            >
              Eliminar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
