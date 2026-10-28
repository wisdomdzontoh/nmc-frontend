/**
 * Help and resources content.
 *
 * Every guide says who it is for (`audience`). "everyone" guides are shown to all signed-in users;
 * "admin" guides only to staff and superusers — the same rule the menu uses (navConfig.canSeeNavItem).
 *
 * Keep out of this file anything that could weaken security: user accounts and passwords of other
 * people, permissions, server or API details, sign-in tokens, or how access checks work.
 */

export type GuideAudience = "everyone" | "admin"

export type GuideCategory =
  | "getting-started"
  | "data-entry"
  | "reports"
  | "visualizations"
  | "account"
  | "report-design"
  | "setup"

/** Built-in screen previews (components/resources/ScreenPreview.tsx). */
export type ScreenId =
  | "shell"
  | "find-page"
  | "dashboard"
  | "data-entry-pickers"
  | "data-entry-form"
  | "data-entry-submit"
  | "data-entry-locked"
  | "reports-list"
  | "reports-view"
  | "reports-rate"
  | "reports-generate"
  | "viz-boxes"
  | "viz-period"
  | "viz-table"
  | "settings-password"
  | "analytics"
  | "designer"
  | "designer-import"
  | "org-assign"
  | "indicator-form"
  | "data-element-import"

export type GuideStep = {
  title: string
  body: string
  /** Short extra advice shown under the step. */
  tip?: string
  /** A built-in preview of the screen, with a numbered marker on what to use. */
  screen?: ScreenId
  /** Optional real screenshot in /public (e.g. "/guides/data-entry-1.png"). Shown instead of the preview. */
  image?: string
  caption?: string
}

export type Guide = {
  id: string
  title: string
  summary: string
  category: GuideCategory
  audience: GuideAudience
  minutes: number
  /** Extra words people might search with. */
  keywords: string[]
  /** The page this guide is about, with a button to open it. */
  page?: { label: string; href: string }
  steps: GuideStep[]
  related?: string[]
}

export type QuickAnswer = {
  id: string
  question: string
  answer: string
  audience: GuideAudience
  guide?: string
  keywords: string[]
}

export const CATEGORY_LABELS: Record<GuideCategory, string> = {
  "getting-started": "Getting started",
  "data-entry": "Entering data",
  reports: "Reports",
  visualizations: "Tables and charts",
  account: "Your account",
  "report-design": "Report forms",
  setup: "Setting up",
}

export const CATEGORY_ORDER: GuideCategory[] = [
  "getting-started",
  "data-entry",
  "reports",
  "visualizations",
  "account",
  "report-design",
  "setup",
]

