"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CellDef } from "@/types/report-layout"

type FormulaBarProps = {
  cell: CellDef | null
  cellReference: string
  onUpdate: (patch: Partial<CellDef>) => void
}

export default function FormulaBar({ cell, cellReference, onUpdate }: FormulaBarProps) {
  const [value, setValue] = React.useState("")
  const [mode, setMode] = React.useState<"text" | "bind" | "compute">("text")

  React.useEffect(() => {
    if (!cell) {
      setValue("")
      setMode("text")
      return
    }

    if (cell.bind) {
      setValue(cell.bind)
      setMode("bind")
    } else if (cell.compute) {
      setValue(cell.compute)
      setMode("compute")
    } else {
      setValue(cell.text || "")
      setMode("text")
    }
  }, [cell])

  const handleChange = (newValue: string) => {
    setValue(newValue)
  }

  const handleBlur = () => {
    if (!cell) return

    // Determine what type of value this is
    if (value.startsWith("=")) {
      // Formula
      onUpdate({ compute: value.slice(1), text: undefined, bind: undefined })
    } else if (value.includes(".") && !value.includes(" ")) {
      // Likely a binding (e.g., "hr.transfer_in")
      onUpdate({ bind: value, text: undefined, compute: undefined })
    } else {
      // Plain text
      onUpdate({ text: value, bind: undefined, compute: undefined })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleBlur()
      ;(e.target as HTMLInputElement).blur()
    } else if (e.key === "Escape") {
      // Reset to original value
      if (cell?.bind) setValue(cell.bind)
      else if (cell?.compute) setValue(cell.compute)
      else setValue(cell?.text || "")
      ;(e.target as HTMLInputElement).blur()
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border-b">
      <div className="flex items-center gap-2 min-w-[100px]">
        <Label className="text-xs font-semibold text-gray-600">Cell:</Label>
        <div className="px-2 py-1 bg-gray-100 rounded text-sm font-mono font-semibold min-w-[60px] text-center">
          {cellReference || "—"}
        </div>
      </div>

      <div className="h-6 w-px bg-gray-300" />

      <div className="flex-1 flex items-center gap-2">
        <Label className="text-xs font-semibold text-gray-600">
          {mode === "bind" ? "Binding:" : mode === "compute" ? "Formula:" : "Value:"}
        </Label>
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={
            cell
              ? 'Type text, binding (e.g., "hr.transfer_in"), or formula (e.g., "=sum(row,1,5)")'
              : "Select a cell to edit"
          }
          disabled={!cell}
          className="flex-1 font-mono text-sm"
        />
      </div>

      {cell && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {cell.bind && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">Data Bound</span>
          )}
          {cell.compute && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">Formula</span>
          )}
        </div>
      )}
    </div>
  )
}
