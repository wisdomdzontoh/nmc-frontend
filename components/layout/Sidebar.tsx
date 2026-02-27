"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { NAV_ITEMS, type NavItem } from "./navConfig";

export default function Sidebar({ open }: { open: boolean }) {
  const pathname = usePathname();
  const { djangoUser } = useAuth();

  const isStaff = Boolean(djangoUser?.is_staff);
  const isSuperuser = Boolean(djangoUser?.is_superuser);

  const visibleNav: NavItem[] = NAV_ITEMS.filter(
    (item) => !item.staffOnly || isStaff || isSuperuser
  );

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col bg-slate-900 border-r border-slate-800 transition-all duration-200 ease-in-out",
        open ? "w-64" : "w-16"
      )}
    >
      <nav className="flex-1 flex flex-col pt-4 px-2 pb-4 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-2 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors",
                isActive && "bg-slate-800 text-white border border-slate-700"
              )}
            >
              <Icon
                className={cn(
                  "flex-shrink-0 h-5 w-5",
                  open ? "mr-3" : "mx-auto",
                  isActive ? "text-amber-400" : "text-slate-400 group-hover:text-slate-200"
                )}
                aria-hidden="true"
              />
              {open && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
