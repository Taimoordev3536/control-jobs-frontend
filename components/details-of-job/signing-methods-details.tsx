"use client"

import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useTranslation } from "@/hooks/use-translation"
import { Card } from "@/components/ui/card"

interface SigningMethodsDetailsProps {
  jobData: any
  isEditable: boolean
}

export function SigningMethodsDetails({ jobData, isEditable }: SigningMethodsDetailsProps) {
  const { t } = useTranslation()

  const signingMethods = jobData?.signingMethods || []

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-center mb-6 underline">{t("signingMethods") || "Signing Methods"}</h3>

      <div className="grid gap-4">
        {signingMethods.length > 0 ? (
          signingMethods.map((method: any, idx: number) => (
            <Card key={idx} className="p-4">
              <h4 className="font-medium text-foreground mb-3 capitalize">{method.methodType}</h4>
              <div className="space-y-2">
                {method.methodDetails?.map((detail: string, detailIdx: number) => (
                  <div key={detailIdx} className="flex items-center space-x-2">
                    <Checkbox checked={true} disabled={true} />
                    <Label className="text-sm capitalize cursor-pointer">{detail}</Label>
                  </div>
                ))}
              </div>
              {method.verifyIdentity && (
                <div className="mt-3 text-sm text-muted-foreground">
                  <strong>Verify Identity:</strong> Required
                </div>
              )}
            </Card>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">No signing methods configured</div>
        )}
      </div>
    </div>
  )
}
