/**
 * Organization Unit Selection Modal — Single Select
 * - Always centered
 * - Full-screen on mobile, dialog on desktop
 * - Sticky header/footer, scrollable body
 * - Single-selection (radio-like behavior)
 * - Fixed ESLint warnings and improved UI
 */

"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Building2,
  ChevronRight,
  ChevronDown,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import api from "@/lib/api"

interface OrgUnit {
  id: number
  name: string
  description?: string
  parent?: number
  level: number
  is_active: boolean
  children?: OrgUnit[]
}

interface OrgUnitSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (selectedUnits: OrgUnit[]) => void // returns [one] or []
  userOrgUnit?: number
}

const OrgUnitSelectionModal: React.FC<OrgUnitSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  userOrgUnit,
}) => {
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [filtered, setFiltered] = useState<OrgUnit[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickMyUnit, setPickMyUnit] = useState(false)

  // Load organization units
  useEffect(() => {
    if (!isOpen) return

    const loadOrgUnits = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get("/org/tree/")
        const tree = res.data || []
        setOrgUnits(tree)
        setFiltered(tree)
        
        // Auto-expand user's org unit branch if provided
        if (userOrgUnit) {
          setExpanded((prev) => new Set(prev).add(userOrgUnit))
        }
      } catch (err) {
        console.error("Failed to load organization units:", err)
        setError("Failed to load organization units. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadOrgUnits()
  }, [isOpen, userOrgUnit])

  // Filter tree while keeping hierarchy for matches
  useEffect(() => {
    if (!search) {
      setFiltered(orgUnits)
      return
    }

    const q = search.toLowerCase()
    
    const matches = (nodeList: OrgUnit[]): OrgUnit[] =>
      nodeList
        .map((node) => ({
          ...node,
          children: node.children ? matches(node.children) : [],
        }))
        .filter(
          (node) =>
            node.name.toLowerCase().includes(q) ||
            (node.children && node.children.length > 0)
        )
    
    const out = matches(orgUnits)
    setFiltered(out)

    // Expand all parents of matches for visibility
    const toExpand = new Set<number>()
    const walk = (arr: OrgUnit[], parents: number[]): void => {
      for (const node of arr) {
        if ((node.children && node.children.length) || node.name.toLowerCase().includes(q)) {
          parents.forEach((p) => toExpand.add(p))
        }
        if (node.children) {
          walk(node.children, [...parents, node.id])
        }
      }
    }
    walk(out, [])
    setExpanded(toExpand)
  }, [search, orgUnits])

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectOnly = (id: number) => {
    // Radio-like; click again to clear
    setSelectedId((prev) => (prev === id ? null : id))
    // Turn off quick-pick if manual change conflicts
    if (pickMyUnit && userOrgUnit && id !== userOrgUnit) {
      setPickMyUnit(false)
    }
  }

  const applyMyUnit = (checked: boolean) => {
    setPickMyUnit(checked)
    if (!userOrgUnit) return
    setSelectedId(checked ? userOrgUnit : null)
  }

  const findById = (nodeList: OrgUnit[], id: number): OrgUnit | undefined => {
    for (const node of nodeList) {
      if (node.id === id) return node
      if (node.children) {
        const hit = findById(node.children, id)
        if (hit) return hit
      }
    }
    return undefined
  }

  const getSelectedName = () => {
    if (!selectedId) return null
    const unit = findById(orgUnits, selectedId)
    return unit?.name
  }

  const renderTree = (nodeList: OrgUnit[], level = 0): React.ReactNode =>
    nodeList.map((node) => {
      const hasKids = !!(node.children && node.children.length)
      const isOpen = expanded.has(node.id)
      const isChecked = selectedId === node.id
      const isUserUnit = userOrgUnit === node.id
      
      return (
        <div key={node.id} className="select-none">
          <div
            className={`
              flex items-center py-2.5 px-2 rounded-md transition-colors
              ${isChecked ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}
              ${!node.is_active ? 'opacity-60' : ''}
            `}
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            {hasKids ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="mr-2 p-1 hover:bg-gray-200 rounded transition-colors"
                aria-label={isOpen ? "Collapse" : "Expand"}
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                )}
              </button>
            ) : (
              <div className="w-6 mr-2" />
            )}

            {/* Using Checkbox component but enforcing radio behavior */}
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => node.is_active && selectOnly(node.id)}
              className="mr-3 rounded-full"
              aria-checked={isChecked}
              role="radio"
              aria-label={`Select ${node.name}`}
              disabled={!node.is_active}
            />

            <Building2 className={`h-4 w-4 mr-2 ${isChecked ? 'text-blue-600' : 'text-gray-500'}`} />
            <span className={`text-sm flex-1 ${isChecked ? 'font-medium text-blue-900' : 'text-gray-900'}`}>
              {node.name}
            </span>

            {isUserUnit && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Your Unit
              </Badge>
            )}

            {!node.is_active && (
              <Badge variant="outline" className="ml-2 text-xs text-gray-500">
                Inactive
              </Badge>
            )}

            {hasKids && (
              <Badge variant="outline" className="ml-2 text-xs">
                {node.children!.length}
              </Badge>
            )}
          </div>

          {isOpen && hasKids && (
            <div className="mt-1">
              {renderTree(node.children!, level + 1)}
            </div>
          )}
        </div>
      )
    })

  const handleApply = () => {
    if (!selectedId) {
      onSelect([])
      onClose()
      return
    }
    const selectedUnit = findById(orgUnits, selectedId)
    onSelect(selectedUnit ? [selectedUnit] : [])
    onClose()
  }

  const handleCancel = () => {
    setSearch("")
    setSelectedId(null)
    setPickMyUnit(false)
    onClose()
  }

  const treeData = filtered.length > 0 ? filtered : orgUnits

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent
        className="
          z-[60] p-0 sm:max-w-4xl w-[100vw] sm:w-[min(95vw,1000px)]
          h-[100vh] sm:h-auto sm:max-h-[90vh]
          overflow-hidden rounded-none sm:rounded-lg
        "
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white border-b">
          <DialogHeader className="p-5">
            <DialogTitle className="flex items-center text-xl">
              <Building2 className="mr-2 h-5 w-5 text-blue-600" />
              Select Organisation Unit
            </DialogTitle>
            <DialogDescription className="text-base mt-1">
              Choose exactly one organisation unit for this report
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Left: quick pick + search */}
          <aside className="sm:w-72 border-b sm:border-b-0 sm:border-r bg-gradient-to-b from-gray-50 to-white p-5 space-y-4 overflow-auto">
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Quick Selection
              </div>
              <label className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
                <Checkbox
                  checked={pickMyUnit}
                  onCheckedChange={(c) => applyMyUnit(Boolean(c))}
                  className="mt-0.5"
                  disabled={!userOrgUnit}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">
                    My organisation unit
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {userOrgUnit ? "Use your assigned unit" : "No unit assigned"}
                  </p>
                </div>
              </label>
            </div>

            <div className="pt-2">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Search
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search units..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {search && (
                <p className="text-xs text-gray-500 mt-2">
                  {filtered.length === 0 ? 'No matches found' : `${filtered.length} unit(s) found`}
                </p>
              )}
            </div>

            {selectedId && (
              <div className="pt-2">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
                  Selected Unit
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900 break-words">
                        {getSelectedName()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Right: tree */}
          <section className="flex-1 overflow-auto bg-white">
            {error ? (
              <div className="p-5">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
                  <span className="text-sm text-gray-600">Loading organization units...</span>
                </div>
              </div>
            ) : treeData.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">
                    {search ? 'No units match your search' : 'No organization units available'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 space-y-1">
                {treeData.map((root) => renderTree([root]))}
              </div>
            )}
          </section>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 bg-white border-t shadow-lg">
          <DialogFooter className="p-4 flex-row justify-between items-center space-x-2">
            <div className="text-sm text-gray-600">
              {selectedId ? (
                <span className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-1.5 text-green-600" />
                  1 unit selected
                </span>
              ) : (
                <span className="text-gray-400">No unit selected</span>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleApply} 
                disabled={!selectedId}
                className="min-w-[100px]"
              >
                {selectedId ? 'Apply Selection' : 'Select a Unit'}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default OrgUnitSelectionModal