export const GUIDES: Guide[] = [
  // ── Getting started ────────────────────────────────────────────────────
  {
    id: "find-your-way",
    title: "Find your way around",
    summary: "Learn the menu, the top bar and the quickest way to get to any page.",
    category: "getting-started",
    audience: "everyone",
    minutes: 2,
    keywords: ["menu", "sidebar", "navigate", "sign out", "logout", "log out", "search", "shortcut"],
    steps: [
      {
        title: "Use the menu on the left",
        body: "Every page you can use is listed in the menu, grouped into Home, Data, Analysis and Account and help. The page you are on is highlighted.",
        tip: "Select Collapse menu at the bottom to give yourself more room. Your choice is remembered on this computer.",
        screen: "shell",
      },
      {
        title: "Jump to any page with Find a page",
        body: "Select Find a page in the top bar, or press Ctrl and K together. Type a word such as \"reports\" and press Enter to open the page.",
        screen: "find-page",
      },
      {
        title: "Open your account menu",
        body: "Select your name at the top left to see your role, open Settings or sign out.",
      },
      {
        title: "Sign out when you are done",
        body: "Select Sign out at the bottom of the menu. Always sign out on a shared computer.",
      },
    ],
    related: ["read-dashboard", "change-password"],
  },
  {
    id: "read-dashboard",
    title: "Read your dashboard",
    summary: "See how many reports have come in, from which units and when.",
    category: "getting-started",
    audience: "everyone",
    minutes: 2,
    keywords: ["home", "overview", "numbers", "charts", "recent submissions", "statistics"],
    page: { label: "Open dashboard", href: "/dashboard" },
    steps: [
      {
        title: "Choose the period",
        body: "Use Period in the filter band to switch between the last 7 days, 30 days, 90 days, 12 months or this year. Every number and chart updates.",
        screen: "dashboard",
      },
      {
        title: "Read the four headline numbers",
        body: "Reports submitted, Units reporting, Report types used and Daily average give you a quick picture. Select Reports submitted to go straight to the list of reports.",
      },
      {
        title: "Check the charts",
        body: "Reports over time shows the trend. The other charts show which units and report types sent the most, and activity day by day.",
      },
      {
        title: "See the latest submissions",
        body: "Recent submissions lists the newest reports with their status. Select See all reports to open the full list.",
        tip: "If the numbers look out of date, select Refresh at the top of the page.",
      },
    ],
    related: ["find-reports", "enter-data"],
  },

  // ── Entering data ──────────────────────────────────────────────────────
  {
    id: "enter-data",
    title: "Enter and submit a report",
    summary: "Fill in a report for your organisation unit and send it in, step by step.",
    category: "data-entry",
    audience: "everyone",
    minutes: 5,
    keywords: ["data entry", "fill", "form", "submit", "monthly return", "send", "enter values", "how to report"],
    page: { label: "Open Data entry", href: "/data-entry" },
    steps: [
      {
        title: "Open Data entry",
        body: "Select Data Entry in the menu. You will see three boxes: Organisation unit, Report and Period.",
        screen: "data-entry-pickers",
      },
      {
        title: "Choose your organisation unit",
        body: "Select the Organisation unit box and pick your unit from the list. You can type in the search box to find it quickly.",
        tip: "You can only enter data for your own organisation unit. Other units open as view-only.",
      },
      {
        title: "Choose the report",
        body: "Select the Report box and pick the report you need to fill in. Only reports assigned to your unit can be filled in.",
      },
      {
        title: "Choose the period",
        body: "Select the Period box. Use Monthly or Quarterly, move between years with the arrows, then pick the month or quarter the data covers.",
      },
      {
        title: "Fill in the form",
        body: "The form opens as soon as all three are chosen. Type your numbers into each box. Your work saves automatically about two seconds after you stop typing.",
        tip: "Watch the pill at the top right of the report card. \"Saving…\" means it is saving, \"Saved\" means it is safe, and \"changes not saved yet\" means it is waiting.",
        screen: "data-entry-form",
      },
      {
        title: "Submit the report",
        body: "When everything is filled in, select Submit report in the bar at the bottom of the page. The status changes to Submitted and you will see a confirmation.",
        tip: "Need a copy? Select Export to Excel in the same bar to download what you entered.",
        screen: "data-entry-submit",
      },
    ],
    related: ["autosave-drafts", "update-submitted", "view-only-forms"],
  },
  {
    id: "autosave-drafts",
    title: "How saving works",
    summary: "Your work saves as you type, and is kept on this computer if the internet drops.",
    category: "data-entry",
    audience: "everyone",
    minutes: 2,
    keywords: ["autosave", "draft", "lost", "save now", "internet", "offline", "restore", "unsaved"],
    page: { label: "Open Data entry", href: "/data-entry" },
    steps: [
      {
        title: "Saving happens on its own",
        body: "About two seconds after you stop typing, your values are saved as a draft. You don't need to press anything.",
        screen: "data-entry-form",
      },
      {
        title: "Use Save now if you are in a hurry",
        body: "If you see \"changes not saved yet\", select Save now in the bottom bar to save straight away, for example before closing the page.",
      },
      {
        title: "If the page closes or the internet drops",
        body: "What you typed is also kept on this computer. When you open the same report again, you will see \"We restored your unsaved work\". Check the values, then submit.",
        tip: "The copy kept on the computer is only on that computer. If you switch computers, submit first.",
      },
      {
        title: "Draft is not the same as submitted",
        body: "A saved draft is only visible as Draft. Your report is not counted until you select Submit report.",
      },
    ],
    related: ["enter-data", "update-submitted"],
  },
  {
    id: "update-submitted",
    title: "Correct a report you already submitted",
    summary: "Change values after submitting, while the period is still open.",
    category: "data-entry",
    audience: "everyone",
    minutes: 2,
    keywords: ["edit", "change", "correct", "mistake", "update", "resubmit", "amend"],
    page: { label: "Open Data entry", href: "/data-entry" },
    steps: [
      {
        title: "Open the same report again",
        body: "In Data entry, choose the same organisation unit, report and period. The form opens with the values that were submitted, and the status shows Submitted.",
      },
      {
        title: "Change the values",
        body: "Type the correct numbers. Changes save automatically, just like the first time.",
      },
      {
        title: "Submit again",
        body: "Select Submit report so the corrected report is recorded. The card shows who submitted last and when.",
        tip: "Reports can only be changed for a set number of days after the period ends. After that the form becomes view-only.",
      },
    ],
    related: ["view-only-forms", "enter-data"],
  },
  {
    id: "view-only-forms",
    title: "Why a form is view-only",
    summary: "Understand the yellow notice and what to do about it.",
    category: "data-entry",
    audience: "everyone",
    minutes: 1,
    keywords: ["locked", "read only", "view only", "can't edit", "cannot type", "greyed out", "disabled"],
    page: { label: "Open Data entry", href: "/data-entry" },
    steps: [
      {
        title: "Read the notice above the form",
        body: "A yellow notice that starts \"You can view this report but not change it\" tells you why. There are three common reasons.",
        screen: "data-entry-locked",
      },
      {
        title: "The period is locked",
        body: "Reports can only be changed for a set number of days after the period ends. If you need to change a locked report, ask your administrator.",
      },
      {
        title: "It is another unit",
        body: "You can look at data for units below yours, but you can only enter data for your own organisation unit.",
      },
      {
        title: "The report isn't assigned to the unit",
        body: "Each unit fills in only the reports assigned to it. If a report is missing or view-only for your unit, ask your administrator to assign it.",
      },
    ],
    related: ["enter-data", "update-submitted"],
  },

  // ── Reports ────────────────────────────────────────────────────────────
  {
    id: "find-reports",
    title: "Find, view and export a submitted report",
    summary: "Search the list of reports, open one and download it as Excel.",
    category: "reports",
    audience: "everyone",
    minutes: 3,
    keywords: ["list", "search", "filter", "download", "excel", "export", "view report", "history"],
    page: { label: "Open Reports", href: "/reports" },
    steps: [
      {
        title: "Open Reports",
        body: "Select Reports in the menu. The All reports tab lists reports for your unit and the units below it.",
        screen: "reports-list",
      },
      {
        title: "Narrow the list",
        body: "Type a report or unit name in the search box. Use the status filter (Submitted or Draft) and the period filters to find a month, quarter or year.",
        tip: "Select a column heading, such as Period or Submitted, to sort by it.",
      },
      {
        title: "Open a report",
        body: "Select View on a row to see all its values without leaving the page.",
        screen: "reports-view",
      },
      {
        title: "Download it",
        body: "Select Export on the row, or in the report window, to download the report as an Excel file.",
      },
    ],
    related: ["reporting-rate", "generate-report"],
  },
  {
    id: "reporting-rate",
    title: "Check the reporting rate",
    summary: "See what share of expected reports have come in for a period.",
    category: "reports",
    audience: "everyone",
    minutes: 3,
    keywords: ["completeness", "rate", "percentage", "expected", "submitted", "who has reported", "compliance", "late", "missing"],
    page: { label: "Open Reports", href: "/reports" },
    steps: [
      {
        title: "Open the Reporting rate tab",
        body: "In Reports, select the Reporting rate tab.",
        screen: "reports-rate",
      },
      {
        title: "Choose the period and unit",
        body: "Pick the period type (monthly, quarterly, half-yearly or yearly), the year and the period. Then choose the organisation unit to start from.",
      },
      {
        title: "Show the results",
        body: "Select Show reporting rate. You will see the number of units, reports expected, reports submitted and the overall completeness.",
      },
      {
        title: "Read each unit's status",
        body: "Each unit gets a status: Complete (100%), Good (75% or more), Partial (50% or more), Incomplete or Not submitted.",
        tip: "Open the Who has reported tab to see exactly which reports each unit has sent and which are still missing.",
      },
    ],
    related: ["generate-report", "find-reports"],
  },
  {
    id: "generate-report",
    title: "Generate a summary report",
    summary: "Combine submitted data for a period into one report you can download.",
    category: "reports",
    audience: "everyone",
    minutes: 3,
    keywords: ["generate", "aggregate", "summary", "combine", "total", "quarterly report", "annual report", "excel"],
    page: { label: "Open Reports", href: "/reports" },
    steps: [
      {
        title: "Open the Generate a report tab",
        body: "In Reports, select the Generate a report tab.",
        screen: "reports-generate",
      },
      {
        title: "Choose the year and period",
        body: "Pick the year and the period you want the report to cover.",
      },
      {
        title: "Choose the report types",
        body: "Open Report types and tick the reports you want to include. Use the search box if the list is long.",
      },
      {
        title: "Generate and download",
        body: "Select Generate report. Each report appears as a card with its values. Select Export Excel on a card to download it.",
        tip: "If a card says \"No data for this period\", no one submitted that report for the period you chose.",
      },
    ],
    related: ["reporting-rate", "build-pivot-table"],
  },

  // ── Tables and charts ──────────────────────────────────────────────────
  {
    id: "build-pivot-table",
    title: "Build a table in Visualizations",
    summary: "Pick data, periods and units, arrange them, and download the table.",
    category: "visualizations",
    audience: "everyone",
    minutes: 4,
    keywords: ["pivot", "table", "visualizer", "visualise", "explore", "compare", "rows", "columns", "download excel", "data elements", "indicators"],
    page: { label: "Open Visualizations", href: "/visualizations" },
    steps: [
      {
        title: "Open Visualizations",
        body: "Select Visualizations in the menu. At the top you will see three boxes: Columns, Rows and Filter. Each box holds one of Data, Period or Organisation unit.",
        screen: "viz-boxes",
      },
      {
        title: "Choose the data",
        body: "Select the Data box. Pick a report to narrow the list, search by name or code, then select the data items or indicators you want.",
      },
      {
        title: "Choose the period",
        body: "Select the Period box. Use Relative periods for quick choices such as Last 3 months, or Fixed periods to pick exact months, quarters or years.",
        screen: "viz-period",
      },
      {
        title: "Choose organisation units",
        body: "Select the Organisation unit box and tick the units you want. You will only see your unit and the units below it.",
      },
      {
        title: "Arrange the table",
        body: "Drag a box by its grip handle onto Columns, Rows or Filter to swap them. Whatever is in Filter is added together.",
      },
      {
        title: "Update and download",
        body: "Select Update table to build it. Select Download Excel to save it.",
        tip: "Wide tables scroll sideways. The first column and the header stay in place while you scroll.",
        screen: "viz-table",
      },
    ],
    related: ["generate-report", "read-dashboard"],
  },

  // ── Your account ───────────────────────────────────────────────────────
  {
    id: "change-password",
    title: "Update your details or change your password",
    summary: "Keep your name and email up to date, and change your own password.",
    category: "account",
    audience: "everyone",
    minutes: 2,
    keywords: ["password", "profile", "name", "email", "account", "settings", "security"],
    page: { label: "Open Settings", href: "/settings" },
    steps: [
      {
        title: "Open Settings",
        body: "Select Settings in the menu, or select your name at the top left and choose Settings.",
      },
      {
        title: "Update your profile",
        body: "On the My profile tab, change your name or email and select Save.",
      },
      {
        title: "Change your password",
        body: "Open the Password tab. Type your current password, then your new password twice, and save.",
        tip: "Use a password you don't use anywhere else, and never share it, not even with colleagues.",
        screen: "settings-password",
      },
      {
        title: "Forgot your password?",
        body: "You can't reset it yourself. Contact the M&E department for support.",
      },
    ],
    related: ["find-your-way"],
  },

  // ── Admin: analytics ───────────────────────────────────────────────────
  {
    id: "use-analytics",
    title: "Use Analytics",
    summary: "See trends across all organisation units and download the numbers.",
    category: "visualizations",
    audience: "admin",
    minutes: 2,
    keywords: ["analytics", "charts", "trends", "statistics", "download data"],
    page: { label: "Open Analytics", href: "/analytics" },
    steps: [
      {
        title: "Open Analytics",
        body: "Select Analytics in the menu. You will see totals for reports, users and organisation units.",
        screen: "analytics",
      },
      {
        title: "Choose the period",
        body: "Use the period list at the top right. Every chart and table updates.",
      },
      {
        title: "Read the charts and tables",
        body: "See reports over time, the share for each report type, the busiest units and daily activity.",
      },
      {
        title: "Download the numbers",
        body: "Select Download data to save the figures behind the charts.",
      },
    ],
    related: ["build-pivot-table"],
  },

  // ── Admin: report forms ────────────────────────────────────────────────
  {
    id: "design-report-form",
    title: "Design a report form",
    summary: "Build the form people fill in on the Data entry page.",
    category: "report-design",
    audience: "admin",
    minutes: 6,
    keywords: ["designer", "layout", "template", "form", "table", "heading", "publish", "bind", "data element"],
    page: { label: "Open Design reports", href: "/design-reports" },
    steps: [
      {
        title: "Start a new layout",
        body: "Open Design Reports and select Create layout. To change an existing form, select Edit on its row instead.",
      },
      {
        title: "Name it and choose the report",
        body: "At the top, type a layout name and a short code, then choose the report this form is for.",
        screen: "designer",
      },
      {
        title: "Add headings and tables",
        body: "Use Insert on the left to add a Heading or a Table. Drag sections by the grip handle to reorder them.",
      },
      {
        title: "Link cells to data elements",
        body: "Select a cell, then use the bar above the table to type a label or link the cell to a data element. Linked cells become boxes people type numbers into.",
        tip: "Right-click a row number or column heading to add or remove rows and columns.",
      },
      {
        title: "Check it in Preview",
        body: "Open the Preview tab to see the form the way people will see it.",
      },
      {
        title: "Save, then publish",
        body: "Select Save draft (or press Ctrl and S). When it's ready, select Publish so it appears on the Data entry page.",
      },
    ],
    related: ["import-report-form", "assign-reports"],
  },
  {
    id: "import-report-form",
    title: "Import a report form from Excel",
    summary: "Use the Excel template to create a form without building it by hand.",
    category: "report-design",
    audience: "admin",
    minutes: 3,
    keywords: ["import", "excel", "template", "upload", "spreadsheet", "xlsx"],
    page: { label: "Open Design reports", href: "/design-reports" },
    steps: [
      {
        title: "Download the template",
        body: "In Design Reports, select Download template. Fill it in following the instructions in the file.",
        screen: "designer-import",
      },
      {
        title: "Import your file",
        body: "Select Import from Excel, give the layout a name and code, and choose your file.",
      },
      {
        title: "Review and publish",
        body: "The new layout appears in the list as a draft. Open it with Edit, check it in Preview, then Publish.",
      },
    ],
    related: ["design-report-form"],
  },

  // ── Admin: setting up ──────────────────────────────────────────────────
  {
    id: "assign-reports",
    title: "Choose which reports a unit fills in",
    summary: "Assign report types to an organisation unit so it can enter them.",
    category: "setup",
    audience: "admin",
    minutes: 3,
    keywords: ["assign", "organisation unit", "org unit", "report types", "missing report", "not assigned"],
    page: { label: "Open Organisations", href: "/organizations" },
    steps: [
      {
        title: "Open Organisations",
        body: "Select Organizations in the menu. Use Table or Tree view, whichever is easier to find the unit in.",
      },
      {
        title: "Open Assign for the unit",
        body: "Select Assign on the unit's row. In Tree view, hover over the unit to see the button.",
        screen: "org-assign",
      },
      {
        title: "Move report types across",
        body: "Select report types on the left and use the arrow to move them to Chosen report types on the right. Use the other arrow to remove them.",
      },
      {
        title: "Save",
        body: "Save your changes. The unit can now fill in those reports on the Data entry page.",
      },
    ],
    related: ["design-report-form", "view-only-forms"],
  },
  {
    id: "add-data-elements",
    title: "Add data elements",
    summary: "Create the numbers people enter, one at a time or many at once from Excel.",
    category: "setup",
    audience: "admin",
    minutes: 3,
    keywords: ["data element", "field", "variable", "code", "bulk import", "excel", "upload"],
    page: { label: "Open Indicators", href: "/indicators" },
    steps: [
      {
        title: "Open the Data elements tab",
        body: "In Indicators, select the Data elements tab.",
      },
      {
        title: "Add one",
        body: "Select Create data element, enter a short code and a clear name, and save.",
        tip: "Codes can't be changed later, so choose them carefully, e.g. DE_NUR_REG.",
      },
      {
        title: "Or add many from Excel",
        body: "Select Import from Excel and upload a spreadsheet with your data elements. You'll see how many were added and any rows that need fixing.",
        screen: "data-element-import",
      },
    ],
    related: ["create-indicator", "design-report-form"],
  },
  {
    id: "create-indicator",
    title: "Create an indicator",
    summary: "Calculate a value such as a percentage from data elements.",
    category: "setup",
    audience: "admin",
    minutes: 4,
    keywords: ["indicator", "formula", "percentage", "numerator", "denominator", "calculate", "factor", "rate"],
    page: { label: "Open Indicators", href: "/indicators" },
    steps: [
      {
        title: "Open Indicators",
        body: "Select Indicators in the menu, then Create indicator.",
      },
      {
        title: "Name it",
        body: "Enter a code and a name people will understand, e.g. \"Share of midwives\".",
      },
      {
        title: "Build the numerator and denominator",
        body: "Select data elements under Numerator to add them to the formula. Do the same under Denominator for what you divide by.",
        screen: "indicator-form",
      },
      {
        title: "Choose the factor",
        body: "Use 100 for a percentage, 1,000 for per thousand, or 1 for a plain number.",
      },
      {
        title: "Save",
        body: "Select Create indicator. If the formula has a problem, a red notice explains what to fix.",
      },
    ],
    related: ["add-data-elements", "build-pivot-table"],
  },
]

