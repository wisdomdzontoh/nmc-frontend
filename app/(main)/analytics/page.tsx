"use client"

import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import type { DjangoUser } from "@/context/AuthContext"
import { ApiClient } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts"
import {
  Users,
  FileText,
  Building2,
  Download,
  RefreshCw,
  BarChart3,
} from "lucide-react"
import { PageCard } from "@/components/layout/PageCard"
import { SectionCard } from "@/components/common/section-card"
import { StatCard } from "@/components/common/stat-card"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { CardSkeleton, StatCardSkeleton } from "@/components/common/skeletons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CHART_AXIS, CHART_GRID, CHART_TICK, CHART_TOOLTIP_STYLE, chartColor } from "@/lib/chart-theme"

interface AnalyticsData {
  summary: {
    total_reports: number
    total_users: number
    total_org_units: number
  }
  reportsByOrgUnit: Array<{ org_unit: string; count: number }>
  reportsByType: Array<{ report_type: string; count: number }>
  reportsOverTime: Array<{ period: string; count: number }>
  userActivity: Array<{ date: string; new_reports: number }>
}

const PERIODS = [
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "last_90_days", label: "Last 90 days" },
  { value: "last_365_days", label: "Last year" },
]

function ChartEmpty() {
  return (
    <div className="flex h-[300px] items-center justify-center">
      <EmptyState
        className="py-0"
        title="No reports in this period"
        description="Try a longer period to see more."
      />
    </div>
  )
}

