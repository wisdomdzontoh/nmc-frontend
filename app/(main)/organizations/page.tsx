/**
 * Organizations Management Page
 * Paginated table of org units with report assignment counts + tree view toggle
 */

"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { ApiClient } from "@/lib/api"
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Settings,
  FileText,
  Search,
  X,
  ListTree,
  LayoutList,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from "lucide-react"
import { PageCard } from "@/components/layout/PageCard"
import { StatCard } from "@/components/common/stat-card"
import { EmptyState } from "@/components/common/empty-state"
import { TableSkeleton } from "@/components/common/skeletons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

interface FlatOrgUnit {
  id: number
  name: string
  code: string
  type?: string
  level: number
  parentName?: string
}

/** Flatten the MPTT tree for table view */
function flattenTree(nodes: OrgUnit[], level = 0, parentName?: string): FlatOrgUnit[] {
  const result: FlatOrgUnit[] = []
  for (const node of nodes) {
    result.push({ id: node.id, name: node.name, code: node.code, type: node.type, level, parentName })
    if (node.children?.length) {
      result.push(...flattenTree(node.children, level + 1, node.name))
    }
  }
  return result
}

const PAGE_SIZE = 15

const OrganizationsPage: React.FC = () => {
  const { djangoUser } = useAuth()
  const canAssignReports = djangoUser?.is_staff || djangoUser?.is_superuser

  const [orgTree, setOrgTree] = useState<OrgUnit[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"table" | "tree">("table")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  // Tree view state
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  // Assignment modal
  const [selectedOrgUnit, setSelectedOrgUnit] = useState<OrgUnit | null>(null)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [assignments, setAssignments] = useState<Record<number, ReportTypeAssignment[]>>({})

  useEffect(() => {
    const fetchTree = async () => {
      setLoading(true)
      try {
        const response = await ApiClient.getOrgUnits()
        setOrgTree(response.data)
      } catch {
        setOrgTree([])
      } finally {
        setLoading(false)
      }
    }
    fetchTree()
  }, [])

  const flatUnits = useMemo(() => (orgTree ? flattenTree(orgTree) : []), [orgTree])

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return flatUnits
    return flatUnits.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.code.toLowerCase().includes(q) ||
        (u.type || "").toLowerCase().includes(q)
    )
  }, [flatUnits, search])

  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filteredUnits.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Reset page when search changes
  useEffect(() => { setPage(1) }, [search])

  const loadAssignments = async (orgUnitId: number) => {
    if (assignments[orgUnitId]) return // cached
    try {
      const response = await ApiClient.getOrgUnitAssignments(orgUnitId)
      setAssignments(prev => ({ ...prev, [orgUnitId]: response.data || [] }))
    } catch {
      // silently ignore
    }
  }

  const handleOpenAssignmentModal = (orgUnit: OrgUnit | FlatOrgUnit) => {
    if (!canAssignReports) return
    const unit = orgUnit as OrgUnit
    setSelectedOrgUnit(unit)
    setShowAssignmentModal(true)
    loadAssignments(unit.id)
  }

  const handleAssignmentChange = () => {
    if (selectedOrgUnit) {
      // Invalidate cache and reload
      setAssignments(prev => { const n = { ...prev }; delete n[selectedOrgUnit.id]; return n })
      loadAssignments(selectedOrgUnit.id)
    }
  }

  const toggle = (id: number) => setExpanded((p) => ({ ...p, [id]: !p[id] }))

  const getAssignmentCount = (id: number) => {
    const a = assignments[id]
    if (!a) return null
    return a.filter(x => x.is_active).length
  }

  const renderTree = (nodes: OrgUnit[], level = 0) => {
    return nodes.map((node) => {
      const count = getAssignmentCount(node.id)
      return (
        <div key={node.id}>
          <div
            className="flex items-center py-2 pr-2 hover:bg-surface-subtle rounded-md group"
            style={{ paddingLeft: 10 + level * 20 }}
          >
            {node.children && node.children.length > 0 ? (
              <button className="mr-1 p-1 rounded hover:bg-muted" onClick={() => toggle(node.id)}>
                {expanded[node.id] ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <span className="w-6" />
            )}
            <Building2 className="h-4 w-4 mr-2 flex-shrink-0 text-primary" aria-hidden="true" />
            <div className="flex-1 flex items-center justify-between min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-sm text-foreground truncate">{node.name}</span>
                {node.type && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">{node.type}</span>
                )}
                {count !== null && count > 0 && (
                  <Badge variant="secondary" className="shrink-0 border-primary-border bg-primary-soft text-xs text-primary-hover">
                    <FileText className="h-3 w-3 mr-1" />
                    {count}
                  </Badge>
                )}
              </div>
              {canAssignReports && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { handleOpenAssignmentModal(node); }}
                  className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs h-7"
                >
                  <Settings className="h-3.5 w-3.5 mr-1" />
                  Assign
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

  const stats = useMemo(() => {
    const total = flatUnits.length
    const withAssignments = flatUnits.filter(u => (getAssignmentCount(u.id) ?? 0) > 0).length
    return { total, withAssignments }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatUnits, assignments])

  return (
    <div className="space-y-6">
      <PageCard
        title="Organisation units"
        description={
          canAssignReports
            ? "See the organisation structure and choose which reports each unit fills in."
            : "See the organisation structure and the reports each unit fills in."
        }
        icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
        actions={
          <div className="inline-flex rounded-lg border border-border bg-surface-subtle p-0.5" role="group" aria-label="View">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              aria-pressed={viewMode === "table"}
            >
              <LayoutList className="h-4 w-4" aria-hidden="true" />
              Table
            </Button>
            <Button
              variant={viewMode === "tree" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("tree")}
              aria-pressed={viewMode === "tree"}
            >
              <ListTree className="h-4 w-4" aria-hidden="true" />
              Tree
            </Button>
          </div>
        }
      />

      {!loading && flatUnits.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Organisation units" value={stats.total} tint="blue" icon={<Building2 className="h-5 w-5" aria-hidden="true" />} />
          <StatCard
            label="Units with reports"
            value={stats.withAssignments}
            hint="Units with at least one report assigned"
            tint="red"
            icon={<FileText className="h-5 w-5" aria-hidden="true" />}
          />
        </div>
      )}

      {loading ? (
        <section className="rounded-xl border border-border bg-card">
          <TableSkeleton rows={6} columns={4} />
        </section>
      ) : !orgTree || orgTree.length === 0 ? (
        <section className="rounded-xl border border-border bg-card">
          <EmptyState
            illustration="empty-list"
            title="No organisation units yet"
            description="Organisation units you can see will appear here. If you expected some, ask your administrator."
          />
        </section>
      ) : viewMode === "table" ? (
        /* ── TABLE VIEW ── */
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">All Organization Units</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {filteredUnits.length} unit{filteredUnits.length !== 1 ? "s" : ""} found
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search units..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm border-border"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-primary-hover to-primary hover:bg-none">
                    <TableHead className="text-error font-semibold text-xs uppercase tracking-wider">Name</TableHead>
                    <TableHead className="text-error font-semibold text-xs uppercase tracking-wider w-32">Code</TableHead>
                    <TableHead className="text-error font-semibold text-xs uppercase tracking-wider w-28 hidden sm:table-cell">Type</TableHead>
                    <TableHead className="text-error font-semibold text-xs uppercase tracking-wider w-28 hidden md:table-cell">Level</TableHead>
                    <TableHead className="text-error font-semibold text-xs uppercase tracking-wider w-28 text-center">Reports</TableHead>
                    {canAssignReports && (
                      <TableHead className="text-error font-semibold text-xs uppercase tracking-wider w-28 text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canAssignReports ? 6 : 5} className="text-center py-10 text-muted-foreground">
                        No organization units found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((unit, idx) => {
                      const count = getAssignmentCount(unit.id)
                      return (
                        <TableRow
                          key={unit.id}
                          className={`${idx % 2 === 0 ? "bg-card" : "bg-surface-subtle/50"} hover:bg-surface-muted/60`}
                          onMouseEnter={() => loadAssignments(unit.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-0.5 rounded-full self-stretch min-h-[20px]"
                                style={{ background: unit.level === 0 ? "hsl(var(--primary))" : unit.level === 1 ? "hsl(var(--primary) / 0.65)" : "hsl(var(--primary) / 0.35)", marginLeft: unit.level * 12 }}
                              />
                              <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                              <span className="font-medium text-foreground text-sm">{unit.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {unit.code}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-xs text-muted-foreground">{unit.type || "—"}</span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-xs text-muted-foreground">Level {unit.level + 1}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {count === null ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : count > 0 ? (
                              <Badge variant="secondary" className="border-primary-border bg-primary-soft text-xs text-primary-hover">
                                {count}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          {canAssignReports && (
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleOpenAssignmentModal(unit)}
                              >
                                <Settings className="h-3.5 w-3.5 mr-1" />
                                Assign
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-surface-subtle/60 text-sm text-muted-foreground">
              <span>
                {filteredUnits.length === 0
                  ? "No results"
                  : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredUnits.length)} of ${filteredUnits.length}`}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-border"
                  disabled={currentPage === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-xs">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 border-border"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ── TREE VIEW ── */
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base">Hierarchy View</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search units..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm border-border"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!canAssignReports && (
              <div className="mb-3 p-3 bg-pending-bg border border-pending-border rounded-md">
                <p className="text-xs text-pending">
                  Only staff and administrators can assign report types to organization units.
                </p>
              </div>
            )}
            <div className="space-y-0.5">
              {renderTree(orgTree)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Type Assignment Modal */}
      {selectedOrgUnit && (
        <ReportTypeAssignmentModal
          orgUnit={selectedOrgUnit}
          isOpen={showAssignmentModal}
          onClose={() => { setShowAssignmentModal(false); setSelectedOrgUnit(null) }}
          onAssignmentChange={handleAssignmentChange}
        />
      )}
    </div>
  )
}

export default OrganizationsPage
