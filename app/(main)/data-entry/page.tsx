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
import LayoutEntryForm, { type LayoutSchema } from "@/components/data-entry/LayoutEntryForm"
import type { ReportType } from "@/components/data-entry/DatasetInlineDropdown"
import type { OrgNode } from "@/components/data-entry/OrgUnitInlineDropdown"
import type { Period } from "@/components/data-entry/PeriodInlineDropdown"

type ValuesById = Record<string, number | null>
type ValuesByCode = Record<string, number | string | null>

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

  const [valuesById, setValuesById] = React.useState<ValuesById>({})
  const [valuesByCode, setValuesByCode] = React.useState<ValuesByCode>({})

  const [layout, setLayout] = React.useState<LayoutSchema | null>(null)

  const hasValues = layout
    ? Object.values(valuesByCode).some((v) => v !== null && v !== undefined && v !== "")
    : Object.values(valuesById).some((v) => v !== null && v !== undefined)

  const canSubmit = !!dataset && !!period && !!org && hasValues

  // initial load
  React.useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        const [rtRes, treeRes] = await Promise.all([api.get("/metadata/report-types/"), api.get("/org/tree/")])
        setDatasets(rtRes.data)
        setOrgTree(treeRes.data || [])
      } catch (e) {
        console.error("[entry] init error:", e)
        toast.error("Failed to load data. Please refresh.")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // reset on dataset change
  React.useEffect(() => {
    setValuesById({})
    setValuesByCode({})
    setLayout(null)
  }, [dataset?.id])

  // fetch published layout for selected dataset
  React.useEffect(() => {
    if (!dataset) return
    ;(async () => {
      try {
        setLoadingLayout(true)
        const resp = await api.get(`/reporting/report-layouts/?report_type=${dataset.id}&status=published`)

        // Accept: array, paginated results, or single object
        const arr = Array.isArray(resp.data)
          ? resp.data
          : resp.data?.results
            ? resp.data.results
            : resp.data
              ? [resp.data]
              : []

        const published = arr.find((l: { status?: string }) => l?.status === "published")
        const schema = published?.schema

        if (schema?.sections && Array.isArray(schema.sections)) {
          setLayout(schema)
          toast.success("Layout loaded")
        } else {
          setLayout(null)
          toast.info("No published layout. Using default form.")
        }
      } catch (e: unknown) {
        console.warn("[entry] layout fetch failed:", e)
        setLayout(null)
        // silently fallback to default without scaring users
      } finally {
        setLoadingLayout(false)
      }
    })()
  }, [dataset?.id])

  const onClear = () => {
    setDataset(null)
    setOrg(null)
    setPeriod(null)
    setValuesById({})
    setValuesByCode({})
    setLayout(null)
  }

  const setIdValue = (id: string, v: number | null) => setValuesById((p) => ({ ...p, [id]: v }))
  const setCodeValue = (code: string, v: number | string | null) => setValuesByCode((p) => ({ ...p, [code]: v }))

  // code → id map
  const codeToId = React.useMemo(() => {
    const m: Record<string, number> = {}
    dataset?.data_elements?.forEach((de) => (m[de.code] = de.id))
    return m
  }, [dataset?.data_elements])

  // --- NEW EFFECT: Fetch existing report data when all three are selected ---
  React.useEffect(() => {
    const fetchExistingReport = async () => {
      if (!dataset?.id || !org?.id || !period?.startDate) return;

      try {
        setSaving(true);
        const res = await api.get("/reporting/data-entry/", {
          params: {
            report_type: dataset.id,
            org_unit: org.id,
            reporting_period: period.startDate,
          },
        });

        const report = res.data;
        if (!report?.values || !Array.isArray(report.values)) return;

        // fill values
        if (layout) {
          // map using data_element.code (layout-based)
          const byCode: Record<string, number | string | null> = {};
          for (const v of report.values) {
            byCode[v.data_element_code] = v.value;
            if (v.remark) byCode[`remark.${v.data_element_code}`] = v.remark;
          }
          setValuesByCode(byCode);
        } else {
          // map using data_element.id (default form)
          const byId: Record<string, number | null> = {};
          for (const v of report.values) {
            byId[String(v.data_element)] = v.value;
          }
          setValuesById(byId);
        }

        toast.info("Existing report loaded for this selection.");
      } catch (err: unknown) {
        const status =
          typeof err === "object" && err !== null && "response" in err
            ? (err as { response?: { status?: number } }).response?.status
            : undefined
        if (status === 404) {
          // no report yet - clear form
          setValuesByCode({});
          setValuesById({});
          return;
        }
        console.error("Error loading report:", err);
        toast.error("Failed to load existing report data.");
      } finally {
        setSaving(false);
      }
    };

    fetchExistingReport();
  }, [dataset?.id, org?.id, period?.startDate, layout]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-2 text-blue-600" />
        <span className="text-gray-600">Loading data entry…</span>
      </div>
    )
  }

  const showForm = !!dataset && !!org && !!period

  const submit = async () => {
    if (!dataset || !org || !period) return

    try {
      setSaving(true)

      let payloadValues: Record<string, number | null> | Record<string, { value: number | null; remark?: string }> = {}

      if (layout) {
        // merge numeric + remark.* by element id
        const combined: Record<string, { value: number | null; remark?: string }> = {}
        for (const [code, raw] of Object.entries(valuesByCode)) {
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
            combined[key].value = (raw as number | null) ?? null
          }
        }
        payloadValues = combined
      } else {
        payloadValues = valuesById
      }

      await api.post("/reporting/data-entry/", {
        report_type: dataset.id,
        org_unit: org.id,
        reporting_period: period.startDate,
        values: payloadValues,
      })

      toast.success("Report submitted successfully!")
      setValuesById({})
      setValuesByCode({})
    } catch (e: unknown) {
      console.error("[entry] submit error:", e)
      const detail =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined
      toast.error(detail || "Failed to submit report.")
    } finally {
      setSaving(false)
    }
  }


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
                  Layout loaded: {Array.isArray(layout.sections) ? layout.sections.length : 0} sections
                </div>
                <LayoutEntryForm layout={layout} values={valuesByCode} onChange={setCodeValue} />
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
                Choose a data set, organisation unit, and period from the top bar to start entering data
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
