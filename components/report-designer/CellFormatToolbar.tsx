"use client"
import { Button } from "@/components/ui/button"
import { Bold, AlignLeft, AlignCenter, AlignRight, Palette, Trash2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CellDef } from "@/types/report-layout"

type CellFormatToolbarProps = {
  cell: CellDef | null
  onUpdate: (patch: Partial<CellDef>) => void
  onClear: () => void
}

const PRESET_COLORS = [
  "#ffffff",
  "#f3f4f6",
  "#e5e7eb",
  "#d1d5db",
  "#fef3c7",
  "#fde68a",
  "#fcd34d",
  "#fbbf24",
  "#dbeafe",
  "#bfdbfe",
  "#93c5fd",
  "#60a5fa",
  "#dcfce7",
  "#bbf7d0",
  "#86efac",
  "#4ade80",
  "#fecaca",
  "#fca5a5",
  "#f87171",
  "#ef4444",
]

export default function CellFormatToolbar({ cell, onUpdate, onClear }: CellFormatToolbarProps) {
  if (!cell) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-gray-50 text-sm text-gray-500">
        Select a cell to format
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b bg-white">
      <div className="text-xs font-medium text-gray-600 mr-2">Format:</div>

      <Button
        size="sm"
        variant={cell.bold ? "default" : "outline"}
        onClick={() => onUpdate({ bold: !cell.bold })}
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-gray-300" />

      <Button
        size="sm"
        variant={cell.align === "left" ? "default" : "outline"}
        onClick={() => onUpdate({ align: "left" })}
        className="h-8 w-8 p-0"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant={cell.align === "center" ? "default" : "outline"}
        onClick={() => onUpdate({ align: "center" })}
        className="h-8 w-8 p-0"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant={cell.align === "right" ? "default" : "outline"}
        onClick={() => onUpdate({ align: "right" })}
        className="h-8 w-8 p-0"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-gray-300" />

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Background Color</Label>
              <div className="grid grid-cols-5 gap-1 mt-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => onUpdate({ backgroundColor: color })}
                    className="h-8 w-8 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={cell.backgroundColor || "#ffffff"}
                onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                className="mt-2 h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Text Color</Label>
              <Input
                type="color"
                value={cell.textColor || "#000000"}
                onChange={(e) => onUpdate({ textColor: e.target.value })}
                className="mt-1 h-8"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="h-6 w-px bg-gray-300" />

      <Button size="sm" variant="outline" onClick={onClear} className="h-8 w-8 p-0 bg-transparent">
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="ml-auto text-xs text-gray-600">
        {cell.bind && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded">
            Bound: {cell.bind}
          </span>
        )}
        {cell.compute && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded">
            Formula: {cell.compute}
          </span>
        )}
        {cell.text && !cell.bind && !cell.compute && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded">
            Text: {cell.text}
          </span>
        )}
      </div>
    </div>
  )
}
