import {
  LayoutDashboard,
  FilePenLine,
  FileSpreadsheet,
  BarChart3,
  Database,
  Users,
  Settings,
  TrendingUp,
  ClipboardList,
  Table2,
  LifeBuoy,
} from "lucide-react"

export type NavGroup = "home" | "data" | "analysis" | "admin" | "help"

export const NAV_GROUP_ORDER: NavGroup[] = ["home", "data", "analysis", "admin", "help"]

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  home: "Home",
  data: "Data",
  analysis: "Analysis",
  admin: "Administration",
  help: "Account and help",
}

export type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  group: NavGroup
  description?: string
  badge?: string
  /** Only show to staff/superuser */
  staffOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    group: "home",
    description: "Overview and key numbers",
  },
  {
    label: "Data Entry",
    href: "/data-entry",
    icon: FileSpreadsheet,
    group: "data",
    description: "Enter and submit report data",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: ClipboardList,
    group: "data",
    description: "View, print and export reports",
  },
  {
    label: "Design Reports",
    href: "/design-reports",
    icon: FilePenLine,
    group: "data",
    description: "Create report templates",
    staffOnly: true,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    group: "analysis",
    description: "Charts and trends",
    staffOnly: true,
  },
  {
    label: "Visualizations",
    href: "/visualizations",
    icon: Table2,
    group: "analysis",
    description: "Pivot tables and data explorer",
  },
  {
    label: "Indicators",
    href: "/indicators",
    icon: TrendingUp,
    group: "admin",
    description: "Manage calculated indicators",
    staffOnly: true,
  },
  {
    label: "Organizations",
    href: "/organizations",
    icon: Database,
    group: "admin",
    description: "Manage organisation units",
    staffOnly: true,
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    group: "admin",
    description: "Manage user accounts",
    staffOnly: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    group: "help",
    description: "Your account and preferences",
  },
  {
    label: "Resources",
    href: "/resources",
    icon: LifeBuoy,
    group: "help",
    description: "Step-by-step guides and answers to common questions",
  },
]

type NavUser = { is_staff?: boolean; is_superuser?: boolean } | null | undefined

/** The one place that decides which pages a user sees in the menu. */
export function canSeeNavItem(item: NavItem, user: NavUser): boolean {
  if (!item.staffOnly) return true
  return Boolean(user?.is_staff || user?.is_superuser)
}

export function visibleNavItems(user: NavUser): NavItem[] {
  return NAV_ITEMS.filter((item) => canSeeNavItem(item, user))
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

/** Plain-words role label for the signed-in user. */
export function roleLabel(user: NavUser): string {
  if (user?.is_superuser) return "Superuser"
  if (user?.is_staff) return "Administrator"
  return "Data officer"
}
