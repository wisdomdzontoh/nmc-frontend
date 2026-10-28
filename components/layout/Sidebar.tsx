"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  NAV_GROUP_LABELS,
  NAV_GROUP_ORDER,
  isNavItemActive,
  visibleNavItems,
} from "./navConfig";

interface SidebarProps {
  /** Rail only: expanded (labels) or collapsed (icons). */
  open: boolean;
  onToggle?: () => void;
  /** "rail" = fixed desktop sidebar; "drawer" = slide-out menu on small screens. */
  variant?: "rail" | "drawer";
  /** Drawer only: close the menu after the user picks a page. */
  onNavigate?: () => void;
}

export default function Sidebar({ open, onToggle, variant = "rail", onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { djangoUser, logout } = useAuth();
  const isDrawer = variant === "drawer";
  const collapsed = !isDrawer && !open;

  const items = visibleNavItems(djangoUser);
  const groups = NAV_GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  })).filter((g) => g.items.length > 0);

  function withTooltip(label: string, node: React.ReactElement) {
    if (!collapsed) return node;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{node}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <aside
      className={cn(
        "sidebar-shell flex h-full shrink-0 flex-col border-r transition-[width] duration-200",
        isDrawer ? "w-full" : collapsed ? "w-16" : "w-60"
      )}
      aria-label="Main menu"
    >
      {/* White brand block — lines up with the 64px top bar */}
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border bg-card px-3"
        aria-label="IMEMS — go to dashboard"
      >
        {collapsed ? (
          <span className="relative mx-auto h-9 w-9">
            <Image src="/logo.png" alt="" fill sizes="36px" className="object-contain" priority />
          </span>
        ) : (
          <>
            <span className="relative h-9 w-[72px] shrink-0">
              <Image src="/logo.png" alt="" fill sizes="72px" className="object-contain" priority />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-extrabold tracking-wide text-foreground">IMEMS</span>
              <span className="block truncate text-2xs font-medium tracking-wide text-muted-foreground uppercase">
                NMC Ghana
              </span>
            </span>
          </>
        )}
      </Link>

      <nav className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {groups.map(({ group, items: groupItems }) => (
          <div key={group}>
            {!collapsed && (
              <p className="sidebar-group-label px-3 pb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                {NAV_GROUP_LABELS[group]}
              </p>
            )}
            {collapsed && group !== NAV_GROUP_ORDER[0] && <div className="sidebar-divider mx-3 mb-2 border-t" />}
            <ul className="space-y-0.5">
              {groupItems.map((item) => {
                const active = isNavItemActive(item, pathname);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    {withTooltip(
                      item.label,
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn("sidebar-item", active && "active", collapsed && "justify-center px-0")}
                        aria-current={active ? "page" : undefined}
                        aria-label={collapsed ? item.label : undefined}
                      >
                        <Icon
                          className={cn("h-[18px] w-[18px] shrink-0", active ? "sidebar-icon-active" : "sidebar-icon-muted")}
                          aria-hidden="true"
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-divider shrink-0 space-y-0.5 border-t p-2">
        {!isDrawer &&
          onToggle &&
          withTooltip(
            "Expand menu",
            <button
              type="button"
              onClick={onToggle}
              className={cn("sidebar-item w-full", collapsed && "justify-center px-0")}
              aria-label={collapsed ? "Expand menu" : "Collapse menu"}
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <PanelLeftOpen className="sidebar-icon-muted h-[18px] w-[18px]" aria-hidden="true" />
              ) : (
                <>
                  <PanelLeftClose className="sidebar-icon-muted h-[18px] w-[18px]" aria-hidden="true" />
                  <span>Collapse menu</span>
                </>
              )}
            </button>
          )}
        {withTooltip(
          "Sign out",
          <button
            type="button"
            onClick={() => void logout()}
            className={cn("sidebar-item w-full", collapsed && "justify-center px-0")}
            aria-label={collapsed ? "Sign out" : undefined}
          >
            <LogOut className="sidebar-icon-muted h-[18px] w-[18px]" aria-hidden="true" />
            {!collapsed && <span>Sign out</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
