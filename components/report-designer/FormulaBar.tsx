"use client"

import type React from "react"

import { Input } from "@/components/ui/input"
import { Calculator } from "lucide-react"
import type { CellDef } from "@/types/report-layout"
import { useState, useEffect } from "react"

type FormulaBarProps = {
  cell: CellDef | null
  cellReference: string
  onUpdate: (patch: Partial<CellDef>) => void
}

export default function FormulaBar({ cell, cellReference, onUpdate }: FormulaBarProps) {
  const [value, setValue] = useState("")

  useEffect(() => {
    if (!cell) {
      setValue("")
      return
    }
    if (cell.compute) {
      setValue(`=${cell.compute}`)
    } else if (cell.bind) {
      setValue(cell.bind)
    } else {
      setValue(cell.text || "")
    }
  }, [cell])

  const handleChange = (newValue: string) => {
    setValue(newValue)
  }

  const handleBlur = () => {
    if (!cell) return

    if (value.startsWith("=")) {
      // Formula: remove = prefix and store in compute
      onUpdate({ compute: value.slice(1), text: undefined, bind: undefined })
    } else if (value.includes(".") && !value.includes(" ")) {
      // Data binding path
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
      if (cell?.compute) {
        setValue(`=${cell.compute}`)
      } else if (cell?.bind) {
        setValue(cell.bind)
      } else {
        setValue(cell?.text || "")
      }
      ;(e.target as HTMLInputElement).blur()
    }
  }

  return (
    <div className="px-4 py-2 border-b bg-gray-50 flex items-center gap-3">
      <div className="flex items-center gap-2 min-w-[80px]">
        <Calculator className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-mono font-semibold text-gray-700">{cellReference || "—"}</span>
      </div>
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={
          cell ? "Enter formula (=SUM(A1:A5)), data binding (hr.transfer_in), or text" : "Select a cell to edit"
        }
        disabled={!cell}
        className="flex-1 font-mono text-sm"
      />
      <div className="text-xs text-gray-500 hidden lg:block">
        <span className="font-semibold">Formulas:</span> =SUM(A1:A5), =AVERAGE(B1:B10), =A1+B1*C1
      </div>
    </div>
  )
}
