"use client"

import * as React from "react"
import { Trash2, Calculator, TrendingUp, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ApiClient } from "@/lib/api"
import { IndicatorBuilder } from "@/components/data-entry/IndicatorBuilder"
import type { IndicatorDefinition } from "@/lib/advanced-formula-evaluator"

interface DataElement {
  id: string
  code: string
  name: string
  description?: string
}

export default function IndicatorsPage() {
  const [indicators, setIndicators] = React.useState<IndicatorDefinition[]>([])
  const [dataElements, setDataElements] = React.useState<DataElement[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
  const [showBuilder, setShowBuilder] = React.useState(false)

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
        id: String(de.id),
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

  const handleSaveIndicator = async (indicator: IndicatorDefinition) => {
    try {
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

      const newIndicator = {
        ...indicator,
        id: String(response.data.id)
      }
      setIndicators(prev => [...prev, newIndicator])
      toast.success("Indicator created successfully")
    } catch (error) {
      console.error("Failed to save indicator:", error)
      toast.error("Failed to save indicator")
    }
  }

  const handleDeleteIndicator = async (id: string) => {
    if (!confirm("Are you sure you want to delete this indicator?")) return

    try {
      await ApiClient.deleteIndicator(Number(id))
      setIndicators(prev => prev.filter(ind => ind.id !== id))
      toast.success("Indicator deleted successfully")
    } catch (error) {
      console.error("Failed to delete indicator:", error)
      toast.error("Failed to delete indicator")
    }
  }

  // Filter indicators
  const filteredIndicators = indicators.filter(indicator => {
    const matchesSearch = indicator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         indicator.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || indicator.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = [...new Set(indicators.map(ind => ind.category).filter(Boolean))]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading indicators...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Indicators Management</h1>
          <p className="text-gray-600 mt-1">
            Create and manage calculation indicators for your reports
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowBuilder(!showBuilder)}
          >
            {showBuilder ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showBuilder ? "Hide" : "Show"} Builder
          </Button>
          
          <IndicatorBuilder
            dataElements={dataElements}
            onSave={handleSaveIndicator}
            existingIndicators={indicators}
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Indicators</p>
                <p className="text-2xl font-bold">{indicators.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">With Denominator</p>
                <p className="text-2xl font-bold">
                  {indicators.filter(ind => ind.denominator).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-orange-600">
                %
              </Badge>
              <div>
                <p className="text-sm text-gray-600">Percentage</p>
                <p className="text-2xl font-bold">
                  {indicators.filter(ind => ind.factor === 100).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-purple-600">
                /1000
              </Badge>
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search indicators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicators List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredIndicators.map((indicator) => (
          <Card key={indicator.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {indicator.code}
                    </Badge>
                    {indicator.name}
                  </CardTitle>
                  {indicator.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {indicator.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteIndicator(indicator.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Formula Display */}
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Formula:</span>
                  <div className="font-mono text-xs bg-gray-100 p-2 rounded mt-1">
                    {indicator.numerator.formula}
                    {indicator.denominator && ` / ${indicator.denominator.formula}`}
                    {indicator.factor !== 1 && ` × ${indicator.factor}`}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {indicator.unit}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {indicator.aggregationType}
                  </Badge>
                </div>
              </div>

              {/* Numerator/Denominator Details */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium text-gray-700">Numerator:</span>
                  <p className="text-gray-600">{indicator.numerator.description}</p>
                </div>
                
                {indicator.denominator && (
                  <div>
                    <span className="font-medium text-gray-700">Denominator:</span>
                    <p className="text-gray-600">{indicator.denominator.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredIndicators.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No indicators found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCategory !== "all" 
                ? "Try adjusting your search or filter criteria."
                : "Create your first indicator to get started with advanced calculations."
              }
            </p>
            <IndicatorBuilder
              dataElements={dataElements}
              onSave={handleSaveIndicator}
              existingIndicators={indicators}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
