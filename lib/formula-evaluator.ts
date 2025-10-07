// lib/formula-evaluator.ts
import { evaluate } from "mathjs"

// Type alias for cell values
export type CellValue = string | number | undefined

// Context describing how to fetch cell values
export type FormulaContext = {
  getCellValue: (rowIndex: number, colIndex: number) => CellValue
  rowCount: number
  colCount: number
}

/* --------------------------------------------------
   Helper: Convert column letters → index (A→0, B→1)
-------------------------------------------------- */
function columnLetterToIndex(letter: string): number {
  let index = 0
  for (let i = 0; i < letter.length; i++) {
    index *= 26
    index += letter.charCodeAt(i) - 65 + 1
  }
  return index - 1
}

/* --------------------------------------------------
   Helper: Parse "A1" → [rowIndex, colIndex]
-------------------------------------------------- */
function parseCellRef(ref: string): [number, number] | null {
  const match = /^([A-Z]+)([0-9]+)$/.exec(ref.toUpperCase())
  if (!match) return null
  const [, letters, num] = match
  const col = columnLetterToIndex(letters)
  const row = parseInt(num, 10) - 1
  return [row, col]
}

/* --------------------------------------------------
   Helper: Extract range "A1:B3" → list of cells
-------------------------------------------------- */
function expandRange(ref: string): string[] {
  const parts = ref.split(":")
  if (parts.length === 1) return [ref]
  const start = parseCellRef(parts[0])
  const end = parseCellRef(parts[1])
  if (!start || !end) return []

  const [r1, c1] = start
  const [r2, c2] = end
  const cells: string[] = []
  for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
      const colLetter = indexToColumnLetter(c)
      cells.push(`${colLetter}${r + 1}`)
    }
  }
  return cells
}

/* --------------------------------------------------
   Helper: Convert index → Excel column label (0→A)
-------------------------------------------------- */
function indexToColumnLetter(index: number): string {
  let i = index + 1
  let s = ""
  while (i > 0) {
    const rem = (i - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    i = Math.floor((i - 1) / 26)
  }
  return s
}

/* --------------------------------------------------
   Evaluate Formula
   Supports:
     =A1+B1*C1
     =SUM(A1:A5)
     =AVERAGE(B2:C4)
     =population + births
-------------------------------------------------- */
export function evaluateFormula(
  formula: string,
  context: FormulaContext
): number | string {
  try {
    let expr = formula.trim()
    if (expr.startsWith("=")) expr = expr.slice(1).trim()

    // Handle basic functions like SUM(A1:A5)
    expr = expr.replace(
      /\b(SUM|AVERAGE|MIN|MAX|COUNT)\s*\(([^)]+)\)/gi,
      (_, funcName: string, rangeExpr: string) => {
        const refs = expandRange(rangeExpr)
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

        switch (funcName.toUpperCase()) {
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
          default:
            return "0"
        }
      }
    )

    // Replace cell refs (A1, B2, etc.) with actual numbers
    expr = expr.replace(/\b([A-Z]+[0-9]+)\b/g, (match) => {
      const pos = parseCellRef(match)
      if (!pos) return "0"
      const [r, c] = pos
      const val = context.getCellValue(r, c)
      if (val === undefined || val === null || val === "") return "0"
      if (typeof val === "number") return String(val)
      const parsed = parseFloat(String(val))
      return isNaN(parsed) ? "0" : String(parsed)
    })

    // Fallback to variable-style names (population, births, etc.)
    // mathjs will try to resolve these if present in context scope
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

    const result = evaluate(expr, scope)
    if (typeof result === "number" && !isNaN(result)) return result
    return String(result)
  } catch (err) {
    console.warn("Formula evaluation error:", formula, err)
    return "#ERROR"
  }
}
