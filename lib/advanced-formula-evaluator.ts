// lib/advanced-formula-evaluator.ts
import { evaluate } from "mathjs"

// Enhanced types for better calculation system
export type CellValue = string | number | null | undefined
export type DataElementValue = { code: string; value: number | null }
export type IndicatorResult = {
  value: number | null
  formatted: string
  isValid: boolean
  error?: string
}

// Enhanced context for formula evaluation
export type AdvancedFormulaContext = {
  getCellValue: (rowIndex: number, colIndex: number) => CellValue
  getDataElementValue: (code: string) => number | null
  rowCount: number
  colCount: number
  dataElements: DataElementValue[]
}

// Indicator definition
export interface IndicatorDefinition {
  id: string
  code: string
  name: string
  description?: string
  numerator: {
    formula: string
    description: string
    dataElements: string[]
  }
  denominator?: {
    formula: string
    description: string
    dataElements: string[]
  }
  factor: number // e.g., 100 for percentage, 1000 for per thousand
  unit: string // e.g., "%", "per 1000", "ratio"
  aggregationType: 'sum' | 'average' | 'count' | 'min' | 'max'
  category?: string
}

// Calculation result with metadata
export interface CalculationResult {
  value: number | null
  formatted: string
  isValid: boolean
  error?: string
  dependencies: string[]
  calculationType: 'formula' | 'indicator' | 'aggregation'
}

/* --------------------------------------------------
   Enhanced Column/Row Helpers
-------------------------------------------------- */
function columnLetterToIndex(letter: string): number {
  let index = 0
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 65 + 1)
  }
  return index - 1
}

function indexToColumnLetter(index: number): string {
  let s = ""
  while (index >= 0) {
    s = String.fromCharCode((index % 26) + 65) + s
    index = Math.floor(index / 26) - 1
  }
  return s
}

function parseCellRef(ref: string): [number, number] | null {
  const match = /^([A-Z]+)([0-9]+)$/.exec(ref.toUpperCase())
  if (!match) return null
  const [, letters, num] = match
  const col = columnLetterToIndex(letters)
  const row = parseInt(num, 10) - 1
  return [row, col]
}

function expandRange(rangeExpr: string): string[] {
  const refs: string[] = []
  const parts = rangeExpr.split(':')
  
  if (parts.length === 2) {
    const [start, end] = parts
    const startPos = parseCellRef(start)
    const endPos = parseCellRef(end)
    
    if (startPos && endPos) {
      const [startRow, startCol] = startPos
      const [endRow, endCol] = endPos
      
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          refs.push(`${indexToColumnLetter(c)}${r + 1}`)
        }
      }
    }
  } else {
    refs.push(rangeExpr)
  }
  
  return refs
}

