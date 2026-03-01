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
        "flex flex-col border-r border-[#7A2818] transition-all duration-200 ease-in-out h-full",
        open ? "w-60" : "w-16"
      )}
      style={{ background: "linear-gradient(180deg, #8B3020 0%, #861e1e 100%)" }}
    >
      <nav className="flex-1 flex flex-col pt-3 px-2 pb-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              title={!open ? item.label : undefined}
              className={cn(
                "group flex items-center rounded-lg px-2 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-[#C9433B] text-white shadow-sm border border-[#D96455]/40"
                  : "text-red-200 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "flex-shrink-0 h-5 w-5 transition-colors",
                  open ? "mr-3" : "mx-auto",
                  isActive ? "text-red-300" : "text-red-400 group-hover:text-red-200"
                )}
                aria-hidden="true"
              />
              {open && (
                <span className="truncate leading-none">{item.label}</span>
              )}
              {open && isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer branding */}
      {open && (
        <div className="px-3 py-3 border-t border-[#7A2818]">
          <p className="text-[10px] text-red-500 text-center leading-relaxed">
            NMC Ghana &copy; {new Date().getFullYear()}
          </p>
        </div>
      )}
    </aside>
  );
}
