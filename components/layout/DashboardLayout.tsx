"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import Header from "./Header";
import Sidebar from "./Sidebar";

const SIDEBAR_KEY = "nmc_sidebar_open";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const pathname = usePathname();

  // Restore the remembered collapse state
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_KEY);
      if (stored !== null) setSidebarOpen(stored === "true");
    } catch {
      // storage blocked — keep the default
    }
  }, []);

  // Close the mobile drawer whenever the page changes
  React.useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleToggleSidebar = React.useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  return (
    // `relative` on the shell and on <main> keeps absolutely positioned children (sr-only labels,
    // markers, popover helpers) inside the scroll area, so they can't stretch the window and
    // scroll the whole app off screen.
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Fixed sidebar from tablet width up; below that the same menu slides out */}
      <div className="hidden md:flex" data-app-chrome>
        <Sidebar open={sidebarOpen} onToggle={handleToggleSidebar} />
      </div>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-64 max-w-[85vw] gap-0 border-0 p-0">
          <SheetTitle className="sr-only">Main menu</SheetTitle>
          <Sidebar open variant="drawer" onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div data-app-chrome>
          <Header onOpenMenu={() => setMenuOpen(true)} />
        </div>
        <main id="main-content" className="canvas-dots scrollbar-thin relative min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6 sm:py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
