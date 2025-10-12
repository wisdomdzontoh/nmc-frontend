"use client"

import * as React from "react"
import { Plus, Trash2, Calculator, Save, Eye, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import type { IndicatorDefinition } from "@/lib/advanced-formula-evaluator"
import { validateIndicator } from "@/lib/advanced-formula-evaluator"

interface DataElement {
  id: string
  code: string
  name: string
  description?: string
}

interface IndicatorBuilderProps {
  dataElements: DataElement[]
  onSave: (indicator: IndicatorDefinition) => void
  existingIndicators?: IndicatorDefinition[]
}

export function IndicatorBuilder({ 
  dataElements, 
  onSave
}: IndicatorBuilderProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [indicator, setIndicator] = React.useState<Partial<IndicatorDefinition>>({
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

  const [showPreview, setShowPreview] = React.useState(false)
  const [validation, setValidation] = React.useState<{ isValid: boolean; errors: string[] }>({
    isValid: true,
    errors: []
  })

  const handleSave = () => {
    if (!indicator.code || !indicator.name || !indicator.numerator?.formula) {
      toast.error("Please fill in all required fields")
      return
    }

    const fullIndicator = indicator as IndicatorDefinition
    const validationResult = validateIndicator(fullIndicator)
    
    if (!validationResult.isValid) {
      setValidation(validationResult)
      toast.error("Please fix validation errors")
      return
    }

    onSave(fullIndicator)
    toast.success("Indicator saved successfully")
    setIsOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setIndicator({
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
    setValidation({ isValid: true, errors: [] })
  }

  const addDataElementToFormula = (field: "numerator" | "denominator", code: string) => {
    const currentFormula = indicator[field]?.formula || ""
    const newFormula = currentFormula ? `${currentFormula} + ${code}` : code
    setIndicator(prev => ({
      ...prev,
      [field]: {
        ...prev[field]!,
        formula: newFormula,
        dataElements: [...(prev[field]?.dataElements || []), code]
      }
    }))
  }

  const removeDataElementFromFormula = (field: "numerator" | "denominator", code: string) => {
    const currentFormula = indicator[field]?.formula || ""
    const newFormula = currentFormula.replace(new RegExp(`\\s*\\+\\s*${code}|${code}\\s*\\+\\s*|^${code}$`, 'g'), '').trim()
    setIndicator(prev => ({
      ...prev,
      [field]: {
        ...prev[field]!,
        formula: newFormula,
        dataElements: (prev[field]?.dataElements || []).filter(de => de !== code)
      }
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Indicator
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Create New Indicator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Code *</label>
                  <Input
                    value={indicator.code || ""}
                    onChange={(e) => setIndicator(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="e.g., IND001"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    value={indicator.name || ""}
                    onChange={(e) => setIndicator(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Malaria Incidence Rate"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={indicator.description || ""}
                  onChange={(e) => setIndicator(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this indicator measures..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Factor</label>
                  <Input
                    type="number"
                    value={indicator.factor || 1}
                    onChange={(e) => setIndicator(prev => ({ ...prev, factor: Number(e.target.value) }))}
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Unit</label>
                  <Input
                    value={indicator.unit || ""}
                    onChange={(e) => setIndicator(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="e.g., %, per 1000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Aggregation</label>
                  <Select
                    value={indicator.aggregationType || "sum"}
                    onValueChange={(value: "sum" | "average" | "count" | "min" | "max") => 
                      setIndicator(prev => ({ ...prev, aggregationType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="average">Average</SelectItem>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="min">Minimum</SelectItem>
                      <SelectItem value="max">Maximum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Numerator */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Numerator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Formula *</label>
                <Input
                  value={indicator.numerator?.formula || ""}
                  onChange={(e) => setIndicator(prev => ({
                    ...prev,
                    numerator: { ...prev.numerator!, formula: e.target.value }
                  }))}
                  placeholder="e.g., DE001 + DE002"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={indicator.numerator?.description || ""}
                  onChange={(e) => setIndicator(prev => ({
                    ...prev,
                    numerator: { ...prev.numerator!, description: e.target.value }
                  }))}
                  placeholder="Describe what the numerator represents..."
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Available Data Elements</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {dataElements.map(de => (
                    <Badge
                      key={de.id}
                      variant={indicator.numerator?.dataElements?.includes(de.code) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (indicator.numerator?.dataElements?.includes(de.code)) {
                          removeDataElementFromFormula("numerator", de.code)
                        } else {
                          addDataElementToFormula("numerator", de.code)
                        }
                      }}
                    >
                      {de.code}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Denominator */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Denominator (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Formula</label>
                <Input
                  value={indicator.denominator?.formula || ""}
                  onChange={(e) => setIndicator(prev => ({
                    ...prev,
                    denominator: { ...prev.denominator!, formula: e.target.value }
                  }))}
                  placeholder="e.g., DE003"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={indicator.denominator?.description || ""}
                  onChange={(e) => setIndicator(prev => ({
                    ...prev,
                    denominator: { ...prev.denominator!, description: e.target.value }
                  }))}
                  placeholder="Describe what the denominator represents..."
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Available Data Elements</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {dataElements.map(de => (
                    <Badge
                      key={de.id}
                      variant={indicator.denominator?.dataElements?.includes(de.code) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (indicator.denominator?.dataElements?.includes(de.code)) {
                          removeDataElementFromFormula("denominator", de.code)
                        } else {
                          addDataElementToFormula("denominator", de.code)
                        }
                      }}
                    >
                      {de.code}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Validation Errors */}
          {!validation.isValid && (
            <Alert>
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

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? "Hide" : "Show"} Preview
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm}>
                <Trash2 className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Indicator
              </Button>
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>Code:</strong> {indicator.code}</div>
                  <div><strong>Name:</strong> {indicator.name}</div>
                  <div><strong>Formula:</strong> {indicator.numerator?.formula} / {indicator.denominator?.formula || "1"} × {indicator.factor}</div>
                  <div><strong>Unit:</strong> {indicator.unit}</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
