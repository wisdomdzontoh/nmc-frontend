"use client"

import * as React from "react"
import {
  RefreshCw,
  TrendingUp,
  Database,
  Plus,
  Search,
  Edit,
  Trash2,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  BarChart3,
  Hash,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { SectionLoader } from "@/components/ui/PageLoader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import type { DjangoUser } from "@/context/AuthContext"
import { ApiClient } from "@/lib/api"
import type { IndicatorDefinition } from "@/lib/advanced-formula-evaluator"
import { IndicatorModal } from "@/components/indicators/IndicatorModal"
import { DataElementModal } from "@/components/indicators/DataElementModal"
import { BulkImportModal } from "@/components/indicators/BulkImportModal"
import { PageCard } from "@/components/layout/PageCard"
import { StatCard } from "@/components/common/stat-card"
import { StatusPill } from "@/components/common/status-pill"
import { EmptyState } from "@/components/common/empty-state"

interface DataElement {
  id: number
  code: string
  name: string
  description?: string
}

const PAGE_SIZES = [10, 25, 50, 100]

function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = React.useState(1)
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const paginated = items.slice((page - 1) * pageSize, page * pageSize)
  React.useEffect(() => { setPage(1) }, [items.length, pageSize])
  return { page, setPage, totalPages, paginated }
}

