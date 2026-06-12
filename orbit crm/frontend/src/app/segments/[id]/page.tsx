"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Users, Megaphone, Sparkles, Filter } from "lucide-react";
import Link from "next/link";
import { getSegment, previewSegment, Segment, SegmentPreview } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function SegmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [segment, setSegment] = useState<Segment | null>(null);
  const [preview, setPreview] = useState<SegmentPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getSegment(id), previewSegment(id)])
      .then(([seg, prev]) => { setSegment(seg); setPreview(prev); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const FIELD_LABELS: Record<string, string> = {
    total_spend: "Total Spend (₹)", order_count: "Order Count",
    last_order_days: "Days Since Last Order", city: "City",
    tags: "Tags", created_days: "Days Since Joining",
  };
  const OP_LABELS: Record<string, string> = {
    gt: ">", gte: "≥", lt: "<", lte: "≤", eq: "=", neq: "≠",
    contains: "contains", in: "in",
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 shimmer rounded mb-4" />
        <div className="h-48 shimmer rounded-2xl" />
      </div>
    );
  }

  if (!segment) return <div className="p-8 text-zinc-500">Segment not found.</div>;

  const isAI = segment.filter_type === "ai";

  return (
    <div className="p-8 animate-in max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{segment.name}</h1>
            <span className="badge" style={{
              background: isAI ? "rgba(139,92,246,0.1)" : "rgba(59,130,246,0.1)",
              color: isAI ? "#a78bfa" : "#60a5fa",
              border: `1px solid ${isAI ? "rgba(139,92,246,0.2)" : "rgba(59,130,246,0.2)"}`,
            }}>
              {isAI ? "AI-Generated" : "Manual"}
            </span>
          </div>
          <p className="text-zinc-500 mt-1">{segment.description || "No description"}</p>
        </div>
        <Link href={`/campaigns/new?segment_id=${segment.id}`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
          <Megaphone size={14} />
          Create Campaign
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.15)" }}>
            <Users size={22} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{preview?.count.toLocaleString() || segment.customer_count.toLocaleString()}</p>
            <p className="text-sm text-zinc-500">Matching Customers</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: isAI ? "rgba(139,92,246,0.15)" : "rgba(59,130,246,0.15)" }}>
            {isAI ? <Sparkles size={22} className="text-violet-400" /> : <Filter size={22} className="text-blue-400" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{isAI ? "AI-Built" : "Manual Rules"}</p>
            <p className="text-xs text-zinc-500">Created {formatDate(segment.created_at)}</p>
          </div>
        </div>
      </div>

      {/* NL Query */}
      {segment.nl_query && (
        <div className="glass-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-violet-400" />
            <h3 className="text-sm font-semibold text-white">Original Natural Language Query</h3>
          </div>
          <p className="text-sm text-zinc-400 italic">"{segment.nl_query}"</p>
        </div>
      )}

      {/* Filter Rules */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Filter Rules ({segment.filter_rules.length})</h3>
        <div className="space-y-2">
          {segment.filter_rules.map((rule, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-zinc-400 font-medium">
                {FIELD_LABELS[rule.field] || rule.field}
              </span>
              <span className="text-zinc-600">
                {OP_LABELS[rule.operator] || rule.operator}
              </span>
              <span className="text-white font-semibold">
                {rule.field === "total_spend"
                  ? formatCurrency(Number(rule.value))
                  : String(rule.value)}
              </span>
              {rule.field === "last_order_days" && (
                <span className="text-zinc-600">days</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sample Customers */}
      {preview && preview.sample_customers.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">
            Sample Customers ({preview.sample_customers.length} shown)
          </h3>
          <div className="space-y-2">
            {preview.sample_customers.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: `hsl(${c.name.charCodeAt(0) * 7 % 360}, 60%, 35%)` }}>
                  {c.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <p className="text-xs text-zinc-500">{c.city} · {c.order_count} orders</p>
                </div>
                <span className="text-sm font-semibold text-white">
                  {formatCurrency(c.total_spend)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
