/**
 * Modern Dashboard Page
 * Clean, responsive, and user-friendly dashboard interface
 */

"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { ApiClient } from "@/lib/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Users, FileText, TrendingUp } from "lucide-react"

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

interface Report {
  id: number
  dataset_name: string
  org_unit_name: string
  period: string
  status: string
  created_at: string
}

const DashboardPage: React.FC = () => {
  // Auth state
  const { djangoUser: user, loading: authLoading, error: authError } = useAuth()
  
  // Component state
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [reportTypes, setReportTypes] = useState<ReportType[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [selectedOrg, setSelectedOrg] = useState<string>("")
  const [selectedReportType, setSelectedReportType] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load initial data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        setError(null)
        
        // Load data in parallel
        const [orgUnitsRes, reportTypesRes, reportsRes] = await Promise.all([
          ApiClient.getOrgUnits(),
          ApiClient.getReportTypes(),
          ApiClient.getReports(),
        ])
        
        setOrgUnits(orgUnitsRes.data)
        setReportTypes(reportTypesRes.data)
        setReports(reportsRes.data.results || [])
        
      } catch (err: unknown) {
        console.error("Failed to load dashboard data:", err)
        setError("Failed to load dashboard data. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    
    loadDashboardData()
  }, [user])

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
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.first_name || user.username}!
        </h1>
        <p className="text-muted-foreground">
          Manage your data entry and view reporting analytics.
        </p>
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
            Report Type
          </label>
          <Select value={selectedReportType} onValueChange={setSelectedReportType}>
            <SelectTrigger>
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map((type) => (
                <SelectItem key={type.id} value={type.id.toString()}>
                  {type.name}
                </SelectItem>
              ))}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground">
              All time reports
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              Currently online
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              System performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
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
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reports found.
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{report.dataset_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {report.org_unit_name} • {report.period}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      report.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : report.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {report.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(report.created_at).toLocaleDateString()}
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