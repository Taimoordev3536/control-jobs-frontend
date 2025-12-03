"use client"

import { useTranslation } from "@/hooks/use-translation"
import { Card } from "@/components/ui/card"

interface SurveysDetailsProps {
  jobData: any
  isEditable: boolean
}

export function SurveysDetails({ jobData, isEditable }: SurveysDetailsProps) {
  const { t } = useTranslation()

  const survey = jobData?.survey

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-center mb-6 underline">{t("surveys") || "Surveys"}</h3>

      {survey ? (
        <div className="space-y-4">
          <Card className="p-4">
            <h4 className="font-medium text-foreground mb-2">{survey.title}</h4>
            <p className="text-sm text-foreground/80 mb-4">{survey.description}</p>

            <div className="space-y-3">
              {survey.questions?.map((question: any, idx: number) => (
                <div key={idx} className="border rounded p-3">
                  <div className="font-medium text-sm mb-2">{question.questionText}</div>
                  <div className="text-sm text-muted-foreground">
                    Type: <span className="capitalize">{question.questionType}</span>
                    {question.isRequired && <span className="ml-2 text-red-600">*Required</span>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No surveys configured</div>
      )}
    </div>
  )
}
