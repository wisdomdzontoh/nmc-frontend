"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface SubNavItem {
  value: string;
  label: string;
  icon?: ReactNode;
  /** Optional count shown after the label. */
  count?: number;
  /** Link mode: navigate here instead of calling onValueChange. */
  href?: string;
}

interface ModuleSubNavProps {
  items: SubNavItem[];
  value: string;
  onValueChange?: (value: string) => void;
  className?: string;
  /** At most this many tabs show directly — the rest collapse under "More". */
  maxVisible?: number;
}

/** Underlined section tabs that sit under the page card. Active tab = red text + red underline. */
export function ModuleSubNav({ items, value, onValueChange, className, maxVisible = 5 }: ModuleSubNavProps) {
  const overflow = items.length > maxVisible;
  const visible = overflow ? items.slice(0, maxVisible - 1) : items;
  const more = overflow ? items.slice(maxVisible - 1) : [];
  const moreActive = more.some((item) => item.value === value);

  function label(item: SubNavItem) {
    return (
      <>
        {item.icon}
        {item.label}
        {typeof item.count === "number" && (
          <span className="ml-0.5 rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
            {item.count}
          </span>
        )}
      </>
    );
  }

  function renderTab(item: SubNavItem) {
    const active = item.value === value;
    const className = cn("module-subnav-tab", active && "active");
    if (item.href) {
      return (
        <Link key={item.value} href={item.href} className={className} aria-current={active ? "page" : undefined}>
          {label(item)}
        </Link>
      );
    }
    return (
      <button
        key={item.value}
        type="button"
        role="tab"
        aria-selected={active}
        className={className}
        onClick={() => onValueChange?.(item.value)}
      >
        {label(item)}
      </button>
    );
  }

  return (
    <nav className={cn("module-subnav", className)} aria-label="Sections" role="tablist">
      {visible.map(renderTab)}
      {overflow && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={cn("module-subnav-tab gap-1", moreActive && "active")}>
              {moreActive ? more.find((item) => item.value === value)?.label : "More"}
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {more.map((item) =>
              item.href ? (
                <DropdownMenuItem key={item.value} asChild>
                  <Link href={item.href}>{item.label}</Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem key={item.value} onSelect={() => onValueChange?.(item.value)}>
                  {item.label}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );
}
