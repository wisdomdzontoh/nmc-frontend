import type { ReactNode } from "react"
import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CloudUpload,
  Download,
  Eye,
  FileSpreadsheet,
  GripVertical,
  Lock,
  Search,
  Send,
  Table2,
  TriangleAlert,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { ScreenId } from "@/lib/guides"

/*
 * Simplified, illustrative drawings of each screen — not real data. Built from the design tokens,
 * so they keep matching the app. Numbered red markers point at what the step asks you to use.
 */

function Frame({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 border-b border-border bg-surface-subtle px-3 py-2">
        <span className="flex gap-1" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        </span>
        <span className="truncate text-2xs font-semibold text-muted-foreground">{title}</span>
      </div>
      <div className={cn("canvas-dots space-y-2.5 p-3 text-[11px] leading-tight", className)}>{children}</div>
    </div>
  )
}

/** Numbered marker pointing at the control the step talks about. */
function Mark({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={cn(
        "absolute z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-4 ring-primary/20",
        className ?? "-top-2 -right-2"
      )}
      aria-hidden="true"
    >
      {n}
    </span>
  )
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("relative rounded-lg border border-border bg-card p-2.5", className)}>{children}</div>
}

function Line({ w = "w-24", className }: { w?: string; className?: string }) {
  return <span className={cn("block h-1.5 rounded-full bg-muted", w, className)} />
}

function Btn({ children, primary, className }: { children: ReactNode; primary?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-6 items-center gap-1 rounded-md border px-2 font-medium whitespace-nowrap",
        primary ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
        className
      )}
    >
      {children}
    </span>
  )
}

