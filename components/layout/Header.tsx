"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useMemo, useState } from "react";
import { Grid, Search, LogOut, ChevronRight, Sparkles, Menu, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { NAV_ITEMS, type NavItem } from "./navConfig";

export default function Header({
  sidebarOpen,
  onToggleSidebar,
}: {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}) {
  const { djangoUser, logout } = useAuth();
  const pathname = usePathname();

  const [appsOpen, setAppsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const isStaff = Boolean(djangoUser?.is_staff ?? (djangoUser as unknown as { is_staff?: boolean })?.is_staff);
  const isSuperuser = Boolean(djangoUser?.is_superuser ?? (djangoUser as unknown as { is_superuser?: boolean })?.is_superuser);
  const visibleApps: NavItem[] = useMemo(
    () => NAV_ITEMS.filter((app) => !app.staffOnly || isStaff || isSuperuser),
    [isStaff, isSuperuser]
  );

  const filteredApps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return visibleApps;
    return visibleApps.filter((app) =>
      app.label.toLowerCase().includes(query) ||
      app.description?.toLowerCase().includes(query)
    );
  }, [searchQuery, visibleApps]);

  const topApps = filteredApps.filter((app) => app.group === "Top apps").slice(0, 6);

  const getUserInitials = () => {
    if (!djangoUser?.full_name) return "U";
    const names = djangoUser.full_name.split(" ");
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
    }
    return djangoUser.full_name.charAt(0).toUpperCase();
  };

  return (
    <header className="w-full text-white shadow-lg" style={{ background: "linear-gradient(135deg, #8B3020 0%, #C9433B 40%, #D96455 100%)" }}>
      {/* Thin top accent */}
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.35), rgba(255,255,255,0.1), rgba(255,255,255,0.35))" }} />

      {/* Main header row */}
      <div className="h-[68px] flex items-center justify-between px-4 lg:px-6">
        {/* Left: Logo, Title and menu toggle */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-white focus-visible:outline-none transition-colors flex-shrink-0"
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {/* Logo — white pill to properly frame landscape dual-crest image */}
          <Link href="/dashboard" className="flex-shrink-0 flex items-center gap-3">
            <div
              className="bg-white rounded-lg shadow-md flex items-center justify-center px-3"
              style={{ height: "44px" }}
            >
              <Image
                src="/logo.png"
                alt="Ministry of Health & NMC Ghana"
                width={112}
                height={36}
                className="object-contain"
                style={{ height: "34px", width: "auto" }}
                priority
              />
            </div>
            <div className="hidden sm:flex flex-col justify-center">
              <h1 className="text-sm font-bold text-white leading-tight tracking-tight">
                Nursing &amp; Midwifery Council
              </h1>
              <p className="text-[10px] text-white/60 leading-tight font-medium tracking-[0.12em] uppercase mt-0.5">
                IMEMS &mdash; Republic of Ghana
              </p>
            </div>
          </Link>

          {/* Divider */}
          <Separator orientation="vertical" className="h-7 bg-white/20 hidden lg:block mx-1" />

          {/* Online status — green dot */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15">
            <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Online</span>
          </div>
        </div>

        {/* Right: Actions and user */}
        <div className="flex items-center gap-1">
          {/* App Launcher */}
          <Popover open={appsOpen} onOpenChange={setAppsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:bg-white/15 hover:text-white transition-all rounded-lg h-9 w-9"
                title="App launcher"
              >
                <Grid className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[680px] max-h-[90vh] overflow-hidden p-0 shadow-2xl border border-gray-200 rounded-xl"
              sideOffset={8}
            >
              {/* Search header */}
              <div className="p-4 border-b" style={{ background: "linear-gradient(135deg, #C9433B, #D96455)" }}>
                <p className="text-xs font-semibold text-white/70 mb-2 uppercase tracking-wide">Applications</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search applications..."
                    className="pl-10 h-10 bg-white border-gray-200 focus-visible:ring-red-500"
                  />
                </div>
              </div>

              {/* Apps grid */}
              <div className="p-4 max-h-[65vh] overflow-y-auto">
                {filteredApps.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No apps found matching &ldquo;{searchQuery}&rdquo;</p>
                  </div>
                ) : (
                  <>
                    {topApps.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="h-4 w-4 text-[#D96455]" />
                          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Featured Apps</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {topApps.map((app) => (
                            <Link
                              key={app.href}
                              href={app.href}
                              onClick={() => { setAppsOpen(false); setSearchQuery(""); }}
                              className={`group relative border rounded-lg p-4 transition-all hover:shadow-md ${
                                pathname.startsWith(app.href)
                                  ? "bg-[#FFF5F3] border-[#F4A99E] shadow-sm"
                                  : "bg-white hover:bg-[#FFF5F3] border-gray-200"
                              }`}
                            >
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                                pathname.startsWith(app.href)
                                  ? "bg-[#FCC6BB] text-[#C9433B]"
                                  : "bg-gray-100 text-gray-700 group-hover:bg-[#FCC6BB] group-hover:text-[#C9433B]"
                              }`}>
                                <app.icon className="h-6 w-6" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-semibold text-gray-900">{app.label}</span>
                                  {app.badge && (
                                    <Badge className="text-[10px] px-1.5 py-0 h-4 bg-[#D96455] hover:bg-[#D96455]">{app.badge}</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2">{app.description}</p>
                              </div>
                              {pathname.startsWith(app.href) && (
                                <div className="absolute top-2 right-2">
                                  <div className="h-2 w-2 rounded-full bg-red-600" />
                                </div>
                              )}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Grid className="h-4 w-4 text-gray-500" />
                        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">All Applications</h3>
                      </div>
                      <div className="border rounded-lg divide-y bg-white max-h-[320px] overflow-y-auto">
                        {filteredApps.map((app) => (
                          <Link
                            key={app.href}
                            href={app.href}
                            onClick={() => { setAppsOpen(false); setSearchQuery(""); }}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors group ${
                              pathname.startsWith(app.href) ? "bg-[#FFF5F3]" : "hover:bg-gray-50"
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              pathname.startsWith(app.href)
                                ? "bg-[#FCC6BB] text-[#C9433B]"
                                : "bg-gray-100 text-gray-600 group-hover:bg-[#FFF5F3] group-hover:text-[#D96455]"
                            }`}>
                              <app.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${pathname.startsWith(app.href) ? "text-[#C9433B]" : "text-gray-900"}`}>
                                  {app.label}
                                </span>
                                {app.badge && (
                                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-[#D96455] hover:bg-[#D96455]">{app.badge}</Badge>
                                )}
                              </div>
                              {app.description && (
                                <p className="text-xs text-gray-500 truncate">{app.description}</p>
                              )}
                            </div>
                            <ChevronRight className={`h-4 w-4 flex-shrink-0 ${pathname.startsWith(app.href) ? "text-[#D96455]" : "text-gray-400"}`} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="px-4 py-3 bg-gray-50 border-t">
                <p className="text-[11px] text-gray-500 text-center">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-white border text-gray-700">Esc</kbd> to close
                </p>
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-6 bg-white/20" />

          {/* Profile menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ml-1">
                <Avatar className="h-8 w-8 ring-2 ring-white/30">
                  <AvatarImage src="" alt={djangoUser?.full_name} />
                  <AvatarFallback className="text-white text-xs font-bold" style={{ background: "linear-gradient(135deg, #C9433B, #E8877A)" }}>
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col text-left">
                  <p className="text-xs font-semibold leading-tight text-white">
                    {djangoUser?.full_name || "User"}
                  </p>
                  <p className="text-[10px] text-white/55 leading-tight mt-0.5">
                    {isSuperuser ? "Superuser" : isStaff ? "Administrator" : djangoUser?.org_unit_name || "Staff"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64" sideOffset={8}>
              <DropdownMenuLabel className="pb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" alt={djangoUser?.full_name} />
                    <AvatarFallback className="text-white font-bold" style={{ background: "linear-gradient(135deg, #C9433B, #E8877A)" }}>
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{djangoUser?.full_name || "User"}</p>
                    <p className="text-xs text-gray-500 truncate">{djangoUser?.email || "No email"}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2 text-gray-500" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                className="cursor-pointer text-[#D96455] focus:text-[#D96455] focus:bg-[#FFF5F3]"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
