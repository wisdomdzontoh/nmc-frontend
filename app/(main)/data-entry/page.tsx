"use client"

import * as React from "react"
import { useAuth } from "@/context/AuthContext"
import api from "@/lib/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Target, Save, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import DataEntryTopBar from "@/components/data-entry/DataEntryTopBar"
import DataEntryForm from "@/components/data-entry/DataEntryForm"
import EnhancedLayoutEntryForm, { type LayoutSchema } from "@/components/data-entry/EnhancedLayoutEntryForm"
import type { ReportType } from "@/components/data-entry/DatasetInlineDropdown"
import type { OrgNode } from "@/components/data-entry/OrgUnitInlineDropdown"
import type { Period } from "@/components/data-entry/PeriodInlineDropdown"
// import { evaluateFormula } from "@/lib/formula-evaluator" // calculations commented out
import { ApiClient } from "@/lib/api"
import { exportToExcel } from "@/lib/export-utils"

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
  const [dataSaved, setDataSaved] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)

  const [datasets, setDatasets] = React.useState<ReportType[]>([])
  const [editableReportTypes, setEditableReportTypes] = React.useState<ReportType[]>([]) // Report types user can actually edit
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
  
  // Report metadata
  const [lastSubmittedBy, setLastSubmittedBy] = React.useState<string | null>(null)
  const [lastSubmittedAt, setLastSubmittedAt] = React.useState<string | null>(null)

  const hasValues = React.useMemo(() => {
    if (layout) {
      return Object.values(valuesByCode).some((v) => v !== null && v !== undefined && v !== "")
    }
    return Object.values(valuesById).some((v) => v !== null && v !== undefined)
  }, [layout, valuesByCode, valuesById])

  // Check if user can edit
  // User can only edit if:
  // 1. Selected org unit is user's org unit, AND
  // 2. Selected report type is assigned to user's org unit, AND
  // 3. Period is not locked (unless user is staff/superuser)
  const userOrgUnitId = djangoUser?.org_unit ?? null
  const isViewingOwnOrg = userOrgUnitId !== null && org?.id === userOrgUnitId
  const isReportTypeEditable = dataset ? editableReportTypes.some(rt => rt.id === dataset.id) : false
  
  // Check if period is locked
  const isPeriodLocked = React.useMemo(() => {
    if (!dataset || !period) {
      return false
    }
    
    // Check if locking is configured
    const lockDays = dataset.lock_period_days
    console.log('[Lock Check] Starting lock check', {
      datasetName: dataset.name,
      lockDays,
      periodName: period.name,
      periodEndDate: period.endDate,
      hasLockDays: !!lockDays
    })
    
    if (!lockDays || lockDays === 0) {
      return false // No locking configured
    }
    
    const isStaff = djangoUser?.is_staff || djangoUser?.is_superuser
    if (isStaff) {
      console.log('[Lock Check] User is staff/superuser - bypassing lock')
      return false // Staff/superusers can always edit
    }
    
    try {
      // Parse period end date (YYYY-MM-DD format)
      const periodEndDateStr = period.endDate
      if (!periodEndDateStr) {
        console.warn("[Lock Check] Period end date is missing")
        return false
      }
      
      // Create date from YYYY-MM-DD string (local timezone, end of day)
      const [year, month, day] = periodEndDateStr.split('-').map(Number)
      const periodEndDate = new Date(year, month - 1, day, 23, 59, 59) // End of the day
      
      // Calculate lock date: period end date + lock_period_days
      const lockDate = new Date(periodEndDate)
      lockDate.setDate(lockDate.getDate() + lockDays)
      
      // Get current date/time
      const now = new Date()
      
      // Compare: if current time is past the lock date, it's locked
      const locked = now > lockDate
      
      console.log(`[Lock Check] Period ${period.name}`, {
        periodEndDate: periodEndDateStr,
        periodEndDateTime: periodEndDate.toISOString(),
        lockDays,
        lockDate: lockDate.toISOString(),
        now: now.toISOString(),
        locked,
        daysPastLock: locked ? Math.floor((now.getTime() - lockDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
      })
      
      return locked
    } catch (error) {
      console.error("[Lock Check] Error calculating lock date:", error, { period, dataset })
      return false // Default to not locked if there's an error
    }
  }, [dataset, period, djangoUser])
  
  const isReadOnly = !isViewingOwnOrg || !isReportTypeEditable || isPeriodLocked || org === null

  const canSubmit = !!dataset && !!period && !!org && hasValues && isViewingOwnOrg && isReportTypeEditable && !isPeriodLocked
  const canExport = !!dataset && !!period && !!org && hasValues

  /* ---------------- EXPORT FUNCTIONS ---------------- */
  const handleExportExcel = async () => {
    if (!canExport) return

    try {
      setExporting(true)

      const exportData = {
        reportType: dataset!.name,
        orgUnit: org!.name,
        period: period!.name,
        values: valuesByCode,
        computedValues: {},
        layout: layout
      }

      await exportToExcel(exportData)
      toast.success("Report exported to Excel successfully!")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export to Excel")
    } finally {
      setExporting(false)
    }
  }

  /* ---------------- INITIAL LOAD ---------------- */
  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const [rtRes, editableRes, treeRes, deRes] = await Promise.all([
          ApiClient.getAvailableReportTypes(), // All report types (including descendants) for viewing
          ApiClient.getAvailableReportTypesForEntry(), // Report types user can actually edit
          api.get("/org/tree/"),
          ApiClient.getDataElements()
        ])
        const allReportTypes = rtRes.data || []
        const editableTypes = editableRes.data || []
        
        // Ensure lock_period_days is included (default to 60 if missing)
        const processedDatasets = allReportTypes.map((rt: ReportType) => ({
          ...rt,
          lock_period_days: rt.lock_period_days ?? 60 // Default to 60 if not set
        }))
        const processedEditable = editableTypes.map((rt: ReportType) => ({
          ...rt,
          lock_period_days: rt.lock_period_days ?? 60
        }))
        
        setDatasets(processedDatasets)
        setEditableReportTypes(processedEditable)
        setOrgTree(treeRes.data || [])
        
        // Load data elements
        const deData = deRes.data?.results || deRes.data || []
        setDataElements(deData.map((de: { id: number; code: string; name: string }) => ({
          id: String(de.id),
          code: de.code,
          name: de.name
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
    setDataSaved(false)
    setLastSubmittedBy(null)
    setLastSubmittedAt(null)
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

  const setIdValue = (id: string, v: number | null) => {
    setValuesById((p) => ({ ...p, [id]: v }))
    setDataSaved(false) // Reset saved state when user edits
  }
  
  // NOTE: onChange from EnhancedLayoutEntryForm should only update user-entered (base) values
  const setCodeValue = (code: string, v: number | string | null) => {
    setValuesByCode((p) => ({ ...p, [code]: v }))
    setDataSaved(false) // Reset saved state when user edits
  }

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
        if (!report?.values || !Array.isArray(report.values)) {
          // Clear metadata if no report found
          setLastSubmittedBy(null)
          setLastSubmittedAt(null)
          return
        }

        // Store submission metadata
        setLastSubmittedBy(report.submitted_by_name || null)
        setLastSubmittedAt(report.submitted_at || null)

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
          setLastSubmittedBy(null)
          setLastSubmittedAt(null)
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

  /* ---------------- CALCULATIONS (commented out) ----------------
  // Computations are disabled — re-enable when formula engine is ready.
  // The computedValuesMap useMemo block below evaluates cell formulas using
  // evaluateFormula() and merges them with user-entered valuesByCode.
  //
  // const computedValuesMap = React.useMemo(() => {
  //   if (!layout?.sections) return {} as ValuesByCode
  //   const base = { ...valuesByCode }
  //   const computed: ValuesByCode = {}
  //   const readCombined = (key: string) => { ... }
  //   // multi-pass formula evaluation ...
  //   return computed
  // }, [layout, valuesByCode])
  //
  // const displayValues = React.useMemo(() => ({
  //   ...(computedValuesMap || {}),
  //   ...(valuesByCode || {}),
  // }), [computedValuesMap, valuesByCode])
  ------------------------------------------------------------------ */

  // While calculations are off, display values = raw user inputs only
  const displayValues = valuesByCode

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
      setDataSaved(true)
      // Update last submitted info
      const userFullName = djangoUser?.full_name || (djangoUser?.first_name && djangoUser?.last_name ? `${djangoUser.first_name} ${djangoUser.last_name}` : null) || "You"
      setLastSubmittedBy(userFullName)
      setLastSubmittedAt(new Date().toISOString())
      // Keep the form values to show they are saved
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
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin mx-auto" style={{ color: "#1B5E3B" }} />
          <p className="text-gray-500 text-sm">Loading data entry…</p>
        </div>
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

      <div className="flex-1 p-4 lg:p-6 space-y-4 overflow-auto">
        {/* Layout loading indicator */}
        {loadingLayout && (
          <Alert className="border-green-200 bg-green-50">
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#1B5E3B" }} />
            <AlertDescription className="text-green-800">Loading report layout…</AlertDescription>
          </Alert>
        )}

        {showForm && !loadingLayout ? (
          <div className="space-y-4">
            {/* Report context card */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-full min-h-8 rounded-full flex-shrink-0" style={{ background: "#1B5E3B" }} />
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Report</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{dataset!.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-full min-h-8 rounded-full flex-shrink-0" style={{ background: "#2E7D52" }} />
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Organisation Unit</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{org!.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1 h-full min-h-8 rounded-full flex-shrink-0" style={{ background: "#4CAF50" }} />
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Reporting Period</p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">{period!.name}</p>
                      </div>
                    </div>
                  </div>
                  {dataSaved && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-green-200 bg-green-50 flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs font-medium text-green-700">Saved</span>
                    </div>
                  )}
                </div>

                {lastSubmittedBy && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    Last submitted by{" "}
                    <span className="font-semibold text-gray-700">{lastSubmittedBy}</span>
                    {lastSubmittedAt && (
                      <>
                        {" "}on{" "}
                        <span className="font-medium text-gray-600">
                          {new Date(lastSubmittedAt).toLocaleDateString("en-GH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Read-only / lock notice */}
            {isReadOnly && (
              <Alert className="bg-amber-50 border-amber-300">
                <AlertDescription className="text-amber-800">
                  <strong>View-only mode — </strong>
                  {isPeriodLocked ? (
                    <>
                      This reporting period <strong>({period!.name})</strong> is locked.
                      Data cannot be modified after {dataset!.lock_period_days} days from the period end date.
                      Contact an administrator to make changes.
                    </>
                  ) : !isViewingOwnOrg ? (
                    <>
                      You are viewing data for <strong>{org!.name}</strong>.
                      You can only enter data for your assigned organisation unit.
                      {userOrgUnitId && (
                        <span className="block mt-1">
                          Select your organisation unit from the dropdown above to make entries.
                        </span>
                      )}
                    </>
                  ) : !isReportTypeEditable ? (
                    <>
                      The report type <strong>{dataset!.name}</strong> is not assigned to your organisation unit.
                    </>
                  ) : (
                    "You cannot make entries for this selection."
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Layout sections info */}
            {layout && (
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full" style={{ background: "#4CAF50" }} />
                <span className="text-xs text-gray-400">
                  Layout: {layout.sections?.length ?? 0} section{(layout.sections?.length ?? 0) !== 1 ? "s" : ""} loaded
                </span>
              </div>
            )}

            {/* Form area */}
            {layout ? (
              <div id="data-entry-form" className={isReadOnly ? "opacity-70 pointer-events-none" : ""}>
                <EnhancedLayoutEntryForm
                  schema={layout}
                  values={displayValues}
                  onChange={setCodeValue}
                  dataElements={dataElements}
                  dataSaved={dataSaved}
                  readOnly={isReadOnly}
                />
              </div>
            ) : (
              <>
                <div className="text-xs text-gray-400 px-1">Using default form (no custom layout available)</div>
                <div className={isReadOnly ? "opacity-70 pointer-events-none" : ""}>
                  <DataEntryForm
                    reportType={dataset!}
                    values={valuesById}
                    onChange={setIdValue}
                    readOnly={isReadOnly}
                  />
                </div>
              </>
            )}

            {/* Action bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-gray-200">
              {/* Export buttons */}
              {canExport ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Export:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcel}
                    disabled={exporting}
                    className="h-8 border-green-200 text-green-700 hover:bg-green-50"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                    Excel
                  </Button>
                </div>
              ) : (
                <div />
              )}

              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" onClick={onClear} className="h-10 border-gray-300">
                  Cancel
                </Button>
                <Button
                  onClick={submit}
                  disabled={!canSubmit || saving}
                  className="h-10 min-w-[140px] text-white font-semibold shadow-sm"
                  style={{ background: canSubmit && !saving ? "linear-gradient(135deg, #1B5E3B, #2E7D52)" : "#9CA3AF" }}
                >
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
          </div>
        ) : !loadingLayout ? (
          /* Empty state */
          <Card className="border-dashed border-2 border-gray-200 shadow-none bg-white">
            <CardContent className="text-center py-20">
              <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: "#f0f7f3" }}>
                <Target className="h-8 w-8" style={{ color: "#2E7D52" }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Data Entry</h3>
              <p className="text-gray-500 max-w-sm mx-auto text-sm leading-relaxed">
                Select a <strong>Report</strong>, <strong>Organisation Unit</strong>, and <strong>Reporting Period</strong> from the toolbar above to begin entering data.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}