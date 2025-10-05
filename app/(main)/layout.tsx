"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { djangoUser: user, supabaseUser, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && isAuthenticated && user && supabaseUser) {
      const needsPassword = supabaseUser.user_metadata?.password_set === false;
      if (needsPassword && pathname !== "/auth/welcome") {
        router.replace("/auth/welcome");
      }
    }
  }, [isAuthenticated, user, supabaseUser, loading, router, pathname]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  // Only allow access if password_set is true or not present, or if on /auth/welcome
  const needsPassword = supabaseUser?.user_metadata?.password_set === false;
  if (needsPassword && pathname !== "/auth/welcome") {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
