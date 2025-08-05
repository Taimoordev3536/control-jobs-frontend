"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, MapPin, Clock, Building, Send, ArrowLeft, Star, ClipboardList } from "lucide-react"

interface JobAssignment {
  id: number
  jobId: string
  title: string
  client: {
    id: number
    name: string
  }
  workCenter: {
    id: number
    name: string
    address: string
    coordinates: { lat: number; lng: number }
  }
  shift: {
    type: "morning" | "afternoon" | "evening"
    startTime?: string
    endTime?: string
    duration: string
    scheduleType: "fixed" | "flexible"
  }
  survey?: {
    rating: number
    comments: string
    submitted: boolean
    submittedAt?: Date
  }
}

interface SurveyCardProps {
  job: JobAssignment
  onSubmit: (rating: number, comments: string) => void
  onCancel: () => void
  isFullPage?: boolean
}

const ratingLabels = [
  { value: 1, label: "Very Poor" },
  { value: 2, label: "Poor" },
  { value: 3, label: "Average" },
  { value: 4, label: "Good" },
  { value: 5, label: "Excellent" },
]

export function SurveyCard({ job, onSubmit, onCancel, isFullPage = false }: SurveyCardProps) {
  const [rating, setRating] = useState<number>(0)
  const [comments, setComments] = useState("")

  const handleSubmit = () => {
    if (rating === 0) return
    onSubmit(rating, comments)
  }

  if (isFullPage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Job Survey</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{job.title}</p>
            </div>
          </div>
        </div>

        <div className="max-w-[800px] mx-auto p-4 space-y-6">
          {/* Job Info Card */}
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{job.title}</h2>
                  <p className="text-gray-600 dark:text-gray-400">{job.client.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span>{job.workCenter.address}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>
                    {job.shift.scheduleType === "fixed" && job.shift.startTime && job.shift.endTime
                      ? `${job.shift.startTime} - ${job.shift.endTime}`
                      : "Flexible Schedule"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Building className="w-4 h-4" />
                  <span>{job.client.name}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Badge
                    variant="outline"
                    className="font-mono bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  >
                    {job.jobId}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Survey Form */}
          <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="text-lg font-medium text-gray-900 dark:text-white mb-4 block">
                    How satisfied are you with the job? <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-5 gap-3">
                    {ratingLabels.map((ratingOption) => (
                      <button
                        key={ratingOption.value}
                        onClick={() => setRating(ratingOption.value)}
                        className={`p-4 rounded-lg border-2 text-center transition-all duration-200 ${
                          rating === ratingOption.value
                            ? "border-purple-600 bg-purple-600 text-white"
                            : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        }`}
                      >
                        <div className="text-2xl font-bold mb-1">{ratingOption.value}</div>
                        <div className="text-sm">{ratingOption.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-lg font-medium text-gray-900 dark:text-white mb-3 block">Any comments?</label>
                  <Textarea
                    placeholder="Share your thoughts, suggestions, or feedback about the job..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="min-h-[120px] resize-none text-base"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleSubmit}
                    disabled={rating === 0}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 text-base"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Submit Survey
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onCancel}
                    className="px-8 py-3 bg-transparent border-gray-300 dark:border-gray-600 text-base"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Compact survey card for dashboard
  return (
    <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{job.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{job.client.name}</p>
            <Badge
              variant="outline"
              className="mt-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            >
              {job.jobId}
            </Badge>
          </div>
        </div>

        {job.survey?.submitted ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">Rating:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= (job.survey?.rating || 0)
                        ? "text-yellow-500 fill-current"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{job.survey?.rating}/5</span>
            </div>
            {job.survey?.comments && (
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mb-3">
                <p className="text-sm text-gray-900 dark:text-white italic">"{job.survey.comments}"</p>
              </div>
            )}
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Submitted: {job.survey?.submittedAt && new Date(job.survey.submittedAt).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <ClipboardList className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">No survey submitted yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
