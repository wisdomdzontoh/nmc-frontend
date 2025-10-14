/**
 * Modern Dashboard Page
 * Clean, responsive, and user-friendly dashboard interface with real-time analytics
 */

"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { ApiClient } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  Users, 
  FileText, 
  TrendingUp, 
  Building2, 
  Activity,
  BarChart3,
  RefreshCw,
  Eye
} from "lucide-react"
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts"

interface OrgUnit {
  id: number
  name: string
  parent?: number
}

interface ReportType {
  id: number
  name: string
  description?: string
}


interface DashboardAnalytics {
  summary: {
    total_reports: number
    total_users: number
    total_org_units: number
  }
  reportsByOrgUnit: Array<{
    org_unit: string
    count: number
  }>
  reportsByType: Array<{
    report_type: string
    count: number
  }>
  reportsOverTime: Array<{
    period: string
    count: number
  }>
  userActivity: Array<{
    date: string
    new_reports: number
  }>
}

interface RecentReport {
  id: number
  report_type_name: string
  org_unit_name: string
  reporting_period: string
  status: string
  submitted_at: string
  submitted_by_name: string
}

const DashboardPage: React.FC = () => {
  // Auth state
  const { djangoUser: user, loading: authLoading, error: authError } = useAuth()
  
  // Component state
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [reportTypes, setReportTypes] = useState<ReportType[]>([])
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [recentReports, setRecentReports] = useState<RecentReport[]>([])
  const [selectedOrg, setSelectedOrg] = useState<string>("all")
  const [selectedPeriod, setSelectedPeriod] = useState<string>("last_30_days")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load dashboard data
  const loadDashboardData = React.useCallback(async (isRefresh = false) => {
    if (!user) return
    
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      
      // Load data in parallel
      const [orgUnitsRes, reportTypesRes, analyticsRes] = await Promise.all([
        ApiClient.getOrgUnits(),
        ApiClient.getReportTypes(),
        ApiClient.getAnalytics({
          period: selectedPeriod,
          org_unit: selectedOrg
        })
      ])
      
      setOrgUnits(orgUnitsRes.data)
      setReportTypes(reportTypesRes.data)
      setAnalytics(analyticsRes.data)
      
      // Load recent reports
      const recentReportsRes = await ApiClient.getReports({ limit: 10, ordering: '-submitted_at' })
      setRecentReports(recentReportsRes.data.results || [])
      
    } catch (err: unknown) {
      console.error("Failed to load dashboard data:", err)
      setError("Failed to load dashboard data. Please try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user, selectedOrg, selectedPeriod])

  // Load initial data
  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Refresh function
  const handleRefresh = () => {
    loadDashboardData(true)
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Auth error state
  if (authError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Authentication Error: {authError}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            You must be logged in to access the dashboard.
          </AlertDescription>
        </Alert>
      </div>
    )
  }


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user.first_name || user.username}!
          </h1>
          <p className="text-muted-foreground">
            Monitor your data entry performance and system analytics.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="min-w-[200px]">
          <label className="block text-sm font-medium mb-2">
            Organization Unit
          </label>
          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger>
              <SelectValue placeholder="Select organization unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {orgUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id.toString()}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="min-w-[200px]">
          <label className="block text-sm font-medium mb-2">
            Time Period
          </label>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger>
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7_days">Last 7 days</SelectItem>
              <SelectItem value="last_30_days">Last 30 days</SelectItem>
              <SelectItem value="last_90_days">Last 90 days</SelectItem>
              <SelectItem value="2024-01">January 2024</SelectItem>
              <SelectItem value="2024-02">February 2024</SelectItem>
              <SelectItem value="2024-03">March 2024</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.summary?.total_reports || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedPeriod === 'last_30_days' ? 'Last 30 days' : 'All time'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.summary?.total_users || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.summary?.total_org_units || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active org units
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Report Types</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportTypes.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Available types
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Reports Over Time
            </CardTitle>
            <CardDescription>
              Report submission trends by period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading chart...</span>
              </div>
            ) : analytics?.reportsOverTime && analytics.reportsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.reportsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reports by Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Reports by Organization
            </CardTitle>
            <CardDescription>
              Report distribution across org units
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading chart...</span>
              </div>
            ) : analytics?.reportsByOrgUnit && analytics.reportsByOrgUnit.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.reportsByOrgUnit}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="org_unit" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reports by Type and User Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reports by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Reports by Type
            </CardTitle>
            <CardDescription>
              Report type distribution over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading chart...</span>
              </div>
            ) : analytics?.reportsByType && analytics.reportsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.reportsByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="report_type" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [value, 'Count']}
                    labelFormatter={(label) => `Report Type: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#8884d8" 
                    strokeWidth={3}
                    dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: '#8884d8', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              User Activity
            </CardTitle>
            <CardDescription>
              Daily report submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading chart...</span>
              </div>
            ) : analytics?.userActivity && analytics.userActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.userActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="new_reports" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Recent Reports
          </CardTitle>
          <CardDescription>
            Latest reports submitted to the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading reports...</span>
            </div>
          ) : recentReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reports found.
            </div>
          ) : (
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{report.report_type_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {report.org_unit_name} • {report.reporting_period}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted by {report.submitted_by_name}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge 
                      variant={
                        report.status === 'completed' ? 'default' :
                        report.status === 'pending' ? 'secondary' : 'outline'
                      }
                    >
                      {report.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {new Date(report.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardPage