"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Filter,
  Megaphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/segments", label: "Segments", icon: Filter },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/chat", label: "AI Copilot", icon: Sparkles },
];

export default function Sidebar() {
  const pathname = usePathname();

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
      <nav className="flex-1 px-3 py-4 space-y-1">
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

      {/* AI Badge */}
      <div className="px-4 pb-6">
        <div className="rounded-xl p-3 text-center"
          style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Sparkles size={13} className="text-violet-400" />
            <span className="text-xs font-semibold text-violet-300">AI-Native</span>
          </div>
          <p className="text-xs text-zinc-500">GPT-4o powered segmentation, messaging & insights</p>
        </div>
      </div>
    </aside>
  );
}
