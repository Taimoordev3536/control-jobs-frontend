"use client"

import React, { useState, useEffect } from 'react'
import { Clock, Calendar, User, MapPin, Edit3, CheckCircle, XCircle, Play, Square, MoreVertical, Check, X, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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
  status: "scheduled" | "in_progress" | "completed"
  startDate: Date
  endDate: Date
  signingMethods: {
    qrCode?: boolean
    gps?: boolean
    wifi?: boolean
    ip?: boolean
    callerId?: boolean
  }
  tasks: Array<{
    id: number
    name: string
    description: string
    completed: boolean
    duration: string
    timing: "during" | "after"
  }>
  checkInTime?: Date
  checkOutTime?: Date
  breakTime: number
  workedTime: number
  expectedHours: number
  totalHours?: number
  breakStartTime?: Date
  totalBreakTime: number
  isOnBreak: boolean
  tags: string[]
  hasAttendanceRecord: boolean
  survey?: {
    rating: number
    comments: string
    submitted: boolean
    submittedAt?: Date
  }
}

interface JobAttendanceDetailProps {
  job: JobAssignment
  onBack: () => void
}

interface TimeEntry {
  date: string
  checkIn: string | null
  checkOut: string | null
  totalHours: number | null
  status: 'completed' | 'active' | 'absent' | 'pending'
  taskStatus: 'completed' | 'pending' | 'absent'
  notes: string
  completedTasks: number[]
}

export function JobAttendanceDetail({ job, onBack }: JobAttendanceDetailProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [currentPage, setCurrentPage] = useState(1)
  const [entriesPerPage] = useState(10)
  const [dateFilter, setDateFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Mock job data based on the passed job
  const jobData = {
    id: job.jobId,
    title: job.title,
    employer: 'John Smith', // This would come from API
    client: job.client.name,
    worker: 'Mike Wilson', // This would come from API
    startDate: job.startDate.toISOString().split('T')[0],
    endDate: job.status === 'completed' ? job.endDate.toISOString().split('T')[0] : null,
    status: job.status === 'completed' ? 'completed' : 'active',
    location: job.workCenter.address,
    description: `${job.title} at ${job.workCenter.name}`,
    hasDefinedTasks: job.tasks.length > 0
  }

  // Available tasks for the job
  const availableTasks = job.tasks.map(task => ({
    id: task.id,
    name: task.name
  }))

  // Generate mock attendance data
  const generateAttendanceData = (): TimeEntry[] => {
    const entries: TimeEntry[] = []
    const startDate = new Date(job.startDate)
    const endDate = job.status === 'completed' ? new Date(job.endDate) : new Date()
    const workStatuses = ['present', 'present', 'present', 'active', 'absent']

    // Generate entries for each day between start and end date
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      // Skip weekends for most jobs (optional logic)
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday = 0, Saturday = 6
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      // Skip some random days (no work scheduled)
      if (Math.random() > 0.8) {
        currentDate.setDate(currentDate.getDate() + 1)
        continue
      }

      const workStatus = workStatuses[Math.floor(Math.random() * workStatuses.length)]
      const checkInHour = 8 + Math.floor(Math.random() * 2)
      const checkInMinute = Math.floor(Math.random() * 60)
      const workDuration = 6 + Math.random() * 4

      const checkIn = `${checkInHour.toString().padStart(2, '0')}:${checkInMinute.toString().padStart(2, '0')}`
      let checkOut = null
      let totalHours = null
      let completedTasks: number[] = []
      let taskStatus: 'completed' | 'pending' | 'absent' = 'pending'
      let notes = ''

      if (workStatus === 'present') {
        // Completed work day
        const endTime = new Date()
        endTime.setHours(checkInHour, checkInMinute)
        endTime.setHours(endTime.getHours() + Math.floor(workDuration))
        endTime.setMinutes(endTime.getMinutes() + (workDuration % 1) * 60)

        checkOut = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`
        totalHours = Math.round(workDuration * 10) / 10

        if (jobData.hasDefinedTasks) {
          // Job with defined tasks - check if ALL tasks completed
          const allTasksCompleted = Math.random() > 0.3

          if (allTasksCompleted) {
            completedTasks = availableTasks.map(task => task.id) // ALL tasks completed
            taskStatus = 'completed'
            notes = 'All tasks completed successfully'
          } else {
            // Some tasks completed, some pending
            completedTasks = availableTasks
              .filter(() => Math.random() > 0.4)
              .map(task => task.id)
            taskStatus = 'pending'
            notes = `Work completed but ${availableTasks.length - completedTasks.length} tasks still pending`
          }
        } else {
          // Free-form job - status based on worker's declaration or time-based completion
          const jobCompleted = Math.random() > 0.2 // 80% chance work is completed
          taskStatus = jobCompleted ? 'completed' : 'pending'
          notes = jobCompleted ? 'Work completed successfully' : 'Work completed but may need follow-up'
        }
      } else if (workStatus === 'active') {
        // Currently working
        if (jobData.hasDefinedTasks) {
          completedTasks = availableTasks
            .filter(() => Math.random() > 0.6)
            .map(task => task.id)
        }
        taskStatus = 'pending' // Always pending for active work
        notes = 'Work in progress'
      } else {
        // Absent day
        taskStatus = 'absent'
        notes = 'No work scheduled'
      }

      entries.push({
        date: currentDate.toISOString().split('T')[0],
        checkIn: workStatus === 'absent' ? null : checkIn,
        checkOut,
        totalHours,
        status: workStatus === 'present' ? (taskStatus === 'completed' ? 'completed' : 'pending') : workStatus as any,
        taskStatus,
        notes,
        completedTasks
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Add today's active entry if job is in progress
    const today = new Date().toISOString().split('T')[0]
    if (job.status === 'in_progress' && !entries.find(e => e.date === today)) {
      entries.push({
        date: today,
        checkIn: job.checkInTime ? job.checkInTime.toTimeString().slice(0, 5) : '09:00',
        checkOut: null,
        totalHours: null,
        status: 'active',
        taskStatus: 'pending',
        notes: 'Work in progress',
        completedTasks: jobData.hasDefinedTasks ? job.tasks.filter(t => t.completed).map(t => t.id) : []
      })
    }

    return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const [timeEntries] = useState(generateAttendanceData())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Calculate statistics
  const getTotalWorkedHours = () => {
    return timeEntries
      .filter(entry => entry.totalHours !== null)
      .reduce((sum, entry) => sum + (entry.totalHours || 0), 0)
  }

  const getThisMonthHours = () => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    return timeEntries
      .filter(entry => {
        const entryDate = new Date(entry.date)
        return entryDate.getMonth() === currentMonth &&
               entryDate.getFullYear() === currentYear &&
               entry.totalHours !== null
      })
      .reduce((sum, entry) => sum + (entry.totalHours || 0), 0)
  }

  const getTotalDays = () => {
    return timeEntries.filter(entry => entry.status !== 'absent').length
  }

  const getThisMonthWorkingDays = () => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.date)
      return entryDate.getMonth() === currentMonth &&
             entryDate.getFullYear() === currentYear &&
             entry.status === 'completed'
    }).length
  }

  // Filter entries based on filters
  const getFilteredEntries = () => {
    let filtered = [...timeEntries]

    const today = new Date()
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    if (dateFilter === 'today') {
      const todayStr = today.toISOString().split('T')[0]
      filtered = filtered.filter(entry => entry.date === todayStr)
    } else if (dateFilter === 'week') {
      filtered = filtered.filter(entry => new Date(entry.date) >= oneWeekAgo)
    } else if (dateFilter === 'month') {
      filtered = filtered.filter(entry => new Date(entry.date) >= oneMonthAgo)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(entry => entry.status === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.date.includes(searchTerm)
      )
    }

    return filtered
  }

  const filteredEntries = getFilteredEntries()
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage)
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Attendance Details</h1>
        </div>

        {/* Job Details Card */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{jobData.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Job ID: {jobData.id}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={`${
                  jobData.status === 'active' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                }`}>
                  {jobData.status === 'active' ? 'Active' : 'Completed'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <User size={16} className="text-blue-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Employer</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{jobData.employer}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <User size={16} className="text-green-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Client</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{jobData.client}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <User size={16} className="text-purple-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Worker</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{jobData.worker}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin size={16} className="text-red-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{jobData.location}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Hours</p>
                  <p className="text-3xl font-bold text-blue-600">{Math.round(getTotalWorkedHours())}h</p>
                </div>
                <Clock className="text-blue-500" size={32} />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This Month Hours</p>
                  <p className="text-3xl font-bold text-green-600">{Math.round(getThisMonthHours())}h</p>
                </div>
                <Calendar className="text-green-500" size={32} />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Days</p>
                  <p className="text-3xl font-bold text-purple-600">{getTotalDays()}</p>
                </div>
                <Calendar className="text-purple-500" size={32} />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This Month Working Days</p>
                  <p className="text-3xl font-bold text-orange-600">{getThisMonthWorkingDays()}</p>
                </div>
                <CheckCircle className="text-orange-500" size={32} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time History Filters */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Time History Filters</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="active">Active</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search notes or date..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">Results</label>
                <div className="flex items-center h-10 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {filteredEntries.length} of {timeEntries.length} entries
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time History */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Time History</h3>

            <div className="space-y-4">
              {paginatedEntries.length > 0 ? (
                paginatedEntries.map((entry, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          entry.taskStatus === 'completed' ? 'bg-green-100 dark:bg-green-900/20' :
                          entry.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/20' :
                          entry.status === 'absent' ? 'bg-red-100 dark:bg-red-900/20' :
                          entry.taskStatus === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          {entry.taskStatus === 'completed' ?
                            <CheckCircle className="text-green-600 dark:text-green-400" size={20} /> :
                            entry.status === 'active' ?
                            <Play className="text-blue-600 dark:text-blue-400" size={20} /> :
                            entry.status === 'absent' ?
                            <XCircle className="text-red-600 dark:text-red-400" size={20} /> :
                            entry.taskStatus === 'pending' ?
                            <Clock className="text-yellow-600 dark:text-yellow-400" size={20} /> :
                            <XCircle className="text-gray-600 dark:text-gray-400" size={20} />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(entry.date)}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {entry.checkIn ? `${entry.checkIn} - ${entry.checkOut || 'In Progress'}` : 'No Check-in'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {entry.totalHours ? `${entry.totalHours}h` : entry.status === 'absent' ? 'Absent' : '...'}
                        </p>
                        <Badge className={`${
                          entry.taskStatus === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          entry.status === 'active' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                          entry.status === 'absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        }`}>
                          {entry.taskStatus === 'completed' ? 'Completed' :
                           entry.status === 'active' ? 'Active' :
                           entry.status === 'absent' ? 'Absent' :
                           'Pending'}
                        </Badge>
                      </div>
                    </div>

                    {/* Tasks Display - Only if job has defined tasks */}
                    {entry.status !== 'absent' && (
                      <div className="space-y-2">
                        {jobData.hasDefinedTasks ? (
                          /* Job with Defined Tasks */
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tasks:</span>
                            {availableTasks.map((task) => {
                              const isCompleted = entry.completedTasks.includes(task.id)
                              return (
                                <div key={task.id} className="flex items-center space-x-1">
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                    isCompleted ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
                                  }`}>
                                    {isCompleted ?
                                      <Check className="text-green-600 dark:text-green-400" size={10} /> :
                                      <X className="text-red-600 dark:text-red-400" size={10} />
                                    }
                                  </div>
                                  <span className={`text-xs ${
                                    isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    {task.name}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          /* Free-form Job - No specific tasks */
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Work Type:</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400 italic">Free-form job (No specific tasks defined)</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {entry.notes && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{entry.notes}</p>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Calendar className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={64} />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">No entries found for the selected filters</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {((currentPage - 1) * entriesPerPage) + 1} to {Math.min(currentPage * entriesPerPage, filteredEntries.length)} of {filteredEntries.length} entries
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>

                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={pageNum === currentPage ? 'bg-purple-600 hover:bg-purple-700' : ''}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
