/**
 * Organizations Management Page
 * Complete organization unit management interface
 */

"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { ApiClient } from "@/lib/api"
import { Building2, ChevronDown, ChevronRight, Loader2, Settings, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import ReportTypeAssignmentModal from "@/components/modals/ReportTypeAssignmentModal"

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
  is_active: boolean
}

const OrganizationsPage: React.FC = () => {
  const { djangoUser } = useAuth()
  
  // Check if user has permission to assign reports (staff or superuser)
  const canAssignReports = djangoUser?.is_staff || djangoUser?.is_superuser
  const [orgTree, setOrgTree] = useState<OrgUnit[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [selectedOrgUnit, setSelectedOrgUnit] = useState<OrgUnit | null>(null)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [assignments, setAssignments] = useState<Record<number, ReportTypeAssignment[]>>({})

  useEffect(() => {
    const fetchTree = async () => {
      setLoading(true)
      try {
        const response = await ApiClient.getOrgUnits()
        // Optionally, filter to only the user's assigned org(s) if needed
        setOrgTree(response.data)
      } catch {
        setOrgTree([])
      } finally {
        setLoading(false)
      }
    }
    fetchTree()
  }, [])

  const toggle = (id: number) => setExpanded((p) => ({ ...p, [id]: !p[id] }))

  const handleOpenAssignmentModal = (orgUnit: OrgUnit) => {
    // Double-check permissions before opening modal
    if (!canAssignReports) {
      return
    }
    setSelectedOrgUnit(orgUnit)
    setShowAssignmentModal(true)
  }

  const handleCloseAssignmentModal = () => {
    setShowAssignmentModal(false)
    setSelectedOrgUnit(null)
  }

  const handleAssignmentChange = () => {
    // Refresh assignments for the selected org unit
    if (selectedOrgUnit) {
      loadAssignments(selectedOrgUnit.id)
    }
  }

  const loadAssignments = async (orgUnitId: number) => {
    try {
      const response = await ApiClient.getOrgUnitAssignments(orgUnitId)
      setAssignments(prev => ({
        ...prev,
        [orgUnitId]: response.data || []
      }))
    } catch (error) {
      console.error("Failed to load assignments:", error)
    }
  }

  const renderTree = (nodes: OrgUnit[], level = 0) => {
    return nodes.map((node) => {
      const nodeAssignments = assignments[node.id] || []
      const activeAssignments = nodeAssignments.filter(a => a.is_active)
      
      return (
        <div key={node.id}>
          <div
            className="flex items-center py-2 pr-2 hover:bg-gray-50 rounded"
            style={{ paddingLeft: 10 + level * 18 }}
          >
            {node.children && node.children.length > 0 ? (
              <button className="mr-1 p-1" onClick={() => toggle(node.id)}>
                {expanded[node.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-6" />
            )}
            <Building2 className="h-4 w-4 mr-2 text-blue-600" />
            <div className="flex-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-base">{node.name}</span>
                {node.type && <span className="text-xs text-gray-500">{node.type}</span>}
                {activeAssignments.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    {activeAssignments.length} report{activeAssignments.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              {canAssignReports && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenAssignmentModal(node)}
                  className="ml-2"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Assign Reports
                </Button>
              )}
            </div>
          </div>
          {node.children && node.children.length > 0 && expanded[node.id] && (
            <div>{renderTree(node.children, level + 1)}</div>
          )}
        </div>
      )
    })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Organization Units</h1>
        <p className="text-muted-foreground">
          {canAssignReports 
            ? "Manage organization units and assign report types for data entry access."
            : "View organization units and their assigned report types."
          }
        </p>
        {!canAssignReports && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Only staff and superuser accounts can assign or modify report types for organization units.
            </p>
          </div>
        )}
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mr-2 text-blue-600" />
          <span className="text-gray-600">Loading organization units…</span>
        </div>
      ) : orgTree && orgTree.length > 0 ? (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          {renderTree(orgTree)}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-12">No organization units found.</div>
      )}

      {/* Report Type Assignment Modal */}
      {selectedOrgUnit && (
        <ReportTypeAssignmentModal
          orgUnit={selectedOrgUnit}
          isOpen={showAssignmentModal}
          onClose={handleCloseAssignmentModal}
          onAssignmentChange={handleAssignmentChange}
        />
      )}
    </div>
  )
}

export default OrganizationsPage
