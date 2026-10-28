"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, LifeBuoy, LogOut, Menu, Search, Settings } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_GROUP_LABELS, NAV_GROUP_ORDER, roleLabel, visibleNavItems } from "./navConfig";

interface HeaderProps {
  /** Small screens only: opens the slide-out main menu. */
  onOpenMenu?: () => void;
}

export default function Header({ onOpenMenu }: HeaderProps) {
  const { djangoUser, logout } = useAuth();
  const router = useRouter();
  const [finderOpen, setFinderOpen] = useState(false);

  const items = visibleNavItems(djangoUser);
  const name = djangoUser?.full_name?.trim() || djangoUser?.first_name || djangoUser?.email || "";
  const firstName = djangoUser?.first_name?.trim() || name.split(" ")[0] || "";
  const orgName = djangoUser?.org_unit_name || (djangoUser?.is_staff || djangoUser?.is_superuser ? "All organisation units" : "");

  // Ctrl/Cmd + K opens "Find a page"
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setFinderOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function initials() {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return (parts[0]?.[0] ?? "U").toUpperCase();
  }

  return (
    <header
      className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-4 sm:px-5"
      role="banner"
    >
      {onOpenMenu && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={onOpenMenu}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Greeting + role — this whole block is the account menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 shrink-0 items-center gap-2.5 rounded-lg py-1 pr-2 pl-1 transition-colors hover:bg-muted"
            aria-label="Your account"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground"
              aria-hidden="true"
            >
              {initials()}
            </span>
            <span className="hidden min-w-0 flex-col items-start text-left sm:flex">
              <span className="truncate text-sm text-foreground">
                Hello, <span className="font-semibold">{firstName || "there"}</span>
              </span>
              <span className="text-2xs font-medium text-muted-foreground">{roleLabel(djangoUser)}</span>
            </span>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64" sideOffset={8}>
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-semibold text-foreground">{name || "Signed in"}</p>
            {djangoUser?.email && <p className="truncate text-xs text-muted-foreground">{djangoUser.email}</p>}
            <span className="status-pill status-pill-brand mt-2">{roleLabel(djangoUser)}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/resources" className="cursor-pointer">
              <LifeBuoy className="h-4 w-4" />
              Help and resources
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => void logout()} className="cursor-pointer">
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Find a page — replaces the old app launcher grid */}
      <div className="mx-auto hidden w-full max-w-md md:block">
        <button
          type="button"
          onClick={() => setFinderOpen(true)}
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/40"
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 truncate text-left">Find a page…</span>
          <kbd className="hidden rounded border border-border bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground lg:inline">
            Ctrl K
          </kbd>
        </button>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setFinderOpen(true)}
          aria-label="Find a page"
        >
          <Search className="h-5 w-5" />
        </Button>

        <Button asChild variant="secondary" className="hidden sm:inline-flex" title="Help and resources">
          <Link href="/resources">
            <LifeBuoy className="h-4 w-4" aria-hidden="true" />
            <span className="hidden lg:inline">Help</span>
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon" className="sm:hidden" aria-label="Help and resources">
          <Link href="/resources">
            <LifeBuoy className="h-5 w-5" />
          </Link>
        </Button>

        {/* Organisation badge — a static label, not a switcher */}
        {orgName && (
          <div
            className="flex h-9 max-w-56 items-center gap-2 rounded-lg bg-primary pr-3 pl-1.5 text-primary-foreground"
            title={orgName}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-card text-primary">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="hidden truncate text-[13px] font-medium lg:block">{orgName}</span>
          </div>
        )}
      </div>

      <CommandDialog
        open={finderOpen}
        onOpenChange={setFinderOpen}
        title="Find a page"
        description="Type to search for a page, then press Enter to open it."
      >
        <CommandInput placeholder="e.g. reports, data entry, users" />
        <CommandList>
          <CommandEmpty>No page matches that. Try another word.</CommandEmpty>
          {NAV_GROUP_ORDER.map((group) => {
            const groupItems = items.filter((item) => item.group === group);
            if (groupItems.length === 0) return null;
            return (
              <CommandGroup key={group} heading={NAV_GROUP_LABELS[group]}>
                {groupItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.href}
                      value={`${item.label} ${item.description ?? ""}`}
                      onSelect={() => {
                        setFinderOpen(false);
                        router.push(item.href);
                      }}
                    >
                      <Icon className="text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        {item.description && <p className="truncate text-xs text-muted-foreground">{item.description}</p>}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>
    </header>
  );
}
