"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Database,
  Users,
  Settings,
  Grid,
  Bell,
  Mail,
  Circle,
  Search,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type AppItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: "Top apps" | "All apps";
};

const APPS: AppItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Top apps" },
  { label: "Data Entry", href: "/data-entry", icon: FileText, group: "Top apps" },
  { label: "Design Reports", href: "/design-reports", icon: FileText, group: "Top apps" },
  { label: "Settings", href: "/settings", icon: Settings, group: "All apps" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, group: "Top apps" },
  { label: "Organizations", href: "/organizations", icon: Database, group: "All apps" },
  { label: "Users", href: "/users", icon: Users, group: "All apps" },
  { label: "Settings", href: "/settings", icon: Settings, group: "All apps" },
];

export default function Header() {
  const { djangoUser, logout } = useAuth();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return APPS;
    return APPS.filter((a) => a.label.toLowerCase().includes(query));
  }, [q]);

  return (
    <header className="w-full bg-blue-900 text-white shadow">
      {/* Top row */}
      <div className="h-12 flex items-center justify-between px-3 sm:px-4 lg:px-6">
        {/* Left: brand + current app title (kept neutral so it works across pages) */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
            <span className="text-blue-900 font-bold text-sm">NMC</span>
          </div>
          <h1 className="text-sm sm:text-base font-semibold tracking-tight">
            Nursing and Midwifery Council - Ghana
          </h1>
        </div>

        {/* Right: status, mail, notifications, app launcher, profile */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Online status */}
          <div className="hidden sm:flex items-center gap-2 text-xs sm:text-sm mr-1">
            <Circle className="h-2 w-2 fill-green-400 text-green-400" />
            <span className="opacity-90">Online</span>
          </div>

          <Button variant="ghost" size="icon" className="text-white/90 hover:bg-blue-800">
            <Mail className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white/90 hover:bg-blue-800">
            <Bell className="h-5 w-5" />
          </Button>

          {/* App Launcher (Dashboard icon → dropdown like DHIS2) */}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white/90 hover:bg-blue-800">
                <Grid className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[680px] p-0 shadow-2xl">
              {/* Search bar */}
              <div className="p-3 border-b flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search apps"
                  className="h-9"
                />
              </div>

              {/* Content area: grid of “Top apps” and scrollable list */}
              <div className="grid grid-cols-12 gap-0">
                {/* Left: Top apps grid */}
                <div className="col-span-5 p-3 border-r">
                  <div className="text-xs font-medium text-gray-600 mb-2">Top apps</div>
                  <div className="grid grid-cols-2 gap-3">
                    {filtered
                      .filter((a) => a.group === "Top apps")
                      .slice(0, 8)
                      .map((a) => (
                        <Link
                          key={a.href}
                          href={a.href}
                          onClick={() => setOpen(false)}
                          className="group border rounded-md p-3 hover:bg-gray-50"
                        >
                          <div className="w-10 h-10 rounded bg-blue-50 text-blue-700 flex items-center justify-center mb-2">
                            <a.icon className="h-5 w-5" />
                          </div>
                          <div className="text-sm font-medium text-gray-900">{a.label}</div>
                        </Link>
                      ))}
                  </div>
                </div>

                {/* Right: All apps list */}
                <div className="col-span-7 p-3 max-h-[380px] overflow-auto">
                  <div className="text-xs font-medium text-gray-600 mb-2">Apps</div>
                  <div className="divide-y rounded border">
                    {filtered.map((a) => (
                      <Link
                        key={a.href}
                        href={a.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 hover:bg-gray-50 ${
                          pathname.startsWith(a.href) ? "bg-blue-50" : ""
                        }`}
                      >
                        <a.icon className="h-4 w-4 text-gray-700" />
                        <span className="text-sm text-gray-900">{a.label}</span>
                      </Link>
                    ))}
                  </div>
                  {/* Footer hint row (keyboard hints like DHIS2) */}
                  <div className="text-[11px] text-gray-500 mt-3 border-t pt-2">
                    Use ↑/↓ to navigate, Enter to select, Esc to close
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Profile menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 rounded-full ring-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt={djangoUser?.full_name} />
                  <AvatarFallback className="bg-blue-800 text-white">
                    {djangoUser?.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs">Signed in</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
