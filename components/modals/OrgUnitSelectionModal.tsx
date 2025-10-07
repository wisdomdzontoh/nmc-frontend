"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
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
  code?: string
  type?: string
  description?: string
  parent?: number
  level?: number
  is_active?: boolean
  children?: OrgUnit[]
}

interface OrgUnitSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (selectedUnits: OrgUnit[]) => void
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

  // Normalize so children is always an array (memoized)
  const normalizeTree = useCallback((nodes: OrgUnit[]): OrgUnit[] => {
    return nodes.map((node) => ({
      ...node,
      is_active: node.is_active ?? true,
      children: normalizeTree(node.children ?? []),
    }))
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const loadOrgUnits = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get("/org/tree/")
        const data = normalizeTree(res.data ?? [])
        setOrgUnits(data)
        setFiltered(data)

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
  }, [isOpen, userOrgUnit, normalizeTree])

  // Filtering
  useEffect(() => {
    if (!search) {
      setFiltered(orgUnits)
      return
    }

    const q = search.toLowerCase()

    const filterTree = (nodes: OrgUnit[]): OrgUnit[] =>
      nodes
        .map((n) => ({
          ...n,
          children: filterTree(n.children ?? []),
        }))
        .filter((n) => n.name.toLowerCase().includes(q) || (n.children ?? []).length > 0)

    const result = filterTree(orgUnits)
    setFiltered(result)

    // Expand parents of matches
    const expandedIds = new Set<number>()
    const collectParents = (nodes: OrgUnit[], parents: number[] = []) => {
      for (const n of nodes) {
        if (n.name.toLowerCase().includes(q)) {
          parents.forEach((p) => expandedIds.add(p))
        }
        collectParents(n.children ?? [], [...parents, n.id])
      }
    }
    collectParents(result)
    setExpanded(expandedIds)
  }, [search, orgUnits])

  const toggleExpand = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selectOnly = (id: number) => {
    setSelectedId((prev) => (prev === id ? null : id))
    if (pickMyUnit && userOrgUnit && id !== userOrgUnit) {
      setPickMyUnit(false)
    }
  }

  const applyMyUnit = (checked: boolean) => {
    setPickMyUnit(checked)
    if (userOrgUnit) setSelectedId(checked ? userOrgUnit : null)
  }

  const findById = useMemo(() => {
    const fn = (nodes: OrgUnit[], id: number): OrgUnit | undefined => {
      for (const node of nodes) {
        if (node.id === id) return node
        const found = fn(node.children ?? [], id)
        if (found) return found
      }
      return undefined
    }
    return fn
  }, [])

  const getSelectedName = () => {
    if (!selectedId) return null
    const node = findById(orgUnits, selectedId)
    return node?.name ?? null
  }

  const renderTree = (nodes: OrgUnit[], level = 0): React.ReactNode =>
    nodes.map((node) => {
      const children = node.children ?? []
      const hasChildren = children.length > 0
      const isOpen = expanded.has(node.id)
      const isChecked = selectedId === node.id
      const isUserUnit = userOrgUnit === node.id
      const isActive = node.is_active ?? true

      return (
        <div key={node.id}>
          <div
            className={`flex items-center py-2 px-2 rounded-md transition-colors ${
              isChecked ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
            } ${!isActive ? "opacity-70 pointer-events-none" : ""}`}
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            {hasChildren ? (
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

            <Checkbox
              checked={isChecked}
              onCheckedChange={() => isActive && selectOnly(node.id)}
              className="mr-3 rounded-full"
              aria-checked={isChecked}
              role="radio"
              aria-label={`Select ${node.name}`}
            />

            <Building2
              className={`h-4 w-4 mr-2 ${isChecked ? "text-blue-600" : "text-gray-500"}`}
            />
            <span
              className={`text-sm flex-1 ${
                isChecked ? "font-medium text-blue-900" : "text-gray-900"
              }`}
            >
              {node.name}
            </span>

            {isUserUnit && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Your Unit
              </Badge>
            )}
            {!isActive && (
              <Badge variant="outline" className="ml-2 text-xs text-gray-500">
                Inactive
              </Badge>
            )}
            {hasChildren && (
              <Badge variant="outline" className="ml-2 text-xs">
                {children.length}
              </Badge>
            )}
          </div>

          {isOpen && hasChildren && (
            <div className="mt-1">{renderTree(children, level + 1)}</div>
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

  const treeData = filtered.length ? filtered : orgUnits

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent
        className="
          z-[60] p-0 sm:max-w-5xl w-[100vw] sm:w-[min(95vw,1100px)]
          h-[100vh] sm:h-[90vh]
          flex flex-col overflow-hidden
          rounded-none sm:rounded-lg
        "
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b flex-shrink-0">
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

        {/* Scrollable body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="sm:w-80 flex-shrink-0 border-r bg-gradient-to-b from-gray-50 to-white p-5 overflow-y-auto">
            <div className="space-y-6">
              {/* Quick Selection */}
              <div>
                <div className="text-xs font-semibold text-gray-600 uppercase mb-3">
                  Quick Selection
                </div>
                <label className="flex items-start space-x-3 p-3 rounded-lg border hover:border-blue-300 hover:bg-blue-50 cursor-pointer">
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

              {/* Search */}
              <div>
                <div className="text-xs font-semibold text-gray-600 uppercase mb-3">
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
                    {filtered.length === 0
                      ? "No matches found"
                      : `${filtered.length} unit(s) found`}
                  </p>
                )}
              </div>

              {/* Selected */}
              {selectedId && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-3">
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
            </div>
          </aside>

          {/* Tree Section (scrollable) */}
          <section className="flex-1 overflow-y-auto bg-white">
            {error ? (
              <div className="p-5">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
                <span className="text-sm text-gray-600">
                  Loading organization units...
                </span>
              </div>
            ) : treeData.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-600">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                {search
                  ? "No units match your search"
                  : "No organization units available"}
              </div>
            ) : (
              <div className="p-4 space-y-1">{renderTree(treeData)}</div>
            )}
          </section>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 bg-white border-t shadow-lg flex-shrink-0">
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
                {selectedId ? "Apply Selection" : "Select a Unit"}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default OrgUnitSelectionModal
