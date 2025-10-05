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
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted text-sm text-muted-foreground">
        <span className="text-xs">Select a cell to format or double-click to edit</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-background">
      <div className="text-xs font-semibold text-foreground mr-2">Format:</div>

      {/* Text formatting */}
      <Button
        size="sm"
        variant={cell.bold ? "default" : "outline"}
        onClick={() => onUpdate({ bold: !cell.bold })}
        className="h-8 w-8 p-0"
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-border" />

      {/* Alignment */}
      <Button
        size="sm"
        variant={cell.align === "left" ? "default" : "outline"}
        onClick={() => onUpdate({ align: "left" })}
        className="h-8 w-8 p-0"
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant={cell.align === "center" ? "default" : "outline"}
        onClick={() => onUpdate({ align: "center" })}
        className="h-8 w-8 p-0"
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant={cell.align === "right" ? "default" : "outline"}
        onClick={() => onUpdate({ align: "right" })}
        className="h-8 w-8 p-0"
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <div className="h-6 w-px bg-border" />

      {/* Colors */}
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent" title="Cell Colors">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold">Background Color</Label>
              <div className="grid grid-cols-5 gap-1.5 mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => onUpdate({ backgroundColor: color })}
                    className="h-8 w-8 rounded border-2 border-border hover:scale-110 hover:border-primary transition-all"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={cell.backgroundColor || "#ffffff"}
                onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                className="mt-2 h-9"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Text Color</Label>
              <Input
                type="color"
                value={cell.textColor || "#000000"}
                onChange={(e) => onUpdate({ textColor: e.target.value })}
                className="mt-2 h-9"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="h-6 w-px bg-border" />

      {/* Clear cell */}
      <Button
        size="sm"
        variant="outline"
        onClick={onClear}
        className="h-8 w-8 p-0 bg-transparent"
        title="Clear Cell (Del)"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="ml-auto flex items-center gap-2">
        {cell.bind && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Data: {cell.bind}
          </span>
        )}
        {cell.compute && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary/10 text-secondary rounded-md text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            Formula: ={cell.compute}
          </span>
        )}
        {cell.text && !cell.bind && !cell.compute && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted text-muted-foreground rounded-md text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
            Text
          </span>
        )}
      </div>
    </div>
  )
}
