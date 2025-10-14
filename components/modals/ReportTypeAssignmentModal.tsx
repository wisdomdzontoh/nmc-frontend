"use client"

import * as React from "react"
import { X, Plus, Trash2, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { ApiClient } from "@/lib/api"

interface ReportType {
  id: number
  code: string
  name: string
  description?: string
}

interface OrgUnit {
  id: number
  name: string
  code: string
  type?: string
  children?: OrgUnit[]
}

interface ReportTypeAssignment {
  id: number
  report_type: number
  report_type_name: string
  report_type_code: string
  org_unit: number
  org_unit_name: string
  org_unit_code: string
  assigned_by: number
  assigned_by_name: string
  assigned_at: string
  is_active: boolean
}

interface Props {
  orgUnit: OrgUnit
  isOpen: boolean
  onClose: () => void
  onAssignmentChange?: () => void
}

export default function ReportTypeAssignmentModal({ 
  orgUnit, 
  isOpen, 
  onClose, 
  onAssignmentChange 
}: Props) {
  const [reportTypes, setReportTypes] = React.useState<ReportType[]>([])
  const [assignments, setAssignments] = React.useState<ReportTypeAssignment[]>([])
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [reportTypesRes, assignmentsRes] = await Promise.all([
        ApiClient.getReportTypes(),
        ApiClient.getOrgUnitAssignments(orgUnit.id)
      ])
      
      setReportTypes(reportTypesRes.data?.results || reportTypesRes.data || [])
      setAssignments(assignmentsRes.data || [])
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Failed to load report types and assignments")
    } finally {
      setLoading(false)
    }
  }, [orgUnit.id])

  // Load data when modal opens
  React.useEffect(() => {
    if (isOpen && orgUnit) {
      loadData()
    }
  }, [isOpen, orgUnit, loadData])

  const handleToggleAssignment = async (reportType: ReportType, isAssigned: boolean) => {
    try {
      setSaving(true)
      
      if (isAssigned) {
        // Remove assignment
        const assignment = assignments.find(a => a.report_type === reportType.id)
        if (assignment) {
          await ApiClient.deleteReportTypeAssignment(assignment.id)
          setAssignments(prev => prev.filter(a => a.id !== assignment.id))
          toast.success(`Removed ${reportType.name} from ${orgUnit.name}`)
        }
      } else {
        // Add assignment
        const response = await ApiClient.createReportTypeAssignment({
          report_type: reportType.id,
          org_unit: orgUnit.id,
          is_active: true
        })
        
        const newAssignment = {
          id: response.data.id,
          report_type: reportType.id,
          report_type_name: reportType.name,
          report_type_code: reportType.code,
          org_unit: orgUnit.id,
          org_unit_name: orgUnit.name,
          org_unit_code: orgUnit.code,
          assigned_by: 0, // Will be set by backend
          assigned_by_name: "Current User",
          assigned_at: new Date().toISOString(),
          is_active: true
        }
        
        setAssignments(prev => [...prev, newAssignment])
        toast.success(`Assigned ${reportType.name} to ${orgUnit.name}`)
      }
      
      onAssignmentChange?.()
    } catch (error) {
      console.error("Failed to toggle assignment:", error)
      toast.error("Failed to update assignment")
    } finally {
      setSaving(false)
    }
  }

  const filteredReportTypes = reportTypes.filter(rt =>
    rt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rt.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-semibold">
              Report Type Assignments
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Assign report types to <strong>{orgUnit.name}</strong> ({orgUnit.type})
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Report Types</Label>
            <Input
              id="search"
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Users in this organization unit and its children will be able to access the assigned report types for data entry.
            </AlertDescription>
          </Alert>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Assigned Report Types */}
              {assignments.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Assigned Report Types ({assignments.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {assignments.map((assignment) => {
                      const reportType = reportTypes.find(rt => rt.id === assignment.report_type)
                      if (!reportType) return null
                      
                      return (
                        <Card key={assignment.id} className="border-green-200 bg-green-50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {reportType.code}
                                  </Badge>
                                  <Check className="h-4 w-4 text-green-600" />
                                </div>
                                <h4 className="font-medium text-gray-900">
                                  {reportType.name}
                                </h4>
                                {reportType.description && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {reportType.description}
                                  </p>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                  Assigned by {assignment.assigned_by_name}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleAssignment(reportType, true)}
                                disabled={saving}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Available Report Types */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Available Report Types ({filteredReportTypes.length})
                </h3>
                {filteredReportTypes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? "No report types match your search." : "No report types available."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredReportTypes.map((reportType) => {
                      const isAssigned = assignments.some(a => a.report_type === reportType.id)
                      
                      return (
                        <Card key={reportType.id} className={`border-gray-200 ${isAssigned ? 'opacity-50' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {reportType.code}
                                  </Badge>
                                </div>
                                <h4 className="font-medium text-gray-900">
                                  {reportType.name}
                                </h4>
                                {reportType.description && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {reportType.description}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleAssignment(reportType, isAssigned)}
                                disabled={saving || isAssigned}
                                className={isAssigned ? "opacity-50" : ""}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
