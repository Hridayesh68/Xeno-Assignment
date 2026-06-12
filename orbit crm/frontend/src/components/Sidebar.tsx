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
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col bg-base-200 border-r border-base-content/10 transition-colors duration-200">
      
      {/* Logo */}
      <div className="px-6 py-6 border-b border-base-content/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary">
            <Zap size={16} className="text-primary-content" />
          </div>
          <div>
            <span className="font-bold text-base-content text-lg tracking-tight">Xeno</span>
            <span className="block text-xs text-base-content/60 -mt-0.5">AI CRM Platform</span>
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
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border border-transparent",
                active
                  ? "bg-primary/15 text-primary border-primary/25 font-semibold"
                  : "text-base-content/70 hover:text-base-content hover:bg-base-content/5"
              )}
            >
              <Icon size={18} className={active ? "text-primary" : "text-base-content/60"} />
              {label}
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme Switcher */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-base-content/70 text-xs font-semibold bg-base-300 border border-base-content/5">
          <Palette size={14} className="text-primary shrink-0" />
          <span className="flex-1 text-[11px]">Theme</span>
          <select 
            value={theme} 
            onChange={(e) => handleThemeChange(e.target.value)}
            className="bg-transparent text-base-content outline-none border-none cursor-pointer text-xs font-medium max-w-[110px]"
          >
            <option value="dark" className="bg-base-200 text-base-content">Midnight</option>
            <option value="light" className="bg-base-200 text-base-content">Clean Light</option>
            <option value="luxury" className="bg-base-200 text-base-content">Luxury Gold</option>
            <option value="night" className="bg-base-200 text-base-content">Neon Night</option>
            <option value="synthwave" className="bg-base-200 text-base-content">Synthwave</option>
            <option value="retro" className="bg-base-200 text-base-content">Amber Retro</option>
            <option value="emerald" className="bg-base-200 text-base-content">Emerald</option>
            <option value="cyberpunk" className="bg-base-200 text-base-content">Cyberpunk</option>
          </select>
        </div>
      </div>

      {/* User profile info & Logout */}
      {user && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-base-300 border border-base-content/5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-primary-content bg-primary shrink-0">
              {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-base-content truncate">{user.name || "Marketer"}</p>
              <p className="text-[10px] text-base-content/60 truncate">{user.email}</p>
            </div>
            <button 
              onClick={logout}
              className="p-1.5 rounded-lg text-base-content/50 hover:text-error hover:bg-error/10 transition-colors shrink-0"
              title="Log Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}

      {/* AI Badge */}
      <div className="px-4 pb-6">
        <div className="rounded-xl p-3 text-center bg-secondary/10 border border-secondary/25">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Sparkles size={13} className="text-secondary" />
            <span className="text-xs font-semibold text-secondary">AI-Native</span>
          </div>
          <p className="text-xs text-base-content/60 leading-snug">Gemini & Groq powered segmentation, messaging & insights</p>
        </div>
      </div>
    </aside>
  );
}
