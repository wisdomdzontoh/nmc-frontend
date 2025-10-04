/**
 * Reports Viewing Page - DHIS2 Style
 * Shows submitted reports and their status
 */

"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  FileText, 
  Calendar, 
  Building2, 
  Download,
  Eye,
  Search,
  Loader2,
  CheckCircle,
  Clock,
  User
} from "lucide-react"
import api from "@/lib/api"

interface Report {
  id: number
  report_type: number
  report_type_name: string
  org_unit: number
  org_unit_name: string
  reporting_period: string
  submitted_by: number
  submitted_at: string
  values: ReportValue[]
}

interface ReportValue {
  id: number
  data_element: number
  data_element_name: string
  value: number | null
}

const ReportsPage: React.FC = () => {
  const { djangoUser } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [periodFilter, setPeriodFilter] = useState("all")

  // Load reports
  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await api.get("/reporting/reports/")
        setReports(response.data.results || response.data)
      } catch (err: any) {
        console.error("Failed to load reports:", err)
        setError("Failed to load reports. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [])

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.report_type_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.org_unit_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPeriod = periodFilter === "all" || 
      report.reporting_period.startsWith(periodFilter)

    return matchesSearch && matchesPeriod
  })

  // Generate period options (last 12 months)
  const generatePeriodOptions = () => {
    const periods = []
    const now = new Date()
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const period = date.toISOString().slice(0, 7) // YYYY-MM format
      const label = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      })
      periods.push({ value: period, label })
    }
    
    return periods
  }

  // Get status badge (simplified - all reports are "submitted")
  const getStatusBadge = (report: Report) => {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="mr-1 h-3 w-3" />
        Submitted
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Submitted Reports</h1>
          <p className="text-muted-foreground">
            View and manage your submitted reports
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>{djangoUser?.org_unit_name || "No organization assigned"}</span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search and Filter Reports</CardTitle>
          <CardDescription>
            Find reports by name, organization, or period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                {generatePeriodOptions().map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {
              setSearchTerm("")
              setPeriodFilter("all")
            }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No reports found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || periodFilter !== "all" 
                  ? "Try adjusting your search or filter criteria." 
                  : "No reports have been submitted yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold">{report.report_type_name}</h3>
                      {getStatusBadge(report)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-2" />
                        {report.org_unit_name}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(report.reporting_period).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        {new Date(report.submitted_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 mt-2">
                      Data elements: {report.values.length} values submitted
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

export default ReportsPage