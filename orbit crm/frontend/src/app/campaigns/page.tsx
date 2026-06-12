"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Megaphone, Play, CheckCircle2, Clock, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { getCampaigns, sendCampaign, deleteCampaign, Campaign } from "@/lib/api";
import { formatDate, formatPercent, CHANNEL_ICONS, STATUS_COLORS } from "@/lib/utils";

function CampaignCard({ campaign, onSend }: { campaign: Campaign; onSend: (id: string) => void }) {
  const [sending, setSending] = useState(false);
  const deliveryRate = campaign.total_sent > 0 ? campaign.total_delivered / campaign.total_sent : 0;
  const openRate = campaign.total_sent > 0 ? campaign.total_opened / campaign.total_sent : 0;
  const statusColor = STATUS_COLORS[campaign.status] || "bg-zinc-700 text-zinc-300";

  const handleSend = async (e: React.MouseEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await sendCampaign(campaign.id);
      onSend(campaign.id);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm(`Are you sure you want to delete campaign "${campaign.name}"?`)) return;
    try {
      await deleteCampaign(campaign.id);
      onSend(campaign.id);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete campaign.");
    }
  };

  return (
    <div className="glass-card p-5 hover:border-primary/30 transition-all duration-200 border border-base-content/10">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-primary/10">
            {CHANNEL_ICONS[campaign.channel] || "📢"}
          </div>
          <div>
            <Link href={`/campaigns/${campaign.id}`}
              className="font-semibold text-base-content hover:text-primary transition-colors block">
              {campaign.name}
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge ${statusColor}`}>
                {campaign.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-warning pulse mr-1 inline-block" />}
                {campaign.status}
              </span>
              <span className="text-xs text-base-content/40">{formatDate(campaign.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {campaign.status === "draft" && (
            <button onClick={handleSend} disabled={sending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-content bg-primary disabled:opacity-50 transition-all hover:opacity-90">
              {sending ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Send
            </button>
          )}
          <button 
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-base-content/50 hover:text-error hover:bg-error/10 transition-colors shrink-0"
            title="Delete campaign record"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {campaign.total_sent > 0 && (
        <div className="grid grid-cols-4 gap-3 pt-4 border-t border-base-content/10">
          {[
            { label: "Sent", value: campaign.total_sent.toLocaleString(), color: "text-base-content/75" },
            { label: "Delivered", value: formatPercent(deliveryRate), color: "text-success" },
            { label: "Opened", value: formatPercent(openRate), color: "text-info" },
            { label: "Clicked", value: campaign.total_clicked.toLocaleString(), color: "text-primary" },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-xs text-base-content/40 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getCampaigns(filter === "all" ? undefined : filter);
      setCampaigns(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  // Auto-refresh when campaigns are running
  useEffect(() => {
    const hasRunning = campaigns.some(c => c.status === "running");
    if (!hasRunning) return;
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [campaigns]);

  const handleSend = () => { load(); };

  const FILTERS = ["all", "draft", "running", "completed", "failed"];

  return (
    <div className="p-8 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-base-content">Campaigns</h1>
          <p className="text-base-content/60 mt-1">Create and manage your marketing campaigns</p>
        </div>
        <Link href="/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary-content bg-primary hover:opacity-90">
          <Plus size={16} />
          New Campaign
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all capitalize border ${
              filter === f
                ? "bg-primary/15 text-primary border-primary/25 font-semibold"
                : "text-base-content/60 border-transparent hover:text-base-content hover:bg-base-content/5"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-40 shimmer rounded-2xl" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="glass-card p-16 text-center border border-base-content/10">
          <Megaphone size={48} className="text-base-content/30 mx-auto mb-4" />
          <h3 className="font-semibold text-base-content mb-2">No campaigns yet</h3>
          <p className="text-sm text-base-content/60 mb-4">
            {filter === "all"
              ? "Create your first campaign to start reaching shoppers."
              : `No ${filter} campaigns found.`}
          </p>
          {filter === "all" && (
            <Link href="/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-primary-content bg-primary hover:opacity-90">
              <Plus size={14} />
              Create Campaign
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {campaigns.map(c => (
            <CampaignCard key={c.id} campaign={c} onSend={handleSend} />
          ))}
        </div>
      )}
    </div>
  );
}
