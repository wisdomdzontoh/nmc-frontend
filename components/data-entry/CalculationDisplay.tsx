"use client"

import * as React from "react"
import { Calculator, TrendingUp, AlertCircle, CheckCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { CalculationResult, IndicatorResult } from "@/lib/advanced-formula-evaluator"

interface CalculationDisplayProps {
  result: CalculationResult | IndicatorResult
  label?: string
  showDetails?: boolean
  size?: "sm" | "md" | "lg"
  variant?: "default" | "success" | "warning" | "error"
}

export function CalculationDisplay({
  result,
  label,
  showDetails = false,
  size = "md",
  variant = "default"
}: CalculationDisplayProps) {
  const isError = !result.isValid || result.formatted === "#ERROR"
  const hasValue = result.value !== null && result.value !== undefined

  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl"
  }

  const variantClasses = {
    default: "text-gray-700",
    success: "text-green-700",
    warning: "text-yellow-700", 
    error: "text-red-700"
  }

  const getVariant = (): "default" | "success" | "warning" | "error" => {
    if (isError) return "error"
    if (hasValue && result.value !== 0) return "success"
    if (hasValue && result.value === 0) return "warning"
    return "default"
  }

  const currentVariant = variant === "default" ? getVariant() : variant

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex items-center gap-2 font-semibold",
          sizeClasses[size],
          variantClasses[currentVariant]
        )}>
          <Calculator className="h-4 w-4 opacity-70" />
          <span className="font-mono">
            {result.formatted}
          </span>
        </div>

        {showDetails && (
          <div className="flex items-center gap-1">
            {isError ? (
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">{result.error || "Calculation error"}</p>
                </TooltipContent>
              </Tooltip>
            ) : hasValue ? (
              <Tooltip>
                <TooltipTrigger>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">Calculation successful</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">No data available</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}

        {label && (
          <Badge variant="outline" className="text-xs">
            {label}
          </Badge>
        )}
      </div>
    </TooltipProvider>
  )
}

interface CalculationSummaryProps {
  results: Array<{
    label: string
    result: CalculationResult | IndicatorResult
    type: "formula" | "indicator" | "aggregation"
  }>
  title?: string
}

export function CalculationSummary({ results, title = "Calculations" }: CalculationSummaryProps) {
  const validResults = results.filter(r => r.result.isValid)
  const errorResults = results.filter(r => !r.result.isValid)

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          {title}
          <Badge variant="outline" className="ml-auto">
            {validResults.length}/{results.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{item.label}</span>
                <Badge 
                  variant={item.type === "indicator" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {item.type}
                </Badge>
              </div>
              <CalculationDisplay 
                result={item.result} 
                size="sm"
                showDetails={true}
              />
            </div>
          </div>
        ))}

        {errorResults.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 font-medium text-sm mb-2">
              <AlertCircle className="h-4 w-4" />
              Calculation Errors ({errorResults.length})
            </div>
            <div className="space-y-1">
              {errorResults.map((item, index) => (
                <div key={index} className="text-xs text-red-600">
                  • {item.label}: {item.result.error || "Unknown error"}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface RealTimeCalculationProps {
  formula: string
  dependencies: string[]
  result: CalculationResult | IndicatorResult
  isCalculating?: boolean
}

export function RealTimeCalculation({
  formula,
  dependencies,
  result,
  isCalculating = false
}: RealTimeCalculationProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <CalculationDisplay result={result} size="lg" showDetails={true} />
        {isCalculating && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        )}
      </div>
      
      <div className="text-xs text-gray-500 space-y-1">
        <div className="font-mono bg-gray-100 px-2 py-1 rounded">
          {formula}
        </div>
        {dependencies.length > 0 && (
          <div>
            Dependencies: {dependencies.join(", ")}
          </div>
        )}
      </div>
    </div>
  )
}
