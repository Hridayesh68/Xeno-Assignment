"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import {
  Users, ShoppingBag, Megaphone, TrendingUp,
  ArrowUpRight, Sparkles, Activity, CheckCircle2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { getDashboard, DashboardStats, Campaign } from "@/lib/api";
import { formatCurrency, formatPercent, formatDate, CHANNEL_ICONS, STATUS_COLORS, cn } from "@/lib/utils";

const CHART_DATA = [
  { day: "Mon", sent: 1200, delivered: 1100, opened: 480 },
  { day: "Tue", sent: 890, delivered: 820, opened: 310 },
  { day: "Wed", sent: 2100, delivered: 1960, opened: 890 },
  { day: "Thu", sent: 1450, delivered: 1380, opened: 620 },
  { day: "Fri", sent: 3200, delivered: 2950, opened: 1400 },
  { day: "Sat", sent: 780, delivered: 720, opened: 280 },
  { day: "Sun", sent: 450, delivered: 420, opened: 160 },
];

function StatCard({
  label, value, sub, icon: Icon, color, trend
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  trend?: string;
}) {
  return (
    <div className="glass-card stat-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        {trend && (
          <span className="flex items-center gap-0.5 text-xs text-emerald-400 font-medium">
            <ArrowUpRight size={12} />
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-sm text-zinc-500">{label}</p>
      {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const deliveryRate = campaign.total_sent > 0
    ? campaign.total_delivered / campaign.total_sent : 0;
  const statusColor = STATUS_COLORS[campaign.status] || "bg-zinc-700 text-zinc-300";

  return (
    <Link href={`/campaigns/${campaign.id}`}
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
        style={{ background: "rgba(139,92,246,0.1)" }}>
        {CHANNEL_ICONS[campaign.channel] || "📢"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate group-hover:text-violet-300 transition-colors">
          {campaign.name}
        </p>
        <p className="text-xs text-zinc-500">{formatDate(campaign.created_at)}</p>
      </div>
      <div className="text-right">
        <span className={`badge ${statusColor}`}>{campaign.status}</span>
        {campaign.total_sent > 0 && (
          <p className="text-xs text-zinc-500 mt-1">
            {formatPercent(deliveryRate)} delivered
          </p>
        )}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getDashboard();
      setStats(data);
      setError(null);
    } catch (e) {
      setError("Could not connect to backend. Make sure the API is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Good {new Date().getHours() < 12 ? "morning" : "afternoon"} 👋
          </h1>
          <p className="text-zinc-500 mt-1">Here's what's happening with your campaigns today.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadStats}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link href="/campaigns/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
            <Megaphone size={14} />
            New Campaign
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl text-amber-300 text-sm"
          style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="glass-card p-5 h-[140px] shimmer" />
          ))
        ) : (
          <>
            <StatCard
              label="Total Customers"
              value={stats?.total_customers?.toLocaleString() || "0"}
              icon={Users}
              color="bg-violet-600"
              trend="+12%"
            />
            <StatCard
              label="Total Orders"
              value={stats?.total_orders?.toLocaleString() || "0"}
              icon={ShoppingBag}
              color="bg-blue-600"
              trend="+8%"
            />
            <StatCard
              label="Total Revenue"
              value={formatCurrency(stats?.total_revenue || 0)}
              icon={TrendingUp}
              color="bg-emerald-600"
              trend="+23%"
            />
            <StatCard
              label="Campaigns"
              value={stats?.total_campaigns?.toLocaleString() || "0"}
              sub={`${stats?.active_campaigns || 0} running now`}
              icon={Megaphone}
              color="bg-rose-600"
            />
          </>
        )}
      </div>

      {/* AI Performance Insight */}
      {stats && (
        <div className="mb-8 p-4 rounded-xl flex items-start gap-3"
          style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
          <Sparkles size={18} className="text-violet-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-violet-300 mb-1">AI Performance Insight</p>
            <p className="text-sm text-zinc-400">
              Your average delivery rate is{" "}
              <span className="text-white font-medium">{formatPercent(stats.avg_delivery_rate)}</span>{" "}
              and open rate is{" "}
              <span className="text-white font-medium">{formatPercent(stats.avg_open_rate)}</span>.{" "}
              {stats.avg_open_rate > 0.25
                ? "Your engagement is above industry average — great messaging! 🎉"
                : "Try personalising messages with customer name and purchase history to boost opens."}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Chart */}
        <div className="col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-white">Weekly Campaign Activity</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Messages sent, delivered, opened</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-zinc-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-violet-500" />Sent
              </span>
              <span className="flex items-center gap-1.5 text-zinc-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Delivered
              </span>
              <span className="flex items-center gap-1.5 text-zinc-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />Opened
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={CHART_DATA}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="delivGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#1a1a26", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}
                labelStyle={{ color: "#e2e2e8" }}
              />
              <Area type="monotone" dataKey="sent" stroke="#7c3aed" fill="url(#sentGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="delivered" stroke="#10b981" fill="url(#delivGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="opened" stroke="#3b82f6" fill="url(#openGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Campaigns */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Recent Campaigns</h2>
            <Link href="/campaigns" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="space-y-1">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-14 rounded-xl shimmer" />
              ))
            ) : stats?.recent_campaigns?.length === 0 ? (
              <div className="text-center py-8">
                <Activity size={32} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">No campaigns yet</p>
                <Link href="/campaigns/new" className="text-xs text-violet-400 hover:underline mt-1 block">
                  Create your first →
                </Link>
              </div>
            ) : (
              stats?.recent_campaigns?.map(c => (
                <CampaignRow key={c.id} campaign={c} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          { label: "Create Segment", desc: "Build an audience with AI or filters", href: "/segments/new", icon: "🎯" },
          { label: "Launch Campaign", desc: "Send personalised messages at scale", href: "/campaigns/new", icon: "🚀" },
          { label: "View Customers", desc: "Browse and search your shopper base", href: "/customers", icon: "👥" },
        ].map(({ label, desc, href, icon }) => (
          <Link key={href} href={href}
            className="glass-card p-4 hover:border-violet-500/40 transition-all duration-200 hover:-translate-y-0.5 group"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <span className="text-2xl mb-3 block">{icon}</span>
            <p className="font-medium text-white text-sm group-hover:text-violet-300 transition-colors">{label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
