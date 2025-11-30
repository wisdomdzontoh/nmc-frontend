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
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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

export default function IndicatorsPage() {
  const { djangoUser } = useAuth() as { djangoUser: DjangoUser | null }
  
  // Check if user is staff or superuser
  const isSuperuser = Boolean((djangoUser as unknown as { is_superuser?: boolean })?.is_superuser)
  const isStaff = Boolean((djangoUser as unknown as { is_staff?: boolean })?.is_staff)
  
  const [activeTab, setActiveTab] = React.useState<"indicators" | "data-elements">("indicators")
  const [indicators, setIndicators] = React.useState<IndicatorDefinition[]>([])
  const [dataElements, setDataElements] = React.useState<DataElement[]>([])
  const [loading, setLoading] = React.useState(true)
  const [indicatorSearch, setIndicatorSearch] = React.useState("")
  const [dataElementSearch, setDataElementSearch] = React.useState("")
  
  // Modal states
  const [indicatorModalOpen, setIndicatorModalOpen] = React.useState(false)
  const [editingIndicator, setEditingIndicator] = React.useState<IndicatorDefinition | null>(null)
  const [dataElementModalOpen, setDataElementModalOpen] = React.useState(false)
  const [editingDataElement, setEditingDataElement] = React.useState<DataElement | null>(null)
  const [bulkImportOpen, setBulkImportOpen] = React.useState(false)
  const [deleteIndicatorId, setDeleteIndicatorId] = React.useState<string | null>(null)
  const [deleteDataElementId, setDeleteDataElementId] = React.useState<number | null>(null)

  // Load data
  React.useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [indicatorsRes, dataElementsRes] = await Promise.all([
        ApiClient.getIndicators(),
        ApiClient.getDataElements()
      ])

      // Process indicators
      const indData = indicatorsRes.data?.results || indicatorsRes.data || []
      setIndicators(indData.map((ind: { 
        id: number; 
        code: string; 
        name: string; 
        description?: string; 
        numerator_formula: string; 
        numerator_description?: string; 
        denominator_formula?: string; 
        denominator_description?: string; 
        factor: number 
      }) => ({
        id: String(ind.id),
        code: ind.code,
        name: ind.name,
        description: ind.description,
        numerator: {
          formula: ind.numerator_formula,
          description: ind.numerator_description || "",
          dataElements: []
        },
        denominator: ind.denominator_formula ? {
          formula: ind.denominator_formula,
          description: ind.denominator_description || "",
          dataElements: []
        } : undefined,
        factor: ind.factor || 1,
        unit: ind.factor === 100 ? "%" : ind.factor === 1000 ? "per 1000" : "ratio",
        aggregationType: "sum" as const,
        category: ""
      })))

      // Process data elements
      const deData = dataElementsRes.data?.results || dataElementsRes.data || []
      setDataElements(deData.map((de: { id: number; code: string; name: string; description?: string }) => ({
        id: de.id,
        code: de.code,
        name: de.name,
        description: de.description
      })))

    } catch (error) {
      console.error("Failed to load data:", error)
      toast.error("Failed to load indicators and data elements")
    } finally {
      setLoading(false)
    }
  }

  // Indicator handlers
  const handleCreateIndicator = () => {
    setEditingIndicator(null)
    setIndicatorModalOpen(true)
  }

  const handleEditIndicator = (indicator: IndicatorDefinition) => {
    setEditingIndicator(indicator)
    setIndicatorModalOpen(true)
  }

  const handleSaveIndicator = async (indicator: IndicatorDefinition) => {
    try {
      if (editingIndicator) {
        // Update existing
        await ApiClient.updateIndicator(Number(editingIndicator.id), {
          code: indicator.code,
          name: indicator.name,
          description: indicator.description,
          numerator_formula: indicator.numerator.formula,
          numerator_description: indicator.numerator.description,
          denominator_formula: indicator.denominator?.formula || "",
          denominator_description: indicator.denominator?.description || "",
          factor: indicator.factor
        })
        setIndicators(prev => prev.map(ind => 
          ind.id === editingIndicator.id ? { ...indicator, id: editingIndicator.id } : ind
        ))
        toast.success("Indicator updated successfully")
      } else {
        // Create new
        const response = await ApiClient.createIndicator({
          code: indicator.code,
          name: indicator.name,
          description: indicator.description,
          numerator_formula: indicator.numerator.formula,
          numerator_description: indicator.numerator.description,
          denominator_formula: indicator.denominator?.formula || "",
          denominator_description: indicator.denominator?.description || "",
          factor: indicator.factor
        })
        setIndicators(prev => [...prev, { ...indicator, id: String(response.data.id) }])
        toast.success("Indicator created successfully")
      }
      setIndicatorModalOpen(false)
      setEditingIndicator(null)
    } catch (error) {
      console.error("Failed to save indicator:", error)
      toast.error(`Failed to ${editingIndicator ? 'update' : 'create'} indicator`)
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

  // Data Element handlers
  const handleCreateDataElement = () => {
    setEditingDataElement(null)
    setDataElementModalOpen(true)
  }

  const handleEditDataElement = (dataElement: DataElement) => {
    setEditingDataElement(dataElement)
    setDataElementModalOpen(true)
  }

  const handleSaveDataElement = async (dataElement: Omit<DataElement, 'id'>) => {
    try {
      if (editingDataElement) {
        // Update existing
        await ApiClient.updateDataElement(editingDataElement.id, dataElement)
        setDataElements(prev => prev.map(de => 
          de.id === editingDataElement.id ? { ...dataElement, id: editingDataElement.id } : de
        ))
        toast.success("Data element updated successfully")
      } else {
        // Create new
        const response = await ApiClient.createDataElement(dataElement)
        setDataElements(prev => [...prev, { ...dataElement, id: response.data.id }])
        toast.success("Data element created successfully")
      }
      setDataElementModalOpen(false)
      setEditingDataElement(null)
      // Reload data elements for indicators
      await loadData()
    } catch (error) {
      console.error("Failed to save data element:", error)
      toast.error(`Failed to ${editingDataElement ? 'update' : 'create'} data element`)
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

  const handleBulkImportSuccess = () => {
    loadData()
    setBulkImportOpen(false)
  }

  // Filter data
  const filteredIndicators = indicators.filter(indicator =>
    indicator.name.toLowerCase().includes(indicatorSearch.toLowerCase()) ||
    indicator.code.toLowerCase().includes(indicatorSearch.toLowerCase())
  )

  const filteredDataElements = dataElements.filter(de =>
    de.name.toLowerCase().includes(dataElementSearch.toLowerCase()) ||
    de.code.toLowerCase().includes(dataElementSearch.toLowerCase())
  )

  // Show error if user is not staff or superuser
  if (!isSuperuser && !isStaff) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">Indicators & Data Elements</h1>
        <Alert>
          <AlertDescription>
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
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Indicators & Data Elements</h1>
          <p className="text-gray-600 mt-1">
            Manage calculation indicators and data elements for your reports
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Indicators</p>
                <p className="text-2xl font-bold">{indicators.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Database className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Data Elements</p>
                <p className="text-2xl font-bold">{dataElements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Badge variant="outline" className="text-purple-600 border-purple-300">
                  %
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Percentage Indicators</p>
                <p className="text-2xl font-bold">
                  {indicators.filter(ind => ind.factor === 100).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  /1000
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Per Thousand</p>
                <p className="text-2xl font-bold">
                  {indicators.filter(ind => ind.factor === 1000).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "indicators" | "data-elements")} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="indicators" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Indicators ({indicators.length})
            </TabsTrigger>
            <TabsTrigger value="data-elements" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Data Elements ({dataElements.length})
            </TabsTrigger>
          </TabsList>

          {activeTab === "indicators" && (
            <Button onClick={handleCreateIndicator}>
              <Plus className="h-4 w-4 mr-2" />
              Create Indicator
            </Button>
          )}

          {activeTab === "data-elements" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
              <Button onClick={handleCreateDataElement}>
                <Plus className="h-4 w-4 mr-2" />
                Create Data Element
              </Button>
            </div>
          )}
        </div>

        {/* Indicators Tab */}
        <TabsContent value="indicators" className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search indicators by name or code..."
                  value={indicatorSearch}
                  onChange={(e) => setIndicatorSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Indicators Grid */}
          {filteredIndicators.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No indicators found</h3>
                <p className="text-gray-600 mb-4">
                  {indicatorSearch 
                    ? "Try adjusting your search criteria."
                    : "Create your first indicator to get started with advanced calculations."
                  }
                </p>
                {!indicatorSearch && (
                  <Button onClick={handleCreateIndicator}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Indicator
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredIndicators.map((indicator) => (
                <Card key={indicator.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs font-mono">
                            {indicator.code}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {indicator.unit}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg line-clamp-2">{indicator.name}</CardTitle>
                        {indicator.description && (
                          <CardDescription className="mt-1 line-clamp-2">
                            {indicator.description}
                          </CardDescription>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditIndicator(indicator)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteIndicatorId(indicator.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Formula:</span>
                      <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 break-all">
                        {indicator.numerator.formula}
                        {indicator.denominator && ` / ${indicator.denominator.formula}`}
                        {indicator.factor !== 1 && ` × ${indicator.factor}`}
                      </div>
                    </div>
                    
                    <div className="space-y-1 text-xs">
                      <div>
                        <span className="font-medium text-gray-700">Numerator:</span>
                        <p className="text-gray-600">{indicator.numerator.description || "—"}</p>
                      </div>
                      
                      {indicator.denominator && (
                        <div>
                          <span className="font-medium text-gray-700">Denominator:</span>
                          <p className="text-gray-600">{indicator.denominator.description || "—"}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Data Elements Tab */}
        <TabsContent value="data-elements" className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search data elements by name or code..."
                  value={dataElementSearch}
                  onChange={(e) => setDataElementSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Elements Table */}
          {filteredDataElements.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No data elements found</h3>
                <p className="text-gray-600 mb-4">
                  {dataElementSearch 
                    ? "Try adjusting your search criteria."
                    : "Create your first data element or import from Excel."
                  }
                </p>
                {!dataElementSearch && (
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Bulk Import
                    </Button>
                    <Button onClick={handleCreateDataElement}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Data Element
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Code</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredDataElements.map((de) => (
                        <tr key={de.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="font-mono text-xs">
                              {de.code}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{de.name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600 line-clamp-2">
                              {de.description || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditDataElement(de)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteDataElementId(de.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Indicator Modal */}
      <IndicatorModal
        open={indicatorModalOpen}
        onOpenChange={setIndicatorModalOpen}
        onSave={handleSaveIndicator}
        indicator={editingIndicator}
        dataElements={dataElements}
      />

      {/* Data Element Modal */}
      <DataElementModal
        open={dataElementModalOpen}
        onOpenChange={setDataElementModalOpen}
        onSave={handleSaveDataElement}
        dataElement={editingDataElement}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onSuccess={handleBulkImportSuccess}
      />

      {/* Delete Indicator Confirmation */}
      <AlertDialog open={!!deleteIndicatorId} onOpenChange={(open) => !open && setDeleteIndicatorId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Indicator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this indicator? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIndicator}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Data Element Confirmation */}
      <AlertDialog open={!!deleteDataElementId} onOpenChange={(open) => !open && setDeleteDataElementId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Data Element</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this data element? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDataElement}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
