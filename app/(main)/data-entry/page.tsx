"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import api from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Target, Save } from "lucide-react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import DataEntryTopBar from "@/components/data-entry/DataEntryTopBar"
import DataEntryForm from "@/components/data-entry/DataEntryForm"
import EnhancedLayoutEntryForm, { type LayoutSchema, type TableArraySection } from "@/components/data-entry/EnhancedLayoutEntryForm"
import type { ReportType } from "@/components/data-entry/DatasetInlineDropdown"
import type { OrgNode } from "@/components/data-entry/OrgUnitInlineDropdown"
import type { Period } from "@/components/data-entry/PeriodInlineDropdown"
import { evaluateFormula } from "@/lib/formula-evaluator"
import { ApiClient } from "@/lib/api"
import type { IndicatorDefinition } from "@/lib/advanced-formula-evaluator"

type ValuesById = Record<string, number | null>
type ValuesByCode = Record<string, number | string | null>

// Schema conversion function to ensure compatibility between report designer and data entry
function convertLayoutSchema(schema: LayoutSchema): LayoutSchema {
  if (!schema?.sections) return schema
  
  const convertedSections = schema.sections.map((section) => {
    if (section.type === "table" && 'rows' in section && section.rows) {
      // Convert table sections to ensure bind properties are preserved
      const convertedRows = section.rows.map((row) => ({
        ...row,
        cells: row.cells?.map((cell) => ({
          ...cell,
          // Ensure bind property is preserved for remarks fields
          bind: cell.bind || undefined,
          text: cell.text || undefined,
          compute: cell.compute || undefined
        })) || []
      }))
      
      return {
        ...section,
        rows: convertedRows
      }
    }
    return section
  })
  
  return {
    ...schema,
    sections: convertedSections
  }
}