const AnalyticsPage: React.FC = () => {
  const { djangoUser } = useAuth() as { djangoUser: DjangoUser | null }

  // Check if user is staff or superuser
  const isSuperuser = Boolean((djangoUser as unknown as { is_superuser?: boolean })?.is_superuser)
  const isStaff = Boolean((djangoUser as unknown as { is_staff?: boolean })?.is_staff)

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("last_30_days")
  const [selectedOrgUnit] = useState("all")

  const loadAnalyticsData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await ApiClient.getAnalytics({
        period: selectedPeriod,
        org_unit: selectedOrgUnit
      })

      setAnalyticsData(response.data)
    } catch (err) {
      console.error("Failed to load analytics:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod, selectedOrgUnit])

  useEffect(() => {
    loadAnalyticsData()
  }, [loadAnalyticsData])

  const handleRefresh = () => {
    loadAnalyticsData()
  }

  const handleExport = () => {
    if (!analyticsData) return

    const dataStr = JSON.stringify(analyticsData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analytics-${selectedPeriod}-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const periodLabel = PERIODS.find((p) => p.value === selectedPeriod)?.label ?? "Selected period"

  // Staff and administrators only
  if (!isSuperuser && !isStaff) {
    return (
      <div className="space-y-6">
        <PageCard title="Analytics" description="Charts and trends for reporting across organisation units." />
        <section className="rounded-xl border border-border bg-card">
          <EmptyState
            illustration="no-access"
            title="You don't have access to analytics"
            description="Analytics is for administrators. If you need it, ask your administrator. You can still build tables in Visualizations."
            action={{ label: "Open Visualizations", href: "/visualizations" }}
          />
        </section>
      </div>
    )
  }

  const header = (
    <PageCard
      title="Analytics"
      description="Charts and trends for reporting across organisation units."
      icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
      actions={
        <>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="h-9 w-40" aria-label="Period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="secondary" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
          <Button onClick={handleExport} disabled={!analyticsData || loading}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download data
          </Button>
        </>
      }
    />
  )

  if (loading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  if (error || !analyticsData) {
    return (
      <div className="space-y-6">
        {header}
        <section className="rounded-xl border border-border bg-card">
          {error ? (
            <ErrorState error={error} title="We couldn't load analytics" onRetry={handleRefresh} />
          ) : (
            <EmptyState
              illustration="report"
              title="No analytics yet"
              description="Charts appear here once reports have been submitted."
            />
          )}
        </section>
      </div>
    )
  }

  const totalReports = analyticsData.reportsOverTime.reduce((sum, item) => sum + item.count, 0)
  const totalActivity = analyticsData.userActivity.reduce((sum, item) => sum + item.new_reports, 0)

  return (
    <div className="space-y-6 pb-10">
      {header}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Total reports"
          value={analyticsData.summary.total_reports.toLocaleString()}
          hint={`${totalReports.toLocaleString()} in ${periodLabel.toLowerCase()}`}
          tint="red"
          icon={<FileText className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Active users"
          value={analyticsData.summary.total_users.toLocaleString()}
          hint={`${totalActivity.toLocaleString()} submissions in this period`}
          tint="blue"
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="Organisation units"
          value={analyticsData.summary.total_org_units.toLocaleString()}
          hint={`${analyticsData.reportsByOrgUnit.length} with reports`}
          tint="teal"
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Reports over time" description="How many reports were submitted in each period">
          {analyticsData.reportsOverTime.length === 0 ? (
            <ChartEmpty />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.reportsOverTime} margin={{ left: -12, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="period" tick={CHART_TICK} stroke={CHART_AXIS} tickLine={false} />
                <YAxis tick={CHART_TICK} stroke={CHART_AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ fontWeight: 600 }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Reports"
                  stroke={chartColor(0)}
                  strokeWidth={2.5}
                  dot={{ fill: chartColor(0), r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Reports by type" description="Share of reports for each report type">
          {analyticsData.reportsByType.length === 0 ? (
            <ChartEmpty />
          ) : (
            <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={analyticsData.reportsByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="report_type"
                    stroke="hsl(var(--card))"
                  >
                    {analyticsData.reportsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={chartColor(index)} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-2 text-sm sm:max-w-56">
                {analyticsData.reportsByType.map((item, index) => {
                  const total = analyticsData.reportsByType.reduce((n, r) => n + r.count, 0) || 1
                  return (
                    <li key={item.report_type} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: chartColor(index) }} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-foreground" title={item.report_type}>
                        {item.report_type}
                      </span>
                      <span className="font-clinical text-muted-foreground">{Math.round((item.count / total) * 100)}%</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Reports by organisation unit" description="The 10 units with the most reports">
          {analyticsData.reportsByOrgUnit.length === 0 ? (
            <ChartEmpty />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.reportsByOrgUnit.slice(0, 10)} margin={{ left: -12, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="org_unit" tick={CHART_TICK} angle={-35} textAnchor="end" height={90} interval={0} stroke={CHART_AXIS} tickLine={false} />
                <YAxis tick={CHART_TICK} stroke={CHART_AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="count" name="Reports" fill={chartColor(1)} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Daily activity" description="Reports submitted each day (last 30 days shown)">
          {analyticsData.userActivity.length === 0 ? (
            <ChartEmpty />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.userActivity.slice(-30)} margin={{ left: -12, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="date" tick={CHART_TICK} angle={-35} textAnchor="end" height={90} stroke={CHART_AXIS} tickLine={false} />
                <YAxis tick={CHART_TICK} stroke={CHART_AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="new_reports" name="Reports" fill={chartColor(2)} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard flush title="Top organisation units" description="Units with the most reports">
          {analyticsData.reportsByOrgUnit.length === 0 ? (
            <EmptyState title="No reports yet" description="Units appear here once they submit reports." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 pl-5">Rank</TableHead>
                  <TableHead>Organisation unit</TableHead>
                  <TableHead className="pr-5 text-right">Reports</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyticsData.reportsByOrgUnit.slice(0, 8).map((item, index) => (
                  <TableRow key={item.org_unit}>
                    <TableCell className="font-clinical pl-5 text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium text-foreground">{item.org_unit}</TableCell>
                    <TableCell className="font-clinical pr-5 text-right font-semibold">{item.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>

        <SectionCard flush title="Report types" description="How reports are split across report types">
          {analyticsData.reportsByType.length === 0 ? (
            <EmptyState title="No reports yet" description="Report types appear here once reports are submitted." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Report type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="pr-5 text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyticsData.reportsByType.map((item) => {
                  const percentage = ((item.count / analyticsData.summary.total_reports) * 100).toFixed(1)
                  return (
                    <TableRow key={item.report_type}>
                      <TableCell className="pl-5 font-medium text-foreground">{item.report_type}</TableCell>
                      <TableCell className="font-clinical text-right font-semibold">{item.count}</TableCell>
                      <TableCell className="font-clinical pr-5 text-right text-muted-foreground">{percentage}%</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

export default AnalyticsPage
