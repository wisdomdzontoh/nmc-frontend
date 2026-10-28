"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageLoader } from "@/components/ui/PageLoader";

export default function Home() {
  const { djangoUser: user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && user) {
        router.replace("/dashboard");
      } else {
        router.replace("/auth/login");
      }
    }
  }, [isAuthenticated, user, loading, router]);

  return <PageLoader message="Loading…" />;
}
