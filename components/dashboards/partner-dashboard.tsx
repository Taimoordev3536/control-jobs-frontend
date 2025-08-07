"use client"

import { useState, useEffect } from "react"
import {
  Handshake,
  Building,
  DollarSign,
  TrendingUp,
  Briefcase,
  Star,
  Eye,
  MoreHorizontal,
  Target,
  BarChart3,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

interface Employer {
  id: number
  name: string
  type: string
  activeJobs: number
  completedJobs: number
  totalRevenue: number
  rating: number
  status: "active" | "inactive" | "pending"
  joinDate: string
}

interface PartnerStats {
  totalEmployers: number
  activeEmployers: number
  totalJobs: number
  completedJobs: number
  totalRevenue: number
  monthlyRevenue: number
  commissionEarned: number
  avgRating: number
  monthlyGrowth: number
}

export default function PartnerDashboard() {
  const { t } = useTranslation()
  const { session } = useAuth()

  const [employers, setEmployers] = useState<Employer[]>([])
  const [stats, setStats] = useState<PartnerStats>({
    totalEmployers: 23,
    activeEmployers: 18,
    totalJobs: 156,
    completedJobs: 142,
    totalRevenue: 485000,
    monthlyRevenue: 45000,
    commissionEarned: 48500,
    avgRating: 4.6,
    monthlyGrowth: 22.5,
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")

  // Mock data for partner employers
  const mockEmployers: Employer[] = [
    {
      id: 1,
      name: "CleanTech Solutions",
      type: "Cleaning Services",
      activeJobs: 8,
      completedJobs: 45,
      totalRevenue: 125000,
      rating: 4.8,
      status: "active",
      joinDate: "2024-03-15",
    },
    {
      id: 2,
      name: "SecureGuard Pro",
      type: "Security Services",
      activeJobs: 12,
      completedJobs: 67,
      totalRevenue: 185000,
      rating: 4.7,
      status: "active",
      joinDate: "2024-01-20",
    },
    {
      id: 3,
      name: "TechSupport Plus",
      type: "IT Services",
      activeJobs: 5,
      completedJobs: 30,
      totalRevenue: 95000,
      rating: 4.5,
      status: "active",
      joinDate: "2024-06-10",
    },
    {
      id: 4,
      name: "MaintenanceMasters",
      type: "Maintenance",
      activeJobs: 0,
      completedJobs: 15,
      totalRevenue: 35000,
      rating: 4.2,
      status: "inactive",
      joinDate: "2024-08-05",
    },
  ]

  useEffect(() => {
    setLoading(true)
    setTimeout(() => {
      setEmployers(mockEmployers)
      setLoading(false)
    }, 1200)
  }, [])

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return {
          color:
            "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
          icon: Activity,
          badgeColor: "bg-green-500",
        }
      case "inactive":
        return {
          color:
            "bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800",
          icon: Clock,
          badgeColor: "bg-gray-500",
        }
      case "pending":
        return {
          color:
            "bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
          icon: AlertCircle,
          badgeColor: "bg-yellow-500",
        }
      default:
        return {
          color:
            "bg-gray-50 text-gray-700 border border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800",
          icon: Clock,
          badgeColor: "bg-gray-500",
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-muted rounded-full animate-spin border-t-primary"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-primary/50"></div>
        </div>
      </div>
    )
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
                  <Handshake className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Partner Dashboard</h1>
                  <p className="text-muted-foreground text-sm">Manage your employer network and business growth</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search employers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64 h-9"
                  />
                </div>
                <Button size="sm" variant="outline" className="h-9 px-4 bg-transparent">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
                <Button size="sm" className="h-9 px-4">
                  <Building className="w-4 h-4 mr-2" />
                  Add Employer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Stats Cards - Matching Employer Dashboard Style */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            {
              label: "TOTAL EMPLOYERS",
              value: stats.totalEmployers,
              change: "+3",
              icon: Building,
              iconColor: "bg-blue-500",
            },
            {
              label: "ACTIVE EMPLOYERS",
              value: stats.activeEmployers,
              change: "+2",
              icon: Activity,
              iconColor: "bg-green-500",
            },
            {
              label: "TOTAL JOBS",
              value: stats.totalJobs,
              change: "+15",
              icon: Briefcase,
              iconColor: "bg-purple-500",
            },
            {
              label: "AVG RATING",
              value: stats.avgRating,
              change: "+0.2",
              icon: Star,
              iconColor: "bg-yellow-500",
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

        {/* Revenue & Performance Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border hover:shadow-md transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">${stats.totalRevenue.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      TOTAL REVENUE
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-600 dark:text-green-400 text-sm font-semibold flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />+{stats.monthlyGrowth}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border hover:shadow-md transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">${stats.commissionEarned.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      COMMISSION EARNED
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-purple-600 dark:text-purple-400 text-sm font-semibold">
                    ${stats.monthlyRevenue.toLocaleString()}/mo
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border hover:shadow-md transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">{stats.completedJobs}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      COMPLETED JOBS
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-600 dark:text-green-400 text-sm font-semibold flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +18
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Employer Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Employers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {employers.map((employer) => {
                const statusConfig = getStatusConfig(employer.status)
                const StatusIcon = statusConfig.icon
                const completionRate =
                  employer.completedJobs > 0
                    ? (employer.completedJobs / (employer.completedJobs + employer.activeJobs)) * 100
                    : 0

                return (
                  <Card
                    key={employer.id}
                    className="border hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                  >
                    <div className="w-full h-0.5 bg-purple-500"></div>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold text-foreground">{employer.name}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs bg-muted border-border">
                              {employer.type}
                            </Badge>
                            <Badge className={`${statusConfig.color} flex items-center gap-1 text-xs font-medium`}>
                              <StatusIcon className="w-3 h-3" />
                              {employer.status.charAt(0).toUpperCase() + employer.status.slice(1)}
                            </Badge>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Analytics
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {/* Job Statistics */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
                          <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                            {employer.activeJobs}
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Active Jobs</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800 text-center">
                          <div className="text-lg font-bold text-green-700 dark:text-green-300">
                            {employer.completedJobs}
                          </div>
                          <div className="text-xs text-green-600 dark:text-green-400 font-medium">Completed</div>
                        </div>
                      </div>

                      {/* Revenue */}
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                            Total Revenue
                          </span>
                          <span className="text-lg font-bold text-purple-700 dark:text-purple-300">
                            ${employer.totalRevenue.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Completion Rate */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-foreground">Completion Rate</span>
                          <span className="text-sm font-bold text-primary">{completionRate.toFixed(0)}%</span>
                        </div>
                        <Progress value={completionRate} className="h-2" />
                      </div>

                      {/* Rating & Join Date */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                            {employer.rating}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Joined {new Date(employer.joinDate).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">Performance Analytics</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto text-sm">
                  View detailed performance metrics, trends, and insights for your employer network.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commissions" className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">Commission Management</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto text-sm">
                  Track your commission earnings, payment history, and financial reports.
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
