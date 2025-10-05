"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ExcelLikeTable from "@/components/report-designer/ExcelLikeTable"
import CellFormatToolbar from "@/components/report-designer/CellFormatToolbar"
import DataElementPalette, { type DataElement } from "@/components/report-designer/DataElementPalette"
import Renderer from "@/components/report-designer/Renderer"
import api from "@/lib/api"
import { createLayout, updateLayout, publishLayout } from "@/lib/reportLayouts"
import type { LayoutSchema, HeadingSection, TableSection, CellDef } from "@/types/report-layout"
import { useDesignerStore } from "@/stores/reportDesignerStore"
import { Undo2, Redo2, Save, Upload, TableIcon, HeadingIcon, Eye, Code, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

type ReportType = { id: number; name: string; code: string; data_elements?: DataElement[] }

const DEFAULT_SCHEMA: LayoutSchema = { title: "", sections: [] }

export default function ReportDesignerPage() {
  const params = useParams<{ id?: string }>()
  const router = useRouter()
  const isNew = !params?.id || params.id === "new"

  const [layoutId, setLayoutId] = useState<number | undefined>()
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [reportTypeId, setReportTypeId] = useState<number | undefined>()
  const [schema, setSchema] = useState<LayoutSchema>(DEFAULT_SCHEMA)
  const [reportTypes, setReportTypes] = useState<ReportType[]>([])
  const [rtElements, setRtElements] = useState<DataElement[]>([])
  const [activeTab, setActiveTab] = useState("design")

  const { selectedCell, setSelectedCell, copiedCell, setCopiedCell, pushHistory, undo, redo, canUndo, canRedo } =
    useDesignerStore()

  // Load data
  useEffect(() => {
    ;(async () => {
      const rts = await api.get("/metadata/report-types/").then((r) => r.data)
      setReportTypes(rts)
      if (!isNew) {
        const l = await api.get(`/reporting/report-layouts/${params.id}/`).then((r) => r.data)
        setLayoutId(l.id)
        setName(l.name)
        setCode(l.code)
        setReportTypeId(l.report_type || undefined)
        setSchema(l.schema || DEFAULT_SCHEMA)
        pushHistory(l.schema || DEFAULT_SCHEMA)
      } else {
        pushHistory(DEFAULT_SCHEMA)
      }
    })()
  }, [isNew, params?.id])

  // Fetch data elements
  useEffect(() => {
    if (!reportTypeId) {
      setRtElements([])
      return
    }
    const rt = reportTypes.find((rt) => rt.id === reportTypeId)
    if (rt?.data_elements?.length) {
      setRtElements(rt.data_elements)
    } else {
      api.get(`/metadata/report-types/${reportTypeId}/`).then((r) => setRtElements(r.data?.data_elements || []))
    }
  }, [reportTypeId, reportTypes])

  // Update schema with history
  const updateSchema = (newSchema: LayoutSchema) => {
    setSchema(newSchema)
    pushHistory(newSchema)
  }

  // Undo/Redo handlers
  const handleUndo = () => {
    const prevSchema = undo()
    if (prevSchema) setSchema(prevSchema)
  }

  const handleRedo = () => {
    const nextSchema = redo()
    if (nextSchema) setSchema(nextSchema)
  }

  // Add sections
  const addHeading = () => {
    updateSchema({
      ...schema,
      sections: [...schema.sections, { type: "heading", text: "SECTION TITLE", level: 2 } as HeadingSection],
    })
  }

  const addTable = () => {
    const t: TableSection = {
      type: "table",
      id: `tbl_${Date.now()}`,
      columnWidths: [64, 420, 220, 220],
      header: {
        rows: [[{ label: "NO." }, { label: "MEASURE" }, { label: "VALUE / INDICATOR" }, { label: "REMARK" }]],
      },
      rows: [{ cells: [{ text: "1" }, { text: "Item" }, { text: "" }, { text: "" }] }],
    }
    updateSchema({ ...schema, sections: [...schema.sections, t] })
  }

  // Update section
  const updateSectionAt = (index: number, next: any) => {
    const copy = [...schema.sections]
    copy[index] = next
    updateSchema({ ...schema, sections: copy })
  }

  // Delete section
  const deleteSection = (index: number) => {
    const copy = schema.sections.filter((_, i) => i !== index)
    updateSchema({ ...schema, sections: copy })
    setSelectedCell(null)
  }

  // Get selected cell
  const getSelectedCell = (): CellDef | null => {
    if (!selectedCell) return null
    const sec = schema.sections[selectedCell.sectionIndex] as TableSection
    if (!sec || sec.type !== "table") return null
    return sec.rows[selectedCell.rowIndex]?.cells[selectedCell.colIndex] ?? null
  }

  // Update selected cell
  const updateSelectedCell = (patch: Partial<CellDef>) => {
    if (!selectedCell) return
    const sec = schema.sections[selectedCell.sectionIndex] as TableSection
    if (!sec || sec.type !== "table") return

    const rows = sec.rows.map((r, ri) =>
      ri === selectedCell.rowIndex
        ? {
            cells: r.cells.map((c, ci) => (ci === selectedCell.colIndex ? { ...c, ...patch } : c)),
          }
        : r,
    )
    updateSectionAt(selectedCell.sectionIndex, { ...sec, rows })
  }

  // Clear selected cell
  const clearSelectedCell = () => {
    updateSelectedCell({ text: "", bind: undefined, compute: undefined })
  }

  // Copy/Paste
  const handleCopy = () => {
    const cell = getSelectedCell()
    if (cell) {
      setCopiedCell(cell)
      toast.success("Cell copied", { description: "Press Ctrl+V to paste" })
    }
  }

  const handlePaste = () => {
    if (copiedCell && selectedCell) {
      updateSelectedCell(copiedCell)
      toast.success("Cell pasted")
    }
  }

  // Bind data element
  const handleBindElement = (el: DataElement) => {
    if (!selectedCell) {
      toast.error("No cell selected", { description: "Select a cell first" })
      return
    }
    updateSelectedCell({ bind: el.code, text: undefined, compute: undefined })
    toast.success("Data element bound", { description: `Bound ${el.code} to cell` })
  }

  // Save/Publish
  const handleSave = async () => {
    const payload = { name, code, report_type: reportTypeId || null, schema }
    try {
      if (isNew) {
        const created = await createLayout(payload)
        setLayoutId(created.id)
        router.push(`/design-reports/${created.id}`)
        toast.success("Layout created")
      } else {
        await updateLayout(layoutId!, payload)
        toast.success("Layout saved")
      }
    } catch (error) {
      toast.error("Error saving layout")
    }
  }

  const handlePublish = async () => {
    if (!layoutId) return
    try {
      await publishLayout(layoutId)
      toast.success("Layout published")
    } catch (error) {
      toast.error("Error publishing layout")
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault()
        handleUndo()
      } else if (e.ctrlKey && e.key === "y") {
        e.preventDefault()
        handleRedo()
      } else if (e.ctrlKey && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [schema, name, code, reportTypeId, layoutId])

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Toaster />

      {/* Top toolbar */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Layout name" className="w-64" />
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Layout code" className="w-48" />
        <Select
          value={reportTypeId ? String(reportTypeId) : ""}
          onValueChange={(v) => {
            setReportTypeId(Number(v))
            setSelectedCell(null)
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select report type" />
          </SelectTrigger>
          <SelectContent>
            {reportTypes.map((rt) => (
              <SelectItem key={rt.id} value={String(rt.id)}>
                {rt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button size="sm" variant="outline" onClick={handleUndo} disabled={!canUndo()}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleRedo} disabled={!canRedo()}>
          <Redo2 className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-gray-300" />

        <Button size="sm" variant="outline" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
        <Button size="sm" onClick={handlePublish} disabled={!layoutId}>
          <Upload className="h-4 w-4 mr-2" />
          Publish
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Palette */}
        <div className="w-64 bg-white border-r p-4 space-y-3">
          <div className="text-sm font-semibold mb-3">Add Elements</div>
          <Button variant="outline" className="w-full justify-start bg-transparent" onClick={addHeading}>
            <HeadingIcon className="h-4 w-4 mr-2" />
            Heading
          </Button>
          <Button variant="outline" className="w-full justify-start bg-transparent" onClick={addTable}>
            <TableIcon className="h-4 w-4 mr-2" />
            Table
          </Button>

          <div className="pt-4 border-t">
            <div className="text-sm font-semibold mb-3">Keyboard Shortcuts</div>
            <div className="space-y-1 text-xs text-gray-600">
              <div>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl+Z</kbd> Undo
              </div>
              <div>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl+Y</kbd> Redo
              </div>
              <div>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl+C</kbd> Copy
              </div>
              <div>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl+V</kbd> Paste
              </div>
              <div>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl+S</kbd> Save
              </div>
              <div>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded">Enter</kbd> Edit cell
              </div>
              <div>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded">Del</kbd> Clear cell
              </div>
              <div>
                <kbd className="px-1 py-0.5 bg-gray-100 rounded">↑↓←→</kbd> Navigate
              </div>
            </div>
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-4 w-fit">
              <TabsTrigger value="design">
                <Code className="h-4 w-4 mr-2" />
                Design
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="design" className="flex-1 overflow-auto p-4 mt-0">
              <div className="max-w-5xl mx-auto space-y-4">
                {schema.sections.map((sec, idx) => {
                  if (sec.type === "heading") {
                    const h = sec as HeadingSection
                    return (
                      <div key={idx} className="bg-white rounded-lg p-4 border group relative">
                        <Input
                          value={h.text}
                          onChange={(e) => {
                            const copy = [...schema.sections]
                            copy[idx] = { ...h, text: e.target.value }
                            updateSchema({ ...schema, sections: copy })
                          }}
                          className="text-lg font-semibold"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteSection(idx)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )
                  }

                  const t = sec as TableSection
                  return (
                    <div key={t.id} className="bg-white rounded-lg border overflow-hidden group relative">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteSection(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                      <CellFormatToolbar
                        cell={selectedCell?.sectionIndex === idx ? getSelectedCell() : null}
                        onUpdate={updateSelectedCell}
                        onClear={clearSelectedCell}
                      />
                      <div className="p-4">
                        <ExcelLikeTable
                          table={t}
                          sectionIndex={idx}
                          onChange={(next) => updateSectionAt(idx, next)}
                          onCopy={handleCopy}
                          onPaste={handlePaste}
                          onDelete={clearSelectedCell}
                        />
                      </div>
                    </div>
                  )
                })}

                {schema.sections.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <TableIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No elements yet. Add a heading or table to get started.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 overflow-auto p-4 mt-0">
              <div className="max-w-5xl mx-auto">
                <Renderer layout={schema} data={{}} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar - Data Elements */}
        <div className="w-80 bg-white border-l">
          {reportTypeId ? (
            <DataElementPalette elements={rtElements} onBind={handleBindElement} />
          ) : (
            <div className="p-4 text-sm text-gray-500 text-center">Select a report type to view data elements</div>
          )}
        </div>
      </div>
    </div>
  )
}
