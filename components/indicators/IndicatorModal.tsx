"use client"

import * as React from "react"
import { Calculator, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type { IndicatorDefinition } from "@/lib/advanced-formula-evaluator"
import { validateIndicator } from "@/lib/advanced-formula-evaluator"

interface DataElement {
  id: number
  code: string
  name: string
  description?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (indicator: IndicatorDefinition) => void
  indicator?: IndicatorDefinition | null
  dataElements: DataElement[]
}

export function IndicatorModal({
  open,
  onOpenChange,
  onSave,
  indicator,
  dataElements
}: Props) {
  const [formData, setFormData] = React.useState<Partial<IndicatorDefinition>>({
    code: "",
    name: "",
    description: "",
    numerator: {
      formula: "",
      description: "",
      dataElements: []
    },
    denominator: {
      formula: "",
      description: "",
      dataElements: []
    },
    factor: 1,
    unit: "",
    aggregationType: "sum",
    category: ""
  })

  const [validation, setValidation] = React.useState<{ isValid: boolean; errors: string[] }>({
    isValid: true,
    errors: []
  })

  const [selectedNumeratorElements, setSelectedNumeratorElements] = React.useState<Set<string>>(new Set())
  const [selectedDenominatorElements, setSelectedDenominatorElements] = React.useState<Set<string>>(new Set())

  // Initialize form when indicator changes
  React.useEffect(() => {
    if (indicator) {
      setFormData(indicator)
      // Extract data elements from formulas
      const numCodes = dataElements
        .filter(de => indicator.numerator.formula.includes(de.code))
        .map(de => de.code)
      const denCodes = indicator.denominator
        ? dataElements
            .filter(de => indicator.denominator!.formula.includes(de.code))
            .map(de => de.code)
        : []
      setSelectedNumeratorElements(new Set(numCodes))
      setSelectedDenominatorElements(new Set(denCodes))
    } else {
      setFormData({
        code: "",
        name: "",
        description: "",
        numerator: {
          formula: "",
          description: "",
          dataElements: []
        },
        denominator: {
          formula: "",
          description: "",
          dataElements: []
        },
        factor: 1,
        unit: "",
        aggregationType: "sum",
        category: ""
      })
      setSelectedNumeratorElements(new Set())
      setSelectedDenominatorElements(new Set())
    }
  }, [indicator, dataElements])

  const handleFactorChange = (factor: number) => {
    setFormData(prev => ({
      ...prev,
      factor,
      unit: factor === 100 ? "%" : factor === 1000 ? "per 1000" : "ratio"
    }))
  }

  const toggleDataElement = (code: string, type: "numerator" | "denominator") => {
    if (type === "numerator") {
      const newSet = new Set(selectedNumeratorElements)
      if (newSet.has(code)) {
        newSet.delete(code)
        setFormData(prev => ({
          ...prev,
          numerator: {
            ...prev.numerator!,
            formula: prev.numerator!.formula
              .replace(new RegExp(`\\s*\\+\\s*${code}|${code}\\s*\\+\\s*|^${code}$`, 'g'), '')
              .trim()
          }
        }))
      } else {
        newSet.add(code)
        const currentFormula = formData.numerator?.formula || ""
        setFormData(prev => ({
          ...prev,
          numerator: {
            ...prev.numerator!,
            formula: currentFormula ? `${currentFormula} + ${code}` : code
          }
        }))
      }
      setSelectedNumeratorElements(newSet)
    } else {
      const newSet = new Set(selectedDenominatorElements)
      if (newSet.has(code)) {
        newSet.delete(code)
        setFormData(prev => ({
          ...prev,
          denominator: {
            ...prev.denominator!,
            formula: prev.denominator!.formula
              .replace(new RegExp(`\\s*\\+\\s*${code}|${code}\\s*\\+\\s*|^${code}$`, 'g'), '')
              .trim()
          }
        }))
      } else {
        newSet.add(code)
        const currentFormula = formData.denominator?.formula || ""
        setFormData(prev => ({
          ...prev,
          denominator: {
            ...prev.denominator!,
            formula: currentFormula ? `${currentFormula} + ${code}` : code
          }
        }))
      }
      setSelectedDenominatorElements(newSet)
    }
  }

  const handleSave = () => {
    if (!formData.code || !formData.name || !formData.numerator?.formula) {
      setValidation({
        isValid: false,
        errors: ["Code, name, and numerator formula are required"]
      })
      return
    }

    const fullIndicator = formData as IndicatorDefinition
    const validationResult = validateIndicator(fullIndicator)
    
    if (!validationResult.isValid) {
      setValidation(validationResult)
      return
    }

    onSave(fullIndicator)
    setValidation({ isValid: true, errors: [] })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {indicator ? "Edit Indicator" : "Create New Indicator"}
          </DialogTitle>
          <DialogDescription>
            {indicator 
              ? "Update the indicator details and formula."
              : "Define a new calculation indicator with numerator and optional denominator."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g., IND001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Malaria Incidence Rate"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this indicator measures..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="factor">Factor</Label>
                <Input
                  id="factor"
                  type="number"
                  value={formData.factor || 1}
                  onChange={(e) => handleFactorChange(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="e.g., %, per 1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aggregation">Aggregation</Label>
                <select
                  id="aggregation"
                  value={formData.aggregationType || "sum"}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    aggregationType: e.target.value as "sum" | "average" | "count" | "min" | "max"
                  }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="sum">Sum</option>
                  <option value="average">Average</option>
                  <option value="count">Count</option>
                  <option value="min">Minimum</option>
                  <option value="max">Maximum</option>
                </select>
              </div>
            </div>
          </div>

          {/* Numerator */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Numerator *</h3>
            <div className="space-y-2">
              <Label htmlFor="numerator-formula">Formula *</Label>
              <Input
                id="numerator-formula"
                value={formData.numerator?.formula || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  numerator: { ...prev.numerator!, formula: e.target.value }
                }))}
                placeholder="e.g., DE001 + DE002"
                className="font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="numerator-description">Description</Label>
              <Textarea
                id="numerator-description"
                value={formData.numerator?.description || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  numerator: { ...prev.numerator!, description: e.target.value }
                }))}
                placeholder="Describe what the numerator represents..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Available Data Elements</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                {dataElements.length === 0 ? (
                  <p className="text-sm text-gray-500">No data elements available</p>
                ) : (
                  dataElements.map(de => (
                    <button
                      key={de.id}
                      type="button"
                      onClick={() => toggleDataElement(de.code, "numerator")}
                      className={selectedNumeratorElements.has(de.code)
                        ? "px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
                        : "px-2 py-1 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50"
                      }
                    >
                      {de.code}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Denominator */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Denominator (Optional)</h3>
            <div className="space-y-2">
              <Label htmlFor="denominator-formula">Formula</Label>
              <Input
                id="denominator-formula"
                value={formData.denominator?.formula || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  denominator: { ...prev.denominator!, formula: e.target.value }
                }))}
                placeholder="e.g., DE003"
                className="font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="denominator-description">Description</Label>
              <Textarea
                id="denominator-description"
                value={formData.denominator?.description || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  denominator: { ...prev.denominator!, description: e.target.value }
                }))}
                placeholder="Describe what the denominator represents..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Available Data Elements</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                {dataElements.length === 0 ? (
                  <p className="text-sm text-gray-500">No data elements available</p>
                ) : (
                  dataElements.map(de => (
                    <button
                      key={de.id}
                      type="button"
                      onClick={() => toggleDataElement(de.code, "denominator")}
                      className={selectedDenominatorElements.has(de.code)
                        ? "px-2 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
                        : "px-2 py-1 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50"
                      }
                    >
                      {de.code}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {!validation.isValid && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {validation.errors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            {indicator ? "Update" : "Create"} Indicator
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

