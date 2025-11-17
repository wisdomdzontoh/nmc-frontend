"use client"

import * as React from "react"
import { X, ChevronRight, ChevronLeft, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { ApiClient } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"

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
  const { djangoUser } = useAuth()
  const [reportTypes, setReportTypes] = React.useState<ReportType[]>([])
  const [assignments, setAssignments] = React.useState<ReportTypeAssignment[]>([])
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [availableSearchTerm, setAvailableSearchTerm] = React.useState("")
  const [chosenSearchTerm, setChosenSearchTerm] = React.useState("")
  const [selectedAvailable, setSelectedAvailable] = React.useState<Set<number>>(new Set())
  const [selectedChosen, setSelectedChosen] = React.useState<Set<number>>(new Set())

  // Check if user has permission to assign reports
  const canAssignReports = djangoUser?.is_staff || djangoUser?.is_superuser

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

  // Get available report types (not assigned)
  const availableReportTypes = reportTypes.filter(rt => 
    !assignments.some(a => a.report_type === rt.id)
  )

  // Get assigned report types
  const assignedReportTypes = assignments
    .map(assignment => {
      const reportType = reportTypes.find(rt => rt.id === assignment.report_type)
      return reportType ? { ...reportType, assignmentId: assignment.id } : null
    })
    .filter((rt): rt is ReportType & { assignmentId: number } => rt !== null)

  // Filter available report types
  const filteredAvailable = availableReportTypes.filter(rt =>
    rt.name.toLowerCase().includes(availableSearchTerm.toLowerCase()) ||
    rt.code.toLowerCase().includes(availableSearchTerm.toLowerCase())
  )

  // Filter chosen report types
  const filteredChosen = assignedReportTypes.filter(rt =>
    rt.name.toLowerCase().includes(chosenSearchTerm.toLowerCase()) ||
    rt.code.toLowerCase().includes(chosenSearchTerm.toLowerCase())
  )

  // Handle multi-select toggle
  const handleAvailableToggle = (reportTypeId: number, event: React.MouseEvent) => {
    const newSelected = new Set(selectedAvailable)
    if (event.ctrlKey || event.metaKey) {
      // Multi-select mode
      if (newSelected.has(reportTypeId)) {
        newSelected.delete(reportTypeId)
      } else {
        newSelected.add(reportTypeId)
      }
    } else {
      // Single select mode
      newSelected.clear()
      newSelected.add(reportTypeId)
    }
    setSelectedAvailable(newSelected)
  }

  const handleChosenToggle = (reportTypeId: number, event: React.MouseEvent) => {
    const newSelected = new Set(selectedChosen)
    if (event.ctrlKey || event.metaKey) {
      // Multi-select mode
      if (newSelected.has(reportTypeId)) {
        newSelected.delete(reportTypeId)
      } else {
        newSelected.add(reportTypeId)
      }
    } else {
      // Single select mode
      newSelected.clear()
      newSelected.add(reportTypeId)
    }
    setSelectedChosen(newSelected)
  }

  // Move selected items from available to chosen
  const handleMoveToChosen = async () => {
    if (selectedAvailable.size === 0) return
    
    try {
      setSaving(true)
      const selectedTypes = reportTypes.filter(rt => selectedAvailable.has(rt.id))
      
      for (const reportType of selectedTypes) {
        await handleToggleAssignment(reportType, false)
      }
      
      setSelectedAvailable(new Set())
      toast.success(`Assigned ${selectedTypes.length} report type(s) to ${orgUnit.name}`)
    } catch (error) {
      console.error("Failed to assign report types:", error)
      toast.error("Failed to assign report types")
    } finally {
      setSaving(false)
    }
  }

  // Move selected items from chosen to available
  const handleMoveToAvailable = async () => {
    if (selectedChosen.size === 0) return
    
    try {
      setSaving(true)
      const selectedTypes = assignedReportTypes.filter(rt => selectedChosen.has(rt.id))
      
      for (const reportType of selectedTypes) {
        await handleToggleAssignment(reportType, true)
      }
      
      setSelectedChosen(new Set())
      toast.success(`Removed ${selectedTypes.length} report type(s) from ${orgUnit.name}`)
    } catch (error) {
      console.error("Failed to remove report types:", error)
      toast.error("Failed to remove report types")
    } finally {
      setSaving(false)
    }
  }

  // Select all available
  const handleSelectAllAvailable = () => {
    if (selectedAvailable.size === filteredAvailable.length) {
      setSelectedAvailable(new Set())
    } else {
      setSelectedAvailable(new Set(filteredAvailable.map(rt => rt.id)))
    }
  }

  // Select all chosen
  const handleSelectAllChosen = () => {
    if (selectedChosen.size === filteredChosen.length) {
      setSelectedChosen(new Set())
    } else {
      setSelectedChosen(new Set(filteredChosen.map(rt => rt.id)))
    }
  }

  // Clear selections when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedAvailable(new Set())
      setSelectedChosen(new Set())
      setAvailableSearchTerm("")
      setChosenSearchTerm("")
    }
  }, [isOpen])

  // Check permissions - if user doesn't have permission, show error and close
  React.useEffect(() => {
    if (isOpen && !canAssignReports) {
      toast.error("You don't have permission to assign reports to organization units.")
      onClose()
    }
  }, [isOpen, canAssignReports, onClose])

  if (!isOpen) return null

  // If user doesn't have permission, don't render the modal
  if (!canAssignReports) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-6xl max-h-[90vh] my-auto overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b flex-shrink-0">
          <div>
            <CardTitle className="text-xl font-semibold">
              Report Type Assignments
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Assign report types to <strong>{orgUnit.name}</strong> {orgUnit.type && `(${orgUnit.type})`}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-6 min-h-0 flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="flex gap-4 flex-1 min-h-0">
              {/* Left Pane - Available Report Types */}
              <div className="flex-1 flex flex-col border rounded-lg overflow-hidden min-h-0 max-h-full">
                <div className="bg-gray-50 px-4 py-3 border-b flex-shrink-0">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Available report types
                  </h3>
                  <p className="text-xs text-gray-600">
                    Choose report types by selecting them and then select the &quot;Choose&quot; arrow button.
                  </p>
                </div>
                
                <div className="px-4 py-2 border-b flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Filter"
                      value={availableSearchTerm}
                      onChange={(e) => setAvailableSearchTerm(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-2">
                      {filteredAvailable.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          {availableSearchTerm ? "No report types match your search." : "No report types available."}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {filteredAvailable.map((reportType) => {
                            const isSelected = selectedAvailable.has(reportType.id)
                            return (
                              <div
                                key={reportType.id}
                                onClick={(e) => handleAvailableToggle(reportType.id, e)}
                                className={cn(
                                  "px-3 py-2 rounded cursor-pointer text-sm transition-colors",
                                  isSelected
                                    ? "bg-blue-100 text-blue-900"
                                    : "hover:bg-gray-100 text-gray-900"
                                )}
                              >
                                <div className="font-medium">{reportType.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{reportType.code}</div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="px-4 py-3 border-t bg-gray-50 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllAvailable}
                    className="w-full"
                    disabled={filteredAvailable.length === 0}
                  >
                    {selectedAvailable.size === filteredAvailable.length
                      ? "Deselect all"
                      : "Choose all report types →"}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Hold down &quot;Control&quot;, or &quot;Command&quot; on a Mac, to select more than one.
                  </p>
                </div>
              </div>

              {/* Transfer Buttons */}
              <div className="flex flex-col items-center justify-center gap-2 py-4 flex-shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleMoveToChosen}
                  disabled={selectedAvailable.size === 0 || saving}
                  className="h-10 w-10"
                  title="Move selected to chosen"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleMoveToAvailable}
                  disabled={selectedChosen.size === 0 || saving}
                  className="h-10 w-10"
                  title="Move selected to available"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </div>

              {/* Right Pane - Chosen Report Types */}
              <div className="flex-1 flex flex-col border rounded-lg overflow-hidden border-green-200 min-h-0 max-h-full">
                <div className="bg-green-50 px-4 py-3 border-b border-green-200 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Chosen report types
                  </h3>
                  <p className="text-xs text-gray-600">
                    Remove report types by selecting them and then select the &quot;Remove&quot; arrow button.
                  </p>
                </div>
                
                <div className="px-4 py-2 border-b border-green-200 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Filter"
                      value={chosenSearchTerm}
                      onChange={(e) => setChosenSearchTerm(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-2">
                      {filteredChosen.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          {chosenSearchTerm ? "No report types match your search." : "No report types assigned."}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {filteredChosen.map((reportType) => {
                            const isSelected = selectedChosen.has(reportType.id)
                            return (
                              <div
                                key={reportType.id}
                                onClick={(e) => handleChosenToggle(reportType.id, e)}
                                className={cn(
                                  "px-3 py-2 rounded cursor-pointer text-sm transition-colors",
                                  isSelected
                                    ? "bg-blue-100 text-blue-900"
                                    : "hover:bg-green-50 text-gray-900"
                                )}
                              >
                                <div className="font-medium">{reportType.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{reportType.code}</div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="px-4 py-3 border-t border-green-200 bg-green-50 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllChosen}
                    className="w-full"
                    disabled={filteredChosen.length === 0}
                  >
                    {selectedChosen.size === filteredChosen.length
                      ? "Deselect all"
                      : "← Remove all report types"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
