"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import type { DjangoUser } from "@/context/AuthContext"
import { ApiClient } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { 
  Users, 
  FileText, 
  Building2,
  Download,
  RefreshCw,
  Loader2,
  TrendingUp,
  Activity
} from "lucide-react"

interface AnalyticsData {
  summary: {
    total_reports: number
    total_users: number
    total_org_units: number
  }
  reportsByOrgUnit: Array<{ org_unit: string; count: number }>
  reportsByType: Array<{ report_type: string; count: number }>
  reportsOverTime: Array<{ period: string; count: number }>
  userActivity: Array<{ date: string; new_reports: number }>
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

const AnalyticsPage: React.FC = () => {
  const { djangoUser } = useAuth() as { djangoUser: DjangoUser | null }
  
  // Check if user is staff or superuser
  const isSuperuser = Boolean((djangoUser as unknown as { is_superuser?: boolean })?.is_superuser)
  const isStaff = Boolean((djangoUser as unknown as { is_staff?: boolean })?.is_staff)
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("last_30_days")
  const [selectedOrgUnit] = useState("all")

  const loadAnalyticsData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await ApiClient.getAnalytics({
        period: selectedPeriod,
        org_unit: selectedOrgUnit
      })
      
      setAnalyticsData(response.data)
    } catch (err) {
      console.error("Failed to load analytics:", err)
      setError("Failed to load analytics data. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod, selectedOrgUnit])

  useEffect(() => {
    loadAnalyticsData()
  }, [loadAnalyticsData])

  const handleRefresh = () => {
    loadAnalyticsData()
  }

  const handleExport = () => {
    if (!analyticsData) return
    
    const dataStr = JSON.stringify(analyticsData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analytics-${selectedPeriod}-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Show error if user is not staff or superuser
  if (!isSuperuser && !isStaff) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">Analytics Dashboard</h1>
        <Alert>
          <AlertDescription>
            Analytics dashboard is only available to staff and administrators. 
            Contact your administrator if you need access.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 text-lg">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={handleRefresh} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert>
          <AlertDescription>No analytics data available.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const totalReports = analyticsData.reportsOverTime.reduce((sum, item) => sum + item.count, 0)
  const totalActivity = analyticsData.userActivity.reduce((sum, item) => sum + item.new_reports, 0)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Comprehensive insights and performance metrics
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_7_days">Last 7 days</SelectItem>
                <SelectItem value="last_30_days">Last 30 days</SelectItem>
                <SelectItem value="last_90_days">Last 90 days</SelectItem>
                <SelectItem value="last_365_days">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} className="bg-white">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium text-white/90">Total Reports</CardTitle>
              <FileText className="h-8 w-8 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-2">{analyticsData.summary.total_reports}</div>
              <p className="text-sm text-white/80 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {totalReports} in selected period
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-600 to-red-700 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium text-white/90">Active Users</CardTitle>
              <Users className="h-8 w-8 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-2">{analyticsData.summary.total_users}</div>
              <p className="text-sm text-white/80 flex items-center gap-1">
                <Activity className="h-4 w-4" />
                {totalActivity} submissions tracked
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium text-white/90">Organization Units</CardTitle>
              <Building2 className="h-8 w-8 text-white/80" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold mb-2">{analyticsData.summary.total_org_units}</div>
              <p className="text-sm text-white/80">
                {analyticsData.reportsByOrgUnit.length} units with reports
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reports Over Time */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Reports Over Time</CardTitle>
              <CardDescription>
                Submission trends by period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={analyticsData.reportsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Reports by Type */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Reports by Type</CardTitle>
              <CardDescription>
                Distribution across report types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={analyticsData.reportsByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ report_type, count, percent }) => 
                      `${report_type}: ${count} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {analyticsData.reportsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reports by Organization Unit */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Reports by Organization Unit</CardTitle>
              <CardDescription>
                Report volume by organizational unit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={analyticsData.reportsByOrgUnit.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="org_unit" 
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* User Activity */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">User Activity</CardTitle>
              <CardDescription>
                Daily report submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={analyticsData.userActivity.slice(-30)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#6b7280"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="new_reports" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Data Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Organizations Table */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Top Organizations</CardTitle>
              <CardDescription>
                Organizations with most reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rank</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Organization</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.reportsByOrgUnit.slice(0, 8).map((item, index) => (
                      <tr key={item.org_unit} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">#{index + 1}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{item.org_unit}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-right text-gray-900">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Report Types Table */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Report Type Distribution</CardTitle>
              <CardDescription>
                Breakdown by report type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Report Type</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Count</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.reportsByType.map((item) => {
                      const percentage = ((item.count / analyticsData.summary.total_reports) * 100).toFixed(1)
                      return (
                        <tr key={item.report_type} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-700">{item.report_type}</td>
                          <td className="py-3 px-4 text-sm font-semibold text-right text-gray-900">{item.count}</td>
                          <td className="py-3 px-4 text-sm text-right text-gray-600">{percentage}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage