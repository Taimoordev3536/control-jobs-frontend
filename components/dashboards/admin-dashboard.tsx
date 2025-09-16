"use client"

import { useState, useEffect } from "react"
import {
  Shield,
  Users,
  Building,
  Briefcase,
  TrendingUp,
  DollarSign,
  BarChart3,
  Activity,
  AlertTriangle,
  CheckCircle,
  Star,
  Settings,
  UserPlus,
  FileText,
  Database,
  Search,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/hooks/use-translation"
import { LoadingSpinner } from "@/components/dashboard-loader"
import { useAuth } from "@/hooks/use-auth"

interface SystemStats {
  totalUsers: number
  totalPartners: number
  totalEmployers: number
  totalWorkers: number
  totalClients: number
  activeJobs: number
  completedJobs: number
  totalRevenue: number
  monthlyGrowth: number
  systemUptime: number
  avgRating: number
  issuesReported: number
}

interface RecentActivity {
  id: number
  type: "user_registered" | "job_created" | "job_completed" | "issue_reported"
  description: string
  timestamp: string
  severity: "low" | "medium" | "high"
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { session } = useAuth()

  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 1247,
    totalPartners: 45,
    totalEmployers: 156,
    totalWorkers: 892,
    totalClients: 154,
    activeJobs: 89,
    completedJobs: 2341,
    totalRevenue: 2450000,
    monthlyGrowth: 18.5,
    systemUptime: 99.8,
    avgRating: 4.7,
    issuesReported: 12,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")

  // Mock recent activity data
  const mockActivity: RecentActivity[] = [
    {
      id: 1,
      type: "user_registered",
      description: "New partner 'TechCorp Solutions' registered",
      timestamp: "2 minutes ago",
      severity: "low",
    },
    {
      id: 2,
      type: "job_completed",
      description: "Job JOB-1247 completed successfully",
      timestamp: "15 minutes ago",
      severity: "low",
    },
    {
      id: 3,
      type: "issue_reported",
      description: "Payment processing issue reported",
      timestamp: "1 hour ago",
      severity: "high",
    },
    {
      id: 4,
      type: "job_created",
      description: "New job request from Downtown Mall",
      timestamp: "2 hours ago",
      severity: "medium",
    },
  ]

  useEffect(() => {
    setLoading(true)
    setTimeout(() => {
      setRecentActivity(mockActivity)
      setLoading(false)
    }, 1200)
  }, [])

  const getActivityConfig = (type: string) => {
    switch (type) {
      case "user_registered":
        return { icon: UserPlus, color: "bg-green-500" }
      case "job_created":
        return { icon: Briefcase, color: "bg-blue-500" }
      case "job_completed":
        return { icon: CheckCircle, color: "bg-purple-500" }
      case "issue_reported":
        return { icon: AlertTriangle, color: "bg-red-500" }
      default:
        return { icon: Activity, color: "bg-gray-500" }
    }
  }

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
      case "medium":
        return "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
      case "low":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800"
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1800px] mx-auto p-4 space-y-4">
        {/* Header - Matching Employer Dashboard Style */}
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-lg shadow-sm">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
                  <p className="text-muted-foreground text-sm">System overview and management</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search system..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64 h-9"
                  />
                </div>
                <Button size="sm" variant="outline" className="h-9 px-4 bg-transparent">
                  <FileText className="w-4 h-4 mr-2" />
                  Reports
                </Button>
                <Button size="sm" className="h-9 px-4">
                  <Settings className="w-4 h-4 mr-2" />
                  System Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Stats Cards - Matching Employer Dashboard Style */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              label: "TOTAL USERS",
              value: stats.totalUsers.toLocaleString(),
              change: "+12%",
              icon: Users,
              iconColor: "bg-blue-500",
            },
            {
              label: "ACTIVE JOBS",
              value: stats.activeJobs,
              change: "+8%",
              icon: Activity,
              iconColor: "bg-green-500",
            },
            {
              label: "TOTAL REVENUE",
              value: `$${(stats.totalRevenue / 1000000).toFixed(1)}M`,
              change: `+${stats.monthlyGrowth}%`,
              icon: DollarSign,
              iconColor: "bg-purple-500",
            },
            {
              label: "SYSTEM UPTIME",
              value: `${stats.systemUptime}%`,
              change: "+0.2%",
              icon: Database,
              iconColor: "bg-yellow-500",
            },
            {
              label: "AVG RATING",
              value: stats.avgRating,
              change: "+0.1",
              icon: Star,
              iconColor: "bg-indigo-500",
            },
          ].map((stat, index) => (
            <Card key={index} className="border hover:shadow-md transition-all duration-300 hover:scale-105 group">
              <CardContent className="p-3">
                <div className={`w-full h-0.5 ${stat.iconColor} rounded-full mb-2`}></div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`p-1.5 rounded-lg ${stat.iconColor} group-hover:scale-110 transition-transform duration-300`}
                  >
                    <stat.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground group-hover:scale-110 transition-transform duration-300">
                      {stat.value}
                    </div>
                    <div className="text-green-600 dark:text-green-400 text-xs font-semibold flex items-center gap-1">
                      <TrendingUp className="w-2.5 h-2.5" />
                      {stat.change}
                    </div>
                  </div>
                </div>
                <div className="text-muted-foreground font-medium text-xs uppercase tracking-wider">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* User Distribution Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "PARTNERS",
              value: stats.totalPartners,
              icon: Building,
              iconColor: "bg-indigo-500",
            },
            {
              label: "EMPLOYERS",
              value: stats.totalEmployers,
              icon: Briefcase,
              iconColor: "bg-orange-500",
            },
            {
              label: "WORKERS",
              value: stats.totalWorkers,
              icon: Users,
              iconColor: "bg-teal-500",
            },
            {
              label: "CLIENTS",
              value: stats.totalClients,
              icon: Building,
              iconColor: "bg-pink-500",
            },
          ].map((stat, index) => (
            <Card key={index} className="border hover:shadow-md transition-all duration-300 hover:scale-105 group">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.iconColor}`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {stat.label}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border hover:shadow-md transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{stats.completedJobs.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      COMPLETED JOBS
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-600 dark:text-green-400 text-sm font-semibold flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +15%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border hover:shadow-md transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{stats.avgRating}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">AVG RATING</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-600 dark:text-green-400 text-sm font-semibold flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +0.1
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border hover:shadow-md transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{stats.issuesReported}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      OPEN ISSUES
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-red-600 dark:text-red-400 text-sm font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    +3
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">System Overview</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* System Health */}
              <Card className="border shadow-sm">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    System Health
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">Server Uptime</span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        {stats.systemUptime}%
                      </span>
                    </div>
                    <Progress value={stats.systemUptime} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">Database Performance</span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">97.2%</span>
                    </div>
                    <Progress value={97.2} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">API Response Time</span>
                      <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">85.4%</span>
                    </div>
                    <Progress value={85.4} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border shadow-sm">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Quick Actions
                  </h3>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add New User
                  </Button>
                  <Button className="w-full justify-start bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button className="w-full justify-start bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800">
                    <Settings className="w-4 h-4 mr-2" />
                    System Settings
                  </Button>
                  <Button className="w-full justify-start bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">User Management</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto text-sm">
                  Manage all system users, roles, and permissions from this section.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            {/* Recent Activity */}
            <Card className="border shadow-sm">
              <CardHeader>
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Recent System Activity
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity) => {
                    const config = getActivityConfig(activity.type)
                    const ActivityIcon = config.icon
                    return (
                      <div
                        key={activity.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${getSeverityConfig(activity.severity)}`}
                      >
                        <div className={`p-2 rounded-lg ${config.color}`}>
                          <ActivityIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">{activity.description}</div>
                          <div className="text-xs text-muted-foreground">{activity.timestamp}</div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            activity.severity === "high"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                              : activity.severity === "medium"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                                : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          }`}
                        >
                          {activity.severity}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">System Reports</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto text-sm">
                  Generate and view comprehensive system reports and analytics.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Floating Action Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            className="w-12 h-12 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 group"
            size="icon"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </Button>
        </div>
      </div>
    </div>
  )
}