export const QUICK_ANSWERS: QuickAnswer[] = [
  {
    id: "missing-report",
    question: "I can't find the report I need to fill in",
    answer: "Only reports assigned to your organisation unit appear in Data entry. Ask your administrator to assign it to your unit.",
    audience: "everyone",
    guide: "view-only-forms",
    keywords: ["missing", "not listed", "report type"],
  },
  {
    id: "cant-type",
    question: "I can see the form but can't type in it",
    answer: "The form is view-only. The yellow notice above it says why: the period is locked, it's another unit, or the report isn't assigned to the unit.",
    audience: "everyone",
    guide: "view-only-forms",
    keywords: ["locked", "read only", "greyed"],
  },
  {
    id: "lost-work",
    question: "Did I lose what I typed?",
    answer: "Probably not. Your work saves as you type and is also kept on this computer. Open the same report again and look for \"We restored your unsaved work\".",
    audience: "everyone",
    guide: "autosave-drafts",
    keywords: ["lost", "closed", "internet", "crash"],
  },
  {
    id: "submitted-or-draft",
    question: "How do I know my report was sent?",
    answer: "The status on the report card changes to Submitted, and the report shows as Submitted in the Reports list. Draft means it was saved but not sent yet.",
    audience: "everyone",
    guide: "enter-data",
    keywords: ["sent", "confirm", "status"],
  },
  {
    id: "page-missing",
    question: "A page someone mentioned isn't in my menu",
    answer: "Some pages are only for administrators. Use Find a page (Ctrl and K) to search the pages you can use. If you need another page for your work, ask your administrator.",
    audience: "everyone",
    guide: "find-your-way",
    keywords: ["menu", "access", "can't see"],
  },
  {
    id: "forgot-password",
    question: "I forgot my password",
    answer: "Contact the M&E department for support. For your safety, you can't reset your password yourself.",
    audience: "everyone",
    guide: "change-password",
    keywords: ["password", "reset", "locked out"],
  },
  {
    id: "export-nothing",
    question: "I selected Export but nothing downloaded",
    answer: "Check your browser's downloads list, as the file may have gone straight there. If your browser blocked it, allow downloads for this site and try again.",
    audience: "everyone",
    guide: "find-reports",
    keywords: ["download", "excel", "blocked"],
  },
  {
    id: "form-not-on-entry",
    question: "A form I designed doesn't show on Data entry",
    answer: "Check that it is published, and that its report is assigned to the unit you chose on Data entry.",
    audience: "admin",
    guide: "assign-reports",
    keywords: ["publish", "layout", "designer"],
  },
]

