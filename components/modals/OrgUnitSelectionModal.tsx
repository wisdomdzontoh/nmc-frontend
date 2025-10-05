/**
 * Organization Unit Selection Modal — Single Select
 * - Always centered
 * - Full-screen on mobile, dialog on desktop
 * - Sticky header/footer, scrollable body
 * - Single-selection (radio-like behavior)
 */

"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
} from "lucide-react"
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
  const [pickMyUnit, setPickMyUnit] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    ;(async () => {
      try {
        setLoading(true)
        const res = await api.get("/org/tree/")
        const tree = res.data || []
        setOrgUnits(tree)
        setFiltered(tree)
        // auto-expand user's org unit branch if provided
        if (userOrgUnit) {
          setExpanded((prev) => new Set(prev).add(userOrgUnit))
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [isOpen, userOrgUnit])

  // filter tree while keeping hierarchy for matches
  useEffect(() => {
    if (!search) return setFiltered(orgUnits)
    const q = search.toLowerCase()
    const matches = (nodes: OrgUnit[]): OrgUnit[] =>
      nodes
        .map((n) => ({
          ...n,
          children: n.children ? matches(n.children) : [],
        }))
        .filter(
          (n) =>
            n.name.toLowerCase().includes(q) ||
            (n.children && n.children.length > 0)
        )
    const out = matches(orgUnits)
    setFiltered(out)

    // expand all parents of matches for visibility
    const expandAll = (nodes: OrgUnit[]) => {
      const toExpand = new Set<number>()
      const walk = (arr: OrgUnit[], parents: number[]) => {
        for (const n of arr) {
          if ((n.children && n.children.length) || n.name.toLowerCase().includes(q)) {
            parents.forEach((p) => toExpand.add(p))
          }
          if (n.children) walk(n.children, [...parents, n.id])
        }
      }
      walk(out, [])
      setExpanded(toExpand)
    }
    expandAll(out)
  }, [search, orgUnits])

  const toggleExpand = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const selectOnly = (id: number) => {
    // radio-like; click again to clear
    setSelectedId((prev) => (prev === id ? null : id))
    // turning off quick-pick if manual change conflicts
    if (pickMyUnit && userOrgUnit && id !== userOrgUnit) setPickMyUnit(false)
  }

  const applyMyUnit = (checked: boolean) => {
    setPickMyUnit(checked)
    if (!userOrgUnit) return
    setSelectedId(checked ? userOrgUnit : null)
  }

  const findById = (nodes: OrgUnit[], id: number): OrgUnit | undefined => {
    for (const n of nodes) {
      if (n.id === id) return n
      const hit = n.children && findById(n.children, id)
      if (hit) return hit
    }
    return undefined
  }

  const renderTree = (nodes: OrgUnit[], level = 0) =>
    nodes.map((n) => {
      const hasKids = !!(n.children && n.children.length)
      const isOpen = expanded.has(n.id)
      const isChecked = selectedId === n.id
      return (
        <div key={n.id} className="select-none">
          <div
            className="flex items-center py-2 px-2 hover:bg-gray-50"
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            {hasKids ? (
              <button
                type="button"
                onClick={() => toggleExpand(n.id)}
                className="mr-2 p-1 hover:bg-gray-200 rounded"
                aria-label={isOpen ? "Collapse" : "Expand"}
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6 mr-2" />
            )}

            {/* Using Checkbox component but enforcing radio behavior */}
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => selectOnly(n.id)}
              className="mr-3 rounded-full"
              aria-checked={isChecked}
              role="radio"
              aria-label={`Select ${n.name}`}
            />

            <Building2 className="h-4 w-4 mr-2 text-gray-500" />
            <span className="text-sm">{n.name}</span>
          </div>

          {isOpen && hasKids && <div>{renderTree(n.children!, level + 1)}</div>}
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="
          z-[60] p-0 sm:max-w-3xl w-[100vw] sm:w-[min(92vw,900px)]
          h-[100vh] sm:h-auto sm:max-h-[85vh]
          overflow-hidden rounded-none sm:rounded-lg
        "
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-white border-b">
          <DialogHeader className="p-4">
            <DialogTitle className="flex items-center">
              <Building2 className="mr-2 h-5 w-5" />
              Organisation unit
            </DialogTitle>
            <DialogDescription>
              Select exactly one organisation unit
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Left: quick pick + search */}
          <aside className="sm:w-64 border-b sm:border-b-0 sm:border-r bg-gray-50 p-4 space-y-3 overflow-auto">
            <div className="text-xs font-semibold text-gray-600 mb-1">
              Quick pick
            </div>
            <label className="flex items-center space-x-2">
              <Checkbox
                checked={pickMyUnit}
                onCheckedChange={(c) => applyMyUnit(Boolean(c))}
              />
              <span className="text-sm">My organisation unit</span>
            </label>

            <div className="pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Filter organisation units…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </aside>

          {/* Right: tree */}
          <section className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading organization units…</span>
              </div>
            ) : (
              <div className="p-2">
                {(filtered.length > 0 ? filtered : orgUnits).map((root) =>
                  renderTree([root])
                )}
              </div>
            )}
          </section>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 z-10 bg-white border-t">
          <DialogFooter className="p-3 sm:p-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={!selectedId}>
              Done
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default OrgUnitSelectionModal
