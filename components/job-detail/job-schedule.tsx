"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, Users, Plus } from "lucide-react"

interface JobScheduleTabProps {
  jobId: string
  jobData?: any
}

export default function JobScheduleTab({ jobId, jobData }: JobScheduleTabProps) {
  // Demo data - replace with actual API call
  const scheduleItems = [
    {
      id: 1,
      title: "Morning Shift",
      startTime: "08:00",
      endTime: "16:00",
      date: "2024-01-15",
      location: "Site A - Building 1",
      assignedWorkers: ["John Doe", "Jane Smith", "Mike Johnson"],
      status: "scheduled",
      notes: "Regular maintenance work",
    },
    {
      id: 2,
      title: "Evening Shift",
      startTime: "16:00",
      endTime: "00:00",
      date: "2024-01-15",
      location: "Site A - Building 2",
      assignedWorkers: ["Sarah Wilson", "Tom Brown"],
      status: "in-progress",
      notes: "Emergency repair work",
    },
    {
      id: 3,
      title: "Night Shift",
      startTime: "00:00",
      endTime: "08:00",
      date: "2024-01-16",
      location: "Site B - Main Hall",
      assignedWorkers: ["Alex Davis"],
      status: "completed",
      notes: "Security patrol and monitoring",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "scheduled":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Job Schedule</h2>
        <Button className="bg-[#662D91] hover:bg-[#662D91]/90">
          <Plus className="w-4 h-4 mr-2" />
          Add Schedule
        </Button>
      </div>

      <div className="grid gap-4">
        {scheduleItems.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">Date:</span>
                    <p className="text-sm text-muted-foreground">{item.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">Time:</span>
                    <p className="text-sm text-muted-foreground">
                      {item.startTime} - {item.endTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">Location:</span>
                    <p className="text-sm text-muted-foreground">{item.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">Workers:</span>
                    <p className="text-sm text-muted-foreground">{item.assignedWorkers.length} assigned</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <span className="font-medium">Assigned Workers:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {item.assignedWorkers.map((worker, index) => (
                    <Badge key={index} variant="outline">
                      {worker}
                    </Badge>
                  ))}
                </div>
              </div>

              {item.notes && (
                <div className="mb-4">
                  <span className="font-medium">Notes:</span>
                  <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Edit Schedule
                </Button>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
                {item.status === "scheduled" && (
                  <Button variant="outline" size="sm">
                    Start Shift
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