/** Guides and answers this user may see. */
export function guidesFor(isAdmin: boolean) {
  return GUIDES.filter((g) => g.audience === "everyone" || isAdmin)
}

export function quickAnswersFor(isAdmin: boolean) {
  return QUICK_ANSWERS.filter((q) => q.audience === "everyone" || isAdmin)
}

function normalise(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9 ]+/g, " ")
}

/** Simple ranked search across titles, summaries, keywords and step text. */
export function searchGuides(guides: Guide[], query: string): Guide[] {
  const words = normalise(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return guides
  const scored = guides.map((g) => {
    const title = normalise(g.title)
    const summary = normalise(g.summary)
    const keys = normalise(g.keywords.join(" "))
    const steps = normalise(g.steps.map((s) => `${s.title} ${s.body} ${s.tip ?? ""}`).join(" "))
    let score = 0
    for (const w of words) {
      if (title.includes(w)) score += 6
      if (keys.includes(w)) score += 4
      if (summary.includes(w)) score += 3
      if (steps.includes(w)) score += 1
    }
    return { g, score }
  })
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.g)
}

export function searchQuickAnswers(answers: QuickAnswer[], query: string): QuickAnswer[] {
  const words = normalise(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return answers
  return answers.filter((a) => {
    const text = normalise(`${a.question} ${a.answer} ${a.keywords.join(" ")}`)
    return words.some((w) => text.includes(w))
  })
}