export default function IndicatorsPage() {
  const { djangoUser } = useAuth() as { djangoUser: DjangoUser | null }
  const isSuperuser = Boolean((djangoUser as unknown as { is_superuser?: boolean })?.is_superuser)
  const isStaff = Boolean((djangoUser as unknown as { is_staff?: boolean })?.is_staff)

  const [activeTab, setActiveTab] = React.useState<"indicators" | "data-elements">("indicators")
  const [indicators, setIndicators] = React.useState<IndicatorDefinition[]>([])
  const [dataElements, setDataElements] = React.useState<DataElement[]>([])
  const [loading, setLoading] = React.useState(true)

  // Report types (for filters)
  const [reportTypes, setReportTypes] = React.useState<{ id: number; name: string; code: string; data_element_ids: number[] }[]>([])

  // Indicator filters
  const [indicatorSearch, setIndicatorSearch] = React.useState("")
  const [indicatorTypeFilter, setIndicatorTypeFilter] = React.useState<"all" | "percentage" | "per_thousand" | "ratio">("all")
  const [indicatorRtFilter, setIndicatorRtFilter] = React.useState<string>("all")
  const [indicatorPageSize, setIndicatorPageSize] = React.useState(10)

  // Indicator → data element ID mapping (for report type filtering)
  const [indicatorDeIds, setIndicatorDeIds] = React.useState<Map<string, number[]>>(new Map())

  // Data element server-side pagination + search
  const [deSearchInput, setDeSearchInput] = React.useState("")
  const [deSearch, setDeSearch] = React.useState("")
  const [dePage, setDePage] = React.useState(1)
  const [dePageSize, setDePageSize] = React.useState(25)
  const [deTotal, setDeTotal] = React.useState(0)
  const [deLoading, setDeLoading] = React.useState(false)
  const [deRtFilter, setDeRtFilter] = React.useState<string>("all")
  const deSearchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Modal states
  const [indicatorModalOpen, setIndicatorModalOpen] = React.useState(false)
  const [editingIndicator, setEditingIndicator] = React.useState<IndicatorDefinition | null>(null)
  const [dataElementModalOpen, setDataElementModalOpen] = React.useState(false)
  const [editingDataElement, setEditingDataElement] = React.useState<DataElement | null>(null)
  const [bulkImportOpen, setBulkImportOpen] = React.useState(false)
  const [deleteIndicatorId, setDeleteIndicatorId] = React.useState<string | null>(null)
  const [deleteDataElementId, setDeleteDataElementId] = React.useState<number | null>(null)
  const [selectedIndicators, setSelectedIndicators] = React.useState<Set<string>>(new Set())
  const [selectedDataElements, setSelectedDataElements] = React.useState<Set<number>>(new Set())
  const [bulkDeleteIndicatorsOpen, setBulkDeleteIndicatorsOpen] = React.useState(false)
  const [bulkDeleteDataElementsOpen, setBulkDeleteDataElementsOpen] = React.useState(false)
  const [bulkDeleting, setBulkDeleting] = React.useState(false)

  React.useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [indicatorsRes, rtRes] = await Promise.all([
        ApiClient.getIndicators({ page_size: 10000 }),
        ApiClient.getReportTypes({ page_size: 10000 }),
      ])

      const indData: Array<{
        id: number; code: string; name: string; description?: string;
        numerator_formula: string; numerator_description?: string;
        denominator_formula?: string; denominator_description?: string; factor: number;
        data_elements?: { id: number }[]
      }> = indicatorsRes.data?.results || indicatorsRes.data || []

      setIndicators(indData.map((ind) => ({
        id: String(ind.id),
        code: ind.code,
        name: ind.name,
        description: ind.description,
        numerator: { formula: ind.numerator_formula, description: ind.numerator_description || "", dataElements: [] },
        denominator: ind.denominator_formula ? { formula: ind.denominator_formula, description: ind.denominator_description || "", dataElements: [] } : undefined,
        factor: ind.factor || 1,
        unit: ind.factor === 100 ? "%" : ind.factor === 1000 ? "per 1000" : "ratio",
        aggregationType: "sum" as const,
        category: ""
      })))

      // Build indicator → data element IDs map for report type filtering
      const deMap = new Map<string, number[]>()
      for (const ind of indData) {
        deMap.set(String(ind.id), (ind.data_elements ?? []).map((de) => de.id))
      }
      setIndicatorDeIds(deMap)

      const rtData: Array<{ id: number; name: string; code: string; data_elements?: { id: number }[] }> =
        rtRes.data?.results || rtRes.data || []
      setReportTypes(rtData.map((rt) => ({
        id: rt.id,
        name: rt.name,
        code: rt.code,
        data_element_ids: (rt.data_elements ?? []).map((de) => de.id),
      })))
    } catch (error) {
      console.error("Failed to load indicators:", error)
      toast.error("Failed to load indicators and report types")
    } finally {
      setLoading(false)
    }
  }

  const loadDataElements = React.useCallback(async (page: number, pageSize: number, search: string, rtFilter: string) => {
    try {
      setDeLoading(true)
      const params: Record<string, string | number> = { page, page_size: pageSize }
      if (search.trim()) params.search = search.trim()
      if (rtFilter !== "all") params.report_types = rtFilter
      const res = await ApiClient.getDataElements(params)
      const deData = res.data?.results || res.data || []
      setDeTotal(res.data?.count ?? deData.length)
      setDataElements(deData.map((de: { id: number; code: string; name: string; description?: string }) => ({
        id: de.id, code: de.code, name: de.name, description: de.description
      })))
    } catch (error) {
      console.error("Failed to load data elements:", error)
      toast.error("Failed to load data elements")
    } finally {
      setDeLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadDataElements(dePage, dePageSize, deSearch, deRtFilter)
  }, [dePage, dePageSize, deSearch, deRtFilter, loadDataElements])

  // Handlers
  const handleCreateIndicator = () => { setEditingIndicator(null); setIndicatorModalOpen(true) }
  const handleEditIndicator = (indicator: IndicatorDefinition) => { setEditingIndicator(indicator); setIndicatorModalOpen(true) }

  const handleSaveIndicator = async (indicator: IndicatorDefinition) => {
    try {
      if (editingIndicator) {
        await ApiClient.updateIndicator(Number(editingIndicator.id), {
          code: indicator.code, name: indicator.name, description: indicator.description,
          numerator_formula: indicator.numerator.formula, numerator_description: indicator.numerator.description,
          denominator_formula: indicator.denominator?.formula || "", denominator_description: indicator.denominator?.description || "",
          factor: indicator.factor
        })
        setIndicators(prev => prev.map(ind => ind.id === editingIndicator.id ? { ...indicator, id: editingIndicator.id } : ind))
        toast.success("Indicator updated successfully")
      } else {
        const response = await ApiClient.createIndicator({
          code: indicator.code, name: indicator.name, description: indicator.description,
          numerator_formula: indicator.numerator.formula, numerator_description: indicator.numerator.description,
          denominator_formula: indicator.denominator?.formula || "", denominator_description: indicator.denominator?.description || "",
          factor: indicator.factor
        })
        setIndicators(prev => [...prev, { ...indicator, id: String(response.data.id) }])
        toast.success("Indicator created successfully")
      }
      setIndicatorModalOpen(false)
      setEditingIndicator(null)
    } catch (error) {
      console.error("Failed to save indicator:", error)
      toast.error(`Failed to ${editingIndicator ? "update" : "create"} indicator`)
    }
  }

  const handleDeleteIndicator = async () => {
    if (!deleteIndicatorId) return
    try {
      await ApiClient.deleteIndicator(Number(deleteIndicatorId))
      setIndicators(prev => prev.filter(ind => ind.id !== deleteIndicatorId))
      toast.success("Indicator deleted successfully")
      setDeleteIndicatorId(null)
    } catch (error) {
      console.error("Failed to delete indicator:", error)
      toast.error("Failed to delete indicator")
    }
  }

  const handleCreateDataElement = () => { setEditingDataElement(null); setDataElementModalOpen(true) }
  const handleEditDataElement = (de: DataElement) => { setEditingDataElement(de); setDataElementModalOpen(true) }

  const handleSaveDataElement = async (dataElement: Omit<DataElement, "id">) => {
    try {
      if (editingDataElement) {
        await ApiClient.updateDataElement(editingDataElement.id, dataElement)
        setDataElements(prev => prev.map(de => de.id === editingDataElement.id ? { ...dataElement, id: editingDataElement.id } : de))
        toast.success("Data element updated successfully")
      } else {
        const response = await ApiClient.createDataElement(dataElement)
        setDataElements(prev => [...prev, { ...dataElement, id: response.data.id }])
        toast.success("Data element created successfully")
      }
      setDataElementModalOpen(false)
      setEditingDataElement(null)
      await loadDataElements(dePage, dePageSize, deSearch, deRtFilter)
    } catch (error) {
      console.error("Failed to save data element:", error)
      toast.error(`Failed to ${editingDataElement ? "update" : "create"} data element`)
    }
  }

  const handleDeleteDataElement = async () => {
    if (!deleteDataElementId) return
    try {
      await ApiClient.deleteDataElement(deleteDataElementId)
      toast.success("Data element deleted successfully")
      setDeleteDataElementId(null)
      await loadDataElements(dePage, dePageSize, deSearch, deRtFilter)
    } catch (error) {
      console.error("Failed to delete data element:", error)
      toast.error("Failed to delete data element")
    }
  }

  const handleBulkImportSuccess = () => { loadDataElements(1, dePageSize, deSearch, deRtFilter); setBulkImportOpen(false) }

  const handleBulkDeleteIndicators = async () => {
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedIndicators].map(id => ApiClient.deleteIndicator(Number(id))))
      setIndicators(prev => prev.filter(ind => !selectedIndicators.has(ind.id)))
      toast.success(`Deleted ${selectedIndicators.size} indicator(s)`)
      setSelectedIndicators(new Set())
      setBulkDeleteIndicatorsOpen(false)
    } catch {
      toast.error("Failed to delete some indicators")
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleBulkDeleteDataElements = async () => {
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedDataElements].map(id => ApiClient.deleteDataElement(id)))
      toast.success(`Deleted ${selectedDataElements.size} data element(s)`)
      setSelectedDataElements(new Set())
      setBulkDeleteDataElementsOpen(false)
      // Reset to page 1 and reload after bulk delete
      setDePage(1)
      await loadDataElements(1, dePageSize, deSearch, deRtFilter)
    } catch {
      toast.error("Failed to delete some data elements")
    } finally {
      setBulkDeleting(false)
    }
  }

  const toggleIndicator = (id: string) => {
    setSelectedIndicators(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleDataElement = (id: number) => {
    setSelectedDataElements(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAllIndicators = (checked: boolean) => {
    setSelectedIndicators(checked ? new Set(filteredIndicators.map(i => i.id)) : new Set())
  }

  const toggleAllDataElements = (checked: boolean) => {
    setSelectedDataElements(checked ? new Set(dataElements.map(d => d.id)) : new Set())
  }

  // Filter logic
  const filteredIndicators = React.useMemo(() => {
    const rtDeIds = indicatorRtFilter !== "all"
      ? new Set(reportTypes.find((rt) => String(rt.id) === indicatorRtFilter)?.data_element_ids ?? [])
      : null

    return indicators.filter(ind => {
      const matchesSearch = ind.name.toLowerCase().includes(indicatorSearch.toLowerCase()) ||
        ind.code.toLowerCase().includes(indicatorSearch.toLowerCase())
      const matchesType = indicatorTypeFilter === "all" ||
        (indicatorTypeFilter === "percentage" && ind.factor === 100) ||
        (indicatorTypeFilter === "per_thousand" && ind.factor === 1000) ||
        (indicatorTypeFilter === "ratio" && ind.factor === 1)
      const matchesRt = !rtDeIds ||
        (indicatorDeIds.get(ind.id) ?? []).some((deId) => rtDeIds.has(deId))
      return matchesSearch && matchesType && matchesRt
    })
  }, [indicators, indicatorSearch, indicatorTypeFilter, indicatorRtFilter, reportTypes, indicatorDeIds])

  const deTotalPages = Math.max(1, Math.ceil(deTotal / dePageSize))

  const indicatorPag = usePagination(filteredIndicators, indicatorPageSize)


  if (!isSuperuser && !isStaff) {
    return (
      <section className="rounded-xl border border-border bg-card">
        <EmptyState
          illustration="no-access"
          title="You don't have access to indicators"
          description="Managing indicators and data elements is for administrators. If you need it, ask your administrator."
          action={{ label: "Back to dashboard", href: "/dashboard" }}
        />
      </section>
    )
  }

  if (loading) {
    return <SectionLoader message="Loading indicators…" />
  }

  return (
    <div className="space-y-6">
      <PageCard
        title="Indicators and data elements"
        description="Data elements are the numbers people enter. Indicators are calculated from them, e.g. a percentage."
        icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
        actions={
          <Button
            variant="secondary"
            onClick={() => { loadData(); loadDataElements(dePage, dePageSize, deSearch, deRtFilter) }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Indicators" value={indicators.length} tint="red" icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />} />
        <StatCard label="Data elements" value={deTotal} tint="blue" icon={<Database className="h-5 w-5" aria-hidden="true" />} />
        <StatCard
          label="Percentages"
          value={indicators.filter(i => i.factor === 100).length}
          hint="Indicators shown as %"
          tint="teal"
          icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Per thousand"
          value={indicators.filter(i => i.factor === 1000).length}
          hint="Indicators shown per 1,000"
          tint="violet"
          icon={<Hash className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "indicators" | "data-elements")} className="space-y-4">
        <div className="flex flex-col justify-between gap-3 border-b border-border sm:flex-row sm:items-end">
          <TabsList className="tabs-line w-auto border-b-0">
            <TabsTrigger value="indicators">
              <TrendingUp className="h-4 w-4" />
              Indicators
              <Badge variant="secondary" className="ml-1 text-xs">{indicators.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="data-elements">
              <Database className="h-4 w-4" />
              Data elements
              <Badge variant="secondary" className="ml-1 text-xs">{deTotal}</Badge>
            </TabsTrigger>
          </TabsList>

          {activeTab === "indicators" && (
            <div className="flex items-center gap-2">
              {selectedIndicators.size > 0 && (
                <Button
                  variant="destructive-outline"
                  onClick={() => setBulkDeleteIndicatorsOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedIndicators.size} selected
                </Button>
              )}
              <Button onClick={handleCreateIndicator}>
                <Plus className="h-4 w-4 mr-2" />
                Create indicator
              </Button>
            </div>
          )}
          {activeTab === "data-elements" && (
            <div className="flex items-center gap-2">
              {selectedDataElements.size > 0 && (
                <Button
                  variant="destructive-outline"
                  onClick={() => setBulkDeleteDataElementsOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedDataElements.size} selected
                </Button>
              )}
              <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import from Excel
              </Button>
              <Button onClick={handleCreateDataElement}>
                <Plus className="h-4 w-4 mr-2" />
                Create data element
              </Button>
            </div>
          )}
        </div>

        {/* ─── Indicators Tab ─── */}
        <TabsContent value="indicators" className="space-y-4 mt-0">
          {/* Filters bar */}
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or code..."
                    value={indicatorSearch}
                    onChange={(e) => setIndicatorSearch(e.target.value)}
                    className="pl-9 border-border"
                  />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={indicatorTypeFilter}
                    onValueChange={(v) => setIndicatorTypeFilter(v as typeof indicatorTypeFilter)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="per_thousand">Per Thousand</SelectItem>
                      <SelectItem value="ratio">Ratio</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={indicatorRtFilter}
                    onValueChange={(v) => { setIndicatorRtFilter(v); indicatorPag.setPage(1) }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Report Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Report Types</SelectItem>
                      {reportTypes.map((rt) => (
                        <SelectItem key={rt.id} value={String(rt.id)}>{rt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(indicatorSearch || indicatorTypeFilter !== "all" || indicatorRtFilter !== "all") && (
                    <Button variant="ghost" size="sm" onClick={() => { setIndicatorSearch(""); setIndicatorTypeFilter("all"); setIndicatorRtFilter("all") }} className="h-9 px-2 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {filteredIndicators.length !== indicators.length && (
                <p className="text-xs text-muted-foreground mt-2">
                  Showing {filteredIndicators.length} of {indicators.length} indicators
                </p>
              )}
            </CardContent>
          </Card>

          {filteredIndicators.length === 0 ? (
            <Card className="border-dashed border-2 border-border">
              <CardContent className="p-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No indicators found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {indicatorSearch || indicatorTypeFilter !== "all"
                    ? "Try adjusting your filters."
                    : "Create your first indicator to get started."}
                </p>
                {!indicatorSearch && indicatorTypeFilter === "all" && (
                  <Button onClick={handleCreateIndicator}>
                    <Plus className="h-4 w-4 mr-2" />Create indicator
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Table */}
              <Card className="border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-subtle">
                        <th className="px-4 py-3 w-10">
                          <Checkbox
                            checked={selectedIndicators.size === filteredIndicators.length && filteredIndicators.length > 0}
                            onCheckedChange={(checked) => toggleAllIndicators(!!checked)}
                            
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground w-28">Code</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground hidden md:table-cell">Formula</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground w-24">Type</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-foreground w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {indicatorPag.paginated.map((indicator, idx) => (
                        <tr key={indicator.id} className={`transition-colors hover:bg-error-bg/50 ${selectedIndicators.has(indicator.id) ? "bg-error-bg" : idx % 2 === 0 ? "bg-card" : "bg-surface-subtle/50"}`}>
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={selectedIndicators.has(indicator.id)}
                              onCheckedChange={() => toggleIndicator(indicator.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="font-mono text-xs border-error-border text-error bg-error-bg">
                              {indicator.code}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-foreground leading-tight">{indicator.name}</p>
                              {indicator.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{indicator.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <code className="text-xs bg-muted text-foreground px-2 py-1 rounded font-mono break-all">
                              {indicator.numerator.formula}
                              {indicator.denominator && ` / ${indicator.denominator.formula}`}
                              {indicator.factor !== 1 && ` × ${indicator.factor}`}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill tone={indicator.factor === 100 ? "brand" : indicator.factor === 1000 ? "purple" : "neutral"}>
                              {indicator.unit}
                            </StatusPill>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditIndicator(indicator)} className="h-8 w-8 p-0 hover:bg-muted hover:text-foreground">
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteIndicatorId(indicator.id)} className="h-8 w-8 p-0 text-error hover:text-error hover:bg-error-bg">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Pagination */}
              <PaginationControls
                page={indicatorPag.page}
                totalPages={indicatorPag.totalPages}
                setPage={indicatorPag.setPage}
                total={filteredIndicators.length}
                pageSize={indicatorPageSize}
                setPageSize={setIndicatorPageSize}
              />
            </>
          )}
        </TabsContent>

        {/* ─── Data Elements Tab ─── */}
        <TabsContent value="data-elements" className="space-y-4 mt-0">
          {/* Search bar */}
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or code..."
                    value={deSearchInput}
                    onChange={(e) => {
                      const val = e.target.value
                      setDeSearchInput(val)
                      if (deSearchTimer.current) clearTimeout(deSearchTimer.current)
                      deSearchTimer.current = setTimeout(() => {
                        setDeSearch(val)
                        setDePage(1)
                      }, 400)
                    }}
                    className="pl-9 border-border"
                  />
                </div>
                <Select
                  value={deRtFilter}
                  onValueChange={(v) => { setDeRtFilter(v); setDePage(1) }}
                >
                  <SelectTrigger className="w-48  flex-shrink-0">
                    <SelectValue placeholder="Report Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Report Types</SelectItem>
                    {reportTypes.map((rt) => (
                      <SelectItem key={rt.id} value={String(rt.id)}>{rt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(deSearchInput || deRtFilter !== "all") && (
                  <Button variant="ghost" size="sm" onClick={() => { setDeSearchInput(""); setDeSearch(""); setDeRtFilter("all"); setDePage(1) }} className="h-9 px-2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4 mr-1" />Clear
                  </Button>
                )}
              </div>
              {(deSearch || deRtFilter !== "all") && (
                <p className="text-xs text-muted-foreground mt-2">
                  Showing {dataElements.length} of {deTotal} data elements
                  {deSearch && <> matching &quot;{deSearch}&quot;</>}
                  {deRtFilter !== "all" && <> in &quot;{reportTypes.find(rt => String(rt.id) === deRtFilter)?.name}&quot;</>}
                </p>
              )}
            </CardContent>
          </Card>

          {deLoading ? (
            <Card className="border border-border shadow-sm">
              <CardContent className="p-8 text-center">
                <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading data elements…</p>
              </CardContent>
            </Card>
          ) : dataElements.length === 0 ? (
            <Card className="border-dashed border-2 border-border">
              <CardContent className="p-12 text-center">
                <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No data elements found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {(deSearchInput || deRtFilter !== "all") ? "Try adjusting your filters." : "Create your first data element or import from Excel."}
                </p>
                {!deSearchInput && deRtFilter === "all" && (
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />Import from Excel
                    </Button>
                    <Button onClick={handleCreateDataElement}>
                      <Plus className="h-4 w-4 mr-2" />Create data element
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-subtle">
                        <th className="px-4 py-3 w-10">
                          <Checkbox
                            checked={selectedDataElements.size === dataElements.length && dataElements.length > 0}
                            onCheckedChange={(checked) => toggleAllDataElements(!!checked)}
                            
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground w-16">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground w-40">Code</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-foreground hidden lg:table-cell">Description</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-foreground w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dataElements.map((de, idx) => (
                        <tr key={de.id} className={`transition-colors hover:bg-error-bg/50 ${selectedDataElements.has(de.id) ? "bg-error-bg" : idx % 2 === 0 ? "bg-card" : "bg-surface-subtle/50"}`}>
                          <td className="px-4 py-3">
                            <Checkbox
                              checked={selectedDataElements.has(de.id)}
                              onCheckedChange={() => toggleDataElement(de.id)}
                            />
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {(dePage - 1) * dePageSize + idx + 1}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="font-mono text-xs border-error-border text-error bg-error-bg">
                              {de.code}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-foreground">{de.name}</span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-xs text-muted-foreground line-clamp-2">{de.description || "—"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditDataElement(de)} className="h-8 w-8 p-0 hover:bg-muted hover:text-foreground">
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteDataElementId(de.id)} className="h-8 w-8 p-0 text-error hover:text-error hover:bg-error-bg">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <PaginationControls
                page={dePage}
                totalPages={deTotalPages}
                setPage={setDePage}
                total={deTotal}
                pageSize={dePageSize}
                setPageSize={(s) => { setDePageSize(s); setDePage(1) }}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <IndicatorModal open={indicatorModalOpen} onOpenChange={setIndicatorModalOpen} onSave={handleSaveIndicator} indicator={editingIndicator} dataElements={dataElements} />
      <DataElementModal open={dataElementModalOpen} onOpenChange={setDataElementModalOpen} onSave={handleSaveDataElement} dataElement={editingDataElement} />
      <BulkImportModal open={bulkImportOpen} onOpenChange={setBulkImportOpen} onSuccess={handleBulkImportSuccess} />

      {/* Delete Indicator */}
      <AlertDialog open={!!deleteIndicatorId} onOpenChange={(open) => !open && setDeleteIndicatorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Indicator</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this indicator? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIndicator} className="bg-error hover:bg-error">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Data Element */}
      <AlertDialog open={!!deleteDataElementId} onOpenChange={(open) => !open && setDeleteDataElementId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Data Element</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this data element? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDataElement} className="bg-error hover:bg-error">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Indicators */}
      <AlertDialog open={bulkDeleteIndicatorsOpen} onOpenChange={setBulkDeleteIndicatorsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIndicators.size} Indicator(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIndicators.size} selected indicator(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteIndicators}
              disabled={bulkDeleting}
              className="bg-error hover:bg-error"
            >
              {bulkDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Data Elements */}
      <AlertDialog open={bulkDeleteDataElementsOpen} onOpenChange={setBulkDeleteDataElementsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedDataElements.size} Data Element(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedDataElements.size} selected data element(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteDataElements}
              disabled={bulkDeleting}
              className="bg-error hover:bg-error"
            >
              {bulkDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Pagination Controls Component ───
function PaginationControls({
  page,
  totalPages,
  setPage,
  total,
  pageSize,
  setPageSize,
}: {
  page: number
  totalPages: number
  setPage: (p: number) => void
  total: number
  pageSize: number
  setPageSize: (s: number) => void
}) {
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">Per page:</Label>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="h-8 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="sm" onClick={() => setPage(1)} disabled={page === 1} className="h-8 w-8 p-0 border-border">
          <ChevronLeft className="h-3.5 w-3.5" />
          <ChevronLeft className="h-3.5 w-3.5 -ml-2" />
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1} className="h-8 w-8 p-0 border-border">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page number buttons */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p: number
          if (totalPages <= 5) {
            p = i + 1
          } else if (page <= 3) {
            p = i + 1
          } else if (page >= totalPages - 2) {
            p = totalPages - 4 + i
          } else {
            p = page - 2 + i
          }
          return (
            <Button
              key={p}
              variant={p === page ? "default" : "secondary"}
              size="sm"
              onClick={() => setPage(p)}
              className="font-clinical h-8 w-8 p-0 text-xs"
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          )
        })}

        <Button variant="secondary" size="sm" onClick={() => setPage(page + 1)} disabled={page === totalPages} className="h-8 w-8 p-0 border-border">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages} className="h-8 w-8 p-0 border-border">
          <ChevronRight className="h-3.5 w-3.5" />
          <ChevronRight className="h-3.5 w-3.5 -ml-2" />
        </Button>
      </div>
    </div>
  )
}
