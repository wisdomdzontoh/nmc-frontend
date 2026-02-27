import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Database,
  Users,
  Settings,
  TrendingUp,
} from "lucide-react"

export type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  group?: "Top apps" | "All apps"
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
    group: "Top apps",
    description: "Overview and key metrics",
  },
  {
    label: "Data Entry",
    href: "/data-entry",
    icon: FileText,
    group: "Top apps",
    description: "Submit new reports",
    badge: "New",
  },
  {
    label: "Design Reports",
    href: "/design-reports",
    icon: FileText,
    group: "Top apps",
    description: "Create report templates",
    staffOnly: true,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileText,
    group: "Top apps",
    description: "View submitted reports",
    staffOnly: true,
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    group: "Top apps",
    description: "Data visualization and insights",
    staffOnly: true,
  },
  {
    label: "Visualizations",
    href: "/visualizations",
    icon: BarChart3,
    group: "Top apps",
    description: "Pivot tables and data explorer",
    staffOnly: true,
  },
  {
    label: "Indicators",
    href: "/indicators",
    icon: TrendingUp,
    group: "All apps",
    description: "Manage calculation indicators",
    staffOnly: true,
  },
  {
    label: "Organizations",
    href: "/organizations",
    icon: Database,
    group: "All apps",
    description: "Manage organization units",
    staffOnly: true,
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    group: "All apps",
    description: "User management",
    staffOnly: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    group: "All apps",
    description: "System configuration",
  },
]

