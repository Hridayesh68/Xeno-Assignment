"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Plus, Trash2, Loader2, ChevronLeft, Users, Wand2 } from "lucide-react";
import {
  aiParseSegment, createSegment, previewSegmentRules,
  FilterRule, SegmentCreate, SegmentPreview
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const FIELDS = [
  { value: "total_spend", label: "Total Spend (₹)" },
  { value: "order_count", label: "Order Count" },
  { value: "last_order_days", label: "Days Since Last Order" },
  { value: "city", label: "City" },
  { value: "tags", label: "Tags" },
  { value: "created_days", label: "Days Since Joining" },
];

const OPERATORS: Record<string, { value: string; label: string }[]> = {
  total_spend: [
    { value: "gt", label: "greater than" }, { value: "gte", label: "≥" },
    { value: "lt", label: "less than" }, { value: "lte", label: "≤" },
    { value: "eq", label: "equals" },
  ],
  order_count: [
    { value: "gt", label: "greater than" }, { value: "gte", label: "≥" },
    { value: "lt", label: "less than" }, { value: "lte", label: "≤" },
    { value: "eq", label: "equals" },
  ],
  last_order_days: [
    { value: "gt", label: "more than X days ago" },
    { value: "lt", label: "less than X days ago" },
  ],
  city: [
    { value: "eq", label: "is" },
    { value: "neq", label: "is not" },
    { value: "in", label: "is one of" },
  ],
  tags: [{ value: "contains", label: "contains" }],
  created_days: [
    { value: "lt", label: "less than X days ago" },
    { value: "gt", label: "more than X days ago" },
  ],
};

function RuleRow({
  rule, index, onChange, onRemove
}: {
  rule: FilterRule;
  index: number;
  onChange: (i: number, r: FilterRule) => void;
  onRemove: (i: number) => void;
}) {
  const ops = OPERATORS[rule.field] || [];
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-base-200 border border-base-content/5">
      <select value={rule.field}
        onChange={e => onChange(index, { ...rule, field: e.target.value, operator: OPERATORS[e.target.value]?.[0]?.value || "eq", value: "" })}
        className="px-3 py-1.5 rounded-lg text-sm text-base-content outline-none bg-base-300 border border-base-content/15">
        {FIELDS.map(f => <option key={f.value} value={f.value} className="bg-base-200 text-base-content">{f.label}</option>)}
      </select>
      <select value={rule.operator}
        onChange={e => onChange(index, { ...rule, operator: e.target.value })}
        className="px-3 py-1.5 rounded-lg text-sm text-base-content outline-none bg-base-300 border border-base-content/15">
        {ops.map(o => <option key={o.value} value={o.value} className="bg-base-200 text-base-content">{o.label}</option>)}
      </select>
      <input type={["city", "tags"].includes(rule.field) ? "text" : "number"}
        value={String(rule.value)}
        onChange={e => onChange(index, { ...rule, value: ["city", "tags"].includes(rule.field) ? e.target.value : Number(e.target.value) })}
        placeholder={rule.field === "city" ? "e.g. Mumbai" : rule.field === "tags" ? "e.g. vip" : "0"}
        className="flex-1 px-3 py-1.5 rounded-lg text-sm text-base-content placeholder-base-content/40 outline-none focus:ring-1 focus:ring-primary bg-base-300 border border-base-content/15"
      />
      <button onClick={() => onRemove(index)}
        className="p-1.5 rounded-lg text-base-content/50 hover:text-error hover:bg-error/10 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function NewSegmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(searchParams.get("name") || "");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [nlQuery, setNlQuery] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlExplanation, setNlExplanation] = useState("");
  const [preview, setPreview] = useState<SegmentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<"manual" | "ai">("manual");

  // Prefill from query params (from suggestions)
  useEffect(() => {
    const rulesParam = searchParams.get("rules");
    if (rulesParam) {
      try {
        setRules(JSON.parse(rulesParam));
        setFilterType("ai");
      } catch {}
    }
  }, []);

  const addRule = () => {
    setRules(r => [...r, { field: "total_spend", operator: "gt", value: 0 }]);
  };

  const updateRule = (i: number, rule: FilterRule) => {
    setRules(r => r.map((x, idx) => idx === i ? rule : x));
  };

  const removeRule = (i: number) => {
    setRules(r => r.filter((_, idx) => idx !== i));
  };

  const runNL = async () => {
    if (!nlQuery.trim()) return;
    setNlLoading(true);
    try {
      const res = await aiParseSegment(nlQuery);
      setRules(res.filter_rules);
      setNlExplanation(res.explanation);
      if (!name) setName(res.segment_name);
      setFilterType("ai");
    } catch (e) {
      console.error(e);
    } finally {
      setNlLoading(false);
    }
  };

  const runPreview = async () => {
    if (!rules.length) return;
    setPreviewLoading(true);
    try {
      const res = await previewSegmentRules({
        name: name || "Preview",
        filter_rules: rules,
      });
      setPreview(res);
    } catch (e) {
      console.error(e);
    } finally {
      setPreviewLoading(false);
    }
  };

  const save = async () => {
    if (!name || !rules.length) return;
    setSaving(true);
    try {
      const seg = await createSegment({
        name,
        description,
        filter_rules: rules,
        nl_query: nlQuery || undefined,
        filter_type: filterType,
      });
      router.push(`/segments/${seg.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 animate-in max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl text-base-content/50 hover:text-base-content hover:bg-base-content/5 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-base-content">New Segment</h1>
          <p className="text-base-content/60 mt-1">Define your audience with AI or manual filters</p>
        </div>
      </div>

      {/* AI Natural Language Builder */}
      <div className="glass-card p-5 mb-6 border border-base-content/10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} className="text-primary" />
          <h2 className="font-semibold text-base-content text-sm">AI Segment Builder</h2>
          <span className="badge ml-1 bg-primary/10 text-primary border border-primary/20">
            Powered by GPT-4o
          </span>
        </div>
        <p className="text-xs text-base-content/60 mb-3">
          Describe your audience in plain English — AI will convert it to filters automatically.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={nlQuery}
            onChange={e => setNlQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runNL()}
            placeholder={"e.g. \"Customers who spent over ₹5000 but haven't bought in 60 days\""}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-base-content placeholder-base-content/40 outline-none focus:ring-1 focus:ring-primary bg-base-200 border border-base-content/10"
          />
          <button onClick={runNL} disabled={nlLoading || !nlQuery}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-content bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90">
            {nlLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            Generate
          </button>
        </div>
        {nlExplanation && (
          <p className="text-xs text-primary mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
            💡 {nlExplanation}
          </p>
        )}
      </div>

      {/* Manual Rules */}
      <div className="glass-card p-5 mb-6 border border-base-content/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base-content text-sm">Filter Rules</h2>
          <button onClick={addRule}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary/10 border border-primary/20 hover:bg-primary hover:text-primary-content transition-all">
            <Plus size={12} />
            Add Filter
          </button>
        </div>
        {rules.length === 0 ? (
          <p className="text-sm text-base-content/40 text-center py-6">
            Use AI above or add filters manually to define your audience.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map((r, i) => (
              <RuleRow key={i} rule={r} index={i} onChange={updateRule} onRemove={removeRule} />
            ))}
          </div>
        )}
      </div>

      {/* Segment Details */}
      <div className="glass-card p-5 mb-6 border border-base-content/10">
        <h2 className="font-semibold text-base-content text-sm mb-4">Segment Details</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-base-content/60 mb-1 block">Segment Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. High-Value Dormant Customers"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-base-content placeholder-base-content/40 outline-none focus:ring-1 focus:ring-primary bg-base-200 border border-base-content/10"
            />
          </div>
          <div>
            <label className="text-xs text-base-content/60 mb-1 block">Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What is this segment for?"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-base-content placeholder-base-content/40 outline-none focus:ring-1 focus:ring-primary resize-none bg-base-200 border border-base-content/10"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      {rules.length > 0 && (
        <div className="glass-card p-5 mb-6 border border-base-content/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base-content text-sm">Preview</h2>
            <button onClick={runPreview} disabled={previewLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary/10 border border-primary/20 hover:bg-primary hover:text-primary-content transition-all disabled:opacity-50">
              {previewLoading ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
              Run Preview
            </button>
          </div>
          {preview ? (
            <div>
              <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-success/15 border border-success/25">
                <Users size={16} className="text-success" />
                <span className="text-sm font-semibold text-base-content">
                  {preview.count.toLocaleString()} customers match
                </span>
              </div>
              <div className="space-y-1">
                {preview.sample_customers.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-base-200 border border-base-content/5">
                    <span className="text-base-content">{c.name}</span>
                    <span className="text-base-content/60">{formatCurrency(c.total_spend)} · {c.order_count} orders</span>
                  </div>
                ))}
                {preview.count > 3 && (
                  <p className="text-xs text-base-content/40 text-center pt-1">
                    +{preview.count - 3} more customers
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-base-content/40 text-center py-4">
              Click "Run Preview" to see how many customers match.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-base-content/70 hover:text-base-content bg-base-200 border border-base-content/10 hover:bg-base-300 transition-colors">
          Cancel
        </button>
        <button onClick={save} disabled={saving || !name || !rules.length}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-content bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:opacity-90">
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          Save Segment
        </button>
      </div>
    </div>
  );
}

export default function NewSegmentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Loading...</div>}>
      <NewSegmentForm />
    </Suspense>
  );
}