/* --------------------------------------------------
   Enhanced Formula Evaluation
-------------------------------------------------- */
export function evaluateAdvancedFormula(
  formula: string,
  context: AdvancedFormulaContext
): CalculationResult {
  try {
    let expr = formula.trim()
    if (expr.startsWith("=")) expr = expr.slice(1).trim()

    const dependencies: string[] = []
    const calculationType: 'formula' | 'indicator' | 'aggregation' = 'formula'

    // Handle advanced functions
    expr = expr.replace(
      /\b(SUM|AVERAGE|MIN|MAX|COUNT|PERCENTAGE|RATIO|IF|ROUND|CEIL|FLOOR)\s*\(([^)]+)\)/gi,
      (_, funcName: string, args: string) => {
        const func = funcName.toUpperCase()
        
        if (func === 'PERCENTAGE') {
          const [numerator, denominator] = args.split(',').map(s => s.trim())
          const numVal = evaluateCellOrDataElement(numerator, context, dependencies)
          const denVal = evaluateCellOrDataElement(denominator, context, dependencies)
          
          if (denVal === 0 || denVal === null) return "0"
          return String((numVal / denVal) * 100)
        }
        
        if (func === 'RATIO') {
          const [numerator, denominator] = args.split(',').map(s => s.trim())
          const numVal = evaluateCellOrDataElement(numerator, context, dependencies)
          const denVal = evaluateCellOrDataElement(denominator, context, dependencies)
          
          if (denVal === 0 || denVal === null) return "0"
          return String(numVal / denVal)
        }
        
        if (func === 'IF') {
          const [condition, trueVal, falseVal] = args.split(',').map(s => s.trim())
          const condVal = evaluateCellOrDataElement(condition, context, dependencies)
          return condVal ? trueVal : falseVal
        }
        
        // Handle range functions
        const refs = expandRange(args)
        const values: number[] = []
        
        for (const ref of refs) {
          const pos = parseCellRef(ref)
          if (!pos) continue
          const [r, c] = pos
          const v = context.getCellValue(r, c)
          const num = typeof v === "number" ? v : parseFloat(String(v))
          if (!isNaN(num)) values.push(num)
        }

        if (values.length === 0) return "0"

        switch (func) {
          case "SUM":
            return String(values.reduce((a, b) => a + b, 0))
          case "AVERAGE":
            return String(values.reduce((a, b) => a + b, 0) / values.length)
          case "MIN":
            return String(Math.min(...values))
          case "MAX":
            return String(Math.max(...values))
          case "COUNT":
            return String(values.length)
          case "ROUND":
            return String(Math.round(values[0] || 0))
          case "CEIL":
            return String(Math.ceil(values[0] || 0))
          case "FLOOR":
            return String(Math.floor(values[0] || 0))
          default:
            return "0"
        }
      }
    )

    // Replace cell references with actual values
    expr = expr.replace(/\b([A-Z]+[0-9]+)\b/g, (match) => {
      const pos = parseCellRef(match)
      if (!pos) return "0"
      const [r, c] = pos
      const val = context.getCellValue(r, c)
      dependencies.push(match)
      
      if (val === undefined || val === null || val === "") return "0"
      if (typeof val === "number") return String(val)
      const parsed = parseFloat(String(val))
      return isNaN(parsed) ? "0" : String(parsed)
    })

    // Replace data element references (e.g., DE001, DE002)
    expr = expr.replace(/\b([A-Z]{2,}\d+)\b/g, (match) => {
      const val = context.getDataElementValue(match)
      dependencies.push(match)
      return val !== null ? String(val) : "0"
    })

    // Create scope for mathjs evaluation
    const scope: Record<string, number> = {}
    for (let r = 0; r < context.rowCount; r++) {
      for (let c = 0; c < context.colCount; c++) {
        const colLabel = indexToColumnLetter(c)
        scope[`${colLabel}${r + 1}`] =
          typeof context.getCellValue(r, c) === "number"
            ? (context.getCellValue(r, c) as number)
            : 0
      }
    }

    // Add data elements to scope
    context.dataElements.forEach(de => {
      scope[de.code] = de.value || 0
    })

    const result = evaluate(expr, scope)
    
    let value: number | null = null
    let formatted = "—"
    let isValid = true

    if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
      value = result
      formatted = formatNumber(result)
    } else {
      isValid = false
      formatted = "#ERROR"
    }

    return {
      value,
      formatted,
      isValid,
      dependencies: [...new Set(dependencies)],
      calculationType
    }

  } catch (err) {
    console.warn("Advanced formula evaluation error:", formula, err)
    return {
      value: null,
      formatted: "#ERROR",
      isValid: false,
      error: String(err),
      dependencies: [],
      calculationType: 'formula'
    }
  }
}

/* --------------------------------------------------
   Helper Functions
-------------------------------------------------- */
function evaluateCellOrDataElement(
  expr: string, 
  context: AdvancedFormulaContext, 
  dependencies: string[]
): number {
  expr = expr.trim()
  
  // Check if it's a cell reference
  const cellPos = parseCellRef(expr)
  if (cellPos) {
    const [r, c] = cellPos
    const val = context.getCellValue(r, c)
    dependencies.push(expr)
    return typeof val === "number" ? val : parseFloat(String(val)) || 0
  }
  
  // Check if it's a data element code
  const deVal = context.getDataElementValue(expr)
  if (deVal !== null) {
    dependencies.push(expr)
    return deVal
  }
  
  // Try to parse as number
  const num = parseFloat(expr)
  return isNaN(num) ? 0 : num
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toLocaleString()
  }
  return value.toFixed(2)
}

