"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Filter,
  Megaphone,
  Sparkles,
  Zap,
  Shield,
  LogOut,
  Palette
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/segments", label: "Segments", icon: Filter },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/users", label: "Users", icon: Shield },
  { href: "/chat", label: "AI Copilot", icon: Sparkles },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("xeno_theme") || "dark";
      setTheme(storedTheme);
    }
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("xeno_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col"
      style={{ background: "#0d0d16", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
      
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-lg tracking-tight">Xeno</span>
            <span className="block text-xs text-zinc-500 -mt-0.5">AI CRM Platform</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              )}
              style={active ? {
                background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,70,229,0.15))",
                border: "1px solid rgba(124,58,237,0.3)",
              } : {}}
            >
              <Icon size={18} className={active ? "text-violet-400" : ""} />
              {label}
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme Switcher */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-500 text-xs font-semibold"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <Palette size={14} className="text-violet-400 shrink-0" />
          <span className="flex-1 text-[11px]">Theme</span>
          <select 
            value={theme} 
            onChange={(e) => handleThemeChange(e.target.value)}
            className="bg-transparent text-white outline-none border-none cursor-pointer text-xs font-medium max-w-[110px]"
          >
            <option value="dark" className="bg-[#0d0d16]">Midnight</option>
            <option value="light" className="bg-[#0d0d16]">Clean Light</option>
            <option value="luxury" className="bg-[#0d0d16]">Luxury Gold</option>
            <option value="night" className="bg-[#0d0d16]">Neon Night</option>
            <option value="synthwave" className="bg-[#0d0d16]">Synthwave</option>
            <option value="retro" className="bg-[#0d0d16]">Amber Retro</option>
            <option value="emerald" className="bg-[#0d0d16]">Emerald</option>
            <option value="cyberpunk" className="bg-[#0d0d16]">Cyberpunk</option>
          </select>
        </div>
      </div>

      {/* User profile info & Logout */}
      {user && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 p-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white bg-violet-600 shrink-0">
              {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name || "Marketer"}</p>
              <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
            </div>
            <button 
              onClick={logout}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-colors shrink-0"
              title="Log Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}

      {/* AI Badge */}
      <div className="px-4 pb-6">
        <div className="rounded-xl p-3 text-center"
          style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Sparkles size={13} className="text-violet-400" />
            <span className="text-xs font-semibold text-violet-300">AI-Native</span>
          </div>
          <p className="text-xs text-zinc-500 leading-snug">Gemini & Groq powered segmentation, messaging & insights</p>
        </div>
      </div>
    </aside>
  );
}
