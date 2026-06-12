"use client";

import React, { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Loader2 } from "lucide-react";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  // Load and apply the theme from localStorage on initial render
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("xeno_theme") || "dark";
      document.documentElement.setAttribute("data-theme", storedTheme);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-zinc-500">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-violet-500" />
          <p className="text-sm font-medium tracking-wide">Securing connection...</p>
        </div>
      </div>
    );
  }

  if (isAuthPage) {
    return <main className="w-full min-h-screen bg-[#0a0a0f]">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen">{children}</main>
    </div>
  );
}
