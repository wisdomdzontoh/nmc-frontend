"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calculator, TrendingUp, Eye, EyeOff } from "lucide-react"
import { CalculationSummary } from "./CalculationDisplay"
import { IndicatorBuilder } from "./IndicatorBuilder"
import { evaluateAdvancedFormula, type AdvancedFormulaContext, type IndicatorDefinition } from "@/lib/advanced-formula-evaluator"

// Example data elements
const exampleDataElements = [
  { id: "1", code: "DE001", name: "Total Population" },
  { id: "2", code: "DE002", name: "Malaria Cases" },
  { id: "3", code: "DE003", name: "OPD Visits" },
  { id: "4", code: "DE004", name: "Under 5 Population" },
  { id: "5", code: "DE005", name: "Under 5 Malaria Cases" },
]

// Example indicators
const exampleIndicators: IndicatorDefinition[] = [
  {
    id: "1",
    code: "IND001",
    name: "Malaria Incidence Rate",
    description: "Number of malaria cases per 1000 population",
    numerator: {
      formula: "DE002",
      description: "Total malaria cases",
      dataElements: ["DE002"]
    },
    denominator: {
      formula: "DE001",
      description: "Total population",
      dataElements: ["DE001"]
    },
    factor: 1000,
    unit: "per 1000",
    aggregationType: "sum",
    category: "Health"
  },
  {
    id: "2",
    code: "IND002", 
    name: "Under 5 Malaria Rate",
    description: "Percentage of malaria cases in under 5 population",
    numerator: {
      formula: "DE005",
      description: "Under 5 malaria cases",
      dataElements: ["DE005"]
    },
    denominator: {
      formula: "DE002",
      description: "Total malaria cases",
      dataElements: ["DE002"]
    },
    factor: 100,
    unit: "%",
    aggregationType: "sum",
    category: "Health"
  }
]

export function CalculationExample() {
  const [values, setValues] = React.useState<Record<string, number | null>>({
    DE001: 10000, // Total Population
    DE002: 150,   // Malaria Cases
    DE003: 500,   // OPD Visits
    DE004: 2000,  // Under 5 Population
    DE005: 45,    // Under 5 Malaria Cases
  })

  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const [indicators, setIndicators] = React.useState<IndicatorDefinition[]>(exampleIndicators)

  // Create context for calculations
  const context: AdvancedFormulaContext = React.useMemo(() => ({
    getCellValue: () => null, // Not used in this example
    getDataElementValue: (code: string) => values[code] || null,
    rowCount: 0,
    colCount: 0,
    dataElements: exampleDataElements.map(de => ({
      code: de.code,
      value: values[de.code] || null
    }))
  }), [values])

  // Calculate all indicators
  const indicatorResults = React.useMemo(() => {
    return indicators.map(indicator => {
      try {
        const formula = indicator.denominator 
          ? `${indicator.numerator.formula} / ${indicator.denominator.formula} * ${indicator.factor}`
          : `${indicator.numerator.formula} * ${indicator.factor}`
        
        const result = evaluateAdvancedFormula(formula, context)
        return {
          label: indicator.name,
          result: {
            ...result,
            formatted: `${result.formatted} ${indicator.unit}`,
            calculationType: 'indicator' as const
          },
          type: 'indicator' as const
        }
      } catch (err) {
        return {
          label: indicator.name,
          result: {
            value: null,
            formatted: "#ERROR",
            isValid: false,
            error: String(err),
            dependencies: [],
            calculationType: 'indicator' as const
          },
          type: 'indicator' as const
        }
      }
    })
  }, [indicators, context])

  // Example formulas
  const formulaResults = React.useMemo(() => {
    const formulas = [
      { label: "Total Health Events", formula: "DE002 + DE003" },
      { label: "Malaria Rate %", formula: "PERCENTAGE(DE002, DE001)" },
      { label: "Average Cases", formula: "AVERAGE(DE002, DE003)" },
    ]

    return formulas.map(({ label, formula }) => {
      try {
        const result = evaluateAdvancedFormula(formula, context)
        return {
          label,
          result,
          type: 'formula' as const
        }
      } catch (err) {
        return {
          label,
          result: {
            value: null,
            formatted: "#ERROR",
            isValid: false,
            error: String(err),
            dependencies: [],
            calculationType: 'formula' as const
          },
          type: 'formula' as const
        }
      }
    })
  }, [context])

  const handleSaveIndicator = (indicator: IndicatorDefinition) => {
    setIndicators(prev => [...prev, { ...indicator, id: String(Date.now()) }])
  }

  const updateValue = (code: string, value: number | null) => {
    setValues(prev => ({ ...prev, [code]: value }))
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Enhanced Calculation System Demo
        </h1>
        <p className="text-gray-600">
          Real-time calculations with DHIS2-like indicators and formulas
        </p>
      </div>

      {/* Data Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Data Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exampleDataElements.map(de => (
              <div key={de.id} className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {de.name}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={values[de.code] || ""}
                    onChange={(e) => updateValue(de.code, e.target.value ? Number(e.target.value) : null)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                  <Badge variant="outline" className="text-xs">
                    {de.code}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {showAdvanced ? "Hide" : "Show"} Advanced Features
        </Button>
        
        {showAdvanced && (
          <IndicatorBuilder
            dataElements={exampleDataElements}
            onSave={handleSaveIndicator}
            existingIndicators={indicators}
          />
        )}
      </div>

      {/* Real-time Calculations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formula Results */}
        <CalculationSummary
          results={formulaResults}
          title="Formula Calculations"
        />

        {/* Indicator Results */}
        <CalculationSummary
          results={indicatorResults}
          title="Indicators"
        />
      </div>

      {/* Advanced Features */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Advanced Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Available Functions</h4>
                <div className="space-y-1 text-sm">
                  <div>• <code>SUM(A1:A5)</code> - Sum of range</div>
                  <div>• <code>AVERAGE(A1:A5)</code> - Average of range</div>
                  <div>• <code>PERCENTAGE(num, den)</code> - Percentage calculation</div>
                  <div>• <code>RATIO(num, den)</code> - Ratio calculation</div>
                  <div>• <code>IF(condition, true, false)</code> - Conditional logic</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Data Element References</h4>
                <div className="space-y-1 text-sm">
                  {exampleDataElements.map(de => (
                    <div key={de.id}>
                      • <code>{de.code}</code> - {de.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Example Formulas</h4>
              <div className="space-y-2 text-sm font-mono bg-gray-100 p-3 rounded">
                <div>Malaria Rate: <code>PERCENTAGE(DE002, DE001)</code></div>
                <div>Total Events: <code>DE002 + DE003</code></div>
                <div>Under 5 Rate: <code>PERCENTAGE(DE005, DE004)</code></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Values Display */}
      <Card>
        <CardHeader>
          <CardTitle>Current Values</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(values).map(([code, value]) => (
              <div key={code} className="text-center p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">{code}</div>
                <div className="text-lg font-semibold">{value || "—"}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
