"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { djangoUser: user, supabaseUser, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && user && supabaseUser) {
        const needsPassword = supabaseUser.user_metadata?.password_set === false;
        if (needsPassword) {
          router.replace("/auth/welcome");
        } else {
          router.replace("/dashboard");
        }
      } else {
        router.replace("/auth/login");
      }
    }
  }, [isAuthenticated, user, supabaseUser, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Loading...</p>
    </div>
  );
}
