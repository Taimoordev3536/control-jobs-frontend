"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { FileText, Users, Calendar, Plus, Eye } from "lucide-react"

interface SurveysTabProps {
  jobId: string
  jobData?: any
}

export default function SurveysTab({ jobId, jobData }: SurveysTabProps) {
  // Demo data - replace with actual API call
  const surveys = [
    {
      id: 1,
      title: "Job Satisfaction Survey",
      description: "Evaluate worker satisfaction and working conditions",
      status: "active",
      createdDate: "2024-01-10",
      endDate: "2024-01-20",
      totalQuestions: 15,
      responses: 8,
      targetResponses: 12,
      responseRate: 67,
    },
    {
      id: 2,
      title: "Safety Assessment",
      description: "Assess safety protocols and identify potential hazards",
      status: "completed",
      createdDate: "2024-01-05",
      endDate: "2024-01-12",
      totalQuestions: 20,
      responses: 15,
      targetResponses: 15,
      responseRate: 100,
    },
    {
      id: 3,
      title: "Quality Control Feedback",
      description: "Gather feedback on work quality and improvement suggestions",
      status: "draft",
      createdDate: "2024-01-14",
      endDate: "2024-01-25",
      totalQuestions: 12,
      responses: 0,
      targetResponses: 10,
      responseRate: 0,
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return "bg-green-500"
    if (rate >= 50) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Job Surveys</h2>
        <Button className="bg-[#662D91] hover:bg-[#662D91]/90">
          <Plus className="w-4 h-4 mr-2" />
          Create Survey
        </Button>
      </div>

      <div className="grid gap-4">
        {surveys.map((survey) => (
          <Card key={survey.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{survey.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{survey.description}</p>
                </div>
                <Badge className={getStatusColor(survey.status)}>{survey.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">Created:</span>
                    <p className="text-sm text-muted-foreground">{survey.createdDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">End Date:</span>
                    <p className="text-sm text-muted-foreground">{survey.endDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">Questions:</span>
                    <p className="text-sm text-muted-foreground">{survey.totalQuestions}</p>
                  </div>
                </div>
              </div>

              {survey.status !== "draft" && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Response Progress:</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {survey.responses}/{survey.targetResponses} ({survey.responseRate}%)
                    </span>
                  </div>
                  <Progress value={survey.responseRate} className="h-2" />
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View Survey
                </Button>
                {survey.status === "active" && (
                  <Button variant="outline" size="sm">
                    View Responses
                  </Button>
                )}
                {survey.status === "draft" && (
                  <Button variant="outline" size="sm">
                    Edit Survey
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  Export Results
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
