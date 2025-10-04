/**
 * Data Entry Page - DHIMS 2 Style
 * Allows users to select report types, periods, and enter data
 */

"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
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
  FileText, 
  Calendar, 
  Building2, 
  Save, 
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Database,
  Target,
  ChevronDown
} from "lucide-react"
import api from "@/lib/api"
import OrgUnitSelectionModal from "@/components/modals/OrgUnitSelectionModal"
import PeriodSelectionModal from "@/components/modals/PeriodSelectionModal"

interface ReportType {
  id: number
  code: string
  name: string
  description?: string
  data_elements: DataElement[]
}

interface DataElement {
  id: number
  code: string
  name: string
  description?: string
  category?: {
    id: number
    name: string
    options: CategoryOption[]
  }
}

interface CategoryOption {
  id: number
  name: string
}

interface ReportInstance {
  id?: number
  report_type: number
  org_unit: number
  reporting_period: string
  values: { [dataElementId: string]: number | null }
}

interface OrgUnit {
  id: number
  name: string
  description?: string
  parent?: number
  level: number
  is_active: boolean
  children?: OrgUnit[]
}

interface Period {
  id: string
  name: string
  startDate: string
  endDate: string
  type: "relative" | "fixed"
}

const DataEntryPage: React.FC = () => {
  const { djangoUser } = useAuth()
  const [reportTypes, setReportTypes] = useState<ReportType[]>([])
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null)
  const [selectedOrgUnits, setSelectedOrgUnits] = useState<OrgUnit[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null)
  const [dataValues, setDataValues] = useState<{ [key: string]: number | null }>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
  const [isOrgUnitModalOpen, setIsOrgUnitModalOpen] = useState(false)
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false)

  // Load report types
  useEffect(() => {
    const loadReportTypes = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await api.get("/metadata/report-types/")
        setReportTypes(response.data)
      } catch (err: any) {
        console.error("Failed to load report types:", err)
        setError("Failed to load report types. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadReportTypes()
  }, [])

  // Handle report type selection
  const handleReportTypeSelect = (reportTypeId: string) => {
    const reportType = reportTypes.find(rt => rt.id.toString() === reportTypeId)
    setSelectedReportType(reportType || null)
    setDataValues({}) // Clear previous data
    setReportingPeriod("") // Clear previous period
  }

  // Handle data value change
  const handleDataValueChange = (dataElementId: string, value: string) => {
    const numericValue = value === "" ? null : parseFloat(value)
    setDataValues(prev => ({
      ...prev,
      [dataElementId]: numericValue
    }))
  }

  // Generate reporting periods (last 12 months)
  const generateReportingPeriods = () => {
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

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedReportType || !selectedPeriod || selectedOrgUnits.length === 0) {
      setError("Please select a report type, period, and organization unit")
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      // Submit for each selected org unit
      const promises = selectedOrgUnits.map(orgUnit => {
        const reportData: ReportInstance = {
          report_type: selectedReportType.id,
          org_unit: orgUnit.id,
          reporting_period: selectedPeriod.startDate,
          values: dataValues
        }
        return api.post("/reporting/data-entry/", reportData)
      })

      await Promise.all(promises)
      
      setSuccess(`Report submitted successfully for ${selectedOrgUnits.length} organization unit(s)!`)
      setIsSubmitDialogOpen(false)
      
      // Reset form
      setSelectedReportType(null)
      setSelectedPeriod(null)
      setSelectedOrgUnits([])
      setDataValues({})
      
    } catch (err: any) {
      console.error("Failed to submit report:", err)
      setError("Failed to submit report. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // Check if form is ready for submission
  const isFormReady = selectedReportType && selectedPeriod && selectedOrgUnits.length > 0 && 
    Object.values(dataValues).some(value => value !== null && value !== undefined)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading report types...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Dimensions Panel */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 p-4 flex-shrink-0">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Filter dimensions</h3>
            <Input 
              placeholder="Search dimensions..." 
              className="text-sm"
            />
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">MAIN DIMENSIONS</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="text-sm">Data</span>
              </div>
              <div 
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer bg-blue-50 border border-blue-200"
                onClick={() => setIsPeriodModalOpen(true)}
              >
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">Period {selectedPeriod ? "1" : ""}</span>
                <ChevronDown className="h-3 w-3 text-blue-600 ml-auto" />
              </div>
              <div 
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer bg-blue-50 border border-blue-200"
                onClick={() => setIsOrgUnitModalOpen(true)}
              >
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-800">Organisation unit {selectedOrgUnits.length > 0 ? selectedOrgUnits.length : ""}</span>
                <ChevronDown className="h-3 w-3 text-blue-600 ml-auto" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">OTHER DIMENSIONS</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="text-sm">Assigned Categories</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">YOUR DIMENSIONS</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
                <span className="text-sm">Age Group</span>
              </div>
              <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
                <span className="text-sm">Gender</span>
              </div>
              <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                <div className="w-4 h-4 bg-gray-400 rounded"></div>
                <span className="text-sm">Service Type</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Visualization Layout Section */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="space-y-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Columns:</span>
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">Data</span>
                  <span className="text-xs text-gray-500">...</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Rows:</span>
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">Period {selectedPeriod ? "1" : ""}</span>
                  <span className="text-xs text-gray-500">...</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Filter:</span>
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded">
                  <Building2 className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">Organisation unit {selectedOrgUnits.length > 0 ? selectedOrgUnits.length : ""}</span>
                  <span className="text-xs text-gray-500">...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Entry Form */}
        <div className="flex-1 p-4 overflow-y-auto">
          {/* Alerts */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Report Type Selection */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Select Report Type
              </CardTitle>
              <CardDescription>
                Choose the type of report you want to submit data for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select onValueChange={handleReportTypeSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a report type..." />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((reportType) => (
                    <SelectItem key={reportType.id} value={reportType.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{reportType.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {reportType.code} • {reportType.data_elements?.length || 0} data elements
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Data Entry Form */}
          {selectedReportType && selectedPeriod && selectedOrgUnits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Data Entry Form
                </CardTitle>
                <CardDescription>
                  Enter values for each data element in {selectedReportType.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedReportType.data_elements?.map((dataElement) => (
                    <div key={dataElement.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">
                            {dataElement.name}
                          </label>
                          <div className="text-xs text-muted-foreground">
                            Code: {dataElement.code}
                          </div>
                          {dataElement.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {dataElement.description}
                            </div>
                          )}
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={dataValues[dataElement.id.toString()] || ""}
                            onChange={(e) => handleDataValueChange(dataElement.id.toString(), e.target.value)}
                            className="text-right"
                          />
                        </div>
                      </div>
                      {dataElement.category && (
                        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          Category: {dataElement.category.name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end mt-4">
                  <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        disabled={!isFormReady || saving}
                        className="min-w-32"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Submit Report
                          </>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Report Submission</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to submit this report? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        <div className="text-sm">
                          <strong>Report Type:</strong> {selectedReportType.name}
                        </div>
                        <div className="text-sm">
                          <strong>Period:</strong> {selectedPeriod.name}
                        </div>
                        <div className="text-sm">
                          <strong>Organization Units:</strong> {selectedOrgUnits.length} selected
                        </div>
                        <div className="text-sm">
                          <strong>Data Elements:</strong> {Object.values(dataValues).filter(v => v !== null && v !== undefined).length} of {selectedReportType.data_elements?.length || 0} completed
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={saving}>
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            "Submit Report"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Text */}
          {(!selectedReportType || !selectedPeriod || selectedOrgUnits.length === 0) && (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ready to Enter Data?
                </h3>
                <p className="text-gray-500">
                  Select a report type, period, and organization unit to begin entering data.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <OrgUnitSelectionModal
        isOpen={isOrgUnitModalOpen}
        onClose={() => setIsOrgUnitModalOpen(false)}
        onSelect={setSelectedOrgUnits}
        userOrgUnit={djangoUser?.org_unit}
      />

      <PeriodSelectionModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        onSelect={setSelectedPeriod}
      />
    </div>
  )
}

export default DataEntryPage
