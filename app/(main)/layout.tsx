"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageLoader } from "@/components/ui/PageLoader";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { djangoUser: user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <PageLoader message="Authenticating…" />;
  }

  if (!isAuthenticated || !user) {
    return <PageLoader message="Redirecting…" />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