/* --------------------------------------------------
   Indicator Evaluation
-------------------------------------------------- */
export function evaluateIndicator(
  indicator: IndicatorDefinition,
  context: AdvancedFormulaContext
): IndicatorResult {
  try {
    // Evaluate numerator
    const numeratorContext = { ...context }
    const numeratorResult = evaluateAdvancedFormula(indicator.numerator.formula, numeratorContext)
    
    if (!numeratorResult.isValid || numeratorResult.value === null) {
      return {
        value: null,
        formatted: "—",
        isValid: false,
        error: "Invalid numerator calculation"
      }
    }

    // Evaluate denominator (if exists)
    let denominatorValue = 1
    if (indicator.denominator) {
      const denominatorContext = { ...context }
      const denominatorResult = evaluateAdvancedFormula(indicator.denominator.formula, denominatorContext)
      
      if (!denominatorResult.isValid || denominatorResult.value === null || denominatorResult.value === 0) {
        return {
          value: null,
          formatted: "—",
          isValid: false,
          error: "Invalid denominator calculation"
        }
      }
      denominatorValue = denominatorResult.value
    }

    // Calculate final value
    const result = (numeratorResult.value / denominatorValue) * indicator.factor
    
    return {
      value: result,
      formatted: `${formatNumber(result)} ${indicator.unit}`,
      isValid: true
    }

  } catch (err) {
    return {
      value: null,
      formatted: "—",
      isValid: false,
      error: String(err)
    }
  }
}

/* --------------------------------------------------
   Validation Functions
-------------------------------------------------- */
export function validateFormula(formula: string): { isValid: boolean; error?: string } {
  try {
    if (!formula.trim()) {
      return { isValid: false, error: "Formula cannot be empty" }
    }

    // Check for basic syntax
    const expr = formula.startsWith("=") ? formula.slice(1) : formula
    
    // Check for balanced parentheses
    let parenCount = 0
    for (const char of expr) {
      if (char === '(') parenCount++
      if (char === ')') parenCount--
      if (parenCount < 0) {
        return { isValid: false, error: "Unbalanced parentheses" }
      }
    }
    
    if (parenCount !== 0) {
      return { isValid: false, error: "Unbalanced parentheses" }
    }

    // Check for valid function names
    const functionRegex = /\b(SUM|AVERAGE|MIN|MAX|COUNT|PERCENTAGE|RATIO|IF|ROUND|CEIL|FLOOR)\s*\(/gi
    const matches = expr.match(functionRegex)
    
    if (matches) {
      for (const match of matches) {
        const funcName = match.replace(/\s*\(/, '').toUpperCase()
        const validFunctions = ['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'PERCENTAGE', 'RATIO', 'IF', 'ROUND', 'CEIL', 'FLOOR']
        if (!validFunctions.includes(funcName)) {
          return { isValid: false, error: `Unknown function: ${funcName}` }
        }
      }
    }

    return { isValid: true }
  } catch (err) {
    return { isValid: false, error: String(err) }
  }
}

export function validateIndicator(indicator: IndicatorDefinition): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!indicator.code.trim()) {
    errors.push("Indicator code is required")
  }

  if (!indicator.name.trim()) {
    errors.push("Indicator name is required")
  }

  if (!indicator.numerator.formula.trim()) {
    errors.push("Numerator formula is required")
  } else {
    const numValidation = validateFormula(indicator.numerator.formula)
    if (!numValidation.isValid) {
      errors.push(`Numerator formula error: ${numValidation.error}`)
    }
  }

  if (indicator.denominator && !indicator.denominator.formula.trim()) {
    errors.push("Denominator formula is required when denominator is specified")
  } else if (indicator.denominator) {
    const denValidation = validateFormula(indicator.denominator.formula)
    if (!denValidation.isValid) {
      errors.push(`Denominator formula error: ${denValidation.error}`)
    }
  }

  if (indicator.factor <= 0) {
    errors.push("Factor must be greater than 0")
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