export default function DataEntryPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { djangoUser } = useAuth()

  const [loading, setLoading] = React.useState(true)
  const [loadingLayout, setLoadingLayout] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const [datasets, setDatasets] = React.useState<ReportType[]>([])
  const [dataset, setDataset] = React.useState<ReportType | null>(null)
  const [orgTree, setOrgTree] = React.useState<OrgNode[]>([])
  const [org, setOrg] = React.useState<OrgNode | null>(null)
  const [period, setPeriod] = React.useState<Period | null>(null)

  // base values entered by the user and remarks
  const [valuesById, setValuesById] = React.useState<ValuesById>({})
  const [valuesByCode, setValuesByCode] = React.useState<ValuesByCode>({})

  // layout schema (published)
  const [layout, setLayout] = React.useState<LayoutSchema | null>(null)

  // Enhanced calculation system
  const [dataElements, setDataElements] = React.useState<Array<{ id: string; code: string; name: string }>>([])
  const [indicators, setIndicators] = React.useState<IndicatorDefinition[]>([])

  const hasValues = React.useMemo(() => {
    if (layout) {
      return Object.values(valuesByCode).some((v) => v !== null && v !== undefined && v !== "")
    }
    return Object.values(valuesById).some((v) => v !== null && v !== undefined)
  }, [layout, valuesByCode, valuesById])

  const canSubmit = !!dataset && !!period && !!org && hasValues


  /* ---------------- INITIAL LOAD ---------------- */
  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const [rtRes, treeRes, deRes, indRes] = await Promise.all([
          api.get("/metadata/report-types/"), 
          api.get("/org/tree/"),
          ApiClient.getDataElements(),
          ApiClient.getIndicators()
        ])
        setDatasets(rtRes.data)
        setOrgTree(treeRes.data || [])
        
        // Load data elements
        const deData = deRes.data?.results || deRes.data || []
        setDataElements(deData.map((de: { id: number; code: string; name: string }) => ({
          id: String(de.id),
          code: de.code,
          name: de.name
        })))
        
        // Load indicators
        const indData = indRes.data?.results || indRes.data || []
        setIndicators(indData.map((ind: { 
          id: number; 
          code: string; 
          name: string; 
          description?: string; 
          numerator_formula: string; 
          numerator_description?: string; 
          denominator_formula?: string; 
          denominator_description?: string; 
          factor: number 
        }) => ({
          id: String(ind.id),
          code: ind.code,
          name: ind.name,
          description: ind.description,
          numerator: {
            formula: ind.numerator_formula,
            description: ind.numerator_description || "",
            dataElements: []
          },
          denominator: ind.denominator_formula ? {
            formula: ind.denominator_formula,
            description: ind.denominator_description || "",
            dataElements: []
          } : undefined,
          factor: ind.factor || 1,
          unit: ind.factor === 100 ? "%" : ind.factor === 1000 ? "per 1000" : "ratio",
          aggregationType: "sum" as const,
          category: ""
        })))
        
      } catch (e) {
        console.error("[entry] init error:", e)
        toast.error("Failed to load data. Please refresh.")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  /* ---------------- RESET WHEN DATASET CHANGES ---------------- */
  React.useEffect(() => {
    setValuesById({})
    setValuesByCode({})
    setLayout(null)
  }, [dataset?.id])

  /* ---------------- FETCH PUBLISHED LAYOUT ---------------- */
  React.useEffect(() => {
    if (!dataset) {
      setLayout(null)
      setValuesByCode({})
      setValuesById({})
      return
    }
    
    // Clear existing values when dataset changes
    setValuesByCode({})
    setValuesById({})
    
    const loadLayoutData = async () => {
      try {
        setLoadingLayout(true)
        console.log(`[DEBUG] Loading layout for dataset: ${dataset.name} (ID: ${dataset.id})`)
        
        const resp = await api.get(
          `/reporting/report-layouts/by_report_type/?report_type=${dataset.id}&status=published`,
          { timeout: 30000 }
        )

        console.log(`[DEBUG] Layout API response:`, resp.data)

        // by_report_type returns a single layout object, not an array
        const layout = resp.data
        console.log(`[DEBUG] Found layout:`, layout)
        
        const schema = layout?.schema

        if (schema?.sections && Array.isArray(schema.sections)) {
          // Convert the schema to ensure compatibility with EnhancedLayoutEntryForm
          const convertedSchema = convertLayoutSchema(schema)
          setLayout(convertedSchema)
          console.log(`[DEBUG] Layout set successfully for: ${dataset.name}`)
          toast.success(`Layout loaded for ${dataset.name}`)
        } else {
          setLayout(null)
          console.log(`[DEBUG] No valid schema found for: ${dataset.name}`)
          toast.info("No published layout found.")
        }
      } catch (e) {
        console.warn("[entry] layout fetch failed:", e)
        const error = e as { response?: { status?: number } }
        if (error?.response?.status === 404) {
          console.log(`[DEBUG] No published layout found for dataset: ${dataset.name}`)
          toast.info(`No published layout found for ${dataset.name}`)
        } else {
          toast.error("Failed to load layout")
        }
        setLayout(null)
      } finally {
        setLoadingLayout(false)
      }
    }

    loadLayoutData()
  }, [dataset?.id, dataset])

  /* ---------------- CLEAR FORM ---------------- */
  const onClear = () => {
    setDataset(null)
    setOrg(null)
    setPeriod(null)
    setValuesById({})
    setValuesByCode({})
    setLayout(null)
  }

  const setIdValue = (id: string, v: number | null) => setValuesById((p) => ({ ...p, [id]: v }))
  // NOTE: onChange from EnhancedLayoutEntryForm should only update user-entered (base) values
  const setCodeValue = (code: string, v: number | string | null) =>
    setValuesByCode((p) => ({ ...p, [code]: v }))

  /* ---------------- CODE → ID MAP ---------------- */
  const codeToId = React.useMemo(() => {
    const m: Record<string, number> = {}
    dataset?.data_elements?.forEach((de) => (m[de.code] = de.id))
    return m
  }, [dataset?.data_elements])

  /* ---------------- LOAD EXISTING REPORT ---------------- */
  React.useEffect(() => {
    const fetchExistingReport = async () => {
      if (!dataset?.id || !org?.id || !period?.startDate) return

      try {
        setSaving(true)
        const res = await api.get("/reporting/data-entry/", {
          params: {
            report_type: dataset.id,
            org_unit: org.id,
            reporting_period: period.startDate,
          },
        })

        const report = res.data
        if (!report?.values || !Array.isArray(report.values)) return

        if (layout) {
          const byCode: Record<string, number | string | null> = {}
          for (const v of report.values) {
            byCode[v.data_element_code] = v.value
            if (v.remark) byCode[`remark.${v.data_element_code}`] = v.remark
          }
          setValuesByCode(byCode)
        } else {
          const byId: Record<string, number | null> = {}
          for (const v of report.values) {
            byId[String(v.data_element)] = v.value
          }
          setValuesById(byId)
        }

        toast.info("Existing report loaded.")
      } catch (err: unknown) {
        const error = err as { response?: { status?: number } };
        const status = error?.response?.status;
        if (status === 404) {
          setValuesByCode({})
          setValuesById({})
          return
        }
        console.error("Error loading report:", err)
        toast.error("Failed to load existing report data.")
      } finally {
        setSaving(false)
      }
    }

    // Only fetch existing report if we have all required data AND layout is loaded
    if (dataset?.id && org?.id && period?.startDate && layout) {
      console.log(`[DEBUG] Fetching existing report for: ${dataset.name} (ID: ${dataset.id}), Org: ${org.name}, Period: ${period.startDate}`)
      fetchExistingReport()
    }
  }, [dataset?.id, org?.id, period?.startDate, layout, dataset?.name, org?.name])

  /* ---------------- PURE COMPUTATION: computedValuesMap ----------------
     This is the crucial change:
     - computedValuesMap is derived purely from (layout, valuesByCode)
     - computedValuesMap is created in useMemo and does NOT call setState during computation
     - It runs iterative passes to resolve chained formulas, but remains synchronous/pure
  ------------------------------------------------------------------ */
  const computedValuesMap = React.useMemo(() => {
    if (!layout?.sections) return {} as ValuesByCode

    // working maps
    const base = { ...valuesByCode } // base user inputs (may contain numbers, strings, remarks)
    const computed: ValuesByCode = {} // computed values we will derive

    // Helper to read "combined" value used during computation: base overrides computed? base should be authoritative for bound fields
    const readCombined = (key: string): string | number | null | undefined => {
      // prefer base user-entered value (including remark.*)
      if (Object.prototype.hasOwnProperty.call(base, key)) return base[key]
      if (Object.prototype.hasOwnProperty.call(computed, key)) return computed[key]
      return undefined
    }

    // Iterate per-table and compute; do multi-pass for chained formulas
    const maxPasses = 6
    for (let pass = 0; pass < maxPasses; pass++) {
      let passChanged = false

      for (const section of layout.sections) {
        if (section.type !== "table") continue
        const table = section as TableArraySection;
        const rows = Array.isArray(table.rows) ? table.rows : [];
        const rowCount = rows.length;
        const colCount = rows.reduce((m: number, r) => Math.max(m, Array.isArray(r.cells) ? r.cells.length : 0), 0) || 0;

        // Build a small accessor to satisfy FormulaContext
        const context = {
          getCellValue: (rowIndex: number, colIndex: number) => {
            // safety bounds
            if (rowIndex < 0 || rowIndex >= rowCount) return undefined
            if (colIndex < 0 || colIndex >= colCount) return undefined

            const cell = rows[rowIndex]?.cells?.[colIndex]
            if (!cell) return undefined

            // if cell has bind, prefer the base value for that bind, otherwise computed
            if (cell.bind) {
              const key = String(cell.bind)
              const v = readCombined(key)
              if (v === null || v === undefined || v === "") return undefined
              return typeof v === "number" ? v : (isNaN(Number(v)) ? undefined : Number(v))
            }

            // if cell has compute, check computed map or base keyed by compute
            if (cell.compute) {
              const key = String(cell.bind || cell.compute)
              const v = readCombined(key)
              if (v === null || v === undefined || v === "") return undefined
              return typeof v === "number" ? v : (isNaN(Number(v)) ? undefined : Number(v))
            }

            // otherwise try text
            if (cell.text !== undefined && cell.text !== null && String(cell.text).trim() !== "") {
              const n = Number(cell.text)
              return isNaN(n) ? undefined : n
            }

            return undefined
          },
          rowCount,
          colCount,
        }

        // For every compute cell, evaluate with current snapshot of base+computed
        for (let r = 0; r < rowCount; r++) {
          const row = rows[r] || { cells: [] }
          for (let c = 0; c < (row.cells || []).length; c++) {
            const cell = row.cells[c]
            if (!cell || !cell.compute || !String(cell.compute).trim()) continue

            const computeKey = String(cell.bind || cell.compute)
            try {
              const result = evaluateFormula(cell.compute, context)

              // normalize numeric strings to numbers where appropriate
              let normalized: number | string | null
              if (typeof result === "number") {
                normalized = Number.isFinite(result) ? result : "#ERROR"
              } else if (typeof result === "string") {
                // evaluator returns "#ERROR" or numeric-like string; try parse
                const maybeNum = Number(result)
                normalized = !Number.isNaN(maybeNum) ? maybeNum : result
              } else {
                normalized = null
              }

              const prev = computed[computeKey] ?? base[computeKey]
              // compare as strings to avoid object identity issues
              const prevStr = prev === undefined || prev === null ? "" : String(prev)
              const newStr = normalized === undefined || normalized === null ? "" : String(normalized)

              if (prevStr !== newStr) {
                computed[computeKey] = normalized
                passChanged = true
              }
            } catch (err) {
              console.warn("Formula evaluation error:", cell.compute, err)
              if (computed[computeKey] !== "#ERROR") {
                computed[computeKey] = "#ERROR"
                passChanged = true
              }
            }
          }
        }
      } // end sections loop

      if (!passChanged) break
    } // end passes

    // return only computed values (do NOT mix base here)
    return computed
  }, [layout, valuesByCode]) // recompute when layout or base values change

  // Combined values to pass to the UI: base user inputs override computed when present.
  const displayValues = React.useMemo(() => {
    return { ...(computedValuesMap || {}), ...(valuesByCode || {}) }
    // put computed first so user-entered values take precedence for bound codes
  }, [computedValuesMap, valuesByCode])

  /* ---------------- SUBMIT HANDLER ---------------- */
  const submit = async () => {
    if (!dataset || !org || !period) return

    try {
      setSaving(true)

      let payloadValues: Record<string, number | null | { value: number | null; remark?: string }> = {}

      if (layout) {
        const combined: Record<string, { value: number | null; remark?: string }> = {}
        // iterate over displayValues to prepare payload using code->id mapping
        for (const [code, raw] of Object.entries(displayValues)) {
          if (code.startsWith("remark.")) {
            const base = code.slice("remark.".length)
            const id = codeToId[base]
            if (!id) continue
            const key = String(id)
            combined[key] = combined[key] || { value: null }
            combined[key].remark = (raw as string) ?? ""
          } else {
            const id = codeToId[code]
            if (!id) continue
            const key = String(id)
            combined[key] = combined[key] || { value: null }
            // only submit numeric values
            combined[key].value = typeof raw === "number" ? raw : null
          }
        }
        payloadValues = combined
      } else {
        payloadValues = valuesById
      }

      await api.post(
        "/reporting/data-entry/",
        {
          report_type: dataset!.id,
          org_unit: org!.id,
          reporting_period: period!.startDate,
          values: payloadValues,
        },
        { timeout: 30000 }
      )

      toast.success("Report submitted successfully!")
      setValuesById({})
      setValuesByCode({})
    } catch (e) {
      console.error("[entry] submit error:", e)
      toast.error("Failed to submit report.")
    } finally {
      setSaving(false)
    }
  }

  /* ---------------- UI RENDER ---------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-2 text-blue-600" />
        <span className="text-gray-600">Loading data entry…</span>
      </div>
    )
  }

  const showForm = !!dataset && !!org && !!period

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Toaster />

      <DataEntryTopBar
        dataset={dataset}
        onDatasetChange={setDataset}
        datasets={datasets}
        org={org}
        onOrgChange={setOrg}
        orgTree={orgTree}
        period={period}
        onPeriodChange={setPeriod}
        onClear={onClear}
      />

      <div className="flex-1 p-6 space-y-4 overflow-auto">
        {loadingLayout && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Loading report layout…</AlertDescription>
          </Alert>
        )}

        {showForm && !loadingLayout ? (
          <div className="space-y-4">
            <Card className="bg-white">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Dataset:</span>
                    <p className="font-medium">{dataset!.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Organisation Unit:</span>
                    <p className="font-medium">{org!.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Period:</span>
                    <p className="font-medium">{period!.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {layout ? (
              <>
                <div className="text-xs text-gray-500 px-2">
                  Layout loaded: {layout.sections?.length ?? 0} sections
                </div>
                {/* Pass the combined displayValues (computed + base) */}
                <EnhancedLayoutEntryForm 
                  schema={layout} 
                  values={displayValues} 
                  onChange={setCodeValue}
                  dataElements={dataElements}
                  indicators={indicators}
                />
              </>
            ) : (
              <>
                <div className="text-xs text-gray-500 px-2">Using default form (no layout available)</div>
                <DataEntryForm reportType={dataset!} values={valuesById} onChange={setIdValue} />
              </>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClear}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={!canSubmit || saving} className="min-w-[140px]">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : !loadingLayout ? (
          <Card>
            <CardContent className="text-center py-16">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Get started with data entry</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Choose a dataset, organisation unit, and period to start entering data.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}