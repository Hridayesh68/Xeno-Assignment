"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Users, Megaphone, Sparkles, Filter, Trash2, X } from "lucide-react";
import Link from "next/link";
import { getSegment, previewSegment, Segment, SegmentPreview, deleteSegment } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";

export default function SegmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [segment, setSegment] = useState<Segment | null>(null);
  const [preview, setPreview] = useState<SegmentPreview | null>(null);
  const [loading, setLoading] = useState(true);

  // Custom Deletion Dialog States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteSegment(id);
      setShowDeleteConfirm(false);
      router.push("/segments");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete segment.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-8 w-64 shimmer rounded mb-4" />
        <div className="h-48 shimmer rounded-2xl" />
      </div>
    );
  }

  if (!segment) return <div className="p-8 text-base-content/60">Segment not found.</div>;

  const isAI = segment.filter_type === "ai";

  return (
    <>
      <div className="p-8 animate-in max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl text-base-content/50 hover:text-base-content hover:bg-base-content/5 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-base-content">{segment.name}</h1>
            <span className={`badge ${isAI ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary/10 text-secondary border-secondary/20"} border`}>
              {isAI ? "AI-Generated" : "Manual"}
            </span>
          </div>
          <p className="text-base-content/60 mt-1">{segment.description || "No description"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-error bg-error/10 hover:bg-error/20 border border-error/20 transition-all">
            <Trash2 size={14} />
            Delete Segment
          </button>
          <Link href={`/campaigns/new?segment_id=${segment.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary-content bg-primary hover:opacity-90">
            <Megaphone size={14} />
            Create Campaign
          </Link>
        </div>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-card p-5 flex items-center gap-4 border border-base-content/10">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-success/10">
            <Users size={22} className="text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-base-content">{preview?.count.toLocaleString() || segment.customer_count.toLocaleString()}</p>
            <p className="text-sm text-base-content/60">Matching Customers</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4 border border-base-content/10">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10">
            {isAI ? <Sparkles size={22} className="text-primary" /> : <Filter size={22} className="text-secondary" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-base-content">{isAI ? "AI-Built" : "Manual Rules"}</p>
            <p className="text-xs text-base-content/60">Created {formatDate(segment.created_at)}</p>
          </div>
        </div>
      </div>

      {/* NL Query */}
      {segment.nl_query && (
        <div className="glass-card p-5 mb-6 border border-base-content/10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-primary" />
            <h3 className="text-sm font-semibold text-base-content">Original Natural Language Query</h3>
          </div>
          <p className="text-sm text-base-content/70 italic">"{segment.nl_query}"</p>
        </div>
      )}

      {/* Filter Rules */}
      <div className="glass-card p-5 mb-6 border border-base-content/10">
        <h3 className="text-sm font-semibold text-base-content mb-4">Filter Rules ({segment.filter_rules.length})</h3>
        <div className="space-y-2">
          {segment.filter_rules.map((rule, i) => (
            <div key={i} className="flex items-center gap-2 p-3 rounded-xl text-sm bg-base-200 border border-base-content/5">
              <span className="text-base-content/70 font-medium">
                {FIELD_LABELS[rule.field] || rule.field}
              </span>
              <span className="text-base-content/40">
                {OP_LABELS[rule.operator] || rule.operator}
              </span>
              <span className="text-base-content font-bold">
                {rule.field === "total_spend"
                  ? formatCurrency(Number(rule.value))
                  : String(rule.value)}
              </span>
              {rule.field === "last_order_days" && (
                <span className="text-base-content/40">days</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Sample Customers */}
      {preview && preview.sample_customers.length > 0 && (
        <div className="glass-card p-5 border border-base-content/10">
          <h3 className="text-sm font-semibold text-base-content mb-4">
            Sample Customers ({preview.sample_customers.length} shown)
          </h3>
          <div className="space-y-2">
            {preview.sample_customers.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-base-200/50 border border-base-content/5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  style={{ background: `hsl(${c.name.charCodeAt(0) * 7 % 360}, 60%, 35%)` }}>
                  {c.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-base-content">{c.name}</p>
                  <p className="text-xs text-base-content/60">{c.city} · {c.order_count} orders</p>
                </div>
                <span className="text-sm font-bold text-base-content">
                  {formatCurrency(c.total_spend)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Custom Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-base-100 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-base-content/10 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-base-content">Delete Segment?</h3>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="p-1 rounded-lg text-base-content/50 hover:bg-base-content/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-base-content/60 mb-6">
              Are you sure you want to delete segment <strong className="text-base-content">"{segment.name}"</strong> and all its associated campaigns? This action is permanent.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-base-content/70 hover:bg-base-content/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-error-content bg-error hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
