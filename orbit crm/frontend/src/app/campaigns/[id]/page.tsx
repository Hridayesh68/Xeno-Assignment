"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Play, Loader2, Sparkles, Users, MessageSquare,
  CheckCircle2, XCircle, Clock, Eye, MousePointerClick, TrendingUp
} from "lucide-react";
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
} from "recharts";
import {
  getCampaign, getCampaignStats, getCampaignCommunications, sendCampaign,
  aiCampaignInsight, Campaign, CampaignStats, Communication, CampaignInsightResponse
} from "@/lib/api";
import { formatDateTime, formatPercent, CHANNEL_ICONS, STATUS_COLORS } from "@/lib/utils";

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center p-4 rounded-xl"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

const COMM_STATUS_ICON: Record<string, React.ReactNode> = {
  delivered: <CheckCircle2 size={13} className="text-emerald-400" />,
  failed: <XCircle size={13} className="text-red-400" />,
  opened: <Eye size={13} className="text-blue-400" />,
  clicked: <MousePointerClick size={13} className="text-violet-400" />,
  sent: <Clock size={13} className="text-zinc-500" />,
  pending: <Clock size={13} className="text-zinc-700" />,
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [comms, setComms] = useState<Communication[]>([]);
  const [insight, setInsight] = useState<CampaignInsightResponse | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [camp, st, cms] = await Promise.all([
        getCampaign(id),
        getCampaignStats(id),
        getCampaignCommunications(id),
      ]);
      setCampaign(camp);
      setStats(st);
      setComms(cms);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // Poll if running
  useEffect(() => {
    if (campaign?.status !== "running") return;
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [campaign?.status]);

  const handleSend = async () => {
    setSending(true);
    try {
      await sendCampaign(id);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const loadInsight = async () => {
    if (!stats || stats.total_sent === 0) return;
    setInsightLoading(true);
    try {
      const res = await aiCampaignInsight(id);
      setInsight(res);
    } catch (e) {
      console.error(e);
    } finally {
      setInsightLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 shimmer rounded mb-8" />
        <div className="grid grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-24 shimmer rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!campaign) return <div className="p-8 text-zinc-500">Campaign not found.</div>;

  const statusColor = STATUS_COLORS[campaign.status] || "bg-zinc-700 text-zinc-300";

  // Pie chart data
  const pieData = stats ? [
    { name: "Delivered", value: stats.total_delivered, color: "#10b981" },
    { name: "Opened", value: stats.total_opened, color: "#3b82f6" },
    { name: "Clicked", value: stats.total_clicked, color: "#8b5cf6" },
    { name: "Failed", value: stats.total_failed, color: "#ef4444" },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="p-8 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl">{CHANNEL_ICONS[campaign.channel]}</span>
            <h1 className="text-3xl font-bold text-white">{campaign.name}</h1>
            <span className={`badge ${statusColor}`}>
              {campaign.status === "running" && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 pulse mr-1.5 inline-block" />
              )}
              {campaign.status}
            </span>
          </div>
          <p className="text-zinc-500 mt-1">
            {campaign.channel.toUpperCase()} · {campaign.ai_generated_message && "🤖 AI message · "}
            Created {formatDateTime(campaign.created_at)}
          </p>
        </div>
        {campaign.status === "draft" && (
          <button onClick={handleSend} disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Launch Campaign
          </button>
        )}
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          <StatPill label="Total Sent" value={stats.total_sent.toLocaleString()} color="text-white" />
          <StatPill label="Delivered" value={`${stats.total_delivered} (${formatPercent(stats.delivery_rate)})`} color="text-emerald-400" />
          <StatPill label="Opened" value={`${stats.total_opened} (${formatPercent(stats.open_rate)})`} color="text-blue-400" />
          <StatPill label="Clicked" value={`${stats.total_clicked} (${formatPercent(stats.click_rate)})`} color="text-violet-400" />
          <StatPill label="Failed" value={stats.total_failed} color="text-red-400" />
        </div>
      )}

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Chart */}
        <div className="glass-card p-5 col-span-1">
          <h3 className="font-semibold text-white text-sm mb-4">Delivery Breakdown</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1a1a26", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}
                    labelStyle={{ color: "#e2e2e8" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-zinc-400">{d.name}</span>
                    </div>
                    <span className="text-white font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
              No data yet — launch the campaign first
            </div>
          )}
        </div>

        {/* Message Preview + AI Insight */}
        <div className="col-span-2 space-y-5">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={14} className="text-zinc-500" />
              <h3 className="font-semibold text-white text-sm">Message Template</h3>
              {campaign.ai_generated_message && (
                <span className="badge" style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>
                  AI-drafted
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-300 p-3 rounded-xl leading-relaxed"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {campaign.message_template}
            </p>
          </div>

          {/* AI Insight */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-violet-400" />
                <h3 className="font-semibold text-white text-sm">AI Campaign Insight</h3>
              </div>
              {!insight && stats && stats.total_sent > 0 && (
                <button onClick={loadInsight} disabled={insightLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-300 hover:text-white transition-colors disabled:opacity-50"
                  style={{ background: "rgba(139,92,246,0.1)" }}>
                  {insightLoading ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                  Analyse
                </button>
              )}
            </div>
            {insight ? (
              <div className="space-y-3">
                <p className="text-sm text-zinc-300">{insight.summary}</p>
                <div>
                  <p className="text-xs text-zinc-600 mb-1.5">Highlights</p>
                  {insight.highlights.map((h, i) => (
                    <p key={i} className="text-xs text-zinc-400 mb-1">✅ {h}</p>
                  ))}
                </div>
                <div>
                  <p className="text-xs text-zinc-600 mb-1.5">Suggestions</p>
                  {insight.suggestions.map((s, i) => (
                    <p key={i} className="text-xs text-zinc-400 mb-1">💡 {s}</p>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-600">
                {stats?.total_sent === 0
                  ? "Launch the campaign to get AI insights after it completes."
                  : "Click 'Analyse' to generate AI-powered performance insights."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Communication Log */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <Users size={14} className="text-zinc-500" />
            <h3 className="font-semibold text-white text-sm">
              Communication Log ({comms.length.toLocaleString()})
            </h3>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {["Customer", "Message (preview)", "Status", "Sent", "Delivered", "Opened"].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comms.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-zinc-600">
                  No messages sent yet
                </td>
              </tr>
            ) : comms.slice(0, 50).map(c => (
              <tr key={c.id}
                className="hover:bg-white/[0.02] transition-colors"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td className="px-5 py-3 text-sm text-zinc-300">{c.customer_id.slice(0, 8)}…</td>
                <td className="px-5 py-3 text-xs text-zinc-500 max-w-[200px] truncate">
                  {c.message.slice(0, 60)}…
                </td>
                <td className="px-5 py-3">
                  <span className="flex items-center gap-1.5 text-xs">
                    {COMM_STATUS_ICON[c.status]}
                    <span className={`${STATUS_COLORS[c.status]} badge`}>{c.status}</span>
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-zinc-500">{formatDateTime(c.sent_at)}</td>
                <td className="px-5 py-3 text-xs text-zinc-500">{formatDateTime(c.delivered_at)}</td>
                <td className="px-5 py-3 text-xs text-zinc-500">{formatDateTime(c.opened_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {comms.length > 50 && (
          <div className="px-5 py-3 text-xs text-zinc-600 text-center"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            Showing first 50 of {comms.length.toLocaleString()} communications
          </div>
        )}
      </div>
    </div>
  );
}
