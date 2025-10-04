/**
 * Metadata Management Page
 * Complete metadata definitions management interface
 */

"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { ApiClient } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Database, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FileText, 
  Tag,
  Calendar,
  Loader2,
  BarChart3
} from "lucide-react"

interface ReportType {
  id: number
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  report_count?: number
}

interface ReportPeriod {
  id: number
  name: string
  description?: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CreateReportTypeData {
  name: string
  description: string
}

interface CreateReportPeriodData {
  name: string
  description: string
  start_date: string
  end_date: string
}

const MetadataPage: React.FC = () => {
  const { djangoUser } = useAuth()
  const [reportTypes, setReportTypes] = useState<ReportType[]>([])
  const [reportPeriods, setReportPeriods] = useState<ReportPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("report-types")
  
  // Report Types Dialog
  const [isCreateReportTypeDialogOpen, setIsCreateReportTypeDialogOpen] = useState(false)
  const [isSubmittingReportType, setIsSubmittingReportType] = useState(false)
  const [createReportTypeData, setCreateReportTypeData] = useState<CreateReportTypeData>({
    name: "",
    description: ""
  })

  // Report Periods Dialog
  const [isCreateReportPeriodDialogOpen, setIsCreateReportPeriodDialogOpen] = useState(false)
  const [isSubmittingReportPeriod, setIsSubmittingReportPeriod] = useState(false)
  const [createReportPeriodData, setCreateReportPeriodData] = useState<CreateReportPeriodData>({
    name: "",
    description: "",
    start_date: "",
    end_date: ""
  })

  // Load metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setLoading(true)
        setError(null)
        const [reportTypesRes, reportPeriodsRes] = await Promise.all([
          ApiClient.getReportTypes(),
          ApiClient.getReportPeriods()
        ])
        setReportTypes(reportTypesRes.data)
        setReportPeriods(reportPeriodsRes.data)
      } catch (err: any) {
        console.error("Failed to load metadata:", err)
        setError("Failed to load metadata. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadMetadata()
  }, [])

  // Handle create report type
  const handleCreateReportType = async () => {
    if (!createReportTypeData.name.trim()) {
      setError("Report type name is required")
      return
    }

    try {
      setIsSubmittingReportType(true)
      setError(null)
      
      const response = await ApiClient.createReportType(createReportTypeData)
      setReportTypes(prev => [...prev, response.data])
      setIsCreateReportTypeDialogOpen(false)
      setCreateReportTypeData({ name: "", description: "" })
    } catch (err: any) {
      console.error("Failed to create report type:", err)
      setError("Failed to create report type. Please try again.")
    } finally {
      setIsSubmittingReportType(false)
    }
  }

  // Handle create report period
  const handleCreateReportPeriod = async () => {
    if (!createReportPeriodData.name.trim()) {
      setError("Report period name is required")
      return
    }

    if (!createReportPeriodData.start_date || !createReportPeriodData.end_date) {
      setError("Start date and end date are required")
      return
    }

    try {
      setIsSubmittingReportPeriod(true)
      setError(null)
      
      const response = await ApiClient.createReportPeriod(createReportPeriodData)
      setReportPeriods(prev => [...prev, response.data])
      setIsCreateReportPeriodDialogOpen(false)
      setCreateReportPeriodData({ name: "", description: "", start_date: "", end_date: "" })
    } catch (err: any) {
      console.error("Failed to create report period:", err)
      setError("Failed to create report period. Please try again.")
    } finally {
      setIsSubmittingReportPeriod(false)
    }
  }

  // Filter data based on search term
  const filteredReportTypes = reportTypes.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredReportPeriods = reportPeriods.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading metadata...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metadata Management</h1>
          <p className="text-muted-foreground">
            Manage report types, periods, and other system metadata
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Metadata</CardTitle>
          <CardDescription>
            Find metadata items by name or description
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search metadata..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="report-types">Report Types</TabsTrigger>
          <TabsTrigger value="report-periods">Report Periods</TabsTrigger>
        </TabsList>

        {/* Report Types Tab */}
        <TabsContent value="report-types" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Report Types</h2>
            <Dialog open={isCreateReportTypeDialogOpen} onOpenChange={setIsCreateReportTypeDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Report Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Report Type</DialogTitle>
                  <DialogDescription>
                    Add a new report type to the system.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      value={createReportTypeData.name}
                      onChange={(e) => setCreateReportTypeData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter report type name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={createReportTypeData.description}
                      onChange={(e) => setCreateReportTypeData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateReportTypeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateReportType} disabled={isSubmittingReportType}>
                    {isSubmittingReportType ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReportTypes.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No report types found
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? "Try adjusting your search terms." : "Get started by creating your first report type."}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsCreateReportTypeDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Report Type
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredReportTypes.map((reportType) => (
                <Card key={reportType.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg">{reportType.name}</CardTitle>
                      </div>
                      <Badge variant={reportType.is_active ? "default" : "secondary"}>
                        {reportType.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {reportType.description && (
                      <p className="text-sm text-gray-600 mb-4">
                        {reportType.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <BarChart3 className="h-4 w-4 mr-1" />
                        {reportType.report_count || 0} reports
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Report Periods Tab */}
        <TabsContent value="report-periods" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Report Periods</h2>
            <Dialog open={isCreateReportPeriodDialogOpen} onOpenChange={setIsCreateReportPeriodDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Report Period
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Report Period</DialogTitle>
                  <DialogDescription>
                    Add a new report period to the system.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      value={createReportPeriodData.name}
                      onChange={(e) => setCreateReportPeriodData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter report period name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={createReportPeriodData.description}
                      onChange={(e) => setCreateReportPeriodData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Start Date *</label>
                      <Input
                        type="date"
                        value={createReportPeriodData.start_date}
                        onChange={(e) => setCreateReportPeriodData(prev => ({ ...prev, start_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">End Date *</label>
                      <Input
                        type="date"
                        value={createReportPeriodData.end_date}
                        onChange={(e) => setCreateReportPeriodData(prev => ({ ...prev, end_date: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateReportPeriodDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateReportPeriod} disabled={isSubmittingReportPeriod}>
                    {isSubmittingReportPeriod ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReportPeriods.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No report periods found
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? "Try adjusting your search terms." : "Get started by creating your first report period."}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsCreateReportPeriodDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Report Period
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredReportPeriods.map((reportPeriod) => (
                <Card key={reportPeriod.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-green-600" />
                        <CardTitle className="text-lg">{reportPeriod.name}</CardTitle>
                      </div>
                      <Badge variant={reportPeriod.is_active ? "default" : "secondary"}>
                        {reportPeriod.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {reportPeriod.description && (
                      <p className="text-sm text-gray-600 mb-4">
                        {reportPeriod.description}
                      </p>
                    )}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(reportPeriod.start_date).toLocaleDateString()} - {new Date(reportPeriod.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Created {new Date(reportPeriod.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default MetadataPage
