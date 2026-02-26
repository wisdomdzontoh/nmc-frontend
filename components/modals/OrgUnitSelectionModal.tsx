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
  Folder,
  ChevronRight,
  ChevronDown,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { cn } from "@/lib/utils"
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
            className={cn(
              "flex items-center gap-2 py-2 px-2 rounded-md transition-colors",
              isChecked ? "bg-primary/5" : "hover:bg-muted/50",
              !isActive && "opacity-70 pointer-events-none"
            )}
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label={isOpen ? "Collapse" : "Expand"}
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-5 shrink-0" />
            )}

            <Checkbox
              checked={isChecked}
              onCheckedChange={() => isActive && selectOnly(node.id)}
              className="h-4 w-4 rounded border-2 border-muted-foreground/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              aria-checked={isChecked}
              role="radio"
              aria-label={`Select ${node.name}`}
            />

            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className={cn("text-sm flex-1 truncate", isChecked ? "font-medium" : "")}>
              {node.name}
            </span>

            {isUserUnit && (
              <Badge variant="secondary" className="ml-2 text-xs shrink-0">
                Your Unit
              </Badge>
            )}
            {!isActive && (
              <Badge variant="outline" className="ml-2 text-xs text-muted-foreground shrink-0">
                Inactive
              </Badge>
            )}
            {hasChildren && (
              <Badge variant="outline" className="ml-2 text-xs shrink-0">
                {children.length}
              </Badge>
            )}
          </div>

          {isOpen && hasChildren && (
            <div className="mt-0.5">{renderTree(children, level + 1)}</div>
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
        {/* Header - title left, close right like reference */}
        <div className="sticky top-0 z-10 bg-background border-b flex-shrink-0">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 p-5">
            <div>
              <DialogTitle className="text-lg font-semibold">Organisation unit</DialogTitle>
              <DialogDescription className="text-sm mt-0.5 text-muted-foreground">
                Choose exactly one organisation unit for this report
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - User org unit checkbox + search (like reference) */}
          <aside className="sm:w-72 flex-shrink-0 border-r bg-muted/20 p-5 overflow-y-auto">
            <div className="space-y-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={pickMyUnit}
                  onCheckedChange={(c) => applyMyUnit(Boolean(c))}
                  disabled={!userOrgUnit}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className="text-sm font-medium">User organisation unit</span>
              </label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search units..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
                {search && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {filtered.length === 0 ? "No matches found" : `${filtered.length} unit(s) found`}
                  </p>
                )}
              </div>

              {selectedId && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-sm font-medium break-words">{getSelectedName()}</p>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Tree Section (scrollable) */}
          <section className="flex-1 overflow-y-auto bg-background">
            {error ? (
              <div className="p-5">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading organisation units...</span>
              </div>
            ) : treeData.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Folder className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                {search ? "No units match your search" : "No organisation units available"}
              </div>
            ) : (
              <div className="p-4 space-y-0.5">{renderTree(treeData)}</div>
            )}
          </section>
        </div>

        {/* Footer - Selected + Deselect, Hide + Update like reference */}
        <div className="sticky bottom-0 z-10 bg-background border-t flex-shrink-0">
          <DialogFooter className="p-4 flex-row justify-between items-center gap-4 flex-wrap">
            <div className="text-sm text-muted-foreground">
              Selected:{" "}
              <span className="font-medium text-foreground">
                {selectedId ? getSelectedName() ?? "1 unit selected" : "No unit selected"}
              </span>
              {selectedId && (
                <Button variant="ghost" size="sm" className="ml-2 h-auto py-0 text-muted-foreground" onClick={() => setSelectedId(null)}>
                  Deselect all
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Hide
              </Button>
              <Button onClick={handleApply} disabled={!selectedId} className="min-w-[90px]">
                Update
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default OrgUnitSelectionModal
