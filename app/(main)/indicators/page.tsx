"use client"

import * as React from "react"
import {
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

  // Indicator filters
  const [indicatorSearch, setIndicatorSearch] = React.useState("")
  const [indicatorTypeFilter, setIndicatorTypeFilter] = React.useState<"all" | "percentage" | "per_thousand" | "ratio">("all")
  const [indicatorPageSize, setIndicatorPageSize] = React.useState(10)

  // Data element filters
  const [dataElementSearch, setDataElementSearch] = React.useState("")
  const [dataElementPageSize, setDataElementPageSize] = React.useState(25)

  // Modal states
  const [indicatorModalOpen, setIndicatorModalOpen] = React.useState(false)
  const [editingIndicator, setEditingIndicator] = React.useState<IndicatorDefinition | null>(null)
  const [dataElementModalOpen, setDataElementModalOpen] = React.useState(false)
  const [editingDataElement, setEditingDataElement] = React.useState<DataElement | null>(null)
  const [bulkImportOpen, setBulkImportOpen] = React.useState(false)
  const [deleteIndicatorId, setDeleteIndicatorId] = React.useState<string | null>(null)
  const [deleteDataElementId, setDeleteDataElementId] = React.useState<number | null>(null)

  React.useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [indicatorsRes, dataElementsRes] = await Promise.all([
        ApiClient.getIndicators(),
        ApiClient.getDataElements()
      ])
      const indData = indicatorsRes.data?.results || indicatorsRes.data || []
      setIndicators(indData.map((ind: {
        id: number; code: string; name: string; description?: string;
        numerator_formula: string; numerator_description?: string;
        denominator_formula?: string; denominator_description?: string; factor: number
      }) => ({
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

      const deData = dataElementsRes.data?.results || dataElementsRes.data || []
      setDataElements(deData.map((de: { id: number; code: string; name: string; description?: string }) => ({
        id: de.id, code: de.code, name: de.name, description: de.description
      })))
    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Failed to load indicators and data elements")
    } finally {
      setLoading(false)
    }
  }

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
      await loadData()
    } catch (error) {
      console.error("Failed to save data element:", error)
      toast.error(`Failed to ${editingDataElement ? "update" : "create"} data element`)
    }
  }

  const handleDeleteDataElement = async () => {
    if (!deleteDataElementId) return
    try {
      await ApiClient.deleteDataElement(deleteDataElementId)
      setDataElements(prev => prev.filter(de => de.id !== deleteDataElementId))
      toast.success("Data element deleted successfully")
      setDeleteDataElementId(null)
    } catch (error) {
      console.error("Failed to delete data element:", error)
      toast.error("Failed to delete data element")
    }
  }

  const handleBulkImportSuccess = () => { loadData(); setBulkImportOpen(false) }

  // Filter logic
  const filteredIndicators = React.useMemo(() => {
    return indicators.filter(ind => {
      const matchesSearch = ind.name.toLowerCase().includes(indicatorSearch.toLowerCase()) ||
        ind.code.toLowerCase().includes(indicatorSearch.toLowerCase())
      const matchesType = indicatorTypeFilter === "all" ||
        (indicatorTypeFilter === "percentage" && ind.factor === 100) ||
        (indicatorTypeFilter === "per_thousand" && ind.factor === 1000) ||
        (indicatorTypeFilter === "ratio" && ind.factor === 1)
      return matchesSearch && matchesType
    })
  }, [indicators, indicatorSearch, indicatorTypeFilter])

  const filteredDataElements = React.useMemo(() => {
    return dataElements.filter(de =>
      de.name.toLowerCase().includes(dataElementSearch.toLowerCase()) ||
      de.code.toLowerCase().includes(dataElementSearch.toLowerCase())
    )
  }, [dataElements, dataElementSearch])

  const indicatorPag = usePagination(filteredIndicators, indicatorPageSize)
  const dePag = usePagination(filteredDataElements, dataElementPageSize)

  // Stat cards
  const stats = [
    { label: "Total Indicators", value: indicators.length, icon: TrendingUp, color: "#1B5E3B", bg: "#e8f5ee" },
    { label: "Data Elements", value: dataElements.length, icon: Database, color: "#2E7D52", bg: "#f0f7f3" },
    { label: "Percentage (%)", value: indicators.filter(i => i.factor === 100).length, icon: BarChart3, color: "#0D3B24", bg: "#d4eddc" },
    { label: "Per Thousand", value: indicators.filter(i => i.factor === 1000).length, icon: Hash, color: "#1B5E3B", bg: "#e8f5ee" },
  ]

  if (!isSuperuser && !isStaff) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="p-4 rounded-full bg-amber-50 inline-flex mb-4">
          <TrendingUp className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Access Restricted</h1>
        <Alert className="border-amber-200 bg-amber-50">
          <AlertDescription className="text-amber-800">
            Indicators and data elements management is only available to staff and administrators.
            Contact your administrator if you need access.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin mx-auto" style={{ color: "#1B5E3B" }} />
          <p className="text-gray-500 text-sm">Loading indicators and data elements...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Indicators &amp; Data Elements</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage calculation indicators and data elements used in reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            Last refreshed: {new Date().toLocaleTimeString()}
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="border-green-200 text-green-700 hover:bg-green-50">
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg flex-shrink-0" style={{ background: stat.bg }}>
                  <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "indicators" | "data-elements")} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="border border-gray-200 bg-gray-50">
            <TabsTrigger value="indicators" className="data-[state=active]:bg-white data-[state=active]:text-green-800 data-[state=active]:shadow-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Indicators
              <Badge variant="secondary" className="ml-1 text-xs">{indicators.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="data-elements" className="data-[state=active]:bg-white data-[state=active]:text-green-800 data-[state=active]:shadow-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Elements
              <Badge variant="secondary" className="ml-1 text-xs">{dataElements.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {activeTab === "indicators" && (
            <Button onClick={handleCreateIndicator} className="text-white shadow-sm" style={{ background: "linear-gradient(135deg, #1B5E3B, #2E7D52)" }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Indicator
            </Button>
          )}
          {activeTab === "data-elements" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setBulkImportOpen(true)} className="border-green-200 text-green-700 hover:bg-green-50">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
              <Button onClick={handleCreateDataElement} className="text-white shadow-sm" style={{ background: "linear-gradient(135deg, #1B5E3B, #2E7D52)" }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Data Element
              </Button>
            </div>
          )}
        </div>

        {/* ─── Indicators Tab ─── */}
        <TabsContent value="indicators" className="space-y-4 mt-0">
          {/* Filters bar */}
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or code..."
                    value={indicatorSearch}
                    onChange={(e) => setIndicatorSearch(e.target.value)}
                    className="pl-9 border-gray-300 focus-visible:ring-green-600"
                  />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <Select
                    value={indicatorTypeFilter}
                    onValueChange={(v) => setIndicatorTypeFilter(v as typeof indicatorTypeFilter)}
                  >
                    <SelectTrigger className="w-40 border-gray-300 focus:ring-green-600">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="per_thousand">Per Thousand</SelectItem>
                      <SelectItem value="ratio">Ratio</SelectItem>
                    </SelectContent>
                  </Select>
                  {(indicatorSearch || indicatorTypeFilter !== "all") && (
                    <Button variant="ghost" size="sm" onClick={() => { setIndicatorSearch(""); setIndicatorTypeFilter("all") }} className="h-9 px-2 text-gray-500 hover:text-gray-700">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {filteredIndicators.length !== indicators.length && (
                <p className="text-xs text-gray-500 mt-2">
                  Showing {filteredIndicators.length} of {indicators.length} indicators
                </p>
              )}
            </CardContent>
          </Card>

          {filteredIndicators.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-200">
              <CardContent className="p-12 text-center">
                <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-1">No indicators found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {indicatorSearch || indicatorTypeFilter !== "all"
                    ? "Try adjusting your filters."
                    : "Create your first indicator to get started."}
                </p>
                {!indicatorSearch && indicatorTypeFilter === "all" && (
                  <Button onClick={handleCreateIndicator} className="text-white" style={{ background: "#1B5E3B" }}>
                    <Plus className="h-4 w-4 mr-2" />Create Indicator
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Table */}
              <Card className="border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "linear-gradient(135deg, #0D3B24, #1B5E3B)" }}>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-green-100 uppercase tracking-wider w-28">Code</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-green-100 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-green-100 uppercase tracking-wider hidden md:table-cell">Formula</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-green-100 uppercase tracking-wider w-24">Type</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-green-100 uppercase tracking-wider w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {indicatorPag.paginated.map((indicator, idx) => (
                        <tr key={indicator.id} className={`transition-colors hover:bg-green-50/50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="font-mono text-xs border-green-200 text-green-800 bg-green-50">
                              {indicator.code}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900 leading-tight">{indicator.name}</p>
                              {indicator.description && (
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{indicator.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono break-all">
                              {indicator.numerator.formula}
                              {indicator.denominator && ` / ${indicator.denominator.formula}`}
                              {indicator.factor !== 1 && ` × ${indicator.factor}`}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="secondary"
                              className="text-xs whitespace-nowrap"
                              style={{
                                background: indicator.factor === 100 ? "#e8f5ee" : indicator.factor === 1000 ? "#e8f0ff" : "#f5f5f5",
                                color: indicator.factor === 100 ? "#1B5E3B" : indicator.factor === 1000 ? "#5B21B6" : "#374151"
                              }}
                            >
                              {indicator.unit}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditIndicator(indicator)} className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-800">
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteIndicatorId(indicator.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
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
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or code..."
                    value={dataElementSearch}
                    onChange={(e) => setDataElementSearch(e.target.value)}
                    className="pl-9 border-gray-300 focus-visible:ring-green-600"
                  />
                </div>
                {dataElementSearch && (
                  <Button variant="ghost" size="sm" onClick={() => setDataElementSearch("")} className="h-9 px-2 text-gray-500 hover:text-gray-700">
                    <X className="h-4 w-4 mr-1" />Clear
                  </Button>
                )}
              </div>
              {filteredDataElements.length !== dataElements.length && (
                <p className="text-xs text-gray-500 mt-2">
                  Showing {filteredDataElements.length} of {dataElements.length} data elements
                </p>
              )}
            </CardContent>
          </Card>

          {filteredDataElements.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-200">
              <CardContent className="p-12 text-center">
                <Database className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-1">No data elements found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {dataElementSearch ? "Try adjusting your search criteria." : "Create your first data element or import from Excel."}
                </p>
                {!dataElementSearch && (
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={() => setBulkImportOpen(true)} className="border-green-200 text-green-700 hover:bg-green-50">
                      <Upload className="h-4 w-4 mr-2" />Bulk Import
                    </Button>
                    <Button onClick={handleCreateDataElement} className="text-white" style={{ background: "#1B5E3B" }}>
                      <Plus className="h-4 w-4 mr-2" />Create Data Element
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "linear-gradient(135deg, #0D3B24, #1B5E3B)" }}>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-green-100 uppercase tracking-wider w-40">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-green-100 uppercase tracking-wider w-40">Code</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-green-100 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-green-100 uppercase tracking-wider hidden lg:table-cell">Description</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-green-100 uppercase tracking-wider w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dePag.paginated.map((de, idx) => (
                        <tr key={de.id} className={`transition-colors hover:bg-green-50/50 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {(dePag.page - 1) * dataElementPageSize + idx + 1}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="font-mono text-xs border-green-200 text-green-800 bg-green-50">
                              {de.code}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{de.name}</span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-xs text-gray-500 line-clamp-2">{de.description || "—"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditDataElement(de)} className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-800">
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeleteDataElementId(de.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
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
                page={dePag.page}
                totalPages={dePag.totalPages}
                setPage={dePag.setPage}
                total={filteredDataElements.length}
                pageSize={dataElementPageSize}
                setPageSize={setDataElementPageSize}
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
            <AlertDialogAction onClick={handleDeleteIndicator} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
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
            <AlertDialogAction onClick={handleDeleteDataElement} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
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
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>
          Showing <span className="font-medium text-gray-700">{start}–{end}</span> of{" "}
          <span className="font-medium text-gray-700">{total}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-gray-500">Per page:</Label>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="h-8 w-16 text-xs border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => setPage(1)} disabled={page === 1} className="h-8 w-8 p-0 border-gray-200">
          <ChevronLeft className="h-3.5 w-3.5" />
          <ChevronLeft className="h-3.5 w-3.5 -ml-2" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1} className="h-8 w-8 p-0 border-gray-200">
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
              variant={p === page ? "default" : "outline"}
              size="sm"
              onClick={() => setPage(p)}
              className="h-8 w-8 p-0 text-xs border-gray-200"
              style={p === page ? { background: "#1B5E3B", color: "white", borderColor: "#1B5E3B" } : {}}
            >
              {p}
            </Button>
          )
        })}

        <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page === totalPages} className="h-8 w-8 p-0 border-gray-200">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={page === totalPages} className="h-8 w-8 p-0 border-gray-200">
          <ChevronRight className="h-3.5 w-3.5" />
          <ChevronRight className="h-3.5 w-3.5 -ml-2" />
        </Button>
      </div>
    </div>
  )
}