function Field({ label, value, icon, dashed, className }: { label: string; value: string; icon: ReactNode; dashed?: boolean; className?: string }) {
  return (
    <div className={cn("relative flex items-center gap-2 rounded-md border bg-card px-2 py-1.5", dashed ? "border-dashed border-input" : "border-input", className)}>
      <span className={cn("flex h-5 w-5 items-center justify-center rounded", dashed ? "bg-muted text-muted-foreground" : "bg-primary-soft text-primary")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[8px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className={cn("block truncate", dashed ? "text-muted-foreground" : "font-semibold text-foreground")}>{value}</span>
      </span>
      <ChevronDown className="h-3 w-3 text-muted-foreground" />
    </div>
  )
}

function Pill({ tone, children }: { tone: "success" | "pending" | "info" | "neutral" | "error" | "warning"; children: ReactNode }) {
  return <span className={cn("status-pill px-1.5 py-0 text-[9px]", `status-pill-${tone}`)}>{children}</span>
}

function TableRows({ cols = 4, rows = 3 }: { cols?: number; rows?: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex gap-2 bg-surface-subtle px-2 py-1.5">
        {Array.from({ length: cols }).map((_, i) => (
          <Line key={i} w="flex-1" className="bg-muted-foreground/25" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-2 border-t border-border px-2 py-1.5">
          {Array.from({ length: cols }).map((_, i) => (
            <Line key={i} w="flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

function Tabs({ items, active, mark }: { items: string[]; active: number; mark?: number }) {
  return (
    <div className="flex gap-3 border-b border-border">
      {items.map((t, i) => (
        <span
          key={t}
          className={cn(
            "relative -mb-px border-b-2 pb-1 font-medium whitespace-nowrap",
            i === active ? "border-primary text-primary" : "border-transparent text-muted-foreground"
          )}
        >
          {t}
          {mark !== undefined && i === active && <Mark n={mark} />}
        </span>
      ))}
    </div>
  )
}

const SCREENS: Record<ScreenId, { title: string; render: () => ReactNode }> = {
  shell: {
    title: "Menu and top bar",
    render: () => (
      <div className="-m-3 flex h-40">
        <div className="sidebar-shell relative w-24 space-y-1 p-2">
          <span className="block h-5 rounded bg-card" />
          {["Dashboard", "Data Entry", "Reports", "Visualizations", "Settings"].map((l, i) => (
            <span key={l} className={cn("block rounded-full px-2 py-0.5 text-[9px]", i === 1 ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground")}>
              {l}
            </span>
          ))}
          <Mark n={1} className="top-10 -right-2" />
        </div>
        <div className="flex-1">
          <div className="relative flex items-center gap-2 border-b border-border bg-card px-2 py-1.5">
            <span className="h-4 w-4 rounded bg-primary" />
            <span className="text-[9px]">Hello, Ama</span>
            <span className="relative ml-2 flex flex-1 items-center gap-1 rounded border border-input px-1.5 py-0.5 text-[9px] text-muted-foreground">
              <Search className="h-2.5 w-2.5" /> Find a page…
              <Mark n={2} />
            </span>
          </div>
          <div className="space-y-1.5 p-2">
            <Card><Line w="w-20" /><Line w="w-32" className="mt-1" /></Card>
            <Card><Line w="w-full" /></Card>
          </div>
        </div>
      </div>
    ),
  },
  "find-page": {
    title: "Find a page (Ctrl + K)",
    render: () => (
      <Card className="mx-auto max-w-xs p-0">
        <div className="relative flex items-center gap-1.5 border-b border-border px-2.5 py-2">
          <Search className="h-3 w-3 text-muted-foreground" />
          <span className="text-foreground">reports</span>
          <Mark n={1} />
        </div>
        <div className="space-y-1 p-2">
          <p className="text-[9px] font-semibold text-muted-foreground">Data</p>
          <div className="flex items-center gap-1.5 rounded bg-accent px-1.5 py-1 font-medium">
            <ClipboardList className="h-3 w-3" /> Reports
          </div>
          <div className="flex items-center gap-1.5 px-1.5 py-1 text-muted-foreground">
            <ClipboardList className="h-3 w-3" /> Design Reports
          </div>
        </div>
      </Card>
    ),
  },
  dashboard: {
    title: "Dashboard",
    render: () => (
      <>
        <Card>
          <p className="font-semibold">Good morning, Ama</p>
          <div className="relative mt-2 flex items-center gap-2 rounded border border-border bg-surface-subtle p-1.5">
            <span className="text-[9px] font-medium">Period</span>
            <Btn className="h-5">Last 30 days <ChevronDown className="h-2.5 w-2.5" /></Btn>
            <Mark n={1} className="-top-2 left-24" />
          </div>
        </Card>
        <div className="grid grid-cols-4 gap-2">
          {["Reports submitted", "Units reporting", "Report types", "Daily average"].map((l, i) => (
            <Card key={l} className="p-2">
              <p className="text-[8px] text-muted-foreground uppercase">{l}</p>
              <p className="text-base font-semibold">{[42, 4, 3, "1.4"][i]}</p>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Card className="h-14"><div className="flex h-full items-end gap-1">{[3, 5, 4, 7, 9, 6].map((h, i) => <span key={i} className="flex-1 rounded-sm bg-chart-1/70" style={{ height: `${h * 10}%` }} />)}</div></Card>
          <Card className="h-14"><div className="flex h-full items-end gap-1">{[8, 5, 6, 3].map((h, i) => <span key={i} className="flex-1 rounded-sm bg-chart-2/70" style={{ height: `${h * 10}%` }} />)}</div></Card>
        </div>
      </>
    ),
  },
  "data-entry-pickers": {
    title: "Data entry",
    render: () => (
      <Card>
        <p className="font-semibold">Data entry</p>
        <div className="mt-2 grid grid-cols-3 gap-2 rounded border border-border bg-surface-subtle p-2">
          <div className="relative"><Field label="Organisation unit" value="Choose a unit" dashed icon={<Building2 className="h-3 w-3" />} /><Mark n={1} /></div>
          <div className="relative"><Field label="Report" value="Choose a report" dashed icon={<ClipboardList className="h-3 w-3" />} /><Mark n={2} /></div>
          <div className="relative"><Field label="Period" value="Choose a period" dashed icon={<CalendarDays className="h-3 w-3" />} /><Mark n={3} /></div>
        </div>
      </Card>
    ),
  },
  "data-entry-form": {
    title: "Data entry — filling in the form",
    render: () => (
      <>
        <Card className="flex items-center justify-between">
          <div className="grid flex-1 grid-cols-3 gap-2">
            {[["Report", "Monthly return"], ["Unit", "Accra Metro"], ["Period", "September 2026"]].map(([l, v]) => (
              <div key={l}><p className="text-[8px] text-muted-foreground uppercase">{l}</p><p className="font-semibold">{v}</p></div>
            ))}
          </div>
          <span className="relative"><Pill tone="success"><CheckCircle2 className="h-2.5 w-2.5" /> Saved just now</Pill><Mark n={2} /></span>
        </Card>
        <Card className="space-y-1.5">
          {["Nurses registered", "Midwives registered", "Candidates examined"].map((l, i) => (
            <div key={l} className="flex items-center gap-2">
              <span className="flex-1 text-foreground">{l}</span>
              <span className={cn("relative w-16 rounded border bg-card px-1.5 py-0.5 text-right font-clinical", i === 0 ? "border-ring ring-2 ring-ring/20" : "border-input")}>
                {[128, 46, ""][i]}
                {i === 0 && <Mark n={1} className="-top-2 -left-3" />}
              </span>
            </div>
          ))}
        </Card>
      </>
    ),
  },
  "data-entry-submit": {
    title: "Data entry — bottom bar",
    render: () => (
      <>
        <Card className="space-y-1.5 opacity-70">
          <Line w="w-40" /><Line w="w-full" /><Line w="w-3/4" />
        </Card>
        <Card className="flex items-center justify-between">
          <Btn><FileSpreadsheet className="h-3 w-3" /> Export to Excel<Mark n={2} /></Btn>
          <div className="flex gap-1.5">
            <Btn>Close report</Btn>
            <Btn primary><Send className="h-3 w-3" /> Submit report<Mark n={1} /></Btn>
          </div>
        </Card>
      </>
    ),
  },
  "data-entry-locked": {
    title: "Data entry — view-only notice",
    render: () => (
      <>
        <div className="relative flex items-start gap-1.5 rounded-md border border-warning-border bg-warning-bg p-2 text-warning">
          <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
          <div><p className="font-semibold">You can view this report but not change it</p><p className="opacity-90">The period September 2026 is locked.</p></div>
          <Mark n={1} />
        </div>
        <Card className="space-y-1.5 opacity-60">
          <div className="flex items-center gap-2"><span className="flex-1">Nurses registered</span><span className="flex w-16 items-center justify-end gap-1 rounded border border-input bg-surface-muted px-1.5 py-0.5 font-clinical"><Lock className="h-2.5 w-2.5" />128</span></div>
          <div className="flex items-center gap-2"><span className="flex-1">Midwives registered</span><span className="flex w-16 items-center justify-end gap-1 rounded border border-input bg-surface-muted px-1.5 py-0.5 font-clinical"><Lock className="h-2.5 w-2.5" />46</span></div>
        </Card>
      </>
    ),
  },
  "reports-list": {
    title: "Reports — All reports",
    render: () => (
      <>
        <Tabs items={["All reports", "Reporting rate", "Who has reported", "Generate a report"]} active={0} mark={1} />
        <Card className="p-0">
          <div className="relative flex items-center gap-1.5 border-b border-border bg-surface-subtle p-2">
            <span className="flex flex-1 items-center gap-1 rounded border border-input bg-card px-1.5 py-0.5 text-muted-foreground"><Search className="h-2.5 w-2.5" /> Search…</span>
            <Btn className="h-5">All statuses <ChevronDown className="h-2.5 w-2.5" /></Btn>
            <Btn className="h-5">All periods <ChevronDown className="h-2.5 w-2.5" /></Btn>
            <Mark n={2} />
          </div>
          <div className="space-y-0 p-2">
            {["Monthly return · Accra Metro", "Monthly return · Ashanti"].map((r, i) => (
              <div key={r} className="flex items-center gap-2 border-b border-border py-1.5 last:border-0">
                <span className="flex-1 font-medium">{r}</span>
                <Pill tone={i === 0 ? "success" : "neutral"}>{i === 0 ? "Submitted" : "Draft"}</Pill>
                <span className="relative"><Btn className="h-5"><Eye className="h-2.5 w-2.5" /> View</Btn>{i === 0 && <Mark n={3} />}</span>
                <Btn className="h-5"><Download className="h-2.5 w-2.5" /> Export</Btn>
              </div>
            ))}
          </div>
        </Card>
      </>
    ),
  },
  "reports-view": {
    title: "Reports — viewing a report",
    render: () => (
      <Card className="mx-auto max-w-sm space-y-2">
        <p className="font-semibold">Monthly return · September 2026</p>
        <p className="text-muted-foreground">Accra Metro · Submitted by Ama Mensah</p>
        <TableRows cols={2} rows={3} />
        <div className="flex justify-end"><Btn primary><Download className="h-3 w-3" /> Export<Mark n={1} /></Btn></div>
      </Card>
    ),
  },
  "reports-rate": {
    title: "Reports — Reporting rate",
    render: () => (
      <>
        <Tabs items={["All reports", "Reporting rate", "Who has reported"]} active={1} mark={1} />
        <Card className="flex flex-wrap items-center gap-1.5">
          <Btn className="h-5">Monthly</Btn><Btn className="h-5">2026</Btn><Btn className="h-5">September</Btn><Btn className="h-5">Ghana</Btn>
          <span className="relative ml-auto"><Btn primary>Show reporting rate</Btn><Mark n={2} /></span>
        </Card>
        <div className="grid grid-cols-4 gap-2">
          {[["Units", "4"], ["Expected", "8"], ["Submitted", "6"], ["Complete", "75%"]].map(([l, v]) => (
            <Card key={l} className="p-2"><p className="text-[8px] text-muted-foreground uppercase">{l}</p><p className="text-sm font-semibold">{v}</p></Card>
          ))}
        </div>
        <Card className="space-y-1">
          {[["Greater Accra", "success", "Complete"], ["Ashanti", "pending", "Partial"], ["Volta", "error", "Not submitted"]].map(([u, t, l]) => (
            <div key={u} className="flex items-center justify-between"><span>{u}</span><Pill tone={t as "success"}>{l}</Pill></div>
          ))}
        </Card>
      </>
    ),
  },
  "reports-generate": {
    title: "Reports — Generate a report",
    render: () => (
      <>
        <Tabs items={["Reporting rate", "Who has reported", "Generate a report"]} active={2} />
        <Card className="flex flex-wrap items-center gap-1.5">
          <span className="relative"><Btn className="h-5">2026</Btn><Mark n={1} /></span>
          <Btn className="h-5">Q3</Btn>
          <span className="relative"><Btn className="h-5">2 report types selected <ChevronDown className="h-2.5 w-2.5" /></Btn><Mark n={2} /></span>
          <span className="relative ml-auto"><Btn primary>Generate report</Btn><Mark n={3} /></span>
        </Card>
        <Card className="space-y-1.5">
          <div className="flex items-center justify-between"><p className="font-semibold">Monthly return — Q3 2026</p><Btn className="h-5"><Download className="h-2.5 w-2.5" /> Export Excel</Btn></div>
          <TableRows cols={2} rows={2} />
        </Card>
      </>
    ),
  },
  "viz-boxes": {
    title: "Visualizations",
    render: () => (
      <Card>
        <div className="flex items-center justify-between">
          <p className="font-semibold">Visualizations</p>
          <span className="relative"><Btn primary>Update table</Btn><Mark n={4} /></span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 rounded border border-border bg-surface-subtle p-2">
          {[["Columns", "Data", 1], ["Rows", "Period", 2], ["Filter", "Org unit", 3]].map(([area, dim, n]) => (
            <span key={area as string} className="relative flex items-center gap-1 rounded border border-border bg-card px-1.5 py-1">
              <span className="text-[8px] font-semibold text-muted-foreground uppercase">{area}</span>
              <GripVertical className="h-3 w-3 text-muted-foreground" />
              <Btn className="h-5">{dim}</Btn>
              <Mark n={n as number} />
            </span>
          ))}
        </div>
      </Card>
    ),
  },
  "viz-period": {
    title: "Visualizations — choosing periods",
    render: () => (
      <Card className="mx-auto max-w-sm space-y-2">
        <p className="font-semibold">Period</p>
        <Tabs items={["Relative periods", "Fixed periods"]} active={0} mark={1} />
        <div className="grid grid-cols-2 gap-1.5">
          {["Last 3 months", "Last 6 months", "Last 12 months", "This year"].map((p, i) => (
            <span key={p} className={cn("relative rounded border px-1.5 py-1", i === 0 ? "choice-option min-h-0 border-primary-border bg-primary-soft font-semibold text-primary" : "border-input bg-card")} data-selected={i === 0 || undefined}>
              {p}{i === 0 && <Mark n={2} />}
            </span>
          ))}
        </div>
        <div className="flex justify-end"><Btn primary>Apply</Btn></div>
      </Card>
    ),
  },
  "viz-table": {
    title: "Visualizations — your table",
    render: () => (
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1 font-semibold"><Table2 className="h-3 w-3 text-primary" /> Pivot table</p>
          <span className="relative"><Btn><Download className="h-3 w-3" /> Download Excel</Btn><Mark n={1} /></span>
        </div>
        <div className="overflow-hidden rounded border border-border font-clinical">
          <div className="grid grid-cols-4 bg-surface-subtle font-sans font-semibold">
            {["Period", "Nurses", "Midwives", "Exams"].map((h) => <span key={h} className="px-1.5 py-1">{h}</span>)}
          </div>
          {[["Jul 2026", 120, 41, 300], ["Aug 2026", 131, 44, 0], ["Sep 2026", 128, 46, 312]].map((r) => (
            <div key={r[0]} className="grid grid-cols-4 border-t border-border">
              {r.map((c, i) => <span key={i} className={cn("px-1.5 py-1", i === 0 ? "font-sans font-medium" : "text-right")}>{c}</span>)}
            </div>
          ))}
        </div>
      </Card>
    ),
  },
  "settings-password": {
    title: "Settings — Password",
    render: () => (
      <>
        <Tabs items={["My profile", "Password"]} active={1} mark={1} />
        <Card className="max-w-xs space-y-1.5">
          {["Current password", "New password", "Confirm new password"].map((l) => (
            <div key={l}><p className="mb-0.5 font-medium">{l}</p><span className="block h-5 rounded border border-input bg-card px-1.5 text-muted-foreground">••••••••</span></div>
          ))}
          <div className="pt-1"><Btn primary>Save password<Mark n={2} /></Btn></div>
        </Card>
      </>
    ),
  },
  analytics: {
    title: "Analytics",
    render: () => (
      <>
        <Card className="flex items-center justify-between">
          <p className="flex items-center gap-1 font-semibold"><BarChart3 className="h-3 w-3 text-primary" /> Analytics</p>
          <div className="flex gap-1.5"><span className="relative"><Btn>Last 30 days <ChevronDown className="h-2.5 w-2.5" /></Btn><Mark n={1} /></span><Btn primary>Download data</Btn></div>
        </Card>
        <div className="grid grid-cols-2 gap-2">
          <Card className="h-16"><svg viewBox="0 0 100 40" className="h-full w-full" aria-hidden="true"><polyline fill="none" stroke="hsl(var(--chart-1))" strokeWidth="2" points="0,32 20,26 40,28 60,16 80,10 100,14" /></svg></Card>
          <Card className="flex h-16 items-center justify-center"><span className="h-11 w-11 rounded-full border-[6px] border-chart-1 border-r-chart-2 border-b-chart-3" /></Card>
        </div>
      </>
    ),
  },
  designer: {
    title: "Design reports — layout editor",
    render: () => (
      <div className="-m-3">
        <div className="relative flex items-center gap-1.5 border-b border-border bg-card px-2 py-1.5">
          <Btn className="h-5">All layouts</Btn>
          <span className="flex-1 rounded border border-input px-1.5 py-0.5 font-semibold">Monthly return</span>
          <span className="rounded border border-input px-1.5 py-0.5 font-clinical">MRR</span>
          <Mark n={1} className="-top-1 left-40" />
          <Btn className="h-5">Save draft</Btn>
          <Btn primary className="h-5">Publish</Btn>
        </div>
        <div className="flex">
          <div className="relative w-20 space-y-1 border-r border-border bg-card p-2">
            <p className="font-semibold">Insert</p>
            <Btn className="h-5 w-full">Heading</Btn><Btn className="h-5 w-full">Table</Btn>
            <Mark n={2} className="top-1 -right-2" />
          </div>
          <div className="flex-1 space-y-1.5 bg-surface-subtle p-2">
            <Card className="py-1.5"><Line w="w-28" /></Card>
            <Card className="p-1.5"><TableRows cols={3} rows={2} /></Card>
          </div>
        </div>
      </div>
    ),
  },
  "designer-import": {
    title: "Design reports",
    render: () => (
      <Card className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Design reports</p>
        <div className="flex gap-1.5">
          <span className="relative"><Btn><Download className="h-3 w-3" /> Download template</Btn><Mark n={1} /></span>
          <span className="relative"><Btn className="border-primary text-primary"><FileSpreadsheet className="h-3 w-3" /> Import from Excel</Btn><Mark n={2} /></span>
          <Btn primary>Create layout</Btn>
        </div>
      </Card>
    ),
  },
  "org-assign": {
    title: "Organisation units — assign reports",
    render: () => (
      <div className="grid grid-cols-2 gap-2">
        <Card className="space-y-1">
          <p className="font-semibold">Available report types</p>
          {["Quarterly exams summary", "Annual return"].map((r, i) => (
            <span key={r} className={cn("block rounded px-1.5 py-0.5", i === 0 ? "bg-primary-soft font-medium text-primary" : "")}>{r}</span>
          ))}
          <Mark n={1} />
        </Card>
        <Card className="space-y-1 border-primary-border">
          <p className="font-semibold">Chosen report types</p>
          <span className="block rounded px-1.5 py-0.5">Monthly registration return</span>
          <div className="flex justify-end pt-1"><Btn primary className="h-5">Save<Mark n={2} /></Btn></div>
        </Card>
      </div>
    ),
  },
  "indicator-form": {
    title: "Indicators — create indicator",
    render: () => (
      <Card className="space-y-2">
        <p className="font-semibold">Numerator</p>
        <span className="block rounded border border-input bg-card px-1.5 py-0.5 font-clinical">#{"{"}DE_MID_REG{"}"}</span>
        <div className="relative flex flex-wrap gap-1">
          {["DE_NUR_REG", "DE_MID_REG", "DE_EXAM"].map((c, i) => (
            <span key={c} className={cn("rounded border px-1.5 py-0.5 font-clinical", i === 1 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card")}>{c}</span>
          ))}
          <Mark n={1} className="-top-2 left-40" />
        </div>
        <div className="flex items-center gap-2"><span className="font-medium">Factor</span><span className="relative rounded border border-input px-1.5 py-0.5 font-clinical">100<Mark n={2} /></span></div>
      </Card>
    ),
  },
  "data-element-import": {
    title: "Indicators — import data elements",
    render: () => (
      <Card className="mx-auto max-w-xs space-y-2 text-center">
        <p className="font-semibold">Import from Excel</p>
        <div className="relative rounded-lg border-2 border-dashed border-input bg-surface-muted p-3">
          <CloudUpload className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-1"><span className="font-semibold">Click to upload</span> or drag a file here</p>
          <p className="text-muted-foreground">.xlsx or .xls</p>
          <Mark n={1} />
        </div>
      </Card>
    ),
  },
}

interface ScreenPreviewProps {
  screen: ScreenId
  caption?: string
}

/** An illustrative preview of a screen with numbered markers. Shows no real data. */
export function ScreenPreview({ screen, caption }: ScreenPreviewProps) {
  const def = SCREENS[screen]
  return (
    <figure className="space-y-1.5">
      <div role="img" aria-label={`Preview of ${def.title}${caption ? `: ${caption}` : ""}`} className="select-none">
        <div aria-hidden="true">
          <Frame title={def.title}>{def.render()}</Frame>
        </div>
      </div>
      <figcaption className="text-xs text-muted-foreground">
        {caption ?? "Illustration — numbered markers show where to look."}
      </figcaption>
    </figure>
  )
}